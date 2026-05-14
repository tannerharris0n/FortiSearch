#!/usr/bin/env node
/*
 * FortiSearch firmware updater.
 *
 * Strategy:
 *   1. Fetch https://docs.fortinet.com/product/<slug>.
 *   2. Trim the HTML before the first "Legacy" marker so we never grab
 *      a legacy release.
 *   3. Find every href of the form /document/<slug>/X.Y.Z/ in that
 *      trimmed HTML. Anchoring on the slug guarantees the version is
 *      tied to THIS product and not to a related-product mention,
 *      compatibility note, or boilerplate.
 *   4. Pick the highest X.Y.Z. That's the current GA point release.
 *
 * SaaS / cloud-only products (firmware: null) are skipped entirely.
 *
 * The 'recommended' and 'feature' fields are NOT touched by this
 * scraper. Those come from per-product Fortinet KB articles and are
 * hand-curated quarterly.
 *
 * Failure modes preserve known-good data: we bump lastChecked but
 * leave the stored version alone if anything fails. Junk versions
 * are rejected by plausibleVersion().
 *
 * Node 18+ (global fetch). No external deps.
 */

import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'src', 'data', 'products.json');
const DOC_HOST = 'https://docs.fortinet.com';
const UA = 'FortiSearch-Updater/2.0 (+https://github.com/tannerharris0n/FortiSearch)';

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
  // Reject year-like majors. The biggest current Fortinet major is 8.x.
  // 50 is generous headroom and rules out Ubuntu (22.04), Windows (10),
  // copyright years, etc.
  if (parts[0] > 50) return false;
  // Reject all-zero versions.
  if (parts.every((n) => n === 0)) return false;
  // Reject placeholders: Fortinet uses .99 for unreleased / development
  // builds (e.g., 8.0.99 in the docs site before the public point release).
  if (parts.length >= 3 && parts[2] === 99) return false;
  return true;
}

// Get the list of non-legacy major versions (X.Y) from the version
// selector at the top of the landing page. The selector is rendered
// inline as anchor links to /product/<slug>/X.Y, with a "Legacy" label
// separating current from legacy majors. Trim before Legacy for the
// major list — that part of the page is short and the selector lives
// in the top section.
function extractCurrentMajors(slug, html) {
  if (!html) return [];
  // The "Legacy" string lives inside the version selector; trim AFTER it.
  // But the marker can also appear later in the body (FAQs, etc.). We
  // only want the FIRST occurrence as the boundary.
  const legacyIdx = html.search(/\bLegacy\b/i);
  const head = legacyIdx > 0 ? html.slice(0, legacyIdx) : html;

  const escapedSlug = slug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(`/product/${escapedSlug}/(\\d{1,2}\\.\\d{1,2})(?=["/?#])`, 'gi');
  const found = new Set();
  let m;
  while ((m = re.exec(head)) !== null) found.add(m[1]);
  return Array.from(found).filter(plausibleVersion);
}

// Pick the highest X.Y.Z from /document/<slug>/X.Y.Z/ hrefs across the
// whole page. If we have a list of non-legacy majors, restrict to those.
function extractCurrentGa(slug, html, allowedMajors) {
  if (!html) return null;
  const escapedSlug = slug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(`/document/${escapedSlug}/(\\d{1,2}\\.\\d{1,2}\\.\\d{1,2})/`, 'gi');

  const found = new Set();
  let m;
  while ((m = re.exec(html)) !== null) found.add(m[1]);

  let candidates = Array.from(found).filter(plausibleVersion);
  if (allowedMajors && allowedMajors.length) {
    const allowed = new Set(allowedMajors);
    candidates = candidates.filter((v) => {
      const major = v.split('.').slice(0, 2).join('.');
      return allowed.has(major);
    });
  }
  if (!candidates.length) return null;
  candidates.sort(compareSemver);
  return candidates[0];
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

async function scrapeProduct(product) {
  const slug = slugFromDocsUrl(product.links?.docs);
  if (!slug) return { ok: false, reason: 'no slug' };

  const landing = await httpGet(`${DOC_HOST}/product/${slug}`);
  if (!landing) return { ok: false, reason: 'landing unreachable' };

  const majors = extractCurrentMajors(slug, landing);
  const ga = extractCurrentGa(slug, landing, majors);
  if (!ga) {
    return {
      ok: false,
      reason: majors.length
        ? `no GA found within current majors [${majors.join(', ')}]`
        : 'no version parsed',
    };
  }

  return { ok: true, version: ga, majors };
}

// Products that run FortiOS directly. Their docs hubs lag mainline FortiOS,
// so we copy firmware from the FortiGate entry rather than trust the scrape
// for these slugs. Removing this list will surface stale docs-hub versions
// (e.g., 5.4.x for FortiCarrier) which are misleading.
const FORTIOS_FAMILY = ['fortigate-5000', 'fortigate-6000', 'fortigate-7000', 'forticarrier'];

function inheritFortiOSFamily(products) {
  const fg = products.find((p) => p.id === 'fortigate');
  if (!fg || !fg.firmware) return [];
  const inherited = [];
  for (const id of FORTIOS_FAMILY) {
    const p = products.find((x) => x.id === id);
    if (!p || !p.firmware) continue;
    const prior = p.firmware.ga;
    p.firmware = { ...fg.firmware };
    if (prior !== fg.firmware.ga) inherited.push(`${p.name}: ${prior || '∅'} -> ${fg.firmware.ga} (inherited)`);
  }
  return inherited;
}

async function main() {
  const raw = await readFile(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  const stats = { checked: 0, skipped: 0, updated: 0, failures: 0, inherited: 0, changes: [], failed: [] };
  const todayIso = today();
  const fortiOsFamily = new Set(FORTIOS_FAMILY);

  for (const product of data.products) {
    if (product.firmware === null || product.firmware === undefined) {
      stats.skipped++;
      continue;
    }
    if (fortiOsFamily.has(product.id)) {
      // Handled after the scrape loop so we always copy the fresh
      // fortigate value, not stale data.
      stats.skipped++;
      continue;
    }
    stats.checked++;
    const result = await scrapeProduct(product);
    product.firmware.lastChecked = todayIso;

    if (!result.ok) {
      stats.failures++;
      stats.failed.push(`${product.id} (${result.reason})`);
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

  // Apply FortiOS-family inheritance once the scraper has refreshed
  // fortigate. This ensures FortiCarrier and the chassis SKUs always
  // mirror mainline FortiOS rather than the lagging docs hubs.
  const inheritedChanges = inheritFortiOSFamily(data.products);
  stats.inherited = inheritedChanges.length;
  for (const c of inheritedChanges) stats.changes.push(c);

  data.meta = data.meta || {};
  data.meta.lastChecked = todayIso;
  data.meta.nextCheck = nextWeek();
  data.meta.checkFrequency = data.meta.checkFrequency || 'weekly';

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  log(`Done. checked=${stats.checked} updated=${stats.updated} inherited=${stats.inherited} skipped=${stats.skipped} failures=${stats.failures}`);
  if (stats.changes.length) {
    log('Changes:');
    for (const c of stats.changes) log('  -', c);
  }
  if (stats.failed.length) {
    log('Failures:');
    for (const f of stats.failed) log('  -', f);
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
