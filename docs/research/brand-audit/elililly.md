# Eli Lilly and Company (elililly)

## Summary
- lilly.com runs on Lilly's own token system **LDS** (`--lds-g-*` CSS custom properties, about 770 of them, exposed on `:root`). It is not published as a public package (npm search found nothing), but the live tokens are complete and readable.
- What makes it recognisable: **Lilly Red `#D31710`** used sparingly on fully rounded **pill CTAs** (48px high), near-black `#191919` text, and translucent black floating pill nav bars. The rest is white or soft grey, with blush `#F9EEED` section tints.
- Type is **Ringside Sans** (Hoefler&Co.) at only two weights (400 and 900), plus **Ringside Sans Extra Wide Black** for big display headlines and **ITC Garamond Narrow Condensed** for serif headlines.
- The UI is light. Status colours are muted and deep: success `#007A55`, warning `#A55500`, error `#9F180F`, info `#1B6CBA`.

## Proposed tokens
```json
{
  "id": "elililly",
  "theme": "light",
  "colors": { "primary": "#D31710", "primaryHover": "#9F180F", "primaryActive": "#6E1911", "secondary": "#191919",
              "accent": ["#003A6C", "#F4C003", "#00422C", "#FD9485"], "link": "#D31710", "focusRing": "#191919",
              "headerBg": "#191919", "headerText": "#FFFFFF", "pageBg": "#FFFFFF", "surface": "#F5F5F5", "border": "#C5C5C5",
              "textPrimary": "#191919", "textSecondary": "#6A6A6A", "textDisabled": "#6A6A6A",
              "success": "#007A55", "warning": "#A55500", "error": "#9F180F", "info": "#1B6CBA",
              "neutralRamp": { "000": "#FFFFFF", "005": "#F5F5F5", "010": "#F0F0F0", "020": "#E2E2E2", "030": "#C5C5C5", "040": "#AFAFAF",
                               "050": "#8A8A8A", "060": "#6A6A6A", "070": "#505050", "080": "#3A3A3A", "090": "#282828", "100": "#191919", "105": "#111111" } },
  "typography": { "uiFamily": "Ringside Sans", "displayFamily": "Ringside Sans Extra Wide", "monoFamily": null, "proprietary": true,
                  "googleFallbackUi": "Libre Franklin", "googleFallbackDisplay": "Archivo (Expanded, Black)",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 400, "semibold": 900, "bold": 900 },
                  "headingScale": [100, 60, 48, 36, 32, 28, 24] },
  "radius": { "button": 32, "input": 20, "card": 24, "chip": 999, "modal": 24 },
  "button": { "height": { "sm": 32, "md": 40, "lg": 48 }, "paddingX": 24, "minWidth": null, "fontSize": 16, "fontWeight": 400, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#D31710", "text": "#FFFFFF", "hoverBg": "#9F180F", "activeBg": "#6E1911", "disabledBg": "#C5C5C5", "disabledText": "#6A6A6A" },
              "secondary": { "bg": "#FFFFFF", "text": "#191919", "border": "#191919", "hoverBg": "#F0F0F0" },
              "ghost": { "text": "#D31710", "hoverBg": "#F9EEED" },
              "focus": { "style": "outline", "width": 2, "offset": 2, "color": "#191919" } },
  "input": { "height": 48, "border": "#6A6A6A", "borderWidth": 1, "radius": 20, "placeholder": "#6A6A6A", "focusBorder": "#191919", "errorBorder": "#9F180F" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 12, "itemHeight": 40, "itemHoverBg": "#F5F5F5", "itemSelectedBg": "#F9EEED", "itemSelectedText": "#9F180F",
                "shadow": "0px 4px 8px 0px rgba(52,63,65,0.04), 0px 8px 12px 0px rgba(52,63,65,0.12)" },
  "tabs": { "style": "pill", "activeIndicator": "#191919", "activeText": "#FFFFFF" },
  "elevation": { "card": "0px 2px 4px 0px rgba(52,63,65,0.16), 0px 4px 6px 0px rgba(52,63,65,0.1)",
                 "menu": "0px 4px 8px 0px rgba(52,63,65,0.04), 0px 8px 12px 0px rgba(52,63,65,0.12)",
                 "modal": "0px 4px 12px 0px rgba(52,63,65,0.08), 0px 18px 28px 0px rgba(52,63,65,0.12)" },
  "spacingBase": 8,
  "iconStyle": "thin outline line icons (search, globe and user glyphs in the nav); library not identified"
}
```

### Evidence notes
- **LDS colour tokens (live `:root`):** `--lds-g-color-brand-1/2/3` = `#D31710 / #9F180F / #6E1911`. The neutral ramp `--lds-g-color-neutral-base-000…105` is in the JSON above. Other roles:
  - Borders: `--lds-g-color-border-1/2/3` = `#111 / #6A6A6A / #C5C5C5`.
  - Text: `on-surface-1/2/3` = `#191919 / #3A3A3A / #6A6A6A`.
  - Disabled: `disabled-1` = `#6A6A6A`, `disabled-container-1` = `#C5C5C5`.
  - Status pairs: info `#1B6CBA` on `#EDF1FD`, success `#007A55` on `#E7F4EA`, warning `#A55500` on `#FCEEE7`, error `#9F180F` on `#FFDAD4`.
- **Named brand colours (live):** `--lds-color-lilly-*` aliases:
  - lilly-red `#D31710`, lilly-black `#191919`, brown-bold `#501009`
  - coral-vibrant `#FD9485`, pink `#FFDAD4`, rose-neutral `#F9EEED`
  - gold-vibrant `#F4C003`, cream-neutral `#F9F0E0`
  - green-bold `#00422C`, sage-neutral `#BEEBE6`
  - blue-bold `#003A6C`, azure-vibrant `#86B3F2`
  - stone-neutral `#D8E4EC`, gray-bold `#818C94`
- **Measured primary CTA** (`a.cta-button-filled`):
  - Default: bg `#D31710`, white text, Ringside Sans 20px/400, padding 12px 24px, height 48, radius 32px, no border.
  - Hover: bg `#9F180F`.
  - Focus: 2px solid `#191919` outline at 2px offset (the radius grows to 40px).
  - The LDS CTA type token is 16px/1.25 by default and 20px/1.2 on desktop. I propose 16px for the plugin.
- **Text links (measured):** `#D31710`, underlined. CTA text links use weight 900 (the `special-cta-text-link` token). Focus shows a 2px `#505050` border with a 12px radius.
- **Type tokens:**
  - Display 1: 900, 6.25rem/1.0, Extra Wide, -0.05em.
  - Display 2: 900, 3.75rem.
  - H1–H6 (desktop): 60 / 48 / 36 / 32 / 28 / 24, all at 400.
  - Body: medium 16/1.5, small 14/1.43, large 20/1.5. Caption 12–14px. Eyebrow uses Extra Wide at 12–14px.
  - Font weight tokens exist only for 400 and 900.
- **Radius tokens:** `--lds-g-radius-1…8` = 12, 16, 20, 24, 28, 32, 40, 48px, plus `radius-full`. There is nothing below 12px, so square corners are off-brand. The hero video cards measure 48px. I chose 24px as the plugin-scale card radius.
- **Search input (measured on /search):** height 58, bg `#F5F5F5`, no border, radius 20px, 24px Garamond text. The plugin input values are adapted from LDS border and radius tokens.
- **Spacing:** `--lds-g-spacing-*` runs in 0.5rem steps (100 = 8px) with 025/050 half steps. Shadows are `--lds-g-shadow-bottom-1…4`, tinted `rgba(52,63,65,…)`.
- **Header:** two floating pills, one for the logo and menu and one for search, language and Sign In. They are 72px high and fully rounded, translucent near-black. Screenshot pixels show `#121212`–`#2D2D2D` depending on the backdrop, i.e. `#191919` with transparency or blur. The script "Lilly" logo sits on it in white, so a reversed white logo on a dark or brand surface is used live. No clear-space rule was found publicly.
- **Motion:** 220, 380, 600 and 720ms durations with `cubic-bezier(0, 0.56, 0.4, 1)` as the standard curve.

## Sources
- https://www.lilly.com/ — Playwright, live computed styles plus the `:root` LDS custom properties and `@font-face` list. Colours, type, radius, spacing, shadow and the primary button are **high** confidence.
- https://www.lilly.com/search?q=insulin — the search input, measured live. **Medium** confidence: this is a marketing search field, not a form control set.
- npm registry search ("lilly design system lds", "elilillyco") found no public LDS package, so there are no design-system docs.
- Web search found no public LDS or brand-guideline page. Ringside is confirmed as an H&Co. typeface (underconsideration.com/brandnew, "Meet Ringside").
- **Inferred, low confidence** (no live example found on the public pages):
  - secondary/ghost button
  - dropdown menu
  - tabs
  - input focus and error borders
  These are built from LDS tokens (border-1, error-1, shadow-bottom-3, radius-1, brand-container colours).
- Google fallbacks are my own judgement:
  - **Libre Franklin** for Ringside, which is a gothic in the Knockout/Franklin lineage.
  - **Archivo** at a wide width with Black weight for Extra Wide.
  - **EB Garamond** if the serif headline style is wanted.

## Differs from current Figma
- **Primary:** Figma has `#D52B1E`. The live LDS brand red is **`#D31710`** (`--lds-g-color-brand-1`). They are visually close; switch to the token value. Also add the real hover `#9F180F` and pressed `#6E1911`.
- **Secondary:** Figma has `#00205B` (navy), which does **not appear** in Lilly's live palette. The UI pairs the red with Lilly black **`#191919`**: text, nav pills and focus ring. If a blue is wanted, Lilly's own is `blue-bold #003A6C` (azure-080).
- The **AkzoNobel-copied shape is wrong for Lilly:** buttons should be full pills (radius at least 32, or half the height), and LDS has no radius below 12px. Weights should be only 400 and 900, with no 500/600.
