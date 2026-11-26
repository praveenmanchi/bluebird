# Meta — corporate web UI (meta.com, about.meta.com)

## Summary
Meta does not publish a public design system, so this audit uses computed styles from meta.com (the Meta Store) and about.meta.com (the corporate site). It does **not** use the Facebook app blue (`#0866FF`). Meta's corporate UI is a very clean white interface built on the proprietary **Optimistic** typeface, with one vivid **Meta Blue `#0064E0`** for primary CTAs and blue links. Buttons are always **full pills** (radius 100 px), content cards use a soft **24 px** radius with no borders or shadows, and surfaces are near-white blue-greys (`#F8F9FB`, `#F3F4F5`). Text is a slate blue-black `#1C2B33` (corporate) or `#111112` (store), with grey `#686A6E` / `#465A69` for secondary copy. The focus ring is a dark blue `#0143B5`, 3 px with a 2 px offset. Search fields are white pills with a soft shadow. The header is plain white (transparent over hero video), with the blue-gradient infinity logo and a black wordmark.

## Proposed tokens
```json
{
  "id": "meta",
  "theme": "light",
  "colors": { "primary": "#0064E0", "primaryHover": "#0050B3", "primaryActive": "#0143B5", "secondary": "#1C2B33",
              "accent": ["#0082FB", "#0040DC"], "link": "#0040DC", "focusRing": "#0143B5",
              "headerBg": "#FFFFFF", "headerText": "#1C2B33", "pageBg": "#FFFFFF", "surface": "#F3F4F5", "border": "#CBD2D9",
              "textPrimary": "#1C2B33", "textSecondary": "#465A69", "textDisabled": "#768591",
              "success": "#31A24C", "warning": "#F7B928", "error": "#E41E3F", "info": "#0064E0",
              "neutralRamp": { "0": "#FFFFFF", "50": "#F8F9FB", "100": "#F3F4F5", "300": "#CBD2D9", "500": "#768591",
                               "600": "#686A6E", "700": "#465A69", "800": "#1C2B33", "900": "#111112" } },
  "typography": { "uiFamily": "Optimistic Text", "displayFamily": "Optimistic Display", "monoFamily": "Optimistic Mono", "proprietary": true,
                  "googleFallbackUi": "Inter", "googleFallbackDisplay": "Montserrat",
                  "bodySize": 15, "bodyLineHeight": 22, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [15, 18, 24, 27, 36, 48, 61] },
  "radius": { "button": 100, "input": 9999, "card": 24, "chip": 100, "modal": 24 },
  "button": { "height": { "sm": 36, "md": 44, "lg": 52 }, "paddingX": 20, "minWidth": null, "fontSize": 16, "fontWeight": 700, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#0064E0", "text": "#FFFFFF", "hoverBg": "#0050B3", "activeBg": "#0143B5", "disabledBg": "#F3F4F5", "disabledText": "#768591" },
              "secondary": { "bg": "#F3F4F5", "text": "#111112", "border": "#F3F4F5", "hoverBg": "#E8EAED" },
              "ghost": { "text": "#0040DC", "hoverBg": "#F3F4F5" },
              "focus": { "style": "solid outline outside the pill", "width": 3, "offset": 2, "color": "#0143B5" } },
  "input": { "height": 48, "border": "#8D8D8E", "borderWidth": 1, "radius": 9999, "placeholder": "#686A6E", "focusBorder": "#0143B5", "errorBorder": "#E41E3F" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 12, "itemHeight": 40, "itemHoverBg": "#F3F4F5", "itemSelectedBg": "#E7F0FD", "itemSelectedText": "#0064E0", "shadow": "0 5px 16px rgba(10,19,23,0.12)" },
  "tabs": { "style": "pill", "activeIndicator": "#1C2B33", "activeText": "#FFFFFF" },
  "elevation": { "card": "none", "menu": "0 5px 16px rgba(10,19,23,0.12)", "modal": "0 5px 16px rgba(10,19,23,0.12)" },
  "spacingBase": 8,
  "iconStyle": "outline, rounded terminals, 1.5–2 px stroke at 24 px (Meta product icon set; not public)"
}
```

### Notes on values
- **Two blues on live sites.** about.meta.com CTAs ("Our mission") are `#0064E0`, going to `#0050B3` on hover. The meta.com store "Shop" CTA is the deeper `#0040DC`, which *lightens* to `#0064E0` on hover. Text links on both sites are `#0040DC` and go to `#0064E0` on hover, with no underline. For the plugin, use `#0064E0` as primary (it is also the start colour of the logo gradient) and `#0040DC` for links.
- **Buttons.** Corporate: 44 px tall, padding 11/20, 16 px bold (700), letter-spacing 0.08 px. Store: 52 px tall, padding 14/30, 15 px semibold. Every button is a pill. The store's secondary button is a translucent light grey (`rgba(243,244,245,0.7)`) with `#111112` text. On white, that grey reads as `#F3F4F5`.
- **Focus.** Measured as `outline: 3px solid #0143B5; outline-offset: 2px` on buttons and links. The search field shows a 1 px `#0143B5` ring on its pill container.
- **Input.** The help-centre search field is a 58 px white pill (radius 9999). Its edge comes from the shadow `0 5px 16px rgba(10,19,23,0.12)` plus a faint violet glow, not from a border. A 48 px height is proposed for compact forms. The neutral border, `rgba(17,17,18,0.45)`, flattens to about `#8D8D8E` on white.
- **Cards.** Radius 24 px (about 40 instances measured), sometimes 32 px for large promo tiles. They use a fill (`#F8F9FB` / `#F3F4F5`) or imagery, with no border and no shadow. The only border measured was 1 px `#CBD2D9`.
- **Header.** 64 px tall, white or transparent over the hero, logo on the left. Nav items are 15 px pill-shaped hover targets (radius 24, padding 4/12).
- **Type.** Fonts loaded: Optimistic Text (400/500/700), Optimistic Display (200–800), Optimistic AI VF and Optimistic Mono VF. Meta's own CSS fallback stack is `"Optimistic AI VF", Montserrat, Helvetica, Arial`. Montserrat is therefore Meta's declared fallback and fits display sizes. Inter is proposed for dense UI text, where Montserrat sets too wide. Measured sizes: body 15/22 and 16/24, light lead 18/21.6 w300, H2 36/43 and 48/53–58 at weight 500, hero 61/70 w500.
- **Status colours are not visible** on the corporate sites. The values given are Meta's product (Facebook/XDS) palette: success `#31A24C`, warning `#F7B928`, error `#E41E3F`. Confidence: low.
- **Dropdown, tabs and modal** were not observable on the public pages without logging in. Those values extrapolate from the measured pill, 24 px card and 12 px inner-container patterns. Confidence: low.
- **Logo.** The Meta logo comes in four colour variants: two primary (blue-gradient symbol with a black or white wordmark) and two mono (black or white). Meta says to use mono only when a primary variant cannot perform. **On a Meta Blue banner, use the mono white variant**, because the gradient symbol disappears on blue. Clear space is twice the symbol height on every side. Minimum size is 12 px (5 mm) symbol height. Every use of the logo requires Meta Brand Review approval.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Primary/link/hover/focus colours, button sizes, radius, text colours, surfaces, header | Live computed style (Playwright, 2026-11-25): https://about.meta.com/ and https://www.meta.com/ | high |
| Input pill, shadow, focus | Live computed style: https://www.meta.com/help/ | high |
| Fonts (Optimistic family, Montserrat fallback) | `document.fonts` and `font-family` stack on meta.com | high |
| Logo variants, clear space, minimum size | https://www.meta.com/brand/resources/meta/company-brand/ | high |
| Logo gradient end `#0082FB` | General brand knowledge, not measured | medium |
| Status colours, dropdown, tabs, modal | Meta product (Facebook) palette and extrapolation; no public design system | low |
- https://about.meta.com/
- https://www.meta.com/
- https://www.meta.com/help/
- https://www.meta.com/brand/resources/
- https://www.meta.com/brand/resources/meta/company-brand/

## Differs from current Figma
- **New brand.** It is not in the Figma file yet.
- Use primary `#0064E0` (hover `#0050B3`, focus `#0143B5`) and links `#0040DC`. Do not use the Facebook blue `#0866FF`.
- Meta has no secondary brand hue. Use slate `#1C2B33` for secondary/strong UI, and the grey pill `#F3F4F5` for secondary buttons.
- Structural changes from the AkzoNobel copy-over: pill buttons and inputs, 24 px cards, no shadows on cards, Inter for UI with Montserrat for display instead of Noto Sans, a white header, and a white mono logo if the banner is blue.
