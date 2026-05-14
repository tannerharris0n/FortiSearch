#!/usr/bin/env node
/*
 * FortiSearch firmware updater.
 *
 * Reads src/data/products.json, walks each product with a doc slug,
 * and tries to determine the current GA point release from
 * docs.fortinet.com. Skips SaaS/cloud products that carry firmware: null.
 *
 * Node 18+ (uses global fetch). No external deps.
 *
 * Logic per product:
 *   1. Fetch https://docs.fortinet.com/product/<slug>. The product
 *      landing page lists major versions like "8.0", "7.6", "7.4" plus
 *      a "Legacy" group.
 *   2. Pick the highest non-legacy major from that list.
 *   3. Fetch the release-notes page for that major
 *      (/document/<slug>/<major>.0/<rn-doc>) and parse the highest
 *      x.y.z token to get the current point release.
 *   4. Stash that in firmware.ga and bump firmware.lastChecked.
 *      If the value changed, also stamp firmware.lastUpdated.
 *
 * Failure modes preserve known-good data: bump lastChecked but leave
 * the stored version alone if the scrape fails at any step.
 *
 * The 'recommended' and 'feature' fields are *not* touched by this
 * scraper. They come from the Fortinet KB recommended-release article
 * and are hand-updated quarterly. See README for the source.
 */

import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'src', 'data', 'products.json');
const DOC_HOST = 'https://docs.fortinet.com';
const UA = 'FortiSearch-Updater/1.1 (+https://github.com/tannerharris0n/FortiSearch)';

const today = () => new Date().toISOString().slice(0, 10);
const nextWeek = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
};

const log = (...args) => console.log('[update-products]', ...args);
const warn = (...args) => console.warn('[update-products] WARN', ...args);

function slugFromDocsUrl(url) {
  if (!url) return null;
  const m = url.match(/\/product\/([a-z0-9-]+)/i);
  return m ? m[1] : null;
}

function compareSemver(a, b) {
  const ap = a.split('.').map(Number);
  const bp = b.split('.').map(Number);
  const len = Math.max(ap.length, bp.length);
  for (let i = 0; i < len; i++) {
    const av = ap[i] || 0;
    const bv = bp[i] || 0;
    if (av !== bv) return bv - av;
  }
  return 0;
}

function plausibleVersion(v) {
  const parts = v.split('.').map(Number);
  if (parts.some(Number.isNaN)) return false;
  // Reject obvious junk: years, port numbers, RFC numbers.
  if (parts[0] > 50) return false;
  // Reject zeros only.
  if (parts.every((n) => n === 0)) return false;
  return true;
}

// Pull the highest "X.Y" pair from a docs landing page. The Fortinet
// product index renders a list of supported major versions; we want
// the highest one outside the "Legacy" section.
function extractLatestMajor(html) {
  if (!html) return null;
  // Trim everything from the first "Legacy" occurrence onward so we
  // never grab a legacy major by accident.
  const legacyIdx = html.search(/legacy/i);
  const trimmed = legacyIdx > 0 ? html.slice(0, legacyIdx) : html;

  const matches = trimmed.match(/\b(\d{1,2}\.\d{1,2})\b/g) || [];
  const candidates = Array.from(new Set(matches)).filter(plausibleVersion);
  if (!candidates.length) return null;
  candidates.sort(compareSemver);
  return candidates[0];
}

// Pull the highest "X.Y.Z" patch number from a release notes page.
function extractLatestPatch(html, expectedMajor) {
  if (!html) return null;
  const re = expectedMajor
    ? new RegExp(`\\b${expectedMajor.replace('.', '\\.')}\\.(\\d+)\\b`, 'g')
    : /\b(\d+\.\d+\.\d+)\b/g;
  const found = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const full = expectedMajor ? `${expectedMajor}.${m[1]}` : m[1];
    if (plausibleVersion(full)) found.add(full);
  }
  if (!found.size) return null;
  const arr = Array.from(found);
  arr.sort(compareSemver);
  return arr[0];
}

async function httpGet(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    if (!res.ok) {
      warn(`HTTP ${res.status} ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    warn(`fetch failed ${url}: ${err.message}`);
    return null;
  }
}

// Resolve the release-notes doc slug for a product. Most products use
// `<slug>-release-notes` but FortiOS is `fortios-release-notes`. We try a
// short list of plausible URLs and return the first that responds.
async function tryReleaseNotes(productSlug, major) {
  const docCandidates = [
    `${productSlug}-release-notes`,
    `${productSlug}os-release-notes`,
    `fortios-release-notes`, // FortiGate / FortiCarrier special-case
    `release-notes`,
  ];
  for (const doc of docCandidates) {
    const url = `${DOC_HOST}/document/${productSlug}/${major}.0/${doc}`;
    const html = await httpGet(url);
    if (html) return { url, html };
  }
  // Fall back to the major-version index page.
  const idx = `${DOC_HOST}/product/${productSlug}/${major}.0`;
  const html = await httpGet(idx);
  return html ? { url: idx, html } : null;
}

async function scrapeProduct(product) {
  const slug = slugFromDocsUrl(product.links?.docs);
  if (!slug) return { ok: false, reason: 'no slug' };

  const landing = await httpGet(`${DOC_HOST}/product/${slug}`);
  if (!landing) return { ok: false, reason: 'landing 404' };

  const major = extractLatestMajor(landing);
  if (!major) return { ok: false, reason: 'no major parsed' };

  const rn = await tryReleaseNotes(slug, major);
  if (!rn) return { ok: false, reason: 'release notes unreachable', major };

  const patch = extractLatestPatch(rn.html, major) || extractLatestPatch(rn.html);
  if (!patch) return { ok: false, reason: 'no patch parsed', major };

  return { ok: true, version: patch, major, source: rn.url };
}

async function main() {
  const raw = await readFile(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  const stats = { checked: 0, skipped: 0, updated: 0, failures: 0, changes: [] };
  const todayIso = today();

  for (const product of data.products) {
    if (product.firmware === null || product.firmware === undefined) {
      stats.skipped++;
      continue;
    }
    stats.checked++;
    const result = await scrapeProduct(product);
    product.firmware.lastChecked = todayIso;

    if (!result.ok) {
      warn(`${product.id}: ${result.reason}`);
      stats.failures++;
      continue;
    }

    const prior = product.firmware.ga;
    if (result.version !== prior) {
      stats.updated++;
      stats.changes.push(`${product.name}: ${prior || '∅'} -> ${result.version}`);
      product.firmware.ga = result.version;
      product.firmware.lastUpdated = todayIso;
    }
  }

  data.meta = data.meta || {};
  data.meta.lastChecked = todayIso;
  data.meta.nextCheck = nextWeek();
  data.meta.checkFrequency = data.meta.checkFrequency || 'weekly';

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  log(`Done. checked=${stats.checked} updated=${stats.updated} skipped=${stats.skipped} failures=${stats.failures}`);
  if (stats.changes.length) {
    log('Changes:');
    for (const c of stats.changes) log('  -', c);
  }

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${stats.updated > 0 ? 'true' : 'false'}\n`);
    await appendFile(process.env.GITHUB_OUTPUT, `summary=checked=${stats.checked} updated=${stats.updated}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
