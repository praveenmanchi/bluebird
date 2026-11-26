# GE Vernova — brand UI audit

Audited 2026-11-25 (agent-gev-hertz-omnicom). gevernova.com loaded normally in headless Chromium. The site publishes its own token set as `--ge-*` CSS custom properties on `:root` (colour ramps, button and control states, font aliases), so most values are **live tokens plus computed styles**. There is no public GE Vernova design system or token package (the old GE Digital "Predix" system is retired and is not the Vernova brand).

## Summary
- **Evergreen `#005E60`** is the brand colour (`--ge-evergreen`). It is used for link text, secondary buttons, checked controls and dark hero bands (`#004746`/`#012D2F`).
- The signature move is **Urgency Green `#C8FF08`** (lime) as the primary CTA fill with **evergreen text**. On hover the button flips to an evergreen fill with white text.
- **Pill buttons** (30px radius, 56px tall, 2px border) sit next to cards with an **asymmetric corner**: 8px radius with a **16px bottom-right** corner.
- Type is **Inter** (self-hosted as `ge-inter-*`) for UI, plus a tall condensed display face **"GE Sons Condensed" ExtraBold in UPPERCASE** for hero headlines.
- The page is light (white `#FFFFFF`, text `#212121`), with full-bleed dark evergreen heroes, mint tint bands (`#E4F1F1`/`#F5FBFB`) and teal-tinted neutrals.

## Proposed tokens
```json
{
  "id": "gevernova",
  "theme": "light",
  "colors": { "primary": "#005E60", "primaryHover": "#004746", "primaryActive": "#004746", "secondary": "#C8FF08", "accent": ["#59C3C9", "#75CA64", "#BFA682", "#DAFE5E"], "link": "#005E60", "focusRing": "#2288C3",
              "headerBg": "#005E60", "headerText": "#FFFFFF", "pageBg": "#FFFFFF", "surface": "#FFFFFF", "border": "#D7DBDB", "textPrimary": "#212121", "textSecondary": "#737373", "textDisabled": "#979B9B",
              "success": "#12A141", "warning": "#F19F39", "error": "#BD3228", "info": "#2288C3",
              "neutralRamp": { "0": "#FFFFFF", "100": "#FAFAFA", "200": "#EAEBEB", "300": "#D7DBDB", "400": "#C5C9C9", "500": "#979B9B", "600": "#737373", "700": "#595959", "800": "#333333", "900": "#212121", "1000": "#171717", "1100": "#0A0A0A" } },
  "typography": { "uiFamily": "Inter", "displayFamily": "GE Sons Condensed", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Inter", "googleFallbackDisplay": "Barlow Condensed",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 }, "headingScale": [84, 68, 32, 24, 18] },
  "radius": { "button": 30, "input": 4, "card": 8, "chip": 9999, "modal": 8 },
  "button": { "height": { "sm": 44, "md": 56, "lg": 56 }, "paddingX": 22, "minWidth": 120, "fontSize": 16, "fontWeight": 600, "textTransform": "none", "borderWidth": 2,
              "primary": { "bg": "#C8FF08", "text": "#005E60", "hoverBg": "#005E60", "activeBg": "#004746", "disabledBg": "#E7EEEE", "disabledText": "#B2CCCC" },
              "secondary": { "bg": "transparent", "text": "#005E60", "border": "#005E60", "hoverBg": "#005E60" },
              "ghost": { "text": "#005E60", "hoverBg": null },
              "focus": { "style": "no custom ring: native outline (auto) on buttons; fields change border colour", "width": 1, "offset": 0, "color": "#2288C3" } },
  "input": { "height": 56, "border": "#C5C9C9", "borderWidth": 1, "radius": 4, "placeholder": "#737373", "focusBorder": "#2288C3", "errorBorder": "#DC3545" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": null, "itemHeight": null, "itemHoverBg": null, "itemSelectedBg": "#005E60", "itemSelectedText": "#FFFFFF", "shadow": null },
  "tabs": { "style": "pill", "activeIndicator": "#005E60", "activeText": "#FFFFFF" },
  "elevation": { "card": "none", "menu": null, "modal": null },
  "spacingBase": 8,
  "iconStyle": "outline line icons (custom GE icon font `ge-corporate-icons`/icomoon, Material-style); circular lime icon buttons"
}
```

### Notes behind the values
- **Buttons** (`.ge-btn`, `--ge-button-*`): 56px tall (small variant 44px), `border-radius: 1.875rem` (30px), 2px border, min-width 7.5rem (120px), padding `1.1rem 1.375rem`, Inter SemiBold 16px, no uppercase.
  - Primary: bg `#C8FF08`, text and icon `#005E60`. Hover: bg and border `#005E60`, text `#FFFFFF` (measured live with Playwright hover). Disabled: `#E7EEEE` bg, `#B2CCCC` text.
  - On dark bands the "primary-light" variant keeps the lime fill and its hover goes **white**.
  - Secondary: transparent, 2px `#005E60` border and text, filling evergreen on hover. The light variant uses a white border.
  - Tertiary (ghost): evergreen text with a **lime `#C8FF08` underline border**, which turns evergreen on hover.
  - Icon buttons are a lime circle with an evergreen glyph (`--ge-button-cir-*`). Hover: bg `#005E60`, glyph white.
- `primaryActive` comes from `--ge-control-primary-bg-active: #004746`. The site defines no separate pressed state for the lime CTA.
- **Tags/chips** (`--ge-button-tag-*`): transparent pill with a `#519595` border and evergreen text. Selected state: `#005E60` fill, white text. These are mapped to `tabs.style: pill`. The hero carousel also uses lime progress underlines.
- **Form fields** (`.form-control/.form-select`): 1px `#C5C9C9` border, 4px radius, 16px padding (56px tall), text `#737373`. Hover border `#212121`, focus border `--ge-blue-600 #2288C3`. Errors use Bootstrap `#DC3545`, so the brand red `#BD3228` stays the status token.
  - The site search field is a separate style: 56px tall, 8px radius, `rgba(0,0,0,.1)` border, and a lime circular submit button.
- **Checkbox/radio**: 24–25px boxes with a 2px `#C5C9C9` border, 4px radius (radio is round), checked fill `#005E60`.
- **Cards**: flat, no shadow. Images use 4px radius. Feature cards use `border-radius: .5rem; border-bottom-right-radius: 1rem`, a distinctive "cut" corner worth copying. Quick-link cards use a 1px `#CDE4E4` border.
- **Links**: Inter SemiBold 16px `#005E60` with no underline and an arrow icon. Hover lightens to `#287F82` (`--ge-light-evergreen`). `--ge-link-color #40CD24` exists but is not used for visible body links.
- **Headings** (measured):
  - Hero h2: GE Sons Condensed ExtraBold, 84/80, uppercase, white.
  - h1: Inter Medium, 68px, −2.04px tracking.
  - Section h2: Inter Medium, 32/40, −0.96px tracking.
  - Card h3: Inter Medium, 24/32.
  - Eyebrow: 14/20 in `#737373`.
  - Hero body: 18/28 in `#E4F1F1` on evergreen.
- **Header**: on the homepage the nav is transparent over the dark hero, with white Inter 16px links. Inner pages such as /search use a solid dark evergreen band (about `#004746`, read from a screenshot, so low confidence). For the Bluebird banner use evergreen `#005E60` with a white logo.
- **Status**: success `--ge-green-700 #12A141`, warning `--ge-alert-3 #F19F39` (the alert ramp runs `#EC642B` → `#BD8C17`), error `--ge-red-600 #BD3228`, info `--ge-blue-600 #2288C3`.
- **Evergreen ramp** (`--ge-evergreen-100…1100`): `#F5FBFB #E4F1F1 #CDE4E4 #ACD2D2 #7AB8B8 #519595 #2C6C6D #005E60 #004746 #002829 #012D2F`.
- **Urgency-green ramp**: `#FCFFF0 #F4FFCC #E9FF99 #C8FF0A #C8FF08 #6F8A0F #4C6100 #384800`.

### Suggested fills for unknowns (derived, not measured)
- Dropdown menu: white surface, 8px radius (matches the search field and cards), 40px items, hover `#E4F1F1` (evergreen-200), selected evergreen and white as in the tag tokens, shadow `0 4px 12px rgba(0,0,0,.12)`.
- Focus ring: 2px `#2288C3` with a 2px offset. This matches the field focus colour. The site itself relies on the browser default.

## Typography
- UI font: **Inter** (self-hosted as `ge-inter-regular/medium/semibold/bold`). It is a free Google Font, so the Figma fallback is Inter itself.
- Display font: **GE Sons Condensed** (`ge-sons-condensed-semibold/extrabold`), a proprietary condensed face used only for uppercase hero headlines. The closest free option is **Barlow Condensed** 800; Oswald 700 is a second choice.
- Body text is 16/24. Weights seen loaded: 400, 500, 600 (700 is declared but not used on the homepage).

## Logo
- The GE monogram in a circle plus the "GE VERNOVA" wordmark. It appears **white on the dark evergreen hero** (live), so a reversed white logo on the brand colour is in real use.
- No official GE Vernova clear-space rule was found. Legacy GE guidance (25% of the monogram diameter) is a different, pre-split standard. Do not apply it as fact.

## Sources
- https://www.gevernova.com/ — `:root` `--ge-*` tokens (colours, button/control states, fonts) plus computed styles and hover/focus of the primary button and links via Playwright. **Live tokens, high confidence.**
- https://www.gevernova.com/search?keys=turbine — search input, inner-page header, cards. **Live computed, high.** The header hex was read from a screenshot (low).
- Site CSS bundles `https://www.gevernova.com/sites/default/files/css/css_*.css` (theme `ge_vernova_unified`) — `.ge-btn`, `.form-control`, `.form-checkbox`, card radii. **Live stylesheet, high.**
- https://interbrand.com/work/ge-vernova and https://madegooddesigns.com/?p=126334 — brand background only, no specs (low).
- https://www.ge.com/news/reports/the-initials-of-a-friend-a-history-of-ges-iconic-monogram-logo — monogram history only (low).

## Differs from current Figma
- GE Vernova is a **new brand**: there is no mode in the current Figma table. The earlier quick value (another file) was primary `#005E60`, and this audit **confirms** it.
- No secondary was recorded earlier. Add **`#C8FF08` Urgency Green** as secondary. It is the primary CTA fill (with `#005E60` text), not a status colour.
- The AkzoNobel-copied defaults need replacing: pill 30px buttons at 56/44px, Inter, teal-tinted greys (`#D7DBDB`/`#C5C9C9`/`#737373`), evergreen banner.
