# Apple — apple.com + Human Interface Guidelines (macOS / web)

## Summary
Apple's UI is airy and quiet. It uses near-black `#1D1D1F` text on white with light-grey `#F5F5F7` bands, and a single interactive blue: **`#0071E3`** for filled CTAs and focus, **`#0066CC`** for text links and outline buttons. Buttons on apple.com are **full capsules** (radius 980 px) in 44 px and 36 px sizes, with regular-weight (400) SF Pro text and slightly negative letter-spacing. The global nav is a 44 px translucent light bar (`rgba(245,245,247,0.8)` with backdrop blur), not a coloured banner. Store cards are large **28 px** rounded tiles with a soft `2px 4px 12px rgba(0,0,0,0.08)` shadow. Text fields are 56 px tall with a 12 px radius and a 1 px `#86868B` border. The focus ring is 2 px `#0071E3`, offset 3 px from the button. SF Pro is proprietary, so use **Inter** as the Google fallback. The macOS HIG (2025, Liquid Glass) adds the system palette (`systemBlue #0088FF`) and 13 pt body text for desktop-density tools.

## Proposed tokens
```json
{
  "id": "apple",
  "theme": "light",
  "colors": { "primary": "#0071E3", "primaryHover": "#0076DF", "primaryActive": "#006EDB", "secondary": "#1D1D1F",
              "accent": ["#0088FF", "#34C759", "#FF8D28"], "link": "#0066CC", "focusRing": "#0071E3",
              "headerBg": "#F5F5F7", "headerText": "#1D1D1F", "pageBg": "#FFFFFF", "surface": "#F5F5F7", "border": "#D2D2D7",
              "textPrimary": "#1D1D1F", "textSecondary": "#6E6E73", "textDisabled": "#86868B",
              "success": "#008009", "warning": "#B64400", "error": "#E30000", "info": "#0066CC",
              "neutralRamp": { "0": "#FFFFFF", "50": "#FAFAFC", "100": "#F5F5F7", "200": "#E8E8ED", "300": "#D2D2D7",
                               "500": "#86868B", "600": "#6E6E73", "700": "#424245", "800": "#333336", "900": "#1D1D1F", "950": "#161617" } },
  "typography": { "uiFamily": "SF Pro Text", "displayFamily": "SF Pro Display", "monoFamily": "SF Mono", "proprietary": true,
                  "googleFallbackUi": "Inter", "googleFallbackDisplay": "Inter",
                  "bodySize": 13, "bodyLineHeight": 16, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [13, 15, 17, 22, 26, 28, 40, 56] },
  "radius": { "button": 980, "input": 12, "card": 28, "chip": 980, "modal": 18 },
  "button": { "height": { "sm": 28, "md": 36, "lg": 44 }, "paddingX": 15, "minWidth": null, "fontSize": 14, "fontWeight": 400, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#0071E3", "text": "#FFFFFF", "hoverBg": "#0076DF", "activeBg": "#006EDB", "disabledBg": "#E8E8ED", "disabledText": "#86868B" },
              "secondary": { "bg": "#FFFFFF", "text": "#0066CC", "border": "#0066CC", "hoverBg": "#0076DF" },
              "ghost": { "text": "#0066CC", "hoverBg": "#F5F5F7" },
              "focus": { "style": "2px solid outline, offset outside the capsule", "width": 2, "offset": 3, "color": "#0071E3" } },
  "input": { "height": 44, "border": "#86868B", "borderWidth": 1, "radius": 12, "placeholder": "#6E6E73", "focusBorder": "#0071E3", "errorBorder": "#E30000" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 12, "itemHeight": 28, "itemHoverBg": "#0071E3", "itemSelectedBg": "#E8E8ED", "itemSelectedText": "#1D1D1F", "shadow": "0 8px 24px rgba(0,0,0,0.16)" },
  "tabs": { "style": "pill", "activeIndicator": "#FFFFFF", "activeText": "#1D1D1F" },
  "elevation": { "card": "2px 4px 12px rgba(0,0,0,0.08)", "menu": "0 8px 24px rgba(0,0,0,0.16)", "modal": "0 20px 60px rgba(0,0,0,0.22)" },
  "spacingBase": 4,
  "iconStyle": "SF Symbols: line-weight matched to text weight, mostly outline with filled variants for selection (proprietary; Lucide or Phosphor as free stand-in)"
}
```

### Notes on values
- **CTA (`a.button`)**: `#0071E3` background with white text. Hover measured as `#0076DF`, slightly *lighter*, which is Apple's behaviour. Large size is 44 px with padding 11/21 and 17 px text; small is 36 px with padding 8/15 and 14 px text. Radius 980 px, a 1 px transparent border, letter-spacing −0.374 px. The active value `#006EDB` is from memory and was not measured (low confidence). For the compact plugin, `sm` 28 px follows the macOS large-control size.
- **Secondary**: transparent with a 1 px `#0066CC` border and `#0066CC` text. **On hover it fills `#0076DF` with white text** (measured). A dark variant also exists: `#1D1D1F` fill, white text, radius 8, 36 px (the "Continue" button in the locale banner). That is the source of the proposed `secondary: #1D1D1F`.
- **Focus**: every control gets `outline: 2px solid #0071E3`. The offset is 3 px for buttons, 1 px for links, and −7 px (inset) for nav links. The root tokens include `--sk-focus-color: #0071e3`, `--sk-focus-offset: 1px` and `--sk-focus-offset-container: 3px`.
- **Links**: `--sk-body-link-color` is `#0066CC`. Inline body links in footnotes and the footer are underlined. Promo "Learn more >" links have no underline. Disabled link opacity is 0.42.
- **Input** (`.form-textbox-input`, apple.com/retail): 56 px tall, radius 12, 1 px `#86868B` border, fill `rgba(255,255,255,0.8)`, 17 px text with a floating label. 44 px is proposed for plugin density. The macOS HIG native text field is about 22–24 pt with a 5–6 pt radius, if a desktop look is preferred.
- **Dropdown**: the web `<select>` uses the same 56 px / 12 px field style. Native macOS menus have a translucent material, roughly a 10–12 pt radius on Tahoe, and about 22–24 pt rows. The highlighted row is **filled with the accent blue and has white text**, and the selected row shows a checkmark rather than a fill. Item height and shadow are estimates (low confidence).
- **Tabs**: Apple uses a **segmented control**: a pill track (`#E8E8ED`) with a white raised thumb for the active segment. apple.com uses capsule "chip" nav for product filters. Underline tabs are not an Apple pattern.
- **Colour tokens** measured from apple.com `:root` (`--sk-*`):
  - glyph `#1D1D1F`, secondary `#6E6E73`, secondary-alt `#424245`, tertiary `#86868B`
  - fills `#FFFFFF`, `#FAFAFC` and `#F5F5F7`, plus greys `#D2D2D7` and `#E8E8ED`
  - fill-blue `#0071E3`, glyph-blue `#0066CC`
  - glyph green `#008009`, orange `#B64400`, red `#E30000`
  - fill green `#03A10E`, orange `#F56300`, yellow `#FFE045`
  - tinted status backgrounds `#F5FFF6`, `#FFF9F4` and `#FFF2F4`
  - Product(RED) `#AF1E2D`
- **HIG 2025 system colours** (default light / dark):
  - Blue `#0088FF` / `#0091FF`
  - Green `#34C759` / `#30D158`
  - Orange `#FF8D28` / `#FF9230`
  - Red `#FF383C` / `#FF4245`
  - Yellow `#FFCC00` / `#FFD600`
  - Grays: `#8E8E93`, `#AEAEB2`, `#C7C7CC`, `#D1D1D6`, `#E5E5EA`, `#F2F2F7`

  These are vivid and fail AA as text on white. Use the apple.com glyph colours above for status text and keep the HIG colours as accents and icons.
- **Header**: the global nav is 44 px, `rgba(245,245,247,0.8)` with backdrop blur, and nav text `rgba(0,0,0,0.8)` at 12 px. A dark variant exists (`--r-globalnav-background-opened-dark: #161617`, used on some product pages). The banner should stay **light `#F5F5F7` with `#1D1D1F` text**. If the plugin needs a dark banner, use `#161617` with `#F5F5F7` text.
- **Type**: apple.com body is SF Pro Text 17/25. Promos use SF Pro Display: 21/25, 28/32, 40, 48, 56 and 80 px, weight 600 for headlines. The macOS HIG body is 13 pt, with Headline 13 bold, Title 3 15, Title 2 17, Title 1 22 and Large Title 26. 13/16 is proposed because the plugin is a desktop tool. Use Inter with slightly tighter tracking (−0.01 em) to imitate SF.
- **Cards**: apple.com/store has about 90 tiles at radius 28 px with the shadow `2px 4px 12px rgba(0,0,0,0.08)` and no border. Smaller modules use 18 px (from memory). The modal radius of 18 is an estimate (medium confidence).
- **Logo**: Apple does not allow third parties to use the Apple logo without a written licence. Apple's Identity Guidelines limit it to Apple and authorised partners. Plan for a text or wordmark placeholder, or confirm licence status with the client. When Apple shows its own logo on a dark ground it is white or grey. No public clear-space rule applies to third parties.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Colours (`--sk-*` tokens), buttons, hover, focus, links, nav, type sizes | Live computed style (Playwright, 2026-11-25): https://www.apple.com/ | high |
| Input field | Live computed style: https://www.apple.com/retail/ | high |
| Card radius and shadow | Live computed style: https://www.apple.com/store | high |
| System colours (2025) and grays | HIG Color JSON: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/color.json (page https://developer.apple.com/design/human-interface-guidelines/color) | high |
| macOS type sizes, menu and segmented-control behaviour, control sizes | HIG Typography, Menus and Segmented controls pages, from memory; not re-fetched | medium |
| Button active colour, dropdown shadow and item height, modal radius | Estimates | low |
| Logo usage restrictions | Apple Trademark and Identity Guidelines (general knowledge), https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html | medium |
- https://www.apple.com/
- https://www.apple.com/retail/
- https://www.apple.com/store
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.apple.com/design/human-interface-guidelines/typography

## Differs from current Figma
- **New brand.** It is not in the Figma file yet.
- Primary: `#0071E3` (apple.com) is proposed over HIG `#0088FF`, because it has better contrast with white text. Links: `#0066CC`.
- Apple has no secondary brand hue. Use graphite `#1D1D1F`.
- Structural changes from the AkzoNobel copy-over: capsule buttons with regular-weight text, 12 px inputs, 28 px soft-shadow cards, a **light** translucent banner (not a brand-colour banner), Inter instead of Noto Sans, and a segmented-control style for tabs. The logo needs a licence decision.
