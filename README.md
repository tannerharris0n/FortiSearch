# 🛡️ FortiSearch

> Fortinet product intelligence for SEs and practitioners. Fuzzy search the full Fortinet catalog with firmware versions, deployment variants, EOL status, and doc links in one place.

[![Update firmware data](https://github.com/tannerharris0n/FortiSearch/actions/workflows/update-firmware.yml/badge.svg)](https://github.com/tannerharris0n/FortiSearch/actions/workflows/update-firmware.yml)
[![Deploy](https://github.com/tannerharris0n/FortiSearch/actions/workflows/deploy.yml/badge.svg)](https://github.com/tannerharris0n/FortiSearch/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **⚠️ Independent project — not a Fortinet GitHub account.**
>
> This repository is **not** a Fortinet GitHub account, repository, or product. FortiSearch is built and maintained independently by [Tanner Harrison](https://tannerharrison.com) and is **not** endorsed, sponsored, reviewed, or supported by Fortinet, Inc. Views and code here are the maintainer's own and do not represent any employer. All Fortinet product names, trademarks, and logos are property of Fortinet, Inc. Product names, firmware versions, and documentation links are pulled from Fortinet's public docs and lifecycle pages for convenience — the authoritative source is always [docs.fortinet.com](https://docs.fortinet.com) and the [Fortinet support portal](https://support.fortinet.com).

## What it does

FortiSearch is a static catalog front-end for the entire Fortinet product portfolio. Type the product line you half-remember, the tag you care about, or the deployment model you need, and the right card surfaces with versions, doc links, and lifecycle status. No login, no backend, no marketing fluff.

It's built for the field practitioner conversation: "what firmware are we on for FortiAuthenticator", "is FortiSRA still a thing", "give me the FortiADC datasheet" all answered in two keystrokes.

## Features

- Fuzzy search across product names, tags, deployment variants, category, and subcategory (Fuse.js, threshold 0.3).
- Live result count, clear-on-click, autofocus.
- Category filter rail with EOL callouts per category.
- Product cards with category accent stripe, firmware freshness color, deployment variant chips, EOL/legacy badges.
- Slide-over detail panel: firmware GA/Recommended/Feature versions with copy-to-clipboard, deployment variants, doc links (Admin Guide, Release Notes, Cookbook, Datasheet, Firmware Download), cloud-specific docs, lifecycle status, tag chips, data-checked-on date.
- Cloud-managed products show a "Cloud / SaaS" pill instead of a firmware version, with a "Cloud-managed — no firmware versioning" note in the detail panel.
- Weekly GitHub Actions scraper refreshes firmware data automatically from docs.fortinet.com.
- Cloudflare Pages-ready (`npm run build` -> `dist/`).
- Plain React + Vite, no TypeScript, no backend.

## Screenshots

> _placeholder: screenshots go here once the site is live_

- `screenshots/landing.png` — search + category rail + result grid
- `screenshots/detail.png` — slide-over with firmware versions and doc links
- `screenshots/mobile.png` — single-column view at 375px wide

## Data coverage

Catalog is sourced from the docs.fortinet.com A-Z product index and verified against the Fortinet product lifecycle page. EOL and legacy products are intentionally retained so customers running them can still get a doc trail.

### By category (UI grouping)

| UI category | Notable members |
| --- | --- |
| **Secure Networking** | FortiGate / FortiOS, FortiGate 5000/6000/7000, FortiCarrier, FortiManager, FortiAIOps, FortiConverter, FortiSwitch, FortiAP / FortiWiFi, FortiNAC-F, FortiExtender, FortiADC, FortiHypervisor, FortiBridge, FortiTap, FortiSAT, FortiGuest, Overlay-as-a-Service |
| **Unified SASE** | FortiSASE, FortiSASE Sovereign, FortiBranchSASE, FortiProxy, FortiMonitor |
| **Cloud & DevSecOps** | Lacework FortiCNAPP, FortiDevSec, FortiDAST, FortiCNP, FortiCWP, FortiCASB, FortiAppSec Cloud, FortiWeb |
| **Security Operations** | FortiAnalyzer, FortiAnalyzer BigData, FortiSIEM, FortiSOAR, SOC-as-a-Service, FortiTIP Cloud, FortiInsight, FortiPolicy, FortiPortal, FortiTelemetry |
| **Identity & Access** | FortiAuthenticator, FortiAuthenticator Cloud, FortiToken, FortiIdentity Cloud, FortiPAM |
| **Email & Data Protection** | FortiMail, FortiPhish, Security Awareness and Training, FortiDLP, FortiData |
| **Endpoint & EDR** | FortiClient, FortiClient Cloud, FortiEDR / FortiXDR, FortiEndpoint |
| **Early Detection** | FortiSandbox, FortiNDR, FortiNDR Cloud, FortiDeceptor, FortiRecon, FortiIsolator |
| **Voice & Surveillance** | FortiVoice, FortiFone, FortiCamera, FortiRecorder, FortiCentral |
| **Legacy / EOL** | FortiNAC (legacy), FortiWAN, FortiTester (EOL), FortiSRA (EOL), FortiDB, FortiCache, FortiWLM, FortiBalancer, AscenLink |

EOL callouts:

- **FortiSRA** is EOL. Migration paths are FortiClient ZTNA (end-user remote access) and FortiPAM (privileged session control).
- **FortiTester** is EOL with no replacement product.
- **FortiBalancer** and **AscenLink** are EOL — migrate to FortiADC and FortiGate SD-WAN respectively.
- **FortiCNP** and **FortiCWP** are being consolidated into Lacework FortiCNAPP.
- **FortiNAC (legacy)** is being phased out in favor of **FortiNAC-F**.

Cloud-only variants (FortiGate Public Cloud, FortiAnalyzer Cloud, etc.) are **not** separate entries. They live as values in the parent product's `deploymentVariants` field and as links in `cloudDocs`.

## How data stays current

A GitHub Action (`.github/workflows/update-firmware.yml`) runs every Sunday at 06:00 UTC. It:

1. Loads `src/data/products.json`.
2. For each product with a `links.docs` slug, fetches `https://docs.fortinet.com/product/<slug>` and parses the highest semver token from the page.
3. Updates `firmware.ga` when the scraped value differs from what's stored, stamps `firmware.lastUpdated`, and bumps `firmware.lastChecked` for every product checked (success or fail — so the UI freshness indicator stays honest).
4. If `products.json` changed, commits directly to `main` with `chore: firmware data update YYYY-MM-DD`.

Manual runs are supported via the **Actions** tab → "Update firmware data" → **Run workflow**, with a `mode` input (`direct` or `pr`):

- `direct` — pushes to main when changes are detected (default for scheduled runs).
- `pr` — opens a PR titled `chore: firmware data update` for review.

SaaS/cloud-only products carry `firmware: null` in the JSON and are skipped by the scraper entirely.

## Firmware version fields

Each non-SaaS product carries three firmware tracks pulled from Fortinet's official guidance:

- **GA** — the highest released version on the current major train. What "latest" usually means.
- **Recommended** — Fortinet's PSIRT-recommended stable version. Sometimes lags GA by a point release while Fortinet validates against the install base. **This is what you should generally deploy.** Sourced from the [Recommended release for FortiOS KB article](https://community.fortinet.com/t5/FortiGate/Technical-Tip-Recommended-release-for-FortiOS/ta-p/227178) (and the per-product equivalents).
- **Feature** — the newest feature-train release. New capabilities first, larger chance of regressions. For lab and validation work.

Plus `lastChecked` (when the scraper last saw this entry) and `lastUpdated` (when the GA value last changed). The card badge color reflects `lastChecked` age: green ≤7d, amber 8-30d, red >30d.

### Current state of firmware data

The initial commit only included **hand-verified firmware for the FortiOS family** (FortiGate, FortiGate 5000/6000/7000, FortiCarrier) — `ga` 7.6.6, `recommended` 7.6.6, `feature` 8.0.0 as of 2026-05-13. Every other product carries `firmware.ga: null` and renders a "version pending" badge until the weekly scraper populates it. This is intentional — the original catalog seed used invented version numbers and was corrected per the original spec's "use null if unsure" rule. Manually verify any specific version against [docs.fortinet.com](https://docs.fortinet.com) before relying on it.

### Authoritative sources

The detail panel includes direct links for cross-referencing:

- **Docs Hub** — `docs.fortinet.com/product/<slug>` for the product's full doc tree.
- **4-D Architecture Guides** — the [Fortinet 4-D reference architectures](https://docs.fortinet.com/4d-resources) (Define, Design, Deploy, Demo) per solution area: NGFW, SD-WAN, SASE, ZTNA, Switching, Wireless, IAM, WAF, ADC.
- **Lifecycle status** — the [Fortinet Product Life Cycle portal](https://support.fortinet.com/Information/ProductLifeCycle.aspx) for EOO / EOS / LSED dates.
- **Firmware Download** — the support portal (`support.fortinet.com/Download/FirmwareImages.aspx`); requires a Fortinet support login.

## Local development

```bash
git clone https://github.com/tannerharris0n/FortiSearch
cd FortiSearch
npm install
npm run dev      # starts Vite on http://localhost:5173
npm run build    # writes dist/
npm run preview  # serves dist/ for sanity check
npm run update-products  # run the scraper locally (Node 18+ required)
```

No env vars, no backend. The scraper writes to `src/data/products.json` in place.

## Adding or updating a product

Edit `src/data/products.json` directly. Required schema:

```json
{
  "id": "kebab-case-id",
  "name": "Display Name",
  "shortDescription": "One-line practitioner description.",
  "category": "Secure Networking | Unified SASE | Security Operations",
  "subcategory": "Sub-grouping shown on cards",
  "uiCategory": "Pill label from the uiCategories list",
  "tags": ["search keyword", "another", "..."],
  "deploymentVariants": ["Appliance", "VM", "Public Cloud", "..."],
  "firmware": {
    "ga": "x.y.z",
    "recommended": "x.y.z",
    "feature": "x.y.z",
    "lastChecked": "YYYY-MM-DD",
    "lastUpdated": null
  },
  "eol": {
    "status": "active | legacy | eol",
    "date": null,
    "notes": null,
    "lifecycleUrl": "https://www.fortinet.com/support/support-services/product-life-cycle-support"
  },
  "links": {
    "productPage": null,
    "docs": "https://docs.fortinet.com/product/<slug>",
    "releaseNotes": null,
    "adminGuide": null,
    "datasheet": null,
    "firmwareDownload": "https://support.fortinet.com/Download/FirmwareImages.aspx",
    "cookbookSearch": "https://docs.fortinet.com/fortinet-cookbook"
  }
}
```

Notes:

- **Cloud / SaaS products**: set `firmware: null` (the literal null). The card shows a "Cloud / SaaS" pill and the detail panel shows the "Cloud-managed" note.
- **Doc slug convention**: the trailing segment of `links.docs` (e.g. `fortigate`, `fortinac-f`). The scraper uses this to fetch the docs page.
- **Cloud variants**: don't create a separate entry for FortiGate Public Cloud etc. — add `Public Cloud` to `deploymentVariants` and the cloud-specific guide URL under `cloudDocs`.
- **`uiCategory`**: must be one of the labels in `uiCategories` so it surfaces under a filter pill.

## Integration with adhd-tools

FortiSearch is built to drop into the [adhd-tools](https://tools.tannerharrison.com) toolbox the same way [FortiCLI](https://tools.tannerharrison.com/forticli) does:

1. Deploy FortiSearch to a subdomain (e.g. `search.tannerharrison.com`).
2. In `adhd-tools/src/registry.js`, add:

   ```js
   {
     id: 'fortisearch',
     path: 'https://search.tannerharrison.com',  // or '/fortisearch' if iframed in
     label: 'FortiSearch',
     icon: '🛡️',
     description: 'Fortinet product catalog with firmware versions, deployment variants, and doc links.',
     category: 'fortinet',
     external: true,
   },
   ```

3. The dashboard card and nav link are auto-generated from the registry.

The standalone FortiSearch nav (`src/components/Nav.jsx`) already includes back-links to the toolbox so users land in the right place when they came in via a direct URL.

## Deployment (Cloudflare Pages)

1. Connect the GitHub repo to Cloudflare Pages.
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Node version: `20`
5. Optionally bind a custom domain (e.g. `search.tannerharrison.com`).

The `.github/workflows/deploy.yml` workflow is informational — it validates the build on every push to `main` and uploads an artifact. If you'd rather drive deploys from GitHub Actions instead of Cloudflare's GitHub integration, uncomment the `cloudflare/pages-action@v1` block and set `CF_API_TOKEN` and `CF_ACCOUNT_ID` repo secrets.

## Limitations

- **Firmware downloads still need a Fortinet support portal login.** The "Firmware Download" link sends you to support.fortinet.com — FortiSearch can't mirror the binaries.
- **The scraper depends on Fortinet's public HTML structure.** If docs.fortinet.com restructures its product pages, the version parser may need updating. Failures are logged and don't overwrite known-good data.
- **No PSIRT/CVE tracking yet.** Planned next pass: pull Fortinet PSIRT advisories per product and surface a security badge on affected versions.
- **`recommended` and `feature` versions** are hand-curated. The scraper only refreshes `ga`. Expanding the scraper to walk the recommended-release KB articles is on the roadmap.
- **Initial firmware coverage is FortiOS family only.** Every other product is `version pending` until the weekly scraper run populates it. See [Current state of firmware data](#current-state-of-firmware-data).
- **Catalog snapshot is May 2026.** Quarterly hand-review keeps subcategory/lifecycle data accurate; the weekly scraper keeps versions accurate.

## What does it cost to run?

For the maintainer: **$0/month** under typical use.

| Layer | Cost |
| --- | --- |
| GitHub Actions (weekly scraper) | **Free.** Public repos get unlimited Actions minutes. Each scraper run is ~2-3 min on `ubuntu-latest`. |
| Cloudflare Pages hosting | **Free.** Free tier covers 500 builds/month, 100k requests/day, unlimited bandwidth. FortiSearch will use a handful of builds/month and minimal traffic. |
| Anthropic / LLM API | **$0.** FortiSearch makes no LLM calls — it's a static site over JSON. (FortiCLI is the BYOK LLM tool; FortiSearch is not.) |
| Domain | Whatever you already pay for `tannerharrison.com`. Subdomain DNS via Cloudflare is free. |

If the repo is made **private**, GitHub Actions still falls inside the 2,000-minute/month free tier (weekly runs use ~12 min/month). The only way to incur cost is exceeding Cloudflare's free request quota, which would require a large-scale traffic event.

The scraper hits ~70 Fortinet public pages per run. That's well under any rate limit Fortinet enforces; if they ever pushed back, the scraper would log failures and preserve prior data without crashing the site.

## License & disclaimer

[MIT](LICENSE).

**FortiSearch is an independent project.** It is **not** a Fortinet GitHub account, product, or service. The maintainer ([Tanner Harrison](https://tannerharrison.com)) is not speaking on behalf of Fortinet, Inc. This project is not affiliated with, endorsed by, sponsored by, or supported by Fortinet. All Fortinet product names, trademarks, logos, and documentation are the property of Fortinet, Inc. For authoritative product information, contact your Fortinet account team or visit [fortinet.com](https://www.fortinet.com).
