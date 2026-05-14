#!/usr/bin/env node
/*
 * FortiSearch firmware updater.
 *
 * Reads src/data/products.json, hits docs.fortinet.com for each product
 * with a doc slug, parses out the latest GA version, and updates the
 * file in place. Skips SaaS/cloud products that carry firmware: null.
 *
 * Node 18+ (uses global fetch). No external deps.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'src', 'data', 'products.json');
const DOC_HOST = 'https://docs.fortinet.com';
const LIFECYCLE_URL = 'https://www.fortinet.com/support/support-services/product-life-cycle-support';

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

// Parse the docs.fortinet.com product page and return the most recent
// non-prerelease semver string we can find. The product index pages
// render a version list; we look for x.y.z patterns and pick the highest.
function extractLatestVersion(html) {
  if (!html) return null;

  // Pull out any tokens that look like x.y.z or x.y, ignore obvious junk.
  const seen = new Set();
  const matches = html.match(/\b(\d+\.\d+(?:\.\d+)?)\b/g) || [];
  for (const m of matches) seen.add(m);

  const versions = Array.from(seen).filter((v) => {
    const parts = v.split('.').map(Number);
    // Reject impossible numbers (years like 2026, port numbers, etc.).
    if (parts[0] > 50) return false;
    if (parts.some((n) => Number.isNaN(n))) return false;
    return true;
  });

  if (versions.length === 0) return null;

  versions.sort((a, b) => {
    const ap = a.split('.').map(Number);
    const bp = b.split('.').map(Number);
    const len = Math.max(ap.length, bp.length);
    for (let i = 0; i < len; i++) {
      const av = ap[i] || 0;
      const bv = bp[i] || 0;
      if (av !== bv) return bv - av;
    }
    return 0;
  });

  return versions[0];
}

async function fetchSlug(slug) {
  const url = `${DOC_HOST}/product/${slug}`;
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'FortiSearch-Updater/1.0 (+https://github.com/tannerharris0n/FortiSearch)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) {
      warn(`HTTP ${res.status} for ${slug}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    warn(`fetch failed for ${slug}: ${err.message}`);
    return null;
  }
}

async function main() {
  const raw = await readFile(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  const stats = { checked: 0, skipped: 0, updated: 0, failures: 0, changes: [] };
  const todayIso = today();

  for (const product of data.products) {
    // Skip SaaS / cloud-only products that have no firmware versioning.
    if (product.firmware === null || product.firmware === undefined) {
      stats.skipped++;
      continue;
    }

    const slug = slugFromDocsUrl(product.links?.docs);
    if (!slug) {
      warn(`no doc slug for ${product.id}, skipping`);
      stats.skipped++;
      continue;
    }

    stats.checked++;
    const html = await fetchSlug(slug);
    if (!html) {
      stats.failures++;
      // Keep prior data intact, just bump lastChecked.
      product.firmware.lastChecked = todayIso;
      continue;
    }

    const latest = extractLatestVersion(html);
    product.firmware.lastChecked = todayIso;

    if (!latest) {
      warn(`no version parsed from ${slug}`);
      stats.failures++;
      continue;
    }

    const prior = product.firmware.ga;
    if (latest !== prior) {
      stats.updated++;
      stats.changes.push(`${product.name}: ${prior || '∅'} -> ${latest}`);
      product.firmware.ga = latest;
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

  // Surface a flag for the workflow to decide whether to commit.
  if (process.env.GITHUB_OUTPUT) {
    const { appendFile } = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${stats.updated > 0 ? 'true' : 'false'}\n`);
    await appendFile(process.env.GITHUB_OUTPUT, `summary=checked=${stats.checked} updated=${stats.updated}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Lifecycle URL is referenced for traceability in product entries.
void LIFECYCLE_URL;
