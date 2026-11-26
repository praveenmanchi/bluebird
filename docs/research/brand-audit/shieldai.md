# Shield (formerly Shield AI) (shieldai)

## Summary
- **Rename:** the live site title is "… | Shield" and the header logo is `shield-logo.svg` (alt "Shield", uploaded to `/2026/10/`), consistent with the rename to "Shield" on 2026-10-28. The legal footer still reads "© 2026 Shield AI. All rights reserved." A web search did not surface a rename announcement, so the date comes from the brief. **Keep the id `shieldai`. Show "Shield" as the brand name and use the new wordmark.**
- **Look:** near-black dark theme (`#050506` page), white text, and **zero radius everywhere**. Thin 1px translucent borders do the work of shadows.
- **Type:** big tight-tracked **Kern Standard** headlines (−4% letter spacing). All UI chrome (nav, buttons, dates, labels) is **KH Teka Mono, 12px, UPPERCASE, wide tracking**, often in brackets like `[NEWS]` and `[NOVEMBER 4, 2026]`.
- **Accent:** a single warm orange-red **`#FF6343`** (`--color-primary`). It shows as a 15%-tint button with orange corner brackets that fills solid orange on hover, and as the nav-link hover colour.
- No public design system exists. The product UI (Hivemind) is not public. Everything below comes from the live marketing site.

## Proposed tokens
```json
{
  "id": "shieldai",
  "theme": "dark",
  "colors": { "primary": "#FF6343", "primaryHover": "#FF6343", "primaryActive": null, "secondary": "#1F1F1F",
              "accent": ["#EAEAEA", "#7A7A7A"], "link": "#FFFFFF", "focusRing": "#FF6343",
              "headerBg": "#050506", "headerText": "#FFFFFF", "pageBg": "#050506", "surface": "#1F1F1F", "border": "#2B2B2B",
              "textPrimary": "#FFFFFF", "textSecondary": "#7A7A7A", "textDisabled": "#505051",
              "success": null, "warning": null, "error": null, "info": null,
              "neutralRamp": { "page": "#050506", "900": "#0F0F0F", "850": "#1E1E1E", "carbon": "#1F1F1F", "border": "#2B2B2B", "600": "#505051",
                               "gray": "#777777", "steel": "#7A7A7A", "cloud": "#EAEAEA", "white": "#FFFFFF" } },
  "typography": { "uiFamily": "KH Teka Mono", "displayFamily": "Kern Standard", "monoFamily": "KH Teka Mono", "proprietary": true,
                  "googleFallbackUi": "IBM Plex Mono", "googleFallbackDisplay": "Inter Tight",
                  "bodySize": 15, "bodyLineHeight": 18, "weights": { "regular": 400, "medium": 400, "semibold": 400, "bold": 400 },
                  "headingScale": [100, 76, 42, 36, 20] },
  "radius": { "button": 0, "input": 0, "card": 0, "chip": 0, "modal": 0 },
  "button": { "height": { "sm": 42, "md": 48, "lg": 54 }, "paddingX": 24, "minWidth": null, "fontSize": 12, "fontWeight": 400, "textTransform": "uppercase", "borderWidth": 1,
              "primary": { "bg": "#2A1310", "text": "#EAEAEA", "hoverBg": "#FF6343", "activeBg": "#FF6343", "disabledBg": "#1F1F1F", "disabledText": "#505051" },
              "secondary": { "bg": "#0F0F10", "text": "#EAEAEA", "border": "#2B2B2B", "hoverBg": "#FF6343" },
              "ghost": { "text": "#FFFFFF", "hoverBg": "#1E1E1F" },
              "focus": { "style": "outline", "width": 1, "offset": 2, "color": "#FF6343" } },
  "input": { "height": 42, "border": "#2B2B2B", "borderWidth": 1, "radius": 0, "placeholder": "#7A7A7A", "focusBorder": "#FF6343", "errorBorder": null },
  "dropdown": { "menuBg": "#0F0F0F", "menuRadius": 0, "itemHeight": 54, "itemHoverBg": "#1E1E1F", "itemSelectedBg": "#1E1E1F", "itemSelectedText": "#FF6343", "shadow": "none" },
  "tabs": { "style": "boxed", "activeIndicator": "#FF6343", "activeText": "#FFFFFF" },
  "elevation": { "card": "none", "menu": "none", "modal": "none" },
  "spacingBase": 4,
  "iconStyle": "minimal thin line glyphs (arrow-up-right, close X); square corner-bracket frames as a decorative motif"
}
```

### Evidence notes
- **`:root` tokens (live):**
  - `--color-primary: #ff6343`, `--color-carbon: #1f1f1f`, `--color-cloud: #eaeaea`, `--color-steel: #7a7a7a`, `--color-gray: #777`, `--color-base: #fff`
  - `--font-base: "Kern-StandardRegular"`, `--font-primary: KHTekaMono-Regular`, `--font-size: 15px`
  - The rest are default WordPress presets, not brand tokens.
- **Body:** bg `#050506`, text `#FFFFFF`, Kern 15px/18px.
  - H1: 100px/100px, −4px tracking.
  - H2: 76px/76px, −3.04px tracking.
  - Everything is weight 400. No bold weight is loaded.
- **Primary CTA** (`a.button.button--red`, header "CONTACT US"):
  - Default: bg `rgba(254,99,66,0.15)`, which composites over the page to about **`#2A1310`**; the screenshot pixel is `#27100B`. Border 1px `rgba(255,99,67,0.15)`, text `#EAEAEA`.
  - Type and size: KH Teka Mono 12px uppercase, tracking 0.84px (0.07em). Padding 16.8px 24px, height 48, radius 0. Orange corner-bracket ticks sit on the four corners.
  - Hover: bg `#FF6343`, text `#FFFFFF`.
- **Neutral button** (`a.button`): bg `rgba(255,255,255,0.05)`, 1px `rgba(255,255,255,0.15)` border (about `#2B2B2B` on the page), text `#EAEAEA`, heights 42 and 54.
  - On light sections, `button--white` is black text on `rgba(0,0,0,0.024)` with a `rgba(0,0,0,0.15)` border.
  - Both variants fill `#FF6343` with white text on hover.
- **Nav links:** KH Teka Mono 12px uppercase, padding 20px 13.6px, height 54. Hover: text `#FF6343` on `rgba(255,255,255,0.1)`. This is the basis for the dropdown and tab hover values.
  - The mobile menu close button is `#1F1F1F`, 71×71 and square.
- **Focus:** the site shows **no custom focus style**; nav and buttons have `outline: none`. The focus ring above (1px `#FF6343`, 2px offset) is a proposal that fits the corner-bracket look.
- **Status colours:** none appear on the public site, so they are null. Keep the current Bluebird status set, or derive one tuned for dark mode.
- **Inputs, dropdowns and tabs:** not observed. The contact page (`/contact/`) timed out in headless Chromium, and no workaround was attempted. Those values are **inferred** from the button and nav patterns.
- **Logo:** the new "Shield" wordmark SVG has `fill="white"`. It is designed reversed, white on black. No published clear-space rule.

## Sources
- https://shield.ai/ — Playwright, live computed styles, `:root` vars, `@font-face`, hover states and screenshot. Colours, type and buttons are **high** confidence for the marketing site.
- https://shield.ai/hivemind/ — product page, live. It confirms the same palette, buttons and fonts (**high**).
- https://shield.ai/wp-content/uploads/2026/10/shield-logo.svg — the logo file (white fills) (**high**).
- https://shield.ai/contact/ — timed out (no data).
- **Inferred, low confidence:**
  - input
  - dropdown
  - tabs
  - focus ring
  - disabled colours
  - Hivemind and the product UI are not publicly documented.
- Web search for the rename found no announcement, so the rename date relies on the brief. The site itself shows the "Shield" branding.
- Google fallbacks are my judgement:
  - **Inter Tight** for Kern Standard, with tight tracking (−0.04em) at display sizes.
  - **IBM Plex Mono** for KH Teka Mono (alternative: Space Mono).
  - Plain **Inter** works for small body text.

## Differs from current Figma
- **Primary:** Figma has `#701000` (dark maroon). Live it is **`#FF6343`** (bright orange-red), a large difference. The maroon may come from the old Shield AI brand. Treat `#FF6343` as the accent and text-hover colour, and use the 15% tint on black (about `#2A1310`) as the resting fill of primary buttons. That is close to what Figma's dark maroon was trying to express.
- **Secondary:** Figma has `#2B2B2B`. The live carbon is **`#1F1F1F`** (`--color-carbon`). `#2B2B2B` matches the effective **border** colour (white 15% on `#050506`), so keep it as the border token.
- The **theme must be dark** (page `#050506`). Radius should be **0** everywhere, with uppercase mono labels. Remove the AkzoNobel radii and Noto Sans semibold weights. The brand uses a single 400 weight.
- **Brand name in the banner:** "Shield", not "Shield AI".
