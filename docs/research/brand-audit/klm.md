# KLM Royal Dutch Airlines — brand UI audit

Audited 2026-11-25 (agent-aa-swa-klm). **klm.com and storybook.klm.com refuse headless Chromium and curl (HTTP/2 protocol error / connection stall, Akamai). That was not bypassed.** Values come from KLM's public design-system site, **Aero** (the Air France-KLM multi-brand system), at **https://design.klm.com**. It is the KLM-branded view of https://design.airfrance.com, published on Supernova. Hex values are written on the colour page. Component colours and sizes were **sampled from the official KLM spec images** (rendered at 2x, so px are halved), and fonts were read from the docs site's own CSS. Older shadow values come from KLM's public npm package `@klm-dt/designsystem` (2022 beta).

## Summary
- Light, white, calm UI. **Primary 500 `#0077CD`** is the action blue for buttons, focus, tabs, chips and selected text. **KLM Blue `#00A1DE`** is reserved for the logo and brand visuals because it fails AA contrast. Text is deep navy **`#072B45`** (Primary 900), not black.
- Greys carry a slight blue tint (`#F6F7F8 … #3F4E58`). Orange **`#E37222`** is the single accent, used for indicators such as the active top-nav underline. It is never used for text.
- **Soft 4px corners** on buttons and fields, 8px cards, pill filter chips. Buttons are **not uppercase** (the old KLM DT package was). The secondary button is a pale-blue fill `#C2DBEA` with `#0E578C` text.
- Typeface is **KLM Universal Sans**: Display 500 for headlines, Text 400/500/600 for UI. It is proprietary and customised for KLM.
- Header ("Logo Header") is white with the blue crown logo, dark navy nav labels, and an orange underline plus light-grey fill on the active top task.

## Proposed tokens
```json
{
  "id": "klm",
  "theme": "light",
  "colors": { "primary": "#0077CD", "primaryHover": "#0064AC", "primaryActive": "#005B9C", "secondary": "#00A1DE", "accent": ["#E37222", "#0E578C", "#C2DBEA"], "link": "#0077CD", "focusRing": "#0077CD",
              "headerBg": "#FFFFFF", "headerText": "#072B45", "pageBg": "#FFFFFF", "surface": "#FFFFFF", "border": "#D4D8DA", "textPrimary": "#072B45", "textSecondary": "#3F4E58", "textDisabled": "#6A757D",
              "success": "#268712", "warning": "#F5B800", "error": "#D10031", "info": "#006FC9",
              "neutralRamp": { "0": "#FFFFFF", "100": "#F6F7F8", "200": "#EAEBEC", "300": "#D4D8DA", "500": "#AAB0B5", "700": "#6A757D", "900": "#3F4E58", "black": "#000000" } },
  "typography": { "uiFamily": "Universal Sans Text", "displayFamily": "Universal Sans Display", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Figtree", "googleFallbackDisplay": "Figtree",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 }, "headingScale": [40, 32, 24, 20, 16] },
  "radius": { "button": 4, "input": 4, "card": 8, "chip": 9999, "modal": 8 },
  "button": { "height": { "sm": null, "md": 44, "lg": 56 }, "paddingX": 24, "minWidth": null, "fontSize": 16, "fontWeight": 500, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#0077CD", "text": "#FFFFFF", "hoverBg": "#0064AC", "activeBg": "#005B9C", "disabledBg": "#EAEBEC", "disabledText": "#AAB0B5" },
              "secondary": { "bg": "#C2DBEA", "text": "#0E578C", "border": null, "hoverBg": "#B3CAD8" },
              "ghost": { "text": "#0E578C", "hoverBg": "#ECF2F6" },
              "focus": { "style": "2px border/ring in Primary 500 (fields); buttons not documented", "width": 2, "offset": 0, "color": "#0077CD" } },
  "input": { "height": 56, "border": "#6A757D", "borderWidth": 1, "radius": 4, "placeholder": "#6A757D", "focusBorder": "#0077CD", "errorBorder": "#D10031" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 4, "itemHeight": 48, "itemHoverBg": "#F6F7F8", "itemSelectedBg": "#F6F7F8", "itemSelectedText": "#0077CD", "shadow": "0 4px 5px 0 rgba(0,0,0,0.2), 0 3px 14px 3px rgba(0,0,0,0.12), 0 8px 10px 1px rgba(0,0,0,0.14)" },
  "tabs": { "style": "underline", "activeIndicator": "#0077CD", "activeText": "#0077CD" },
  "elevation": { "card": "0 1px 1px 0 rgba(0,0,0,0.1), 0 1px 1px 0 rgba(0,0,0,0.12), 0 0 1px 0 rgba(0,0,0,0.14)", "menu": "0 4px 5px 0 rgba(0,0,0,0.2), 0 3px 14px 3px rgba(0,0,0,0.12), 0 8px 10px 1px rgba(0,0,0,0.14)", "modal": "0 8px 10px 0 rgba(0,0,0,0.4), 0 6px 30px 5px rgba(0,0,0,0.24), 0 16px 24px 2px rgba(0,0,0,0.28)" },
  "spacingBase": 8,
  "iconStyle": "outline line icons on a 24x24 grid; icon colour follows the label (Primary 500 for primary icons, signal colours for notifications)"
}
```

### Notes on the values
- **Palette (design.klm.com › Foundation › Colour › Original theme, written hex).**
  - KLM Blue `#00A1DE`: "only use for branding purposes, the KLM logo and visuals".
  - Primary: 100 `#EBF3F8`, 300 `#C2DBEA`, **500 `#0077CD`**, 800 `#0E578C` (subtitles, non-primary actions), **900 `#072B45`** (primary text).
  - Accent 500 `#E37222`.
  - Grey: 100 `#F6F7F8`, 200 `#EAEBEC`, 300 `#D4D8DA`, 500 `#AAB0B5`, 700 `#6A757D` (tertiary text), 900 `#3F4E58` (secondary text).
  - Status sets (100 bg / 300 border / 500 icon / 900 text): Blue `#E0F2FF/#7CBCF7/#006FC9/#002845`, Green `#E8FBE4/#9FD994/#268712/#193403`, Red `#FFE0E8/#FF809D/#D10031/#430211`, Yellow `#FFF9E0/#FFD97A/#F5B800/#322800` (700 `#A66300` for label text).
  - State overlays: Primary `rgba(14,87,140,.08)` hover / `.16` active on white; Black `.04/.08` on white, `.16/.24` on colour; White `.16/.24` on colour.
- **Buttons** (Button overview + spec images). "All Buttons use a 4px corner radius." Primary has a colour fill + elevation: `#0077CD` → hover `#0064AC` → active `#005B9C` (sampled). Secondary is a pale fill: `#C2DBEA` → `#B3CAD8` → `#A3B8C4`, label `#0E578C`. Tertiary is outlined: 1px `#0E578C` border/label on white, hover `#E4EBF0`, active `#D0DDE6` (sampled on a grey canvas). Text: `#0E578C` label with the primary overlay on hover. Sizes from the "other variants" image: **44px and 56px** tall (images are 2x), label ≈16px, ≈24px side padding, plus square icon-only buttons. Disabled colours are not shown on the docs pages. The proposed values are Grey 200/500 (low confidence). Web components ship as `@aviato/components` (Angular, `bwc-*`).
- **Text field / select** (spec images). Label sits *outside* the field, above it, in `#072B45`. Field ≈56px tall, white, 4px radius.
  - Default: 1px `#6A757D` border.
  - Hover: 2px `#6A757D`.
  - Focus: 2px `#0077CD`.
  - Disabled: 1px `#D4D8DA` border, text `#6A757D`.
  - Error: 2px `#D10031` + red error text with an icon.
  - The select uses the same shell with a solid `#072B45` caret.
- **Menu.** White overlay with level-3 elevation (Elevation page: "Dropdown/Select menu = 3"). Items ≈48px. The selected item has a `#F6F7F8` fill, `#0077CD` text and a blue check icon on the right, and can have a leading icon. Level-3 shadow values are not published as text. The proposed shadow is the old `@klm-dt` `$shadow-8` (medium-low).
- **Tabs.** Selected: `#0077CD` label + **4px rounded `#0077CD` indicator**. Unselected: `#6A757D`. Hover: `#0077CD` label. A bottom divider separates the tab strip from content. A segmented-tab variant exists for view switching.
- **Chips.** Pill, ≈32px. Unselected: 1px `#0077CD` outline + blue label, hover `#E4EBF0`, active `#D0DDE6`. Selected: `#0077CD` fill, white label and close icon, hover `#0064AC`, active `#005B9C`.
- **Cards.** White, ≈8px radius, elevation 1 (hover → 2). The doc says buttons stay at 4px "when used inside a Card (which has rounder corners)".
- **Elevation levels** 0–4 (+2b/3b reversed for bottom-anchored UI). Level 0 is flat: buttons, inputs, tabs, chips. Level 1: content cards. Level 2: banner, tooltip, card hover. Level 3: calendar, dropdown/select menu, header/sub-header, toast. Level 4: modal/dialog. Exact shadows are only in the Figma "Effects" panel. The JSON uses the `@klm-dt/designsystem` `$shadow-1/8/16` values as the closest published text values.
- **Spacing.** "Increments of 8px, with 4px increments for the smallest sizes"; 4px baseline grid.
- **Typography** (docs site CSS loads `Universal Sans Text` 400/500/600 and `Universal Sans Display` 500). Fallback stack is `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`. Body line height ≈150% on a 4px baseline (16/24). Title sizes follow "close to a major third" scale. The heading scale above is **inferred** (the web text-style table is a Storybook embed on storybook.klm.com, which was blocked). The older `@klm-dt` package used h3 24, h4 20, h5 16 at weight 500–600 with headline font KLM Noa. **Figtree** is the suggested free geometric fallback (DM Sans is the alternative). That is a judgement call.
- **Header.** White Logo Header (hamburger, KLM Blue crown + "Royal Dutch Airlines", search, region, Login), then a Top Task row. The active item has a `#EAEBEC` fill and a **4px orange `#E37222` underline**. Header elevation is level 3. In flows the Top Task row is replaced by a Sub Header.
- **Dark theme** is documented separately (design.klm.com › Colour › Dark theme). Default product UI is light.
- **Logo.** "Can be applied either in KLM Blue or white." Preferred is full colour on white. A **white logo on an even-toned coloured background with sufficient contrast is allowed**, using official palette colours only. Four lock-ups exist (with/without "Royal Dutch Airlines"). Clear space is defined by the logo's own shapes; no px rule is published as text.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Colour palette, status, state overlays | https://design.klm.com/latest/foundation/colour/original-theme-gEcw2EQQ (written hex) | High |
| Typeface names, weights, fallback stack, line-height rule | https://design.klm.com/latest/foundation/typography/overview-EDtalZdW + docs-site `document.fonts` | High (names), Medium (scale) |
| Button radius/variants; button colours and sizes | https://design.klm.com/latest/components/button/overview-r2ecqcsn text + spec images sampled with canvas | High (radius, colours), Medium (sizes, 2x images) |
| Text field, select, tabs, menu, chip, card, header | design.klm.com component overview pages (`/components/text-field/…`, `/select/…`, `/tabs/…`, `/menu/…`, `/chip/…`, `/card/…`, `/logo-header/…`) + spec images | Medium |
| Elevation levels, spacing, logo, icons | https://design.klm.com/latest/foundation/elevation-JHKgQFcq, `/spacing-XnRBxesX`, `/logo-LoTL92ne`, `/icons/overview-6J1L02mV` | High (rules) |
| Shadow values | npm `@klm-dt/designsystem@1.0.6` (`stylesheets/shared/_shadows.scss`, 2022 beta, older brand) | Low–medium |
| Aero background (multi-brand, AF/KLM tokens `aero-[category]-color-[group]`) | https://design.airfrance.com/latest/global-foundation/colors/overview-XvcBHKdQ | High |
| klm.com live UI, storybook.klm.com | Blocked (HTTP/2 error), not bypassed | Not available |

## Differs from current Figma
- Current Figma: primary `#003145`, secondary `#00A1DE`.
- **Primary `#003145`** is the old "KLM night blue" from the 2018–2022 `@klm-dt` package (`--klm-night-blue`). Aero no longer uses it. Use **`#0077CD`** (Primary 500) for actions, and **`#072B45`** (Primary 900) wherever a dark navy is needed (text, dark banner).
- **Secondary `#00A1DE`** is correct as KLM Blue, but brand-only (logo, banner, illustrations). It fails WCAG AA, so don't use it for text, buttons or focus.
- Add accent orange `#E37222` (active nav underline), blue-tinted greys, Universal Sans → Figtree instead of Noto Sans, 4px button/field radius, 8px cards, pill chips, a pale-blue secondary button (`#C2DBEA` / `#0E578C`), and 56px outside-label fields.
