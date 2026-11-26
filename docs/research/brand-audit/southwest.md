# Southwest Airlines — brand UI audit

Audited 2026-11-25 (agent-aa-swa-klm). southwest.com loaded normally in headless Chromium, so most values are **live computed styles** plus the site's own published CSS custom properties (`--primary-*`, `--secondary-*`, `--cmp-core-color-*` component tokens in the `.customer-light-theme` scope).

## Summary
- Light, white-header UI. **Bold Blue `#304CB2`** carries all text links, nav and tabs, and **Sunrise Yellow `#FFBF27`** is the primary CTA fill, with **dark navy `#111B40` text** on it. The yellow button with navy text is the signature.
- Corners are almost square: 2px on buttons, inputs and cards. The only round shapes are the "capsule" button variant and radios.
- Proprietary **Southwest Sans** (400/700) everywhere. Buttons use bold 16px labels, and the top nav uses uppercase 12px bold links.
- Deep navy `#111B40` bands and `#1C2D6A`/`#090F23` gradients for premium surfaces. Warm Red `#D5152E` and the heart logo colours appear only as accents.
- Focus feedback is a navy border plus underlined label, not a glow ring.

## Proposed tokens
```json
{
  "id": "southwest",
  "theme": "light",
  "colors": { "primary": "#304CB2", "primaryHover": "#263C8E", "primaryActive": "#1C2D6A", "secondary": "#FFBF27", "accent": ["#D5152E", "#111B40", "#01AFD0"], "link": "#304CB2", "focusRing": "#111B40",
              "headerBg": "#FFFFFF", "headerText": "#304CB2", "pageBg": "#F4F4F4", "surface": "#FFFFFF", "border": "#CCCCCC", "textPrimary": "#111B40", "textSecondary": "#515151", "textDisabled": "#A3A3A3",
              "success": "#00801F", "warning": "#FF792E", "error": "#D7112A", "info": "#304CB2",
              "neutralRamp": { "0": "#FFFFFF", "50": "#F4F4F4", "100": "#EEEEEE", "200": "#E0E0E0", "300": "#D6D6D6", "400": "#CCCCCC", "500": "#A3A3A3", "600": "#7A7A7A", "700": "#515151", "900": "#000000" } },
  "typography": { "uiFamily": "Southwest Sans", "displayFamily": "Southwest Sans", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Nunito Sans", "googleFallbackDisplay": "Nunito Sans",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": null, "semibold": null, "bold": 700 }, "headingScale": [32, 24, 20, 16] },
  "radius": { "button": 2, "input": 2, "card": 2, "chip": 9999, "modal": null },
  "button": { "height": { "sm": 40, "md": 48, "lg": 48 }, "paddingX": 20, "minWidth": null, "fontSize": 16, "fontWeight": 700, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#FFBF27", "text": "#111B40", "hoverBg": "#FFBF27", "activeBg": "#FFBF27", "disabledBg": "#E0E0E0", "disabledText": "#A3A3A3" },
              "secondary": { "bg": "#FFFFFF", "text": "#304CB2", "border": "#304CB2", "hoverBg": "#D1D3D9" },
              "ghost": { "text": "#304CB2", "hoverBg": null },
              "focus": { "style": "border colour change to navy + underlined label (no glow)", "width": 1, "offset": 0, "color": "#111B40" } },
  "input": { "height": 48, "border": "#CCCCCC", "borderWidth": 1, "radius": 2, "placeholder": "#7A7A7A", "focusBorder": "#304CB2", "errorBorder": "#D7112A" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 0, "itemHeight": 36, "itemHoverBg": "#E5ECFF", "itemSelectedBg": "#DDE7FF", "itemSelectedText": "#000000", "shadow": "0 5px 5px 0 rgba(0,0,0,0.15)" },
  "tabs": { "style": "underline", "activeIndicator": "#304CB2", "activeText": "#304CB2" },
  "elevation": { "card": "0 5px 5px 0 rgba(0,0,0,0.15)", "menu": "0 5px 5px 0 rgba(0,0,0,0.15)", "modal": null },
  "spacingBase": 4,
  "iconStyle": "solid/filled glyphs in Bold Blue #304CB2 (custom set; info 'i' and alert icons are filled circles)"
}
```

### Notes on the values
- **Primary vs CTA.** The brand primary is Bold Blue `#304CB2` (`--primary-500`). The *primary button*, though, is yellow `#FFBF27` with navy `#111B40` text (`customer-light-button-primary`). The blue-filled button is the **tertiary** variant: `#304CB2` fill, white text, hover `rgba(48,76,178,.85)`, selected `#1C2D6A`. For our plugin, map primary-CTA to yellow/navy and keep blue for links, tabs and selection.
- **Primary button states.** Hover keeps the yellow fill and only the border turns navy (`--cmp-core-color-button-border-hover: #111B40`). Focus does the same and also underlines the label (`--cmp-core-button-focus-text-decoration: underline`). Disabled is `#E0E0E0` fill with a `#A3A3A3` border and text. There is no darker-yellow hover; `primaryHover`/`primaryActive` in the JSON are the Bold Blue ramp (`--primary-400`, `--primary-300`) for blue interactive elements.
- **Secondary button.** White fill, 1px `#304CB2` border, `#304CB2` text. Hover and focus add a `rgba(17,27,64,.2)` fill (≈`#D1D3D9` on white) and a navy border.
- **Button sizes.** The "Log in" header button is 40px tall with 14px padding. Search and Book now are 48px tall with 20px padding. The label is a `labelLarge` span at 16px/700, and the button root reports weight 400. `--cmp-core-button-border-radius: 2`, capsule variant `500` (pill).
- **Inputs.** 48px tall, 1px `#CCCCCC` border, 2px radius, 8px side padding, text `#111B40`. Focus border is `#304CB2` (measured `rgb(66,91,181)` mid-transition). Error border/icon `#D7112A` (`--cmp-core-color-input-error`). Placeholder token `#7A7A7A`. `--cmp-core-color-input-border-bottom: #FFBF27` exists for a yellow-underline variant.
- **Dropdown.** The trigger has a 1px `#CCCCCC` box with blue `#304CB2` value text and a chevron. The menu flyout is white with a **1px `#304CB2` border**, square corners, a `0 5px 5px rgba(0,0,0,.15)` shadow and a pointer caret. Items are 36px, 16px text, black. The selected item is `#DDE7FF` (`--cmp-core-color-input-selected`). Hover token `rgba(221,231,255,.75)` (`--cmp-core-color-vertical-list-bg-hover`) ≈ `#E5ECFF` on white.
- **Tabs.** Booking-widget tabs are 56px tall with `#304CB2` labels. The active tab gets a **4px `#304CB2` bar** (`hoverIndicator active`) and a bold label. Inactive tabs show a 1px `#304CB2` baseline. The widget's white tab strip sits on a card.
- **Status message palette** (`customer-light-message-*`): info bg `#DDE7FF`/fg `#304CB2`, success `#CCE5D2`/`#00801F`, caution `#FFF2D3`/`#FFBF27`, danger `#FCD9DE`/`#D7112A`. All have a navy `#1C2D6A` border and `#111B40` headline. Warning ramp `--warning-500 #FF792E`.
- **Checkbox/radio.** Border `#304CB2`, checked fill `#304CB2`, focus `#111B40`. Toggle on = green `#00801F` with a `#304CB2` knob.
- **Cards.** 2px radius, `0 5px 5px rgba(0,0,0,.15)` "low-box" shadow, optional 1px `#CCCCCC`/`#D6D6D6` border. Card title `#111B40`, body `#515151`.
- **Header.** White, links `#304CB2` (`--cmp-dotcom-color-header-fg`). Utility links are italic or regular, and the main nav is uppercase 12px/700. The mobile header turns `#304CB2` (`--cmp-dotcom-color-header-bg-mobile`). Footer is `#F4F4F4`. The home page also has a full-width `#111B40` quick-links band. Page background token `--cmp-dotcom-color-page-bg: #F4F4F4`. The home hero uses the Summit Silver gradient `#F8F9FD → #E2E7F0`.
- **Typography.** `"Southwest Sans", Arial, sans-serif` everywhere. The faces loaded are Southwest Sans 400/700 and **Southwest Flare** 400/700, a second proprietary face for marketing display. Body is 16/24. H2 measured 32/40 bold, and the hero headline is bold 32px Bold Blue. **24/20 in the heading scale are inferred, not measured.** Nunito Sans is the suggested free fallback (friendly, geometric-humanist, wide weight range). Treat it as a judgement call, not a match.
- **Spacing tokens** published: 0, 2, 4, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64 (4px base). **Radius tokens:** 0, 2, 4, 8, 12, 16, 28, full. **Shape tokens:** rect 2, medium 12, large 16, extra-large 28, pill 9999. Product UI uses `rect` (2).
- **Logo.** The wordmark is Bold Blue with the tri-colour heart (blue/red/yellow). The mobile header shows it on a `#304CB2` bar, so a reversed/white wordmark on brand blue is used in Southwest's own UI. A published clear-space rule was not found.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Colour ramps (`--primary-*`, `--secondary-*`, `--tertiary-*`, `--success/warning/danger-*`, `--neutral-*`, gradients) | Live CSS custom properties, https://www.southwest.com/ | High |
| Component tokens (button, input, dropdown, tabs, checkbox, message, header, page bg) | Live CSS (`.customer-light-theme` / `.customer-light-button-*` rules), https://www.southwest.com/ | High |
| Button/input/tab/menu sizes, radii, shadows, fonts | Live `getComputedStyle` + hover/focus/open-menu checks (Playwright, own Chromium) on https://www.southwest.com/ | High |
| Heading scale beyond 32px, modal radius | Not measured | Low / unknown |
| Google fallback font | Judgement | Low |

## Differs from current Figma
- Current Figma: primary `#304CB2`, secondary `#FFBF27`. **Both are correct.** They exactly match `--primary-500` and `--secondary-500`.
- What is wrong is the *role* mapping. On southwest.com the **primary CTA is yellow `#FFBF27` with navy `#111B40` text**, not a blue button with white text. Blue is the link, tab and selection colour.
- Everything copied from AkzoNobel needs replacing: 2px (near-square) radii instead of rounded, Southwest Sans → Nunito Sans instead of Noto Sans, navy `#111B40` text instead of neutral black, `#CCCCCC` input borders, `#F4F4F4` page/footer grey, and the 4px blue tab indicator.
