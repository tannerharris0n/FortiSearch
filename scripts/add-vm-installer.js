#!/usr/bin/env node
/*
 * One-shot: add links.vmInstaller to every product whose deploymentVariants
 * includes "VM". The canonical hub is docs.fortinet.com/vm — a real page
 * that pivots by hypervisor (ESXi, KVM, AWS, Azure, GCP, OCI, etc.).
 *
 * FortiOS family gets the more specific FortiGate virtualization guide
 * which is verified to exist at /document/fortigate/8.0.0/fortigate-virtualization.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'src', 'data', 'products.json');

const VM_HUB = 'https://docs.fortinet.com/vm';
const FORTIOS_FAMILY = new Set([
  'fortigate',
  'fortigate-5000',
  'fortigate-6000',
  'fortigate-7000',
  'forticarrier',
]);
const FORTIGATE_VM_GUIDE = 'https://docs.fortinet.com/document/fortigate/8.0.0/fortigate-virtualization';

const raw = await readFile(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

let touched = 0;
for (const p of data.products) {
  const variants = (p.deploymentVariants || []).map((v) => v.toLowerCase());
  const hasVm = variants.some((v) =>
    v === 'vm' || v.includes('public cloud') || v === 'private cloud' || v === 'container'
  );
  if (!p.links) p.links = {};
  if (hasVm) {
    p.links.vmInstaller = FORTIOS_FAMILY.has(p.id) ? FORTIGATE_VM_GUIDE : VM_HUB;
    touched++;
  } else {
    // Leave undefined / null for appliance-only products.
    if ('vmInstaller' in p.links) delete p.links.vmInstaller;
  }
}

await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`vmInstaller set on ${touched} products`);
