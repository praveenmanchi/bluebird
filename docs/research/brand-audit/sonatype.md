# Sonatype (sonatype)

## Summary
- **Two layers.** The current **brand** on sonatype.com has a deep navy `#090B2F`, an electric blue primary `#2D36EC`, and a lime `#DAFC02` "go" button, set in FK Grotesk with 10px-radius buttons. The **product UI** (Nexus Repository, Lifecycle and others) is built on Sonatype's public component library **React Shared Components (RSC)**: `@sonatype/react-shared-components` v14.0.11, EPL-2.0, `--nx-*` CSS variables. RSC is light, Open Sans, blue `#0F4FBD`, 6px radius and a 4px spacing grid.
- **Recommendation:** brand colours and font from the live site, plus RSC component anatomy (40px controls, underline tabs, 4px grid, warm-grey neutrals, status set). That way the plugin feels like a Sonatype product.
- **What makes it recognisable:** navy plus electric blue with an unexpected **neon lime** CTA. The hexagon logo mark. Electric-blue glow shadows on hover.

## Proposed tokens
```json
{
  "id": "sonatype",
  "theme": "light",
  "colors": { "primary": "#2D36EC", "primaryHover": "#1D26C9", "primaryActive": "#414AFF", "secondary": "#090B2F",
              "accent": ["#DAFC02", "#FE572A", "#0F1C4D"], "link": "#2D36EC", "focusRing": "#2D36EC",
              "headerBg": "#090B2F", "headerText": "#FFFFFF", "pageBg": "#F4F5FB", "surface": "#FFFFFF", "border": "#DADFF1",
              "textPrimary": "#090B2F", "textSecondary": "#595961", "textDisabled": "#9D9D95",
              "success": "#107046", "warning": "#C85204", "error": "#B81414", "info": "#0F4FBD",
              "neutralRamp": { "white": "#FFFFFF", "bgLiteBlue": "#F6F8FC", "siteBg": "#F4F5FB", "bgLite": "#ECEEF2", "inputBorder": "#E0E1FB", "border": "#DADFF1",
                               "divider": "#D4DAE3", "disabled": "#9D9D95", "controlBorder": "#85857A", "text": "#595961", "navy700": "#0F1C4D", "navy900": "#090B2F", "stark": "#0D0D0C" } },
  "typography": { "uiFamily": "FK Grotesk", "displayFamily": "FK Screamer", "monoFamily": "Courier Prime", "proprietary": true,
                  "googleFallbackUi": "Hanken Grotesk", "googleFallbackDisplay": "Anton",
                  "bodySize": 16, "bodyLineHeight": 22, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 600 },
                  "headingScale": [78, 48, 28, 22, 18] },
  "radius": { "button": 10, "input": 10, "card": 10, "chip": 16, "modal": 10 },
  "button": { "height": { "sm": 30, "md": 40, "lg": 48 }, "paddingX": 20, "minWidth": null, "fontSize": 16, "fontWeight": 500, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#2D36EC", "text": "#FFFFFF", "hoverBg": "#1D26C9", "activeBg": "#414AFF", "disabledBg": "#E7E7E4", "disabledText": "#9D9D95" },
              "secondary": { "bg": "#FFFFFF", "text": "#2D36EC", "border": "#2D36EC", "hoverBg": "#EEEFFD" },
              "ghost": { "text": "#090B2F", "hoverBg": "#EEEFFD" },
              "focus": { "style": "outline", "width": 2, "offset": 2, "color": "#2D36EC" } },
  "input": { "height": 40, "border": "#85857A", "borderWidth": 1, "radius": 10, "placeholder": "#6A6A62", "focusBorder": "#2D36EC", "errorBorder": "#B81414" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 6, "itemHeight": 32, "itemHoverBg": "#EEEFFD", "itemSelectedBg": "#E0E1FC", "itemSelectedText": "#090B2F",
                "shadow": "0 2px 12px 0 rgba(182,191,226,0.2), 0 1px 2px 0 rgba(145,158,212,0.2), 0 1px 1px 0 rgba(108,126,198,0.2)" },
  "tabs": { "style": "underline", "activeIndicator": "#2D36EC", "activeText": "#2D36EC" },
  "elevation": { "card": "none", "menu": "0 2px 12px 0 rgba(182,191,226,0.2), 0 1px 2px 0 rgba(145,158,212,0.2), 0 1px 1px 0 rgba(108,126,198,0.2)",
                 "modal": "0 6px 18px 2px rgba(45,54,236,0.3)" },
  "spacingBase": 4,
  "iconStyle": "Font Awesome (RSC ships fontawesomeConfig); marketing uses simple outline arrows/chevrons"
}
```

### Evidence notes
- **Live site `:root`:**
  - Colours: `--primary #2d36ec`, `--secondary #090b2f`, `--tertiary #dafc02`, `--quaternary #fe572a`.
  - Backgrounds: `--bg-dark #090b2f`, `--bg-lite #f1f5ed`, `--bg-liteBlue #eceef2`. Text: `--text-color #595961`.
  - Fonts: `--primary-font "FK-Grotesk","Univers","Aptos"`, `--secondary-font "FK-Screamer"`.
  - The Osano consent theme, which Sonatype configures in its own brand colours, sets: button `#2d36ec`, hover `#1d26c9`, contrast `#414aff`, selected bg `#eeeffd`, selected hover `#e0e1fc`, borders `#d5d6dc`, text `#090b2f`.
- **Measured live:**
  - Header: white, 78px, navy logo `#090B2F`.
  - "Book a Demo" `btn--primary`: bg `#2D36EC`, white, FK Grotesk 16px/500, padding 16px 20px, height 48, radius 10. Hover keeps the bg and adds a glow `0 6px 18px 2px rgba(45,54,236,0.3)`.
  - `btn--secondary`: lime `#DAFC02` with navy text, height 52, padding 18px 24px. Hover adds a lime glow.
  - `btn--transparent`: navy text that turns `#2D36EC` on hover.
  - Search input: height 50, bg `#F6F8FC`, 1px `#E0E1FB`, radius 10.
  - H1: 78/600 navy `#090B2F`. H2: 48/600. H3: 28/400. Eyebrow H5: 18/600 uppercase with +1px tracking. Body: 16/22.4 `#595961`.
  - Focus falls back to the browser default ring; there is no branded ring.
- **RSC rendered locally with Playwright** (the package CSS on a test page, light scheme by default; a dark scheme exists behind `nx-html--enable-color-schemes`):
  - Primary button `#0F4FBD`, hover `#0B3B8E`, active `#1363EC`. Focus is a 2px white inset outline (offset −4px).
  - Secondary is white with a blue 1px border and text, hover `#D0E0FB`. Tertiary is a grey `#85857A` border.
  - All buttons: Open Sans 16/600, padding 7px 23px, height 40, radius 6. Small is 14px, about 30px high.
  - Text input box: height 40, 1px `#85857A`, radius 6, hover border `#0D0D0C`. Focus is an outline in `#0F4FBD`. Invalid is `#B81414`. Placeholder `#6A6A62`.
  - Dropdown menu: white, radius 6, items 32px high (padding 4px 16px), hover `#E7E7E4`, selected `#D0E0FB`, with the 3-layer indigo shadow above.
  - Tabs: underline, 2px active border in blue, active text 600, 56px high. Tags: pill, radius 16, 14/600.
  - Tile (card): white on site bg `#F4F5FB`, radius 6, padding 24, no shadow. Page header: white with a 1px `#DADFF1` bottom border.
  - Alerts: info `#0F4FBD` on `#E7EFFD`, success `#107046` on `#E9FCF4`, warning `#C85204` on `#FFF6F0`, error `#B81414` on `#FCE8E8`, all radius 6.
  - Spacing: `--nx-spacing-base: 4px`, `--nx-border-radius: 6px`, `--nx-font-family: Open Sans`, mono Courier Prime.
- **Mixing rule I applied:**
  - From the brand: colours, font, and the 10px radius on buttons and inputs.
  - From RSC: component sizes (40/30px controls), 32px menu items, underline tabs, status colours, the menu shadow, the 4px grid, and the warm-grey disabled and control-border colours.
  - The secondary button follows the RSC outline pattern in brand blue.
  - If a closer match to the shipped product is wanted instead, use the RSC values directly: primary `#0F4FBD`, Open Sans (a free Google Font), radius 6.
- **Header/banner:** the marketing nav is white. Navy `#090B2F` is the brand's dark surface (hero, logo, footer). I propose navy for the Bluebird brand banner with a white reversed logo. The live site uses a navy logo on white and white type on navy sections. No published clear-space rule.

## Sources
- https://www.sonatype.com/ — Playwright, live computed styles, `:root` vars, `@font-face` (FK Grotesk 300–600, FK Screamer 400–700, pressio-compressed) and hover states. Brand colours, type and marketing buttons are **high** confidence. The Osano consent banner offered no reject option, so it was closed with X; no tracking was accepted.
- https://www.npmjs.com/package/@sonatype/react-shared-components (v14.0.11, released 2025-12-15). Tarball: https://registry.npmjs.org/@sonatype/react-shared-components/-/react-shared-components-14.0.11.tgz. This is the **public design-system code**. Its CSS was rendered locally for the product-UI values (**high** confidence for current product UI anatomy).
- **Judgement, medium confidence:**
  - primaryHover `#1D26C9` and primaryActive `#414AFF`, taken from Sonatype's own Osano brand config, not from a site button
  - the card and modal radius of 10
  - the navy banner choice
  - the focus ring in brand blue
- Google fallbacks are my judgement: **Hanken Grotesk** (or Inter) for FK Grotesk, and **Anton** for the FK Screamer condensed display. **Open Sans** is the exact product-UI font and is free.

## Differs from current Figma
- **Primary:** Figma has `#1B1C30`. That is a dark ink, not Sonatype's action colour. The live brand primary is **`#2D36EC`**, used for CTAs, links and focus, and the nearest live dark is **`#090B2F`** (secondary, logo, dark sections).
- **Secondary:** Figma has `#6C41ED` (violet). It does **not appear** in the current brand. It most likely comes from Sonatype's previous purple-era brand; RSC still carries a `purple` swatch (hue 259), but only as a data-vis colour. Replace it with navy **`#090B2F`** and add lime **`#DAFC02`** as the accent.
- The **theme stays light**. Use a cool blue-grey page `#F4F5FB` with a white surface. The radius should be 10px for brand controls (6px if mirroring RSC), not the AkzoNobel values.
