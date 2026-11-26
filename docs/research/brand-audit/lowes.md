# Lowe's — brand UI audit

Audited 2026-11-25 (agent-delta-lowes). **lowes.com blocked headless Chromium** (Akamai "Access Denied"). Per the brief I did not try to bypass it. Values come from two sources:
- **The Internet Archive copy of www.lowes.com captured 2026-11-02**, loaded in my own headless Chromium. It exposes Lowe's **Backyard Design System** tokens on `:root` (`--bds-*`, `--bds-name: light`) and the Backyard component classes (`backyard button size--… variant--… color--… shape--…`). I read those tokens and the per-component `--btn-*` variables with `getComputedStyle`.
- **Lowe's own published token package** `@lowes-tech/bds-tokens@1.0.0` on npm (v3/light/_cssvars.css), for shadows.

## Summary
- A white, retail-dense UI. A **navy `#012169` utility bar** sits above a white header (logo, a big rounded search box, ghost icon buttons), with a white category nav below.
- The interactive colour is **Lowe's blue `#0072CE`**: primary buttons, links, focus. The navy `#012169` is the brand and logo blue, used for the top bar and big marketing bands, not for buttons.
- **8px rounded** buttons, search field and image tiles. Cards are 4px with a 1px `#CBD1DD` border. Icon-only buttons are circles.
- The type is proprietary **Fellix** (400/600), with Roboto as the in-house fallback. Button labels are semibold with slight +0.015rem tracking, and headings are 600.
- The neutral ramp is cool blue-grey (`#F4F6FA` … `#17191F`). Text is near-black `#17191F` with alpha secondary and tertiary shades. Status colours are deep: green `#007A33`, red `#971B2F`.

## Proposed tokens
```json
{
  "id": "lowes",
  "theme": "light",
  "colors": { "primary": "#0072CE", "primaryHover": "#0059A4", "primaryActive": "#00386A", "secondary": "#012169", "accent": ["#00A3E0", "#F0B323", "#9BCBEB"], "link": "#0072CE", "focusRing": "#0072CE",
              "headerBg": "#FFFFFF", "headerText": "#17191F", "pageBg": "#FFFFFF", "surface": "#FFFFFF", "border": "#CBD1DD", "textPrimary": "#17191F", "textSecondary": "#45474C", "textDisabled": "#B9BABC",
              "success": "#007A33", "warning": "#F0B323", "error": "#971B2F", "info": "#0072CE",
              "neutralRamp": { "01": "#FFFFFF", "02": "#F4F6FA", "03": "#E5E9F1", "04": "#CBD1DD", "05": "#9EA4B2", "06": "#616670", "07": "#393C44", "08": "#24272D", "09": "#17191F", "10": "#000000" } },
  "typography": { "uiFamily": "Fellix", "displayFamily": "Fellix", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Plus Jakarta Sans", "googleFallbackDisplay": "Plus Jakarta Sans",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 }, "headingScale": [40, 28, 24, 20, 16] },
  "radius": { "button": 8, "input": 8, "card": 4, "chip": null, "modal": null },
  "button": { "height": { "sm": 40, "md": 48, "lg": 56 }, "paddingX": 32, "minWidth": null, "fontSize": 16, "fontWeight": 600, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#0072CE", "text": "#FFFFFF", "hoverBg": "#0059A4", "activeBg": "#00386A", "disabledBg": "#B9BABC", "disabledText": "#B9BABC" },
              "secondary": { "bg": "#FFFFFF", "text": "#0072CE", "border": "#0072CE", "hoverBg": "#D4EBFE" },
              "ghost": { "text": "#0072CE", "hoverBg": "#D4EBFE" },
              "focus": { "style": "outline (solid) outside the button", "width": 2, "offset": 2, "color": "#616670" } },
  "input": { "height": 48, "border": "#616670", "borderWidth": 1, "radius": 8, "placeholder": "#616670", "focusBorder": "#012169", "errorBorder": "#971B2F" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": null, "itemHeight": 32, "itemHoverBg": "#F4F6FA", "itemSelectedBg": null, "itemSelectedText": null, "shadow": "0 5px 5px rgba(0,0,0,0.2), 0 8px 10px rgba(0,0,0,0.14), 0 3px 14px rgba(0,0,0,0.12)" },
  "tabs": { "style": "underline", "activeIndicator": "#0072CE", "activeText": "#17191F" },
  "elevation": { "card": "0 2px 1px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.12)", "menu": "0 5px 5px rgba(0,0,0,0.2), 0 8px 10px rgba(0,0,0,0.14), 0 3px 14px rgba(0,0,0,0.12)", "modal": "0 11px 15px rgba(0,0,0,0.2), 0 24px 38px rgba(0,0,0,0.14), 0 9px 46px rgba(0,0,0,0.12)" },
  "spacingBase": 4,
  "iconStyle": "outline/line icons (grid, tag, bulb, cart, account) in near-black #17191F, 14–24px; filled only for small status glyphs"
}
```

### Notes on the values
- **Colour roles (`--bds-color-*`).**
  - `action-interactive` is `#0072CE`, hover `#0059A4`, pressed `#00386A`. The subdued set is `#F0F8FF`, hover `#D4EBFE`, pressed `#A9D8FD`.
  - `marketing-dark-blue` and `surface-dark-blue` are `#012169`, the logo and utility-bar navy. Other marketing colours: blue `#00A3E0`, light blue `#9BCBEB`, gold `#F0B323`, green `#007A33`, red `#971B2F`.
  - Action green (`#007A33`, hover `#004B1D`) and action red (`#971B2F`, hover `#610816`) exist as alternative button colours.
- **Primary button** (`variant--primary color--interactive`, from computed `--btn-*`): base `#0072CE`, white label, hover `#0059A4`, pressed `#00386A`. Disabled uses the `--btn-disabled` token `rgba(23,25,31,.3)` (≈ `#B9BABC` on white) for both fill and label. One disabled carousel arrow measured `#9EA4B2`, so treat the disabled colour as medium confidence.
- **Shape and size.** `shape--rounded` is the default at 8px (`--bds-border-radius-lg`). The other shapes are `shape--squared` (0) and `shape--circle` (128px, for icon buttons).
  - Heights: sm 40 (padding 20), md 48 (padding 32), lg 56 (padding 32), jumbo 96.
  - Labels are 14 / 16 / 18 / 28px at weight 600 with 0.015rem letter-spacing and a 1px border.
- **Secondary button.** Transparent with a 1px `--btn-base` border and a `--btn-text` label. The hover value is inferred from the `color--interactive` subdued hover `#D4EBFE`.
- **Tertiary button.** `--btn-base-subdued` fill (`#F0F8FF` for interactive) with a blue label.
- **Ghost buttons.** Neutral ghost (the category nav) has a `#17191F` label, hover `#E5E9F1`, pressed `#CBD1DD`. Interactive ghost has a `#0072CE` label with hover `#D4EBFE`.
- **Focus.** Buttons draw `outline: 2px solid var(--btn-focus)` with a 2px offset, and `--btn-focus` resolves to `#616670` (`--bds-color-focus-default`). Links and image cards use a 2px `#0072CE` outline (`--bds-color-focus-interactive`). The JSON's `focusRing` uses the interactive blue, and `button.focus` uses the grey actually rendered on buttons.
- **Search input** (the most prominent field). 48px tall, 1px `#616670` border, 8px radius, white, 16px Fellix text, placeholder `#616670` at 14px. In the focused state (`section.sb-focused`) the border turns navy `#012169` and adds a **2px `#51AAF2` outer outline**. The suggestion list is white with a 1px `#F4F6FA` border, ~32px rows of 14px/600 `#17191F` text, and `#F4F6FA` hover. I did not see a standalone Backyard text field or select on the homepage. The error border uses the `--bds-color-border-red` token `#971B2F`, unmeasured.
- **Borders.** `border-default` `#616670`, hover `#393C44`, pressed `#24272D`, `border-subdued` `#CBD1DD` (cards and dividers), `border-interactive` `#0072CE`, `border-disabled` `#9EA4B2`.
- **Text.** Primary `#17191F`. Secondary is `rgba(23,25,31,.8)` (≈ `#45474C`), tertiary `rgba(23,25,31,.7)` (≈ `#5D5E62`), disabled `rgba(23,25,31,.3)`. Interactive `#0072CE`, visited link `#7F2CFC`.
- **Links** (`backyard link`). Regular weight. They underline on hover and focus, and card CTAs ("Shop Now") are underlined at rest.
- **Cards.** White, 1px `#CBD1DD`, 4px radius (`--bds-border-radius-md`), and no shadow at rest on the homepage. Product and category image tiles use 8px radius.
- **Shadows** (npm `v3/light/_cssvars.css`, `--bds-shadows-shadow-01…06`). These are Material-style three-layer black shadows. The JSON maps card = 01, menu = 04 and modal = 06, which is my judgement. The 2026 site sets all `--bds-color-elevation-*` to white surfaces.
- **Typography.** `--bds-font-family-fellix` is `Fellix, Arial, sans-serif`, and a `fellix-roboto` stack exists. Fellix 400 and 600 load on the homepage.
  - Headings, desktop tokens: h1 40/56, h2 28/40, h3 24/32, h4 20/32, h5 16/24, h6 14/24.
  - Body-1 is 16/24 and body-2 is 14/24; caption 14/24, footnote 12/16.
  - Headings measured 28px/600 (h2) and 24px/600 (h3).
  - Fellix is a commercial Displaay geometric grotesk. **Plus Jakarta Sans** is the suggested free fallback (a judgement call). Roboto is Lowe's own fallback if a neutral face is preferred.
- **Spacing.** Tokens: xxs 4, xs 8, sm 16, md 24, lg 40, xl 56. The size scale goes in 4px steps.
- **Tabs.** No tab component appeared on the homepage, so the underline/blue indicator in the JSON is an assumption (low confidence).
- **Theme and header.** The site and the token package are light-first (`--bds-name: light`); a dark set exists in the npm package. The main header is white. The navy `#012169` utility bar ("Deals…", "Order Status", "Weekly Ad") is the natural match for our brand banner.
- **Logo.** The Lowe's mark is the white LOWE'S wordmark inside a blue house-shaped badge, so it already reads on white. On a navy `#012169` banner the badge can sit as-is. I found no published clear-space or reversed-logo rule. **Unverified.**

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Colour, border, text, focus, radius, spacing and type tokens (`--bds-*`) | `:root` CSS of https://web.archive.org/web/20261102003313/https://www.lowes.com/ resolved in my own Chromium | High (published CSS, archive copy 3 weeks old) |
| Button variants, sizes, shapes, `--btn-*` colours, focus outline | Backyard component CSS + computed `--btn-*` on real buttons, same archive copy | High (primary, ghost) / Medium (secondary hover, disabled) |
| Search input, suggestion menu, card border/radius, header layout | Computed style + screenshot of the archive copy | High |
| Shadows (`--bds-shadows-shadow-01…06`) | https://www.npmjs.com/package/@lowes-tech/bds-tokens (v1.0.0, 2023; `v3/light/_cssvars.css` via unpkg) | Medium (package is 2023; role mapping is judgement) |
| Live lowes.com | Blocked (Akamai Access Denied for headless Chromium); not bypassed | — |
| Tabs, dropdown selected state, modal radius, error border, logo rules | Not observed / inferred | Low |
| Fellix → Plus Jakarta Sans fallback | Judgement | Low |
| Third-party summary (primary `#0072CE`, Fellix) used only as a cross-check | https://www.shadcn.io/design/lowes | Low |

## Differs from current Figma
- **New brand.** It is not in the Figma file yet. Proposed mode: primary `#0072CE` (interactive blue), secondary `#012169` (logo/utility-bar navy), white header with a navy banner, 8px rounded buttons, cool blue-grey neutrals.
