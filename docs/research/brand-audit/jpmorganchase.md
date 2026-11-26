# JPMorgan Chase: Salt Design System (J.P. Morgan theme)

## Summary
JPMorgan Chase has two consumer-facing looks, and Salt adds two more for internal use:
- **J.P. Morgan (corporate / CIB).** Warm and restrained. Text and the serif-style wordmark are dark brown (`#4B2C1D`). The brand palette is brown/wheat with cream surfaces (`#FAF8F2`), and every CTA is **topaz teal**. CTAs are uppercase with letter-spacing and almost square corners (3–4 px). Headings use a light-weight display face (CelesteOT on the website, Amplitude in Salt).
- **Chase (consumer).** Bright Chase blue (`#0060F0` sign-in, `#005EB8` brand blue), a green "Open an account" CTA (`#128842`), Open Sans, 4–5 px radius and near-black text `#101820`.
- **JPMorganChase (parent brand, jpmorganchase.com).** Tiempos serif headlines, Sons sans, **pill** buttons (999 px), brown links `#8F5A39` and a light-blue `#A6D7F0` bold CTA.

**Recommendation for Bluebird (a B2B design tool): the J.P. Morgan theme.** Salt calls it "J.P. Morgan (default), recommended for all new projects". It is built for CIB desktop and web apps and is the only one of the three themes that is public (Chase and JPMorganChase are internal-only Salt packages). Salt apps are dense: 28 px controls at medium density, 12 px Open Sans body text, and uppercase Amplitude button labels. Inputs are filled boxes marked by a **bottom border only**, and focus is a **2 px dotted** outline.

## Proposed tokens
```json
{
  "id": "jpmorganchase",
  "theme": "light",
  "colors": { "primary": "#1B7F9E", "primaryHover": "#176C86", "primaryActive": "#AFE0ED", "secondary": "#936846",
              "accent": ["#4B2C1D", "#12647E", "#AFE0ED", "#FAF8F2"], "link": "#12647E", "focusRing": "#094A60",
              "headerBg": "#4B2C1D", "headerText": "#FFFFFF", "pageBg": "#F5F7F8", "surface": "#FFFFFF", "border": "#B3B3B3",
              "textPrimary": "#000000", "textSecondary": "#4C5157", "textDisabled": "#999999",
              "success": "#00875D", "warning": "#C75300", "error": "#E52135", "info": "#0078CF",
              "neutralRamp": { "100": "#E6E9EB", "200": "#D3D5D8", "300": "#B1B5B9", "400": "#91959A", "500": "#72777D",
                               "600": "#5F646A", "700": "#4C5157", "800": "#3A3F44", "900": "#292E33" } },
  "typography": { "uiFamily": "Open Sans", "displayFamily": "Amplitude", "monoFamily": "PT Mono", "proprietary": true,
                  "googleFallbackUi": "Open Sans", "googleFallbackDisplay": "Archivo",
                  "bodySize": 12, "bodyLineHeight": 16, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [12, 14, 18, 24, 54, 68] },
  "radius": { "button": 4, "input": 4, "card": 6, "chip": 999, "modal": 6 },
  "button": { "height": { "sm": 20, "md": 28, "lg": 36 }, "paddingX": 8, "minWidth": null, "fontSize": 12, "fontWeight": 500, "textTransform": "uppercase", "borderWidth": 1,
              "primary": { "bg": "#1B7F9E", "text": "#FFFFFF", "hoverBg": "#176C86", "activeBg": "#AFE0ED", "disabledBg": "#A4CCD8", "disabledText": "#FFFFFF" },
              "secondary": { "bg": "#FFFFFF", "text": "#000000", "border": "#72777D", "hoverBg": "#E6E9EB" },
              "ghost": { "text": "#000000", "hoverBg": "#E6E6E6" },
              "focus": { "style": "outline 2px dotted, no offset", "width": 2, "offset": 0, "color": "#094A60" } },
  "input": { "height": 28, "border": "#72777D", "borderWidth": 1, "radius": 4, "placeholder": "#4C5157", "focusBorder": "#094A60", "errorBorder": "#E52135" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 6, "itemHeight": 36, "itemHoverBg": "#DBF5F7", "itemSelectedBg": "#AFE0ED", "itemSelectedText": "#000000", "shadow": "0 6px 10px 0 rgba(0,0,0,0.2)" },
  "tabs": { "style": "underline", "activeIndicator": "#1B7F9E", "activeText": "#000000" },
  "elevation": { "card": "0 2px 4px 0 rgba(0,0,0,0.1)", "menu": "0 6px 10px 0 rgba(0,0,0,0.2)", "modal": "0 12px 40px 0 rgba(0,0,0,0.3)" },
  "spacingBase": 8,
  "iconStyle": "Salt icons (@salt-ds/icons), simple outline glyphs, 12 px at medium density"
}
```

### Notes on the tokens
- **Source of truth:** `@salt-ds/theme@1.49.0` (`index.css` plus `css/theme-next.css`), resolved in headless Chromium on `<div class="salt-theme salt-theme-next salt-density-medium" data-mode="light" data-accent="teal" data-corner="rounded" data-heading-font="Amplitude" data-action-font="Amplitude">`. These are the exact props the Salt docs list for the J.P. Morgan theme (`SaltProviderNext accent="teal" corner="rounded" headingFont/actionFont="Amplitude"`).
- **Primary CTA** is `--salt-actionable-accented-bold-*` (Button `sentiment="accented" appearance="solid"`). **Hover** is defined as a 15 % black overlay over teal-500, so `#176C86` is computed from it. **Active/pressed** flips to the pale accent `#AFE0ED` with **black** text, which is unusual. Disabled is 40 % opacity (`#A4CCD8` composited on white).
- **Secondary** is the neutral bordered button: transparent fill, black text, 1 px `#72777D` border, hover `#E6E9EB`, active `#D3D5D8`. **Ghost** is neutral transparent: hover is black at 10 % (`#E6E6E6` on white), active is black at 15 %. A solid neutral button also exists: `#72777D` fill with white text.
- **Button text:** Amplitude Medium 500, uppercase, letter-spacing 0.6 px. Radius is `--salt-palette-corner-weak` = 4 px. Padding is `spacing-100` (8 px) minus a 1 px border.
- **Heights scale with density:** high 20, medium 28, low 36, touch 44 (`--salt-size-base`). Text scales with density too (medium body 12/16, h1 24/32, h2 18/24, h3 14/18, h4 12/16, label 11/14, display1 68/88, display2 54/70).
- **Inputs and dropdown triggers** are filled boxes (`#FFFFFF` primary or `#F5F7F8` secondary variant). They have a **1 px bottom border `#72777D`** that becomes **2 px `#094A60`** when active and `#1B7F9E` on hover, with a 4 px radius. There is no full border by default; this underline field is the most "Salt" detail.
- **Options:** height is `size-base` + 8 = 36 px. Hover is `#DBF5F7`. Selected is `#AFE0ED` with a `#1B7F9E` left-edge inset bar. The menu uses a 6 px radius and the popout shadow.
- **Tabs:** 3 px indicator (`--salt-size-indicator`) in `#1B7F9E`. The tab bar has a 1 px rule at black 30 %.
- **Cards:** 6 px radius, 1 px border at black 30 % and shadow `0 2px 4px rgba(0,0,0,.1)`. Hover shadow is `0 4px 8px rgba(0,0,0,.15)`.
- **Checkbox** has a 2 px radius, **pill** a 2 px radius and **tag** 999 px.
- **headerBg `#4B2C1D` is a recommendation, not a measurement.** jpmorgan.com uses a white nav with a brown (`#4B2C1D`) wordmark and a brown accent tab. Salt does not specify an app header colour. JPM brown with a white logo is the most recognisable J.P. Morgan cue that suits our coloured banner. The alternative is teal-800 `#033142`.
- **Border `#B3B3B3`** is black at 30 % (`--salt-separable-secondary-borderColor`) composited on white.

## Live verification (Playwright, 2026-11-25)
- **jpmorgan.com/global** (cookie banner dismissed with "Reject All"): body Roboto 16/24 in `#4B2C1D` and headings CelesteOT 300. CTAs are `#1B8096`, 2 px border in the same colour, 3 px radius, 41–44 px high, 8 × 60 px padding, Roboto 700 14 px uppercase with 2.25 px letter-spacing. The site exposes `--cwm-*` tokens: brand brown-500 `#936846`, brown-jpm `#4B2C1D`, topaz-500 `#1A7B99` (CTA categorical `#1B8096`), wheat backgrounds `#FAF8F6` / `#F7F4F0` / cream `#FFFBF3`, neutral "dove gray" `#615654`–`#F0E9E8` and negative `#A50034`.
- **jpmorganchase.com:** Tiempos 300 for headlines (72 px) and Sons 400–700 for UI. `--cwm-palette-corner-default: 999` gives pill buttons. Links are `#8F5A39` and the focus outline is `#8F5A39`. The bold CTA is `#A6D7F0` with black text, and hover inverts it to black with light-blue text.
- **chase.com** (headless Chromium was shown an "upgrade your browser" notice, but the page still rendered): Open Sans 400/600/700 and text `#101820`. The primary "Sign in" button is `#0060F0`, white, 36 px high with a 5 px radius. The secondary is `#005EB8` text on an 8 % `#005EB8` tint. The "Open an account" CTA is `#128842` with a 4 px radius. Links are `#0060F0`. The input is underline-only (inset `0 -1px 0 #8C8E90`). Classes show Chase's own MDS (`mds-*`) system.

## Sources
- https://www.saltdesignsystem.com/salt/themes/index: theme list and J.P. Morgan setup props (design-system docs, **high**)
- https://unpkg.com/@salt-ds/theme@1.49.0/css/theme.css and `/css/theme-next.css`: every colour, size, radius, shadow and typography token (published package, **high**)
- https://unpkg.com/@salt-ds/core@1.75.0/dist-es/{button,input,dropdown,option,tabs,card,tag,pill,checkbox,dialog,link}/*.css.js: which token each component uses (published package, **high**)
- https://www.jpmorgan.com/global: corporate colours, fonts and CTA style (live computed style, **high** for the site, **medium** as a proxy for product UI)
- https://www.jpmorganchase.com/: parent-brand look (live computed style, **high**)
- https://www.chase.com/: consumer look (live computed style, **medium**, because a degraded browser notice was shown)
- Header colour recommendation and Amplitude→Archivo fallback: my own judgement (**low**). Amplitude is a licensed Font Bureau grotesk; JPMC employees get the files internally.
- Logo reversal and clear-space rules: not published publicly (**unverified**). jpmorgan.com only shows the brown or black wordmark on white.

## Differs from current Figma
- **Primary:** current `#005EB8` is **Chase's** blue (seen on chase.com as the secondary-button colour). It is not J.P. Morgan or Salt. Proposed `#1B7F9E` (Salt J.P. Morgan accent; the live site uses `#1B8096`). If the client wants the Chase consumer look instead, use `#0060F0` as primary and `#005EB8` as secondary.
- **Secondary:** current `#936846` **matches** J.P. Morgan `--cwm-color-brown-500` exactly. Keep it.
- Everything else copied from AkzoNobel should change. Noto Sans becomes Open Sans for UI, with Amplitude (fallback Archivo) for headings. Buttons become 28 px, 4 px radius, uppercase. Inputs become underline-style. Focus becomes a 2 px dotted outline. Text becomes pure black on white or `#F5F7F8`.
