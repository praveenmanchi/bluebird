# DoorDash — brand UI audit

## Summary
DoorDash's consumer web app runs on its internal **Prism** design system. Prism is not published, but its full token set (`--base-*`, `--usage-*`, `--comp-*`) ships inline in doordash.com's HTML.
What makes it recognisable:
- **Pill buttons** (radius 9999) in **DoorDash Red `#EB1700`** with white **bold (700)** labels.
- Near-black **`#191919`** as the secondary/brand-dark colour, also used for every "selected" state (toggles, switches, chips).
- Light-grey filled controls (`#F1F1F1` tertiary buttons, `#F7F7F7` filled inputs with 8px radius).
- Neutral greys with no tint.
- The **DD Norms** typeface (a TT Norms Pro derivative), whose **body text is medium weight 500**.

The UI is light. Marketing heroes go full red with a white logo and condensed black uppercase headlines.

## Proposed tokens
```json
{
  "id": "doordash",
  "theme": "light",
  "colors": { "primary": "#EB1700", "primaryHover": "#D91400", "primaryActive": "#B71000", "secondary": "#191919",
              "accent": ["#622EEA", "#00838A", "#FFF0ED"], "link": "#4969F5", "focusRing": "#191919",
              "headerBg": "#FFFFFF", "headerText": "#191919", "pageBg": "#FFFFFF", "surface": "#FFFFFF", "border": "#E4E4E4",
              "textPrimary": "#191919", "textSecondary": "#606060", "textDisabled": "#B2B2B2",
              "success": "#00832D", "warning": "#A36500", "error": "#D91400", "info": "#00838A",
              "neutralRamp": { "0": "#F7F7F7", "5": "#F1F1F1", "10": "#D6D6D6", "20": "#C4C4C4", "30": "#B2B2B2", "40": "#9F9F9F",
                               "50": "#8B8B8B", "60": "#767676", "70": "#606060", "80": "#494949", "90": "#313131", "95": "#242424", "100": "#191919" } },
  "typography": { "uiFamily": "DD Norms", "displayFamily": "DD Norms", "monoFamily": null, "proprietary": true,
                  "googleFallbackUi": "Plus Jakarta Sans", "googleFallbackDisplay": "Plus Jakarta Sans",
                  "bodySize": 16, "bodyLineHeight": 22, "weights": { "regular": 500, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [32, 24, 20, 18, 16] },
  "radius": { "button": 9999, "input": 8, "card": 12, "chip": 4, "modal": null },
  "button": { "height": { "sm": 32, "md": 40, "lg": 48 }, "paddingX": 12, "minWidth": null, "fontSize": 16, "fontWeight": 700, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#EB1700", "text": "#FFFFFF", "hoverBg": "#D91400", "activeBg": "#B71000", "disabledBg": "#F7F7F7", "disabledText": "#B2B2B2" },
              "secondary": { "bg": "#F1F1F1", "text": "#191919", "border": "#F1F1F1", "hoverBg": "#D6D6D6" },
              "ghost": { "text": "#191919", "hoverBg": "#F3F3F3" },
              "focus": { "style": "border/outline in #191919 at 66% alpha (#191919A8)", "width": null, "offset": null, "color": "#191919" } },
  "input": { "height": 40, "border": "#F7F7F7", "borderWidth": 1, "radius": 8, "placeholder": "#606060", "focusBorder": "#191919", "errorBorder": "#D91400" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 12, "itemHeight": null, "itemHoverBg": "#F7F7F7", "itemSelectedBg": "#F1F1F1", "itemSelectedText": "#191919",
                "shadow": "0 4px 12px 0 rgba(25,25,25,0.2)" },
  "tabs": { "style": "underline", "activeIndicator": "#191919", "activeText": "#191919" },
  "elevation": { "card": "0 1px 4px 0 rgba(25,25,25,0.2)", "menu": "0 4px 12px 0 rgba(25,25,25,0.2)", "modal": "0 8px 24px 0 rgba(25,25,25,0.2)" },
  "spacingBase": 4,
  "iconStyle": "Prism icon set: rounded, mostly outline glyphs at 16/20/24px (button icon sizes); no public library name"
}
```

### Notes behind the values (Prism token names)
- **Brand:** `--usage-color-brand-primary #EB1700`, `--usage-color-brand-secondary #191919`. Also DashPass `#622EEA` and highlight `#00838A`.
- **Primary action** (`--usage-color-action-primary-*` = `brand-doordash-60/70/80`): `#EB1700` / hover `#D91400` / pressed `#B71000`, text white. Subdued variant: `#FFF0ED`-range backgrounds.
- **Secondary action** (`--usage-color-action-secondary-*`): solid **`#191919`** / hover `#242424` / pressed `#313131`, white text. Use this if Bluebird needs a filled dark button.
- **Tertiary button** (`--comp-color-button-tertiary-*`): `#F1F1F1` → hover `#D6D6D6` → pressed `#C4C4C4`, text `#191919`. Its *selected* state is `#191919` with white text. This grey pill is what I mapped to our "secondary".
- **Flat/ghost** (`--comp-color-button-flat-*`, `ghost-*`): transparent, hover `#1919190D` (≈`#F3F3F3`), pressed `#1919191A`. Brand ghost text is `#EB1700`.
- **Disabled** (all buttons): background `#F7F7F7`, text and icon `#B2B2B2`.
- **Button size and type:**
  - `--comp-border-radius-button: 9999px`.
  - Padding 12 (sm/md) and 16 (lg). Icons 16/20/24. Gap 4/4/8.
  - Label 14/16/18 px, **weight 700** (`--comp-type-button-label-*`).
  - Measured on the page: 40px tall with 16/22 bold labels, and a 32px small variant with 14/20 labels.
  - The "elevated" white variant adds `0 2px 8px rgba(25,25,25,.2)`.
- **Field:**
  - `--comp-border-radius-field-*: 8px`, `--comp-border-width-field-default: 1px`.
  - **Filled style:** background `#F7F7F7` with a border of the same colour. Hover `#F1F1F1`, pressed `#D6D6D6`.
  - Error background `#FFF0ED`. Placeholder `#606060`. Labels are bold (700) 14/16/18.
  - Focus border and error border are not tokenised separately; I used `border-selected #191919` and `negative #D91400`.
  - Field height is assumed equal to the medium button (40); I did not measure it.
- **Focus:**
  - `--usage-color-border-focused: #191919A8` (inverse `#FFFFFFA8`).
  - The archived page showed the browser default outline on the focused link, so ring width and offset are unverified.
- **Neutrals and text:**
  - `--usage-color-border-default #E4E4E4`.
  - Text `#191919`, subdued `#606060`, disabled `#B2B2B2`.
  - Background `#FFFFFF`, subdued `#F7F7F7`, strong `#F1F1F1`, inverse `#191919`.
- **Status:** positive `#00832D`, warning `#A36500`, negative `#D91400`. Strong variants: `#006A25`, `#784200`, `#B71000`.
  - Prism has no blue "informational" colour; informational banners are neutral `#191919`/`#494949`. I mapped info to highlight teal `#00838A`.
  - Tag backgrounds: positive `#E7FBEF`, warning `#FFF6D4`, negative/deal `#FFF0ED`, highlight `#ECFCFC`.
- **Selection controls** (switch, toggle, checkbox): selected `#191919`. Switch track off `#D6D6D6`, thumb white.
- **Radii:** x-small 2 / small 4 / medium 8 / large 12 / x-large 16 / xx-large 24 / full 9999.
  - By component: tag 4, banner/toast/tooltip 8, list-cell container 12, chat 20.
  - Prism has no modal token (null). If needed, use 16 (x-large); that is my guess.
- **Elevation:** `--usage-elevation-1..6` = `0 1/2/4/4/6/8px 4/8/12/16/20/24px rgba(25,25,25,.2)`.
- **Spacing:** 2/4/8/12/16/24/32/40/48 → base 4.
- **Typography:**
  - `--usage-font-family-default/brand/condensed: DD Norms`. Weights 400–800 are loaded.
  - Body medium is **16/22 weight 500**; body small 14/20, weight 500.
  - Display: 32/40 (700); display-medium 24/28 (700).
  - Title: title-large 20/24 (700); title-medium 18/22 (700).
  - Labels are 700. Tab labels: unselected 500, selected 700.
  - Marketing headings measured 32–40px at **weight 800**. The hero H1 uses `TTNormsProCond-Blk` (condensed black, uppercase).
  - DD Norms is proprietary. Suggested Google fallback: **Plus Jakarta Sans** (or Figtree) at 500/700. For condensed hero type: **Barlow Condensed** 800.
- **Header:** the consumer app top bar is white with the red logo and `#191919` text. This is from Prism defaults and the archived page's elevated/white buttons; I could not observe the logged-out feed header live. The hero shows **white logo on red**, so a red `#EB1700` banner with the white logo is also on-brand.
- **Tabs:** only the label weights (500/700) are tokenised. The underline style and colour are my best guess (`#191919`).

### Logo
- **Seen:** the DoorDash "dash" mark and wordmark in **white on `#EB1700`** (homepage hero), and red on white elsewhere. Both orientations are in active use.
- **Not checked:** DoorDash's brand page for clear-space rules (also behind Cloudflare).

## Sources
| What | URL | Type | Confidence |
|---|---|---|---|
| Live site (blocked) | https://www.doordash.com/ — Cloudflare "Just a moment…" challenge in headless Chromium. about./merchants./developer./dasher.doordash.com all return 403. Not bypassed. | — | — |
| Full Prism token set (`--base-color-*`, `--usage-*`, `--comp-*`) | https://web.archive.org/web/20261118024347id_/https://www.doordash.com/ — inline styled-components CSS, resolved with my own script | Design-system tokens shipped in production HTML (18 Nov 2026 capture) | high |
| Button height, padding, label font, hover colour, elevated variant | https://web.archive.org/web/20261118024347/https://www.doordash.com/ rendered in my own Playwright | Archived live site, computed style | high |
| Prism public docs / npm package | none found (npm search "doordash prism": nothing) | — | — |
| Input height, focus ring width, tab style, modal radius, menu item height | not tokenised or not observable | Inference | low |
| Google font fallbacks | — | Judgement | low |

## Differs from current Figma
- **Current:** primary `#EB1700`, secondary `#191919`.
- **Both match Prism exactly:** `--usage-color-brand-primary` and `--usage-color-brand-secondary`. Keep them.
- **Fill in the AkzoNobel-copied rest:**
  - Hover `#D91400`, pressed `#B71000`.
  - **Pill buttons** (9999 radius), labels **700**.
  - Grey `#F1F1F1` tertiary/secondary pill.
  - Filled `#F7F7F7` inputs with 8px radius.
  - Selected states in `#191919`.
  - Neutral ramp `#F7F7F7` → `#191919` with border `#E4E4E4`.
  - Status colours: success `#00832D`, warning `#A36500`, error `#D91400`.
  - Link blue `#4969F5`.
  - Font: Noto Sans → DD Norms, with Plus Jakarta Sans as the Figma fallback. Body weight 500.
