# Siemens — brand UI audit

Audited 2026-11-25 by agent-hyundai-bentley-siemens. Sources: the open-source **Siemens iX** design system (`@siemens/ix` 6.0.0) and siemens.com.

## Summary
- Siemens iX has two theme families. **Community** is the open-source theme on npm; it is what iX ≤5 called "classic". **Brand** is the Siemens-only theme, `@siemens/ix-brand-theme`, which is not on public npm. The brand values below were read live from ix.siemens.io, which runs `data-ix-theme="brand"` with a dark/light toggle.
- In the brand theme, the dark scheme is the default (the docs site opens in dark). Everything sits on **Siemens Deep Blue `#000028`**. The interactive accent is **bold petrol/aqua `#00CCCC`**, hover is **bright green `#00FFB9`**, and text on the accent is deep blue. In light mode the accent darkens to **`#006B80`**.
- Shapes are crisp and industrial. Buttons and inputs have a **2px radius**; cards, menus and modals 4px; chips and pills are full pills. Controls are 32px tall and buttons use 14px / 600 text.
- The font is **Siemens Sans Pro** (proprietary; variable "SiemensSans Pro VF"). siemens.com headlines use the Black weight (900).
- On siemens.com the call to action is a **square** (0 radius) aqua `#00CCCC` button with black text, 56px tall, turning `#00FFB9` on hover. The header is deep blue `#000028`, and the logo is white on it.

## Proposed tokens (iX brand theme, dark)
```json
{
  "id": "siemens",
  "theme": "dark",
  "colors": { "primary": "#00CCCC", "primaryHover": "#00FFB9", "primaryActive": "#00E5AA", "secondary": "#009999", "accent": ["#00FFB9", "#006B80", "#007993"], "link": "#00CCCC", "focusRing": "#199FFF",
              "headerBg": "#000028", "headerText": "#FFFFFF", "pageBg": "#000028", "surface": "#23233C", "border": "#4C4C68", "textPrimary": "#FFFFFF", "textSecondary": "#B3B3BE", "textDisabled": "#66667E",
              "success": "#28BF66", "warning": "#FF9000", "error": "#D72339", "info": "#206ED9",
              "neutralRamp": { "1000": "#000028", "950": "#12122E", "900": "#23233C", "850": "#2D2D45", "800": "#333353", "750": "#40405E", "700": "#4C4C68", "600": "#66667E", "500": "#7D8099", "400": "#9999A9", "300": "#B3B3BE", "200": "#CCCCD4", "100": "#E5E5E9", "50": "#F5F5F5", "0": "#FFFFFF" } },
  "typography": { "uiFamily": "Siemens Sans Pro", "displayFamily": "Siemens Sans Pro (Black 900 on web)", "monoFamily": "Courier New", "proprietary": true, "googleFallbackUi": "Source Sans 3", "googleFallbackDisplay": "Source Sans 3",
                  "bodySize": 14, "bodyLineHeight": 16, "weights": { "regular": 400, "medium": 600, "semibold": 600, "bold": 700 }, "headingScale": [32, 28, 24, 20, 16, 14] },
  "radius": { "button": 2, "input": 2, "card": 4, "chip": 9999, "modal": 4 },
  "button": { "height": { "sm": 24, "md": 32, "lg": 40 }, "paddingX": 8, "minWidth": null, "fontSize": 14, "fontWeight": 600, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#00CCCC", "text": "#000028", "hoverBg": "#00FFB9", "activeBg": "#00E5AA", "disabledBg": "#23233C", "disabledText": "#66667E" },
              "secondary": { "bg": "transparent", "text": "#00CCCC", "border": "#00CCCC", "hoverBg": "#00333E" },
              "ghost": { "text": "#00CCCC", "hoverBg": "#00333E" },
              "focus": { "style": "solid outline", "width": 2, "offset": 1, "color": "#199FFF" } },
  "input": { "height": 32, "border": "#9999A9", "borderWidth": 1, "radius": 2, "placeholder": "#B3B3BE", "focusBorder": "#FFFFFF", "errorBorder": "#D72339" },
  "dropdown": { "menuBg": "#23233C", "menuRadius": 4, "itemHeight": 40, "itemHoverBg": "#333353", "itemSelectedBg": "#40405E", "itemSelectedText": "#FFFFFF", "shadow": "0 -0.25px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.6)" },
  "tabs": { "style": "underline", "activeIndicator": "#00FFB9", "activeText": "#FFFFFF" },
  "elevation": { "card": "0 -0.25px 2px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.6)", "menu": "0 -0.25px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.6)", "modal": "0 -0.25px 2px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.6)" },
  "spacingBase": 4,
  "iconStyle": "@siemens/ix-icons — line/outline 24px industrial set"
}
```

### Brand theme: light vs dark (live from ix.siemens.io, `--si-sys-color-*`)
| Token | Dark | Light |
|---|---|---|
| background-0 (page) | `#000028` | `#F5F5F5` |
| background-1 / 2 / 3 | `#23233C` / `#12122E` / `#2D2D45` | `#FFFFFF` / `#F0F0EF` / `#FFFFFF` |
| background-accent / hover / active | `#00CCCC` / `#00FFB9` / `#00E5AA` | `#006B80` / `#005159` / `#004F60` |
| accent-secondary hover / active (ghost and outline hover) | `#00333E` / `#001F39` | `#D1FFF2` / `#C2FFEE` |
| background-hover / selected / disabled | `#333353` / `#40405E` / `#40405E` | `#EDEDED` / `#E0E0DE` / `#B3B3BE` |
| text primary / secondary / disabled | `#FFFFFF` / `#B3B3BE` / `#66667E` | `#000028` / `#4C4C68` / `#9999A9` |
| text-accent / text-on-accent | `#00CCCC` / `#000028` | `#006B80` / `#FFFFFF` |
| border-1 / 2 / 3 / 4 | `#FFFFFF` / `#9999A9` / `#66667E` / `#4C4C68` | `#000028` / `#66667E` / `#9999A9` / `#E5E5E9` |
| danger / warning / success / info / caution | `#D72339` / `#FF9000` / `#28BF66` / `#206ED9` / `#FFD732` | `#D72339` / `#C75300` / `#1C703F` / `#206ED9` / `#EDBF00` |
| focus | `#199FFF` | `#008FF5` |
| font | `"SiemensSans Pro VF", "SiemensSans Pro", helvetica, arial` | same |

For a light Bluebird mode, use the light column. The primary becomes `#006B80` (hover `#005159`) and the banner stays `#000028`.

### Community theme, formerly "classic" (open source, npm 6.0.0)
Rendered from `dist/siemens-ix/theme/community-{light,dark}.css` in a local harness.
| | Light | Dark |
|---|---|---|
| Primary button | `#006A87`, white text, hover `#004F69` | `#00C9E4`, text `#000609`, hover `#00EAFF` |
| Page / surface | `#F3F4F5` / `#FFFFFF` | `#000609` / `#1A272D` |
| Text / secondary | `#000609` / `#405158` | `#FFFFFF` / `#AEB5B8` |
| Font | Arial, helvetica | same |
| Status | danger `#D72323`, warning `#BA5D00`, success `#376F1C`, info `#226AE7` | danger `#D72323`, warning `#FF8000`, success `#59BD28` |

Community is cool turquoise on blue-grey; Brand is aqua/green on deep blue. **Use Brand for Siemens**: it is what Siemens' own products show.

### Shared component metrics (identical across themes; harness and component CSS)
- **Button:** min-height 32 (`--si-sys-sizing-size-80`), padding 0 8, radius 2 (`border-radius-xs`), 1px border, 14px / 600, no text transform. Secondary = outlined accent; tertiary = accent text on transparent; subtle-primary = filled with background-2. Focus: outline 2px `effects-focus`, offset 1. The docs header button measured 40px.
- **Input / select:** 32px, padding 4px 8px, `1px border-2`, radius 2; hover background-4; focus = border-1 colour plus a 2px focus outline at offset 1.
- **Dropdown:** radius 4, shadow-40, item height 40 (`size-90`). **Modal:** radius 4, shadow-40. **Card:** radius 4 with a 4px accent strip option. **Chip / pill:** radius 9999, chip height 32, pill 20.
- **Tabs:** underline indicator 2px (`border-width-selected`) in `background-accent-hover` (`#00FFB9` dark, `#005159` light); hover background = accent-secondary-hover; label 14px / 600, padding 0 24, height 40.
- **Application header:** min-height 48 (`size-100`), background-1, bottom border-4.
- **Checkbox:** 20px, radius 2. **Toggle:** 24px pill.
- **Typography tokens:** body 14/16, body-paragraph 14/20, body-lg 16/20, h1 28/36 (600), h2 24/32, h3 20/24, h4 16/20, display 32/40, display-lg 40, display-xl 48, display-xxl 58.
- **Spacing:** 4px base (`--si-ref-sizing-dimension-*` 2, 4, 6, 8, 12, 16, 20, 24, 32…).

### siemens.com (live marketing site)
| Element | Measured |
|---|---|
| Header | `#000028`, 144px (two rows), white `SiemensSans` 16px nav |
| Primary CTA `.btn-secondary` | `#00CCCC` (`--color-aqua`), black text, 56px, padding 16px 24px, **radius 0**, 16px / 700; hover/focus `#00FFB9` (`--color-green-light`); disabled `#D9D9DF` |
| Gradient CTA `.btn-primary` | linear gradient `#00FFB9` → `#00E6DC`, black text; hover `#C4FFEE` |
| Outline CTA | transparent, inset 2px box-shadow in the current colour (white on dark); hover `#EBEBEE` on light, `#002949` on dark |
| Tabs | active `#D1FFF2` background with `#000028` 18px / 900 text; square |
| Links / focus | `--color-blue-link #007993`; focus outlines `#1491EB` / `#007993`, 2px, offset 2 |
| Neutrals | text `#000028`, secondary `#4C4C68`, sand surface `#F3F3F0`, border `#D9D9DF` |
| Type | H1 32/44 at weight **900**; body 16/24 at 400; radii 0 on CTAs, 999px on carousel pills |
| Brand variables | `--color-petrol #009999` (logo petrol), `--color-blue-dark #000028`, `--color-aqua #00CCCC`, `--color-green-light #00FFB9`, `--color-red #D91A30`, `--color-orange #FD9400`, `--color-yellow #FFD732` |

## Typography notes
Siemens Sans and Siemens Sans Pro are proprietary and not licensed for general use. **Source Sans 3** (Google) is the closest free humanist sans: it has a Black 900 weight for siemens.com-style headlines and installs in Figma. Noto Sans is an acceptable second choice. The open-source iX community theme itself falls back to **Arial**.

## Theme and logo
- Brand theme default is **dark** (deep blue `#000028`). siemens.com pairs a deep-blue header with white or sand content. The Bluebird banner should be `#000028` in both modes.
- Logo: petrol `#009999` wordmark on light backgrounds, white on deep blue (as in the siemens.com header and the iX `effects-logo` token, which is white on dark and black on light). No clear-space figure was found in public sources.

## Not verified
- The brand-theme npm package is restricted. Brand **colour** tokens are live-read from ix.siemens.io; brand **component metrics** are assumed to equal the open-source component CSS (the docs-site button confirmed a 2px radius and 600 weight).
- Input placeholder colour and dropdown menu background are inferred from tokens (text-secondary, background-1), not measured.
- siemens.com hover states come from stylesheet rules (`.btn-secondary:hover`); the live hover did not trigger in headless Chromium.

## Sources
- https://www.npmjs.com/package/@siemens/ix (6.0.0): community theme CSS, component CSS, local harness render. Confidence **high**.
- https://github.com/siemens/ix: source repository. **High**.
- https://ix.siemens.io/docs/components/button/overview: live brand-theme `--si-sys-*` tokens (dark and light), font, docs button. **High** for colours; **medium** for component metrics.
- https://www.siemens.com/global/en.html: live computed style, CSS variables and button rules. **High**.
- Google font fallback (Source Sans 3): designer judgement, not measured. **Low–medium**.

## Differs from current Figma
| | Figma now | Proposed | Note |
|---|---|---|---|
| primary | `#000028` | `#00CCCC` (dark) / `#006B80` (light) as the interactive primary; keep `#000028` as **headerBg** and page background | Deep blue is Siemens' ground colour, not its button colour. |
| secondary | `#009999` | `#009999` (keep, as the petrol logo/brand colour); hover accent `#00FFB9` | `#009999` is correct as brand petrol, but iX uses `#00CCCC` / `#006B80` for interactive states. |
| font | Noto Sans | Siemens Sans Pro → Source Sans 3 | |
| radius | AkzoNobel copy | 2px buttons and inputs, 4px cards/menus/modals, pills for chips | siemens.com marketing CTAs are 0px. |
| button | — | 32px, 14px / 600, deep-blue text on aqua | |
