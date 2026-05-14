#!/usr/bin/env node
/*
 * Populate links.vmGuides per product by discovering hypervisor-specific
 * admin guides on docs.fortinet.com.
 *
 * Fortinet publishes per-hypervisor admin guides under two slug roots:
 *   /product/<slug>-public-cloud   (AWS, Azure, GCP, OCI, AliCloud, IBM)
 *   /product/<slug>-private-cloud  (ESXi, KVM, Hyper-V, OpenStack, etc.)
 *
 * Each hub lists per-platform docs at:
 *   /document/<slug>-(public|private)-cloud/<ver>/<platform>-administration-guide
 *
 * For every catalog product whose deploymentVariants imply VM/cloud, we
 * try both hubs and harvest the platform admin-guide URLs we find.
 *
 * The FortiOS family inherits FortiGate's vmGuides (same SKUs, same images).
 *
 * Node 18+ (global fetch). No external deps.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'src', 'data', 'products.json');
const DOC_HOST = 'https://docs.fortinet.com';
const UA = 'FortiSearch-Updater/2.1';

const FORTIOS_FAMILY = new Set(['fortigate-5000', 'fortigate-6000', 'fortigate-7000', 'forticarrier']);

const PLATFORM_LABELS = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'Google Cloud',
  oci: 'Oracle Cloud',
  alicloud: 'AliCloud',
  'ibm-cloud': 'IBM Cloud',
  'vmware-esxi': 'VMware ESXi',
  kvm: 'KVM',
  'microsoft-hyper-v': 'Hyper-V',
  openstack: 'OpenStack',
  xen: 'Xen',
  nutanix: 'Nutanix',
  docker: 'Docker',
  proxmox: 'Proxmox',
  kubernetes: 'Kubernetes',
  'cisco-aci': 'Cisco ACI',
};

const PLATFORM_KIND = {
  aws: 'public',
  azure: 'public',
  gcp: 'public',
  oci: 'public',
  alicloud: 'public',
  'ibm-cloud': 'public',
  'vmware-esxi': 'private',
  kvm: 'private',
  'microsoft-hyper-v': 'private',
  openstack: 'private',
  xen: 'private',
  nutanix: 'private',
  docker: 'private',
  proxmox: 'private',
  kubernetes: 'private',
  'cisco-aci': 'private',
};

async function httpGet(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function slugFromDocsUrl(url) {
  if (!url) return null;
  const m = url.match(/\/product\/([a-z0-9-]+)/i);
  return m ? m[1] : null;
}

// Pull every /document/<hubSlug>/<X.Y.Z>/<platform>-administration-guide
// link and pick the highest version for each platform.
function extractPlatformGuides(hubSlug, html) {
  if (!html) return {};
  const escapedHub = hubSlug.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(
    `/document/${escapedHub}/(\\d+\\.\\d+\\.\\d+)/([a-z0-9-]+)-administration-guide`,
    'gi'
  );
  const byPlatform = new Map();
  let m;
  while ((m = re.exec(html)) !== null) {
    const ver = m[1];
    const platform = m[2];
    if (!PLATFORM_LABELS[platform]) continue;
    const existing = byPlatform.get(platform);
    if (!existing || compareSemver(ver, existing.version) < 0) {
      byPlatform.set(platform, { version: ver });
    }
  }
  const result = {};
  for (const [platform, info] of byPlatform) {
    result[platform] = `${DOC_HOST}/document/${hubSlug}/${info.version}/${platform}-administration-guide`;
  }
  return result;
}

function compareSemver(a, b) {
  const ap = a.split('.').map(Number);
  const bp = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const av = ap[i] || 0;
    const bv = bp[i] || 0;
    if (av !== bv) return bv - av;
  }
  return 0;
}

function variantImpliesVm(p) {
  const v = (p.deploymentVariants || []).map((x) => x.toLowerCase());
  return v.some((x) =>
    x === 'vm' ||
    x === 'public cloud' ||
    x === 'private cloud' ||
    x === 'container' ||
    x.includes('cloud-native')
  );
}

async function probeHub(hubSlug) {
  const url = `${DOC_HOST}/product/${hubSlug}`;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  }).catch(() => null);
  if (!res || !res.ok) return { exists: false };
  return { exists: true, url, html: await res.text() };
}

async function discoverForSlug(slug) {
  const guides = {};
  const hubs = {};
  for (const kind of ['public', 'private']) {
    const hubSlug = `${slug}-${kind}-cloud`;
    const probe = await probeHub(hubSlug);
    if (!probe.exists) continue;
    hubs[kind] = probe.url;
    Object.assign(guides, extractPlatformGuides(hubSlug, probe.html));
  }
  return { guides, hubs };
}

async function main() {
  const raw = await readFile(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  const stats = { discovered: 0, hubsOnly: 0, byProduct: [], empty: [] };

  // First pass: scrape per-product hubs.
  const cache = new Map();
  for (const p of data.products) {
    if (!variantImpliesVm(p)) {
      if (p.links?.vmGuides) delete p.links.vmGuides;
      if (p.links?.vmInstaller) delete p.links.vmInstaller;
      continue;
    }
    const slug = slugFromDocsUrl(p.links?.docs);
    if (!slug) continue;
    if (FORTIOS_FAMILY.has(p.id)) continue; // handled by inheritance pass

    let discovered = cache.get(slug);
    if (!discovered) {
      discovered = await discoverForSlug(slug);
      cache.set(slug, discovered);
    }
    const { guides, hubs } = discovered;
    if (!p.links) p.links = {};

    const hasGuides = Object.keys(guides).length > 0;
    const hasHubs = Object.keys(hubs).length > 0;

    if (hasGuides) {
      p.links.vmGuides = guides;
      stats.discovered++;
      stats.byProduct.push(`${p.name}: ${Object.keys(guides).length} platforms`);
    } else {
      delete p.links.vmGuides;
    }

    if (hasHubs) {
      p.links.cloudHubs = hubs;
      if (!hasGuides) {
        stats.hubsOnly++;
        stats.byProduct.push(`${p.name}: hub fallback (${Object.keys(hubs).join(', ')})`);
      }
    } else {
      delete p.links.cloudHubs;
    }

    if (!hasGuides && !hasHubs) stats.empty.push(p.name);
    // The old single-link field is superseded; drop it.
    delete p.links.vmInstaller;
  }

  // Second pass: FortiOS-family inheritance from FortiGate.
  const fortigate = data.products.find((p) => p.id === 'fortigate');
  if (fortigate?.links?.vmGuides) {
    for (const id of FORTIOS_FAMILY) {
      const p = data.products.find((x) => x.id === id);
      if (!p) continue;
      if (!p.links) p.links = {};
      p.links.vmGuides = { ...fortigate.links.vmGuides };
      if (fortigate.links.cloudHubs) p.links.cloudHubs = { ...fortigate.links.cloudHubs };
      delete p.links.vmInstaller;
      stats.discovered++;
      stats.byProduct.push(`${p.name}: inherited (${Object.keys(fortigate.links.vmGuides).length} platforms)`);
    }
  }

  // Also drop the bogus cloudDocs field that pointed at non-existent URLs.
  for (const p of data.products) {
    if (p.cloudDocs) delete p.cloudDocs;
  }

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(`Done. populated=${stats.discovered} hubsOnly=${stats.hubsOnly} empty=${stats.empty.length}`);
  for (const line of stats.byProduct) console.log('  +', line);
  if (stats.empty.length) {
    console.log('No VM hubs found for:');
    for (const n of stats.empty) console.log('  -', n);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
