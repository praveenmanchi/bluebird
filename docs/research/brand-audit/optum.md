# Optum — brand UI audit

Audited 2026-11-25 (agent-vanguard-optum-anthropic). www.optum.com loaded normally in headless Chromium. Values are **live computed styles** plus the site's own `--dmp-*` CSS custom properties, which form a full theme token set (button, link, neutral, semantic, header). Optum's design system **Abyss** (abyss.optum.com, shared with UHC/UHG) is gated: every page redirects to "Please access the application from UHG network", and its packages are not on public npm. So no DS docs were used.

## Summary
- Light, warm UI: white header, **warm-white `#FAF8F2`** utility bar and hero bands, charcoal **`#3D3C38`** text. **Optum orange `#FF612B`** is the logo, decorative arcs, illustrations and the 4px active-tab bar. It is **never a white-text button fill** (3.0:1).
- **The default primary button is charcoal `#3D3C38`, not orange.** It is a pill, 44px tall, with a 2px border and a bold 16px label. Hover goes darker (`#232220`), and pressed goes black.
- When orange is needed as a button, Optum uses a darker **"vibrant" `#D74120`** (white text 4.5:1), with hover `#C93919` and active `#B83C20`.
- Links are deep teal-blue **`#095F87`** and underlined. Focus is a **double ring**: 2px white gap plus a 3px charcoal ring.
- Proprietary UHG **Enterprise Sans** (400/500/700) for UI, with **Enterprise Serif Text italic** as a headline accent ("…, *for everyone*"). Cards have 12px radius and a soft shadow, and the search field is a pill.

## Proposed tokens
```json
{
  "id": "optum",
  "theme": "light",
  "colors": { "primary": "#FF612B", "primaryHover": "#C93919", "primaryActive": "#B83C20", "secondary": "#3D3C38", "accent": ["#D74120", "#095F87", "#F9A667", "#FFD1AB", "#D9F6FA", "#EDE8E0"], "link": "#095F87", "focusRing": "#3D3C38",
              "headerBg": "#FFFFFF", "headerText": "#3D3C38", "pageBg": "#FAF8F2", "surface": "#FFFFFF", "border": "#CECDCA", "textPrimary": "#3D3C38", "textSecondary": "#73716A", "textDisabled": "#989790",
              "success": "#066605", "warning": "#FD602B", "error": "#D71515", "info": "#095F87",
              "neutralRamp": { "0": "#FFFFFF", "5": "#FAFAFA", "10": "#F3F3F3", "20": "#E7E6E4", "30": "#CECDCA", "50": "#989790", "60": "#84827A", "70": "#73716A", "80": "#504F4A", "90": "#3D3C38", "100": "#232220", "110": "#000000" } },
  "typography": { "uiFamily": "Enterprise Sans", "displayFamily": "Enterprise Serif Text", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Source Sans 3", "googleFallbackDisplay": "Source Serif 4",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": null, "bold": 700 }, "headingScale": [40, 32, 23, 18] },
  "radius": { "button": 9999, "input": 9999, "card": 12, "chip": 9999, "modal": null },
  "button": { "height": { "sm": null, "md": 44, "lg": null }, "paddingX": 24, "minWidth": null, "fontSize": 16, "fontWeight": 700, "textTransform": "none", "borderWidth": 2,
              "primary": { "bg": "#3D3C38", "text": "#FFFFFF", "hoverBg": "#232220", "activeBg": "#000000", "disabledBg": null, "disabledText": null },
              "secondary": { "bg": "#FFFFFF", "text": "#3D3C38", "border": "#3D3C38", "hoverBg": "#F3F3F3" },
              "ghost": { "text": "#3D3C38", "hoverBg": null },
              "focus": { "style": "box-shadow double ring: 0 0 0 2px #FFFFFF, 0 0 0 5px #3D3C38", "width": 3, "offset": 2, "color": "#3D3C38" } },
  "input": { "height": 56, "border": "#095F87", "borderWidth": 2, "radius": 9999, "placeholder": "#3D3C38", "focusBorder": "#095F87", "errorBorder": "#D71515" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 4, "itemHeight": 50, "itemHoverBg": null, "itemSelectedBg": null, "itemSelectedText": "#3D3C38", "shadow": "0 2px 6px 0 rgba(0,0,0,0.16)" },
  "tabs": { "style": "boxed", "activeIndicator": "#FF612B", "activeText": "#3D3C38" },
  "elevation": { "card": "0 1px 4px 0 rgba(25,25,26,0.16)", "menu": "0 2px 6px 0 rgba(0,0,0,0.16)", "modal": null },
  "spacingBase": 8,
  "iconStyle": "outline line icons in charcoal for UI (search, location, chevrons); two-tone illustrative icons (orange + charcoal) for quick links"
}
```

### Notes on the values
- **Button tokens (live CSS):**
  - `--dmp-primary-button-bg-color #3D3C38`, hover `#232220`, active `#000`, focus bg unchanged.
  - `--dmp-secondary-button-*`: white bg, `#3D3C38` text and border, hover bg `#F3F3F3` (border/text `#232220`), active bg `#E7E6E4` (text/border black).
  - `--dmp-primary-alt-button-*` (the ghost-like variant on images): white bg, `#3D3C38` text. Hover is transparent with a `#989790` border, and active has a `#73716A` border.
  - `--dmp-vibrant-button-*`: `#D74120` bg, white text, hover `#C93919`, active `#B83C20`. The vibrant outlined variant has a `#D74120` border and text, hover bg `#FFF8F6`, active `#FBE1DA`.
  - Measured buttons ("Sign in", "Get to know us") are 44px tall, 24px side padding, 999px radius, 2px border, Enterprise Sans Bold 16px.
- **For our plugin.** Map **CTA → charcoal `#3D3C38`** and keep `#FF612B` for the banner logo, brand accents and the active tab bar. If an orange CTA is wanted, use `#D74120` (vibrant), never `#FF612B` with white text (3.0:1). `primaryHover`/`primaryActive` in the JSON are the vibrant ramp (`--dmp-color-theme-vibrant-interaction-4/5`).
- **Focus.** Buttons measured `box-shadow: 0 0 0 2px #fff, 0 0 0 5px #3D3C38` (no outline). Links get `0 0 0 2px #3D3C38`. On the dark nav variant the token `--o5-nav-dark-focus` is white.
- **Links.** `--link-standard-font-color #095F87`, underlined. Hover is `#05344A` with the underline removed (measured). Reverse links are white. Teal on white = 7.0:1.
- **Input.** The search drawer field (MUI-based "UES" component) is **56px tall, pill (50px radius), 2px `#095F87` outline** (fieldset), with a white fill, a `0 2px 6px rgba(25,25,26,.16)` shadow, 16px text and a `#3D3C38` placeholder. Input text token `--dmp-color--input-text #4B4D4F`. The error border is **inferred** from `--dmp-color-semantic-danger-fg #D71515`, not measured.
- **Dropdown.** The "Sign in ▾" menu is a white surface with 4px radius and a `0 2px 6px rgba(0,0,0,.16)` shadow. It has 50px rows, 14px `#3D3C38` text and no row border. Hover/selected colours were not captured.
- **Tabs.** The "Personal | Business" switch in the utility bar is a **boxed tab**. The active tab is a white box with a **4px `#FF612B` top border** and bold 14px charcoal text. The inactive tab is transparent on the `#FAF8F2` bar.
- **Semantic tokens.** Success fg `#066605`/bg `#E0F3DF`, danger `#D71515`/`#FCF0F0`, warning `#FD602B`/`#FFE8CD`, info `#095F87`/`#DFF3F9`. Alert component tokens use charcoal text on those backgrounds, with the icon in the semantic colour.
- **Surfaces.** The body background is `#F3F3F3`. Hero/section bands and the utility header bar use `--dmp-color-header-bar` / `--dmp-color-theme-primary-5` `#FAF8F2`, and the main header is white. `pageBg` = `#FAF8F2` because that is what the user sees behind content. Quick-link cards are white, 12px radius, with a `0 1px 4px rgba(25,25,26,.16)` shadow. Brand accents: peach `#FFD1AB`, apricot `#F9A667`, ice `#D9F6FA`, sand `#EDE8E0`.
- **Typography.** `--dmp-font-family-primary: "Enterprise Sans", Helvetica, Arial`, with faces Regular 400, Medium 500, Bold 700, XBold 900 and condensed cuts. Headline accent words use **Enterprise Serif Text Medium Italic**. The UES header search uses **"Optum Sans UES" 600**. Body is 16/24, H1 40/40, H2 32/40 (one section 41/52), H3 23/28, and the main nav is 18px bold. `textSecondary` `#73716A` (neutral-70) is **inferred**, because the site's own `--dmp-color--text-secondary` resolves to `#000`. **Source Sans 3 / Source Serif 4** are the suggested free fallbacks (judgement).
- **Logo.** The orange "Optum" wordmark sits on white or warm white. A reversed white logo was not seen on the site. A clear-space rule was not available (the brand centre is behind UHG login).
- **Cookie banner.** It is informational only ("by continuing… you agree"), with a close button and no reject option. It was left untouched.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Colour, button, link, semantic, neutral, header tokens (`--dmp-*`) | Live CSS custom properties, https://www.optum.com/ | High |
| Button/link sizes, hover/focus states, input, menu, tabs, card shadow, fonts | Live `getComputedStyle` + hover/focus/open (Playwright, own Chromium), https://www.optum.com/ | High |
| Abyss design system (Optum theme) | https://abyss.optum.com/web/brand/optum/tokens, https://abyss.optum.com/web/ui/button: **UHG-network gated, not readable** | n/a |
| Disabled button, modal radius, menu hover/selected, input error | Not found | Low / unknown |
| Google fallback fonts | Judgement | Low |

## Differs from current Figma
- **This is a new brand** with no Figma mode yet. The earlier quick value of primary `#FF612B` is **confirmed as the brand orange** (`--dmp-color-theme-brand-50`). But Optum does **not** use it as a button fill with white text. The live primary button is charcoal `#3D3C38`, and the accessible orange button is `#D74120`.
- Suggested secondary is **`#3D3C38`** (charcoal), with link/info teal `#095F87`.
- Do not copy the AkzoNobel defaults. Use pill buttons (2px border, bold 16px), pill 56px search inputs, 12px soft-shadow cards, a warm-white `#FAF8F2` background, charcoal text, a double-ring focus, and Enterprise Sans → Source Sans 3.
