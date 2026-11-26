# Omnicom (Omnicom Global Solutions) — brand UI audit

Audited 2026-11-25 (agent-gev-hertz-omnicom). Source: **omnicomglobalsolutions.com** (OGS), as requested. It is a Next.js + Tailwind v4 site with an `@theme` token set on `:root, :host` (`--color-opposite`, `--color-nearly`, `--color-violet`…), measured live with Playwright on the home and "Life at OGS" pages.
- OGS is a marketing microsite with **no forms, no text buttons and no menus**, so button, input and dropdown values are mostly unknown (null) and appear only under "suggested fills".
- The parent site **omc.com** uses a completely different system (black and white, Instrument Sans + Cormorant Garamond, WordPress). It was not used for tokens.

## Summary
- **Deep indigo `#262250`** (`--color-opposite`, used as `ink` and `hero`) carries all text, the footer and dark bands. **Lavender `#EBE5EF`** (`--color-nearly`, used as `surface`) is the page and header background, so the whole site reads lavender-on-indigo.
- **Violet `#8971FF`** (plus `#7C69F4`/`#A96AF7`) for section headings and the infographic nodes. **Orange `#FFA300`** (plus `#F39A33`) for bold highlighted phrases. Pastel mint `#B0FCCA`, cyan `#C9FFF6` and lime `#F0FFB8` serve as tile tints.
- Type is **Gotham** (Black 900 headlines with tight negative tracking, Regular body) paired with **Lora** serif for small captions and underlined "see more" links.
- Shape is **square**: tiles and cards have 0 radius with a 1px indigo/25% border. Round shapes appear only in icon buttons (`rounded-full`) and the 20px-radius media cards with a soft, deep shadow.
- Navigation is big and typographic: 28px nav links, and the active link goes Black 900 with an underline.

## Proposed tokens
```json
{
  "id": "omnicom",
  "theme": "light",
  "colors": { "primary": "#262250", "primaryHover": null, "primaryActive": null, "secondary": "#FFA300", "accent": ["#8971FF", "#7C69F4", "#A96AF7", "#F39A33", "#B0FCCA", "#C9FFF6", "#F0FFB8"], "link": "#262250", "focusRing": "#262250",
              "headerBg": "#262250", "headerText": "#EBE5EF", "pageBg": "#EBE5EF", "surface": "#FFFFFF", "border": "#C9C8D3", "textPrimary": "#262250", "textSecondary": "#615D80", "textDisabled": null,
              "success": null, "warning": null, "error": null, "info": null,
              "neutralRamp": { "0": "#FFFFFF", "50": "#EBE5EF", "100": "#DBD5E2", "150": "#D9D5DD", "200": "#C9C8D3", "700": "#2E2A63", "800": "#2B2658", "900": "#262250", "950": "#25224D" } },
  "typography": { "uiFamily": "Gotham", "displayFamily": "Gotham", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Montserrat", "googleFallbackDisplay": "Montserrat",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": null, "semibold": 600, "bold": 700 }, "headingScale": [64, 44, 36, 28] },
  "radius": { "button": 9999, "input": null, "card": 0, "chip": null, "modal": 20 },
  "button": { "height": { "sm": 40, "md": 48, "lg": 80 }, "paddingX": null, "minWidth": null, "fontSize": null, "fontWeight": null, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": null, "text": null, "hoverBg": null, "activeBg": null, "disabledBg": null, "disabledText": null },
              "secondary": { "bg": "#FFFFFF", "text": "#262250", "border": "#D4D3DC", "hoverBg": null },
              "ghost": { "text": "#262250", "hoverBg": null },
              "focus": { "style": "box-shadow ring (Tailwind ring-2) in ink at 30% opacity", "width": 2, "offset": 0, "color": "#262250" } },
  "input": { "height": null, "border": null, "borderWidth": null, "radius": null, "placeholder": null, "focusBorder": null, "errorBorder": null },
  "dropdown": { "menuBg": null, "menuRadius": null, "itemHeight": null, "itemHoverBg": null, "itemSelectedBg": null, "itemSelectedText": null, "shadow": null },
  "tabs": { "style": "underline", "activeIndicator": "#262250", "activeText": "#262250" },
  "elevation": { "card": "none", "menu": null, "modal": "0 20px 60px rgba(0,0,0,0.18)" },
  "spacingBase": 4,
  "iconStyle": "thin outline line icons (chevrons/arrows) inside round white icon buttons"
}
```

### Notes behind the values
- **Theme tokens** (`:root, :host`):
  - `--color-opposite #262250`, `--color-nearly #EBE5EF`, `--color-complete #FFFFFF`, `--color-violet #8971FF`
  - `--color-mint #B0FCCA`, `--color-cyan #C9FFF6`, `--color-axis-lite #F0FFB8`, `--color-yellow #F3FFBF`
  - `--color-infographicback #2B2658`, `--color-locations-base #25224D`, `--color-locations-hover #8B7CF6`
  - Aliases: `--color-ink`/`--color-hero` = opposite, `--color-surface` = nearly
  - `--color-border` = `color-mix(oklab, ink 25%, white)` ≈ `#C9C8D3`
  - `--color-panel-2` = ink 8% into lavender ≈ `#DBD5E2`
- **Arbitrary colours in the CSS**: `#7C69F4`, `#A96AF7` (violet text), `#FFA300`, `#F39A33`, `#E6A23B` (orange highlights), `#2E2A63` (hero paragraph text), `#2A295B`, `#2B2D6E`, `#D9D5DD` (light panels), `#F6E9D5` (warm tile tint), `#1F1F1F`.
- **Body**: Gotham 16/24 `#262250` on `#EBE5EF`. Hero paragraphs: Gotham 26/39 `#2E2A63`, with highlighted phrases in **bold orange `#FFA300`**.
- **Headings**:
  - h2 hero: Gotham Bold 64px, line-height 0.92, tracking −0.04em.
  - Section h2: Gotham Black 900 at 44px, tracking −0.02em.
  - Accent h2: Gotham Black 36px in violet `#8971FF`.
  - Footer labels: 12px uppercase, tracking 0.08em, weight 900.
- **Header**: sticky, 101px tall, lavender `#EBE5EF` at 95% opacity with a bottom border in `--color-border`. Logo in indigo. Nav links are Gotham 28px; the active link is weight 900 with an underline.
  - The **footer and dark bands are indigo `#262250`** with lavender text (`text-nearly`), and the footer carries the OGS mark on indigo.
  - For the Bluebird brand-colour banner I propose **indigo `#262250` with a lavender/white logo**. The live site's top bar is lavender.
- **Tiles** (service cards are `<button>`s): 248×346, `bg-panel-2` (≈`#DBD5E2`), 1px `ink/25%` border, **0 radius**, no shadow.
- **Location rows**: full-width `#25224D` bars with white text, 16×32 padding. Hover moves to `#8B7CF6`.
- **Icon buttons**: 40px (carousel 48px) white circles with a 1px `ink/20%` border, indigo glyph. I mapped these to `secondary`, using `#D4D3DC` as the approximate border on white.
- **Media cards**: `rounded-[20px]` with `shadow-[0_20px_60px_rgba(0,0,0,0.18)]`. I mapped this to the modal radius and elevation.
- **Links**: Lora SemiBold 12px indigo, underlined with a 2px offset. Some links use `underline-offset-4/8`.
- **Focus**: `focus-visible:ring-2 ring-ink/30`, which is a 2px ring of `#262250` at 30% opacity (`#2622504D`). Elsewhere the browser default applies.
- **Text secondary**: `ink/70–80` on lavender, ≈ `#615D80` (computed blend).
- **Spacing**: Tailwind `--spacing: .25rem` (4px). The theme also defines `--radius-md: .375rem`.

### Suggested fills for unknowns (derived, not measured)
- **Primary button**: indigo `#262250` fill, lavender `#EBE5EF` text, hover violet `#7C69F4`, active `#25224D`. Square (0–2px) radius to match the tiles, 40/48px tall, Gotham Bold 14–16px, no uppercase.
- **Disabled**: `#D9D5DD` bg with `#615D80` text.
- **Inputs**: white, 1px `#C9C8D3` border, 0 radius, 44px tall, focus border `#262250` plus the 30% ring, error `#D93F3F`. The site has no status palette, so error, success and info need neutral picks. Suggested: error `#D93F3F`, success `#1F9D6B`, warning `#FFA300`, info `#7C69F4`.
- **Dropdown**: white menu, 0 radius, 40px items, hover `#EBE5EF`, selected `#262250` with lavender text, shadow `0 20px 60px rgba(0,0,0,.18)` scaled down to `0 8px 24px rgba(0,0,0,.12)`.

## Typography
- **Gotham** (Hoefler & Co.) is proprietary and self-hosted at weights 300/400/500/700/900. The closest free Google Font is **Montserrat**. It is wider than Gotham, so drop letter-spacing slightly for headlines; Black 900 exists for the heavy headings.
- **Lora** (serif) is a free Google Font, used at 12px for captions, card copy and "see more" links. Keep Lora as is.

## Logo
- The OGS mark is a sunburst "U" arc followed by "GS", in indigo on lavender. It also appears on the indigo footer, so a light/reversed logo on the brand colour is in real use.
- The footer line reads "A UNIT OF OMNICOM". No clear-space rule is published.

## Sources
- https://www.omnicomglobalsolutions.com/ — `:root` Tailwind theme tokens, computed styles (body, header, headings, tiles, icon buttons, links), focus classes from the site CSS. **Live, high confidence** for colour, type, shape and header. Buttons, inputs and dropdowns do not exist on the site (unknown).
- https://www.omnicomglobalsolutions.com/life-at-ogs — location rows, media cards (20px radius and shadow), carousel buttons. **Live, high.**
- https://www.omc.com/ — parent Omnicom site, checked for comparison only (Instrument Sans, black and white, link blue `#004FC9`). **Not used for tokens.**

## Differs from current Figma
- Omnicom is a **new brand**: there is no mode in the current Figma table. The earlier values read from this site's CSS are **confirmed**: indigo `#262250` primary, violet `#7C69F4`/`#8971FF`, orange `#FFA300` secondary, lavender `#EBE5EF` surfaces, Gotham + Lora.
- **Additions:** `#2E2A63`/`#25224D` dark variants, the pastel tile tints (`#B0FCCA`, `#C9FFF6`, `#F0FFB8`), border `#C9C8D3`, and square tiles with pill-only icon buttons.
- **Caveat:** the OGS site has no form controls or status colours, so those tokens are proposals, not brand evidence.
