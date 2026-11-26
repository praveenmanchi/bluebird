# T-Mobile US — TDDS (T-Mobile Digital Design System) + Phoenix (`phx`) on t-mobile.com

## Summary
T-Mobile is **magenta `#E20074` on near-white greys**: a `#FBFBFB` header with the white "T" on a magenta square, a `#F5F5F5` page and white cards. Magenta is the only brand hue. It is used for primary buttons, tertiary/text CTAs, links, checkboxes, toggles, the tab underline, the text cursor and full-bleed notice bars. Hover and pressed states darken through the magenta ramp (`#A7005A`, then `#770141`). Headlines are **TeleNeo ExtraBold (800)**, tight and heavy. Body and UI text use the **system font stack**, not TeleNeo. Buttons have small **4 px** corners. Inputs are nearly square (**2 px**). Cards are 8–12 px with a very soft, wide grey shadow. Chips and filter pills are fully rounded (24 px). Secondary buttons are a 2 px near-black outline that **fills solid black on hover**. Focus uses the browser's own ring with a **4 px offset**.

## Proposed tokens
```json
{
  "id": "tmobile",
  "theme": "light",
  "colors": { "primary": "#E20074", "primaryHover": "#A7005A", "primaryActive": "#770141", "secondary": "#141414",
              "accent": ["#7E0C7E", "#F6288F", "#FFCEE7"], "link": "#E20074", "focusRing": "#005FCC",
              "headerBg": "#FBFBFB", "headerText": "#2B2B2B", "pageBg": "#F5F5F5", "surface": "#FFFFFF", "border": "#CCCCCC",
              "textPrimary": "#141414", "textSecondary": "#6A6A6A", "textDisabled": "#8C8C8C",
              "success": "#008110", "warning": "#AD590B", "error": "#D20D00", "info": "#0C48BD",
              "neutralRamp": { "white": "#FFFFFF", "100": "#FBFBFB", "200": "#F5F5F5", "300": "#E6E6E6", "400": "#CCCCCC", "500": "#8C8C8C",
                               "600": "#6A6A6A", "700": "#414141", "800": "#2B2B2B", "900": "#1C1C1C", "1000": "#141414", "black": "#000000" } },
  "typography": { "uiFamily": "system-ui (-apple-system, Roboto, Helvetica, Segoe UI, Arial)", "displayFamily": "TeleNeo", "monoFamily": "Lucida Sans Typewriter", "proprietary": true,
                  "googleFallbackUi": "Inter", "googleFallbackDisplay": "Manrope",
                  "bodySize": 16, "bodyLineHeight": 20, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [20, 24, 28, 32, 40, 48, 52, 60, 68] },
  "radius": { "button": 4, "input": 2, "card": 12, "chip": 24, "modal": null },
  "button": { "height": { "sm": 34, "md": 48, "lg": 48 }, "paddingX": 16, "minWidth": 110, "fontSize": 16, "fontWeight": 600, "textTransform": "none", "borderWidth": 2,
              "primary": { "bg": "#E20074", "text": "#FFFFFF", "hoverBg": "#A7005A", "activeBg": "#770141", "disabledBg": "#F5F5F5", "disabledText": "#8C8C8C" },
              "secondary": { "bg": "transparent", "text": "#141414", "border": "#141414", "hoverBg": "#141414" },
              "ghost": { "text": "#E20074", "hoverBg": "transparent" },
              "focus": { "style": "browser default focus ring (outline: -webkit-focus-ring-color auto 1px) drawn 4px outside the button", "width": 2, "offset": 4, "color": "#005FCC" } },
  "input": { "height": 48, "border": "#6A6A6A", "borderWidth": 1, "radius": 2, "placeholder": "#6A6A6A", "focusBorder": "#141414", "errorBorder": "#D20D00" },
  "dropdown": { "menuBg": "#FBFBFB", "menuRadius": 0, "itemHeight": 30, "itemHoverBg": null, "itemSelectedBg": null, "itemSelectedText": "#141414",
                "shadow": "0 8px 24px 0 rgba(65,65,65,0.19)" },
  "tabs": { "style": "underline", "activeIndicator": "#E20074", "activeText": "#141414" },
  "elevation": { "card": "0 2px 20px 3px rgba(65,65,65,0.11), 0 2px 20px 10px rgba(65,65,65,0.03)", "menu": "0 8px 24px 0 rgba(65,65,65,0.19)", "modal": "0 8px 24px 0 rgba(65,65,65,0.19)" },
  "spacingBase": 4,
  "iconStyle": "Phoenix/TDDS line icons, mostly outline at 24 px (20 px in small buttons, 16 px in xs); a few utility icons (chat, cart) are filled"
}
```

### Notes on values
- **Token sets found on the page**: `--tdds-*` is the T-Mobile Digital Design System (brand, status, type, radius, spacing, elevation). `--phx--*` is the older Phoenix layer, still used for the component tokens of buttons and type. `--xpr--*` covers page layout.
- **Magenta ramp** (`--tdds-color-brand-primary-*`): 100 `#FFCEE7`, 200 `#FF52A3`, 300 `#F6288F`, **400 `#E20074`**, 500 `#A7005A`, 600 `#770141`. `brand-secondary-*` is the **same magenta ramp**, so T-Mobile has no second brand hue. The only other brand ramp is "highlight" purple: 100 `#F8E8F8`, 200 `#B780B7`, 300 `#A044A2`, 400 `#7E0C7E`, 500 `#450245`, 600 `#2D0521`. In the token block, `secondary` is near-black `#141414`, the colour of the secondary button and of text. On dark surfaces the brand fill is `#F6288F` (primary-300). The brand gradient is 45° `#A7005A` → `#E20074` (stops `#770141`, `#A7005A`, `#E20074`).
- **Status** (100 tint / 200 fill / 300 text / 400 deep):
  - positive `#E6FCE8` / `#2DBF3B` / `#008110` / `#002805`
  - caution `#FFF3DE` / `#F8A50C` / `#AD590B` / `#321800`
  - critical `#FFEDEC` / `#F44125` / `#D20D00` / `#3D0400`
  - info `#EAF1FF` / `#4886FF` / `#0C48BD` / `#001338`

  The JSON uses the 300 (text-safe) values. Validation banners use the 100 tint with a 300 border.
- **Buttons** (`.tdds-button`):
  - **Default size**: min-height 48, padding 12/16, min-width 110, max-width 424, `body-lg-strong` (16/20, 600), radius 4.
  - **Small** (`data-size="small"`): 34 px, padding 7/16, 14/18 600. This is the size of the homepage hero CTA, measured at 34 px, `#E20074`, 14/600, radius 4.
  - **XS**: 27 px, padding 5/10, 11 px semibold, no min-width.
  - **Primary**: `#E20074` → hover `#A7005A` → pressed `#770141` (measured live). Text is white; it shifts to `#F5F5F5` on hover. Disabled bg `#F5F5F5` (`fill-onLight-primary-disabled`), text `#8C8C8C`. Phoenix's `comp-button` layer says disabled `#E6E6E6`/`#6A6A6A` instead.
  - **Secondary**: transparent with a **2 px `#141414`** border and padding 10/14. On hover the bg becomes `#141414`, the text `#F5F5F5` and the border transparent. Pressed bg is `#6A6A6A`. Disabled has a `#CCCCCC` border and `#8C8C8C` text.
  - **Tertiary**: a text-only magenta CTA with a trailing chevron that nudges right on hover. Height 24, no padding, pressed `#770141`. A monochrome tertiary uses `#141414` → hover `#414141`.
- **Focus**: TDDS defers to the user-agent ring (`outline: -webkit-focus-ring-color auto 1px; outline-offset: 4px`). Chrome rendered it as `#005FCC`. Tabs use offset −2 px. The segmented tab uses a 2 px solid ring.
- **Inputs** (`.tdds-text-field`):
  - Size and shape: min-height 48, padding-left 16, radius 2, transparent bg.
  - Borders: 1 px `#6A6A6A` → hover `#414141` → filled `#141414` → active/focus `#141414` (2 px in the `border-input-onLight-active` token). Error border `#D20D00` with error text in `#D20D00`. Disabled border `#CCCCCC` on fill `#FBFBFB`.
  - Text: the value is 16/20 **semibold** (600). The label is a floating label that sits inside the field and shrinks to 12 px when filled. The caret is magenta `#E20074`.
- **Select** (product filter sort, cell-phones page): 48 px, white, 1 px `#6A6A6A`, square corners, padding 8/40/8/16, 16 px text in `#2B2B2B`.
- **Menu** ("My account" dropdown, opened on the archive):
  - Panel: square, white/`#FBFBFB`, soft drop shadow, items 14/700 `#141414` with about 30 px rhythm. It contains a full-width magenta "Log in" button.
  - Trigger: turns `#770141` while expanded.
  - Item hover and selected colours were not captured.
- **Tabs** (`.tdds-tab`): an underline style with a **4 px** brand-coloured selector bar (`border-onLight-general-brand`). Active text `#141414`, inactive `#414141`. On hover a 1 px `#6A6A6A` rule appears. The segmented variant uses a `#E6E6E6` track, radius 4, and a black selected pill (radius 2) with `#F5F5F5` text.
- **Chips**: pill (24 px radius), 1 px `#141414` border. Hover fills `#6A6A6A` and selected fills **solid `#141414`**, both with light text.
- **Checkbox** (24 px) and **toggle** (52×32 track, 28 px white thumb): `#E20074` when on, `#A7005A` on hover, `#770141` when pressed. A toggle that is off is grey.
- **Links**: `#E20074` → hover `#A7005A` → pressed `#770141`. Inline links are underlined with a 3 px offset. Legal links are underlined `#141414`.
- **Cards**: white (or `#F5F5F5` on white), radius 8 (promo) or 12 (`border-radius-style-card`, the action tiles and intent cards). They use the wide soft shadow above. The quick-action tiles use a 1 px `#CCCCCC` border with no shadow.
- **Elevation tokens** (`onLight`): close `0 2px 2px rgba(65,65,65,.19)`, near `0 3px 10px rgba(65,65,65,.19)`, far `0 8px 24px rgba(65,65,65,.19)`. The header uses a 3-layer `rgba(0,0,0,.05)` shadow.
- **Type**:
  - TeleNeo (Deutsche Telekom's corporate face; **proprietary**) is loaded as `teleneo` 400/700/800 plus a variable 125–950. It is used for headlines, display text, card titles and checkbox legends.
  - Scales: headline xs–xxl 20/22, 24/26, 28/30, 32/34, 40/42, 48/50; display 52/54, 60/63, 68/71, up to 96/100. Most headlines are **800**.
  - Body is the system stack at 16/20 (lg), 14/18 (md), 12/16 (sm), 11/15 (xs); strong is 600.
  - Google fallbacks: **Inter** for the system-stack UI. **Manrope** ExtraBold for TeleNeo (**low** confidence on the visual match; Barlow is an alternative for the squarish feel).
- **Header**: a 25 px universal bar in `#E6E6E6` (WIRELESS, BUSINESS… in 10 px bold caps), then a 64 px `#FBFBFB` main bar. Nav text is 14/700 `#2B2B2B`, with a filled magenta "My account" button that is 48 px with square corners. The footer is dark, with `#FBFBFB` text.
- **Spacing**: TDDS sizes 2, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64, 80, 96, 160. The Phoenix spacer is 8-based. The grid gutter is 16 and the layout gutter 20.
- **Logo**: the web header uses the **white "T" on a magenta square** (reversed mark on brand colour). That is the normal lockup, so a white logo on the magenta banner fits the brand. The clear-space rule was **not verified**.

## Sources
- `https://www.t-mobile.com/` and every other `*.t-mobile.com` host (es., account., investor., developer.) **timed out at the network level** from this machine, for both headless Chromium and curl (no response, not a challenge page). I did not try to get around this.
- Instead I measured T-Mobile's own production CSS from the Internet Archive with Playwright (live computed styles and `:root` tokens on the archived pages):
  - `https://web.archive.org/web/20261102003356/https://www.t-mobile.com/` (homepage capture of 2 Nov 2026): tokens, buttons, header, cards, menu, hover/focus states. **High** confidence that these are T-Mobile's real values, as of 2 Nov 2026.
  - `https://web.archive.org/web/20261029055325/https://www.t-mobile.com/cell-phones` (29 Oct 2026): select, product cards, filters. **High**.
- `--tdds-*` and `--phx--*` CSS custom properties and component rules (`.tdds-button`, `.tdds-text-field`, `.tdds-tab`, `.tdds-chip`, `.tdds-checkbox`, `.tdds-toggle`, `.tdds-link`) were read from the same archived stylesheets. Design-token level, **high**.
- Dropdown item hover/selected colours: not captured (**unknown**). Modal radius: not found (**unknown**).
- Google font matches for TeleNeo: my own judgement, **low**.
- No public T-Mobile design-system docs or npm token package was found. On npm, `magenta-ds`, `tmo-ui-components` and `hugo-tools` are unofficial or internal. On GitHub, `tmobile/magentaA11y` is accessibility test criteria, not tokens.

## Differs from current Figma
New brand: there is no T-Mobile mode in the Figma file yet. Proposed primary is `#E20074` and secondary is `#141414`. T-Mobile has no second brand hue: its "secondary" token ramp is the same magenta, so near-black stands in.
