# Brand audit — 21 client brands (2026-11-25)

Seven parallel agents audited each brand's public design system, live site (own headless Playwright) and brand pages, following [BRIEF.md](BRIEF.md). One file per brand, each with a summary, a **Proposed tokens** JSON block (colours, type, radius, button/input/dropdown/tab states, elevation, spacing), sources with confidence, and a comparison with the current Figma mode.

## At a glance

| Brand | Theme | Primary | Secondary | Header | UI font → Figma fallback | Btn radius | Btn md height | Tabs |
|---|---|---|---|---|---|---|---|---|
| [IBM](ibm.md) | light | `#0F62FE` ✓ | `#393939` ✗ | `#161616` | IBM Plex Sans (free) | 0 | 40 | underline |
| [JPMorgan Chase](jpmorganchase.md) | light | `#1B7F9E` ✗ | `#936846` ✓ | `#4B2C1D` | Open Sans (free) | 4 | 28 | underline |
| [American Airlines](americanairlines.md) | light | `#006DC0` ✗ | `#C30019` ✓ | white | American Sans → Source Sans 3 | 4 | 36 | underline |
| [Sanofi](sanofi.md) | light | `#7A00E6` ✓ | `#23004C` ✓ | `#7A00E6` | Sanofi Sans → Work Sans | 4 | 44 | underline |
| [Cisco](cisco.md) | light | `#0A60FF` ✗ | `#07182D` ✗ | white | Inter (free) | 48 (pill) | 48 | pill |
| [Adobe](adobe.md) | light | `#3B63FB` ✗ | `#292929` ✗ | white | Adobe Clean → Source Sans 3 | pill | 32 | underline |
| [Shield AI](shieldai.md) | **dark** | `#FF6343` ✗ | `#1F1F1F` ✗ | `#050506` | KH Teka Mono → IBM Plex Mono | 0 | 48 | boxed |
| [Merck Group](merckgroup.md) | light | `#503291` ✓ | `#EB3C96` ✓ | `#503291` | Lato (free) | 4 | 40 | boxed |
| [Eli Lilly](elililly.md) | light | `#D31710` ≈ | `#191919` ✗ | `#191919` | Ringside Sans → Libre Franklin | 32 (pill) | 40 | pill |
| [Maersk](maersk.md) | light | `#141414` ✗ | `#42B0D5` ✓ | white | Maersk Text → Source Sans 3 | 6 | 40 | underline |
| [Hyundai Motor Group](hyundaimotorgroup.md) | **dark** | `#FFFFFF` ✗ | `#01428B` ✗ | `#000000` | Spoqa Han Sans Neo → Noto Sans KR | pill | 54 | underline |
| [Bentley Systems](bentleysystems.md) | light | `#0071B8` ✗ | `#156B54` ✗ | white | Noto Sans ✓ | 4 | 36 | underline |
| [Siemens](siemens.md) | **dark** | `#00CCCC` ✗ | `#009999` ✓ | `#000028` | Siemens Sans Pro → Source Sans 3 | 2 | 32 | underline |
| [KLM](klm.md) | light | `#0077CD` ✗ | `#00A1DE` ✓ | white | Universal Sans → Figtree | 4 | 44 | underline |
| [Southwest](southwest.md) | light | `#304CB2` ✓ | `#FFBF27` ✓ | white | Southwest Sans → Nunito Sans | 2 | 48 | underline |
| [DoorDash](doordash.md) | light | `#EB1700` ✓ | `#191919` ✓ | white | DD Norms → Plus Jakarta Sans | pill | 40 | underline |
| [UPS](ups.md) | light | `#FFC400` ✗ | `#351C15` ✓ | white | Roboto (free) | 40 (pill) | 46 | underline |
| [Microsoft](microsoft.md) | light | `#0F6CBD` ✓ | `#0078D4` ✗ | white | Segoe UI → Open Sans | 4 | 32 | underline |
| [Sonatype](sonatype.md) | light | `#2D36EC` ✗ | `#090B2F` ✗ | `#090B2F` | FK Grotesk → Hanken Grotesk | 10 | 40 | underline |
| [SAP](sap.md) | light | `#0070F2` ✓ | `#0064D9` ✗ | white | 72 → Inter | 8 | 36 | underline |
| [Salesforce](salesforce.md) | light | `#066AFE` ✗ | `#032D60` ✓ | white | system-ui → Inter | pill | 32 | underline |

✓ matches the current Figma mode · ≈ close · ✗ differs (see each file's "Differs from current Figma").

**Score:** primary matches in 7/21, secondary in 11/21. Every brand differs from the copied AkzoNobel shape (radius, button height, font).

## Patterns worth knowing
- **Primary ≠ logo colour** is common: Adobe (red is logo-only, buttons are blue), UPS (gold buttons, brown logo), Southwest (yellow primary button, blue for links/selection), Maersk (near-black buttons), Cisco and KLM (navy is text, not CTA), Hyundai Motor Group (white-pill buttons on black).
- **Pills vs square:** pills — Adobe, Cisco, DoorDash, Lilly, UPS, Salesforce, Hyundai MG; square/near-square — IBM, Shield (0), Siemens, Southwest (2).
- **Free fonts usable as-is:** IBM Plex Sans, Open Sans (JPMorgan), Inter (Cisco), Lato (Merck), Roboto (UPS), Noto Sans (Bentley). Everything else needs a Google fallback (listed above).
- **Dark products:** Shield, Siemens (iX dark default), Hyundai Motor Group. Our modes are all light today.
- **White headers:** 12 brands use a white top bar, while our plugin banner is always brand-coloured with a white logo.

## Decisions needed before applying
1. **Banner:** keep a brand-coloured banner for all (current pattern), or follow brands with white headers (dark logo needed)?
2. **Dark themes** for Shield, Siemens, Hyundai MG — build them on the Gap/Bridge (dark) shape instead of AkzoNobel?
3. **Hyundai:** the group site (black/white, `#01428B`) or the Hyundai car brand (`#002C5F`) — which is the client?
4. **JPMorgan Chase:** J.P. Morgan teal/brown (Salt default, recommended for B2B) or Chase consumer blue?
5. **Merck Group:** purple "Shake" theme (current) or Liquid's default blue `#0F69AF`/`#2DBECD`?
6. **Sonatype:** marketing look (`#2D36EC`, FK Grotesk→Hanken) or shipped product UI (`#0F4FBD`, Open Sans, 6px)?

## Applied to Figma (2026-11-25)
Applied to the 21 Brand UI modes in Project-Bluebird-UI-backup, using these defaults for the open decisions:
1. **Banner:** brand-coloured for every brand, read from a new per-brand banner colour in `<id>/color/brand/primary` (`surface/brand-banner` now aliases it). White-header brands got a dark or brand banner: AA `#0078D2`, Cisco `#07182D`, Adobe red `#EB1000`, Maersk `#00243D`, KLM `#072B45`, SAP `#131E29`, Salesforce `#032D60`; the others use their own header colour.
2. **Dark themes:** Shield, Siemens and Hyundai MG rebuilt from the Gap (dark) mode.
3. **Hyundai:** the Group look (black, white pill buttons, `#01428B`).
4. **JPMorgan Chase:** J.P. Morgan teal `#1B7F9E` + brown.
5. **Merck Group:** purple theme kept.
6. **Sonatype:** marketing look.

What changed per brand:
- **Foundations `<id>/*`:** primary ramp regenerated around the audited CTA colour, secondary ramp around the audited secondary, text/border/subtle greys from the audit, status ramps from the audited success/warning/error/info, fonts set to the free Google fallback.
- **Brand UI mode:** 38 shape tokens (button/input/menu/chip/card radius mapped to the nearest Semantics radius, button/tab weights), button font → UI font, banner, focus ring (nearest brand colour to the audited focus colour), dark text on accent where white fails (UPS, Shield, Siemens, Hyundai MG), link colour → info blue for UPS.
- All 21 modes pass 4.5:1 for on-accent, body, link, banner and muted text.

Not applied (no per-brand token exists yet): button heights and padding, input heights, shadows, hover/pressed colours as exact hex (hover/pressed use the generated ramp), tab style (underline vs pill), uppercase labels (JPMorgan, Shield). Fonts swapped for availability: Shield UI Inter (Inter Tight missing; full mono UI wrapped badly), Bentley mono JetBrains Mono, single-weight display faces (Anton, Archivo Black, Questrial) skipped.

## Round 2 — 16 more brands (2026-11-25)
Audited by 6 agents (files `gevernova`, `github`, `hertz`, `optum`, `meta`, `amazon`, `vanguard`, `atlassian`, `omnicom`, `delta`, `lowes`, `tmobile`, `verizon`, `anthropic`, `apple`, `figma`.md) and built into Brand UI. Figma caps a collection at **40 modes**, so at the user's request Richemont, Disney, Fiskars, Adecco and AkzoNobel modes were deleted (their Foundations namespaces and logo variants remain; `akzonobel/*` is kept as the shape template).

| Brand | Mode | Accent (buttons) | Banner | Font | Btn radius |
|---|---|---|---|---|---|
| GE Vernova | GEVernova | `#005E60` (lime `#C8FF08` secondary) | `#005E60` | Inter / Barlow Condensed | pill |
| GitHub | GitHub | `#1F883D` | `#25292E` | Mona Sans | 6 |
| Hertz | Hertz | `#FFCC00`, dark text | `#FFCC00`, dark text | Open Sans | pill |
| Optum | Optum | `#3D3C38` (orange `#FF612B` secondary) | `#D74120` | Source Sans 3 / Source Serif 4 | pill |
| Meta | Meta | `#0064E0` | `#0064E0` | Inter / Montserrat | pill |
| Amazon | Amazon | `#006CE0` (Cloudscape) | `#0F141A` | Open Sans | pill |
| Vanguard | Vanguard | `#C20029` | `#C20029` | Figtree | pill, square inputs/cards |
| Atlassian | Atlassian | `#1868DB` | `#1868DB` | Inter | 6 |
| Omnicom GS | Omnicom | `#262250` (orange `#FFA300`) | `#262250` | Montserrat | 0 |
| Delta | DeltaAirLines | `#E01933` | `#001122` | Source Sans 3 / Fira Sans Condensed | 4 |
| Lowe's | Lowes | `#0072CE` | `#012169` | Plus Jakarta Sans | 8 |
| T-Mobile | TMobile | `#E20074` | `#E20074` | Inter / Manrope | 4 |
| Verizon | Verizon | `#000000` (red `#EE001E` secondary) | `#E10014` | Inter | pill |
| Anthropic | Anthropic | `#141413` (clay `#D97757` secondary) | `#BA5B3C` | Inter / Source Serif 4 | 8 |
| Apple | Apple | `#0071E3` | `#1D1D1F` | Inter | pill |
| Figma | Figma | `#0768CF` (editor blue `#0D99FF` too light for white text) | `#1E1E1E` | Inter | 5 |

All 16 pass 4.5:1 for button text, body, links, banner and muted text (Hertz, Vanguard and Figma muted greys darkened). Logos: 16 real SVG variants (Wikimedia, worldvectorlogo, Simple Icons, the OGS site). Apple and GitHub require written permission to use their marks.

In modes with dark text on the accent (Hertz, UPS, Shield, Siemens, Hyundai MG), chips on fixed colours (principle, rating, change-status, Jira glyphs, change-count, redline/anatomy labels, intro arrow/skip) stay white, and the app-header wordmark follows `Banner/Text`.

## Confidence notes
Sites that blocked headless browsers were **not** bypassed: adobe.com, sap.com, salesforce.com, merckgroup.com, aa.com (except one page), klm.com, ups.com and doordash.com (Internet Archive copies of 18–24 Nov 2026 used), chase.com (partial). Those brands lean on published design-system packages or docs. Lowest-confidence areas: Hyundai MG states/forms, Shield inputs/dropdowns, AA inputs, KLM sizes (from spec images), Cisco inputs. No brand publishes a reachable logo clear-space rule.
