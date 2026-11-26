# Amazon — amazon.com retail UI vs AWS Cloudscape

## Summary
Amazon has two very different UIs:
- **amazon.com retail** is dense and commerce-first. It has a near-black "squid ink" header (`#131921` belt over a `#232F3E` sub-nav), **yellow `#FFD814` pill CTAs** with black text, an orange `#FFA41C` Buy Now button, blue-teal links (`#2162A1`, recently changed from `#007185`), Arial/Amazon Ember text at 14/20, and grey pill secondary buttons with an `#888C8C` border.
- **AWS Cloudscape** is Amazon's public open-source B2B design system (AWS Console). It is light, with a dark `#0F141A` top navigation, blue `#006CE0` primary, **20 px pill buttons**, 8 px inputs and menus, 16 px containers, bold 14 px button labels and Open Sans.

**Recommendation: theme the plugin from Cloudscape.** It is the system Amazon itself built for professional tools. It has published, versioned tokens (`@cloudscape-design/design-tokens`) covering every state we need, and it meets WCAG AA. Retail yellow-on-black reads as "checkout", not "design tool". Keep the Amazon smile orange `#FF9900` as a brand accent only, for highlights and the logo on the dark banner.

## Proposed tokens
Based on Cloudscape, visual-refresh light mode.
```json
{
  "id": "amazon",
  "theme": "light",
  "colors": { "primary": "#006CE0", "primaryHover": "#002B66", "primaryActive": "#002B66", "secondary": "#FF9900",
              "accent": ["#FF9900", "#FFD814", "#7300E5"], "link": "#006CE0", "focusRing": "#006CE0",
              "headerBg": "#0F141A", "headerText": "#F9F9FA", "pageBg": "#FFFFFF", "surface": "#F6F6F9", "border": "#C6C6CD",
              "textPrimary": "#0F141A", "textSecondary": "#424650", "textDisabled": "#B4B4BB",
              "success": "#00802F", "warning": "#855900", "error": "#DB0000", "info": "#006CE0",
              "neutralRamp": { "0": "#FFFFFF", "50": "#F9F9FA", "100": "#F6F6F9", "150": "#F3F3F7", "200": "#EBEBF0", "250": "#DEDEE3",
                               "300": "#C6C6CD", "350": "#B4B4BB", "400": "#8C8C94", "500": "#656871", "600": "#424650",
                               "700": "#333843", "750": "#232B37", "800": "#1B232D", "850": "#161D26", "900": "#0F141A" } },
  "typography": { "uiFamily": "Open Sans", "displayFamily": "Open Sans", "monoFamily": "Monaco", "proprietary": false,
                  "googleFallbackUi": "Open Sans", "googleFallbackDisplay": "Open Sans",
                  "bodySize": 14, "bodyLineHeight": 20, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [14, 16, 18, 20, 24] },
  "radius": { "button": 20, "input": 8, "card": 16, "chip": 8, "modal": 16 },
  "button": { "height": { "sm": 28, "md": 32, "lg": 40 }, "paddingX": 20, "minWidth": null, "fontSize": 14, "fontWeight": 700, "textTransform": "none", "borderWidth": 2,
              "primary": { "bg": "#006CE0", "text": "#FFFFFF", "hoverBg": "#002B66", "activeBg": "#002B66", "disabledBg": "#EBEBF0", "disabledText": "#8C8C94" },
              "secondary": { "bg": "#FFFFFF", "text": "#006CE0", "border": "#006CE0", "hoverBg": "#F0FBFF" },
              "ghost": { "text": "#006CE0", "hoverBg": "#F0FBFF" },
              "focus": { "style": "2px ring outside the control, 4px focus-ring radius", "width": 2, "offset": 2, "color": "#006CE0" } },
  "input": { "height": 32, "border": "#8C8C94", "borderWidth": 1, "radius": 8, "placeholder": "#656871", "focusBorder": "#006CE0", "errorBorder": "#DB0000" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 8, "itemHeight": 32, "itemHoverBg": "#F3F3F7", "itemSelectedBg": "#F0FBFF", "itemSelectedText": "#0F141A", "shadow": "0 4px 20px 1px rgba(0,7,22,0.10)" },
  "tabs": { "style": "underline", "activeIndicator": "#006CE0", "activeText": "#006CE0" },
  "elevation": { "card": "none", "menu": "0 4px 20px 1px rgba(0,7,22,0.10)", "modal": "0 1px 1px 1px #E9EBED, 0 6px 36px rgba(0,7,22,0.10)" },
  "spacingBase": 4,
  "iconStyle": "outline, 2 px stroke, 16/20/24/32/48 px, Cloudscape icon set (@cloudscape-design/components Icon)"
}
```

### Notes on Cloudscape values (design-tokens 3.0.120, visual-refresh)
- **Buttons.** Primary hover and active are both `#002B66`. The normal (secondary) button has a 2 px `#006CE0` border with blue text. On hover it gets a `#F0FBFF` fill and its border and text turn `#002B66`. When pressed the fill is `#D1F1FF`. Disabled normal buttons have a `#B4B4BB` border and `#8C8C94` text. Comfortable density is 32 px tall with 20 px horizontal padding; compact is 28 px with 16 px padding.
- **Inputs.** Field border is 1 px. Focus turns the border `#006CE0` and adds a 2 px ring. The error state adds an 8 px coloured inline-start bar (`border-width-field-status-inline-start`). Compact inputs are 28 px.
- **Dropdown.** Container border is 2 px `#B4B4BB`. Hovered items get a `#8C8C94` border and `#F3F3F7` fill. Selected items are `#F0FBFF` with a 2 px `#006CE0` border. Matched filter text is `#006CE0`.
- **Status.** Text colours are success `#00802F`, warning `#855900`, error `#DB0000` and info `#006CE0`. Background tints are `#EFFFF1`, `#FFFEF0`, `#FFF5F5` and `#F0FBFF`. Alert and flashbar radius is 12 px with a 2 px border. The Gen-AI label colour is violet `#7300E5`.
- **Type.** `font-family-base` is `'Open Sans', 'Helvetica Neue', Roboto, Arial`. The AWS Console overrides this with Amazon Ember. All headings and buttons are weight 700. Heading sizes: XS 14/18, S 16/20, M 18/22, L 20/24, XL 24/30. Tabs are 16/20 bold.
- **Dark mode** exists: background `#161D26`, primary `#42B4FF` with `#0F141A` text. Cloudscape's top navigation and home header use `#0F141A` in both modes, which maps to our banner.
- **Shadows.** `shadow-card` is none, and `shadow-container-active` is listed above as the modal value. The dropdown shadow comes from the Cloudscape components CSS as I remember it and was not in the tokens package. Confidence: medium.

### Retail amazon.com values (if the client wants the shopping look instead)
- Header belt `#131921`, sub-nav `#232F3E`, footer `#161D26`. These are the CSS defaults from `nav-bluebeacon`. The live site was showing a seasonal Black Friday orange header (`#FF6200` / `#FF9946`) during the audit.
- Primary button: `#FFD814`, hover `#FFCE12`, active `#F8BD19`, text `#0F1111`. Buy Now (`.a-button-oneclick`): `#FFA41C`, hover `#FF8400`. Secondary: white with a 1 px `#888C8C` border, hover `#F7FAFA`. Disabled: `#F0F2F2` fill, `#D5D9D9` border, `#565959` text. Buttons measured as **pills** (radius 100 px), 32 px tall, 13–14 px regular text.
- Focus: `outline 2px solid #888C8C, offset 2px`. It is grey, not blue. Focused inputs also get a `#2162A1` border.
- Input: 32 px, 1 px `#888C8C` border, radius 8, padding 5/11, placeholder `#6F7373`. Error: `#C10015` border plus a 1 px inset ring.
- Dropdown: popover radius 8 with a 1 px `#BBBFBF` border. The active item is `#EDF8FF` with a 3 px `#2162A1` inset bar on the left.
- Text `#0F1111`, secondary `#565959`. Links `#2162A1`, hover `#0C3353` with underline. Price and error `#C10015`, success `#0B7B3C`, warning `#FFB14A`, info `#246FB6`. Box border is `#D5D9D9` with radius 8.
- Fonts: Amazon Ember and Amazon Ember Modern (proprietary) are loaded. The search pages render in Arial 14/20.

### Logo
The Amazon smile logo is used in white on squid ink `#232F3E`/`#131921`; the site header shows exactly this. A white logo on our dark `#0F141A` banner is therefore consistent with Amazon's own usage. For AWS, the "aws" smile logo is also shown in white on dark navy. I did not fetch the clear-space rule; Amazon's trademark guidelines require written permission to use the logo. Confidence: low.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Cloudscape colours, radii, borders, type, spacing, sizes | npm `@cloudscape-design/design-tokens@3.0.120` (`index-visual-refresh.json`) | high |
| Cloudscape dropdown shadow, focus offset, icon set | Cloudscape docs and components, from memory; not re-measured | medium |
| Retail buttons, inputs, links, dropdown, status, header defaults | Live computed style and downloaded CSS (Playwright, 2026-11-25): https://www.amazon.com/ and https://www.amazon.com/s?k=notebook | high |
| Retail header colour | CSS default `#131921`/`#232F3E`; live page showed a seasonal orange theme | high (CSS) |
| Logo usage | Observed on site; formal guideline not fetched | low |
- https://cloudscape.design/
- https://www.npmjs.com/package/@cloudscape-design/design-tokens
- https://www.amazon.com/
- https://www.amazon.com/s?k=notebook

## Differs from current Figma
- **New brand.** It is not in the Figma file yet.
- With the Cloudscape recommendation: primary `#006CE0`, secondary/accent `#FF9900`, banner `#0F141A` with a white logo, Open Sans (free on Google Fonts), 20 px pill buttons at 32 px tall, and 8 px inputs and menus.
- If the retail look is chosen instead: primary `#FFD814` with **black** text (white text fails contrast), banner `#131921`, links `#2162A1`, grey focus ring.
