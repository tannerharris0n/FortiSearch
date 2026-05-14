#!/usr/bin/env node
/*
 * One-shot data correction:
 *  - Null out invented firmware versions (everything except FortiGate family
 *    where I have verified values).
 *  - Fix broken lifecycle URLs to the real Fortinet support portal.
 *  - Add architectureDocs field pointing at the Fortinet 4-D docs hub or
 *    per-category subpage.
 *  - Drop speculative releaseNotes / adminGuide / datasheet URLs that
 *    embedded made-up version numbers.
 *
 * After this runs once, the scraper takes over for ongoing firmware updates.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'src', 'data', 'products.json');

const REAL_LIFECYCLE = 'https://support.fortinet.com/Information/ProductLifeCycle.aspx';
const FOURD_HUB = 'https://docs.fortinet.com/4d-resources';
const FOURD = {
  'SD-WAN': 'https://docs.fortinet.com/4d-resources/SD-WAN',
  'ZTNA': 'https://docs.fortinet.com/4d-resources/ZTNA',
  'Wireless': 'https://docs.fortinet.com/4d-resources/Wireless',
  'Switching': 'https://docs.fortinet.com/4d-resources/Switching',
  'SASE': 'https://docs.fortinet.com/4d-resources/SASE',
  'NGFW': 'https://docs.fortinet.com/4d-resources/NGFW',
  'IAM': 'https://docs.fortinet.com/4d-resources/IAM',
  'WAF': 'https://docs.fortinet.com/4d-resources/WAF',
  'ADC': 'https://docs.fortinet.com/4d-resources/ADC',
};

// Verified May 2026: FortiOS 7.6.6 is the recommended/mature track GA.
// 8.0.0 (build 0167) is the new feature train. Source: docs.fortinet.com
// product page and Fortinet KB "Technical Tip: Recommended release for FortiOS".
const VERIFIED_FORTIOS = {
  ga: '7.6.6',
  recommended: '7.6.6',
  feature: '8.0.0',
  lastChecked: '2026-05-13',
  lastUpdated: '2026-05-13',
};

// Products that run FortiOS directly. They share the FortiOS version table.
const FORTIOS_FAMILY = new Set([
  'fortigate',
  'fortigate-5000',
  'fortigate-6000',
  'fortigate-7000',
  'forticarrier',
]);

// Map product id -> 4D category key. Anything not listed gets the hub URL
// (the per-category mapping is not 1:1 with the catalog, so we don't force it).
const FOURD_BY_ID = {
  fortigate: 'NGFW',
  'fortigate-5000': 'NGFW',
  'fortigate-6000': 'NGFW',
  'fortigate-7000': 'NGFW',
  forticarrier: 'NGFW',
  fortiswitch: 'Switching',
  'fortiswitch-manager': 'Switching',
  fortiap: 'Wireless',
  'fortiap-u': 'Wireless',
  'fortilan-cloud': 'Wireless',
  fortipresence: 'Wireless',
  fortiplanner: 'Wireless',
  'fortiedge-cloud': 'Wireless',
  fortiextender: 'SD-WAN',
  'overlay-as-a-service': 'SD-WAN',
  fortisase: 'SASE',
  'fortisase-sovereign': 'SASE',
  fortibranchsase: 'SASE',
  fortiproxy: 'SASE',
  forticlient: 'ZTNA',
  'forticlient-cloud': 'ZTNA',
  fortiweb: 'WAF',
  'fortiappsec-cloud': 'WAF',
  fortiadc: 'ADC',
  fortigslb: 'ADC',
  fortiauthenticator: 'IAM',
  'fortiauthenticator-cloud': 'IAM',
  fortitoken: 'IAM',
  'fortiidentity-cloud': 'IAM',
  fortipam: 'IAM',
};

function nullFirmware(checkedToday = false) {
  return {
    ga: null,
    recommended: null,
    feature: null,
    lastChecked: null,
    lastUpdated: null,
  };
}

const raw = await readFile(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

const todayIso = '2026-05-13';

for (const p of data.products) {
  // Lifecycle URL — every product gets the real support portal URL.
  if (p.eol) {
    p.eol.lifecycleUrl = REAL_LIFECYCLE;
  }

  // Architecture docs — per-category 4-D URL when mappable, else hub.
  const fourdKey = FOURD_BY_ID[p.id];
  if (!p.links) p.links = {};
  p.links.architectureDocs = fourdKey ? FOURD[fourdKey] : FOURD_HUB;

  // Drop speculative deep URLs that embedded made-up version numbers.
  p.links.releaseNotes = null;
  p.links.adminGuide = null;
  p.links.datasheet = null;

  // Firmware: only FortiOS family retains verified values. Everything else
  // (that wasn't already SaaS-null) gets its versions blanked. The original
  // spec said "do not invent firmware version numbers — use null if unsure",
  // which I should have followed the first time.
  if (p.firmware === null) {
    // SaaS / cloud-only — already correct.
    continue;
  }
  if (FORTIOS_FAMILY.has(p.id)) {
    p.firmware = { ...VERIFIED_FORTIOS };
  } else {
    p.firmware = nullFirmware();
  }
}

// Meta: today's check date.
data.meta = data.meta || {};
data.meta.lastChecked = todayIso;
const next = new Date(todayIso + 'T00:00:00Z');
next.setUTCDate(next.getUTCDate() + 7);
data.meta.nextCheck = next.toISOString().slice(0, 10);
data.meta.sourceNote =
  'Versions are scraped weekly from docs.fortinet.com and cross-referenced against the Fortinet recommended-release KB. FortiOS-family firmware was hand-verified on 2026-05-13; other products are awaiting the next scraper run. Cloud / SaaS products carry no firmware version.';

await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('data fixed');
