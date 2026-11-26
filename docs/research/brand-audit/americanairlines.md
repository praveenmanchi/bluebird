# American Airlines — brand UI audit

Audited 2026-11-25 (agent-aa-swa-klm). **The aa.com homepage and booking pages return Akamai "Access Denied" (403) to headless Chromium. That was not bypassed.** One content page did load normally (Contact American, `/i18n/customer-service/...`). Its live CSS exposes AA's current web design system, **Aileron** (`aileron-*` classes, `agc-`/`adc-` Angular components, `--ads-color-*` tokens). The flight-status app shell loaded, but its form never rendered, so **no live text input or dropdown was measured**. Input values come from AA's legacy `core.css` on the same page, with a third-party reference for corroboration only.

## Summary
- Clean white UI with a hairline-grey header. Interactive blue is **`#006DC0`** (Aileron `bg-fill-interactive`), a deeper shade than the brand "AA blue" `#0078D2`, which survives on legacy links and light-weight H1s.
- Text uses blue-greys: Aileron `#1B1F23`, legacy `#36495A`/`#627A88`. Headings in legacy pages are **AmericanSansLight**, large and light.
- Buttons have 4px corners, a bold 16px label (14px in the header) and a solid blue fill. Hover and active go darker (`#005CA4` / `#004C88`). Secondary and ghost buttons hover to a pale blue `#E0F2FF`.
- Focus is a **2px solid `#006DC0` outline with a 2px offset** (Aileron standard).
- Red (`#C30019` brand/legacy error, `#D6001B` Aileron destructive) appears only for errors, destructive actions and the logo. It is never a CTA.

## Proposed tokens
```json
{
  "id": "americanairlines",
  "theme": "light",
  "colors": { "primary": "#006DC0", "primaryHover": "#005CA4", "primaryActive": "#004C88", "secondary": "#C30019", "accent": ["#0078D2", "#00467F", "#0090FB"], "link": "#006DC0", "focusRing": "#006DC0",
              "headerBg": "#FFFFFF", "headerText": "#1B1F23", "pageBg": "#FFFFFF", "surface": "#FFFFFF", "border": "#D0DAE0", "textPrimary": "#1B1F23", "textSecondary": "#5E6D7A", "textDisabled": "#B9C4CB",
              "success": "#008712", "warning": "#D14904", "error": "#D6001B", "info": "#006DC0",
              "neutralRamp": { "0": "#FFFFFF", "50": "#F9FAFB", "100": "#EDF1F3", "150": "#E6ECEF", "200": "#D0DAE0", "300": "#B9C4CB", "400": "#9DA6AB", "500": "#869199", "600": "#627A88", "700": "#5E6D7A", "800": "#36495A", "900": "#1B1F23", "950": "#131313" } },
  "typography": { "uiFamily": "AmericanSans Var", "displayFamily": "AmericanSansLight", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Source Sans 3", "googleFallbackDisplay": "Source Sans 3",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": null, "bold": 700 }, "headingScale": [38, 30, 24, 16] },
  "radius": { "button": 4, "input": 4, "card": 8, "chip": null, "modal": null },
  "button": { "height": { "sm": 32, "md": 36, "lg": 48 }, "paddingX": 16, "minWidth": null, "fontSize": 16, "fontWeight": 700, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#006DC0", "text": "#F9FAFB", "hoverBg": "#005CA4", "activeBg": "#004C88", "disabledBg": "#EDF1F3", "disabledText": "#B9C4CB" },
              "secondary": { "bg": "#FFFFFF", "text": "#006DC0", "border": "#006DC0", "hoverBg": "#E0F2FF" },
              "ghost": { "text": "#006DC0", "hoverBg": "#E0F2FF" },
              "focus": { "style": "outline solid", "width": 2, "offset": 2, "color": "#006DC0" } },
  "input": { "height": 44, "border": "#9DA6AB", "borderWidth": 1, "radius": 4, "placeholder": "#536773", "focusBorder": "#006DC0", "errorBorder": "#C30019" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 4, "itemHeight": null, "itemHoverBg": "#E0F2FF", "itemSelectedBg": "#D6EDFF", "itemSelectedText": "#006DC0", "shadow": "0 0 6px 1px rgba(0,0,0,0.15)" },
  "tabs": { "style": "underline", "activeIndicator": "#006DC0", "activeText": "#006DC0" },
  "elevation": { "card": "none (1px #D0DAE0 border)", "menu": "0 0 6px 1px rgba(0,0,0,0.15)", "modal": "0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.2)" },
  "spacingBase": 4,
  "iconStyle": "'American Icons' icon font (v4.8) + Aileron SVG icons, mostly outline/line glyphs in #006DC0 (--icon-fill)"
}
```

### Notes on the values
- **Buttons (Aileron, measured).** Base `.button` is `height: 3rem; border-radius: 4px; font: 700 1rem/1.5rem "AmericanSans Var"`. Sizes are `xs 28 / sm 32 / md 36 / lg 48`, with padding 10/10/12/16px. The header "Log in" overrides this to 42px tall, 12px padding, 14px/700.
  - Primary: `var(--ads-color-bg-bg-fill-interactive, #006DC0)`, text `#F9FAFB`, hover `#005CA4` (live-verified), active `#004C88`, disabled `#EDF1F3`/`#B9C4CB`.
  - Secondary: transparent with a 1px `#006DC0` border and `#006DC0` text. Hover `#E0F2FF`, active `#D6EDFF`.
  - Ghost: `#006DC0` text with the same hover and active fills.
  - Destructive: `#D6001B` → hover `#B80018` → active `#950013`.
  - Inverse variants exist for dark surfaces (white fill + blue text; or a 1px `#F9FAFB` outline).
- **Focus.** `.button:focus-visible { outline: 2px solid #006DC0; outline-offset: 2px }` (live-verified on keyboard focus). Links use the same treatment.
- **Dark mode exists** in Aileron (`html[aileron-color-scheme="dark"]`): fill `#3AABFF`, hover `#ACDCFF`, main bg `#131313`, focus `#3AABFF`. aa.com renders light by default.
- **Tabs.** Underline style. The tab bar has a 1px `#D0DAE0` bottom border. The selected tab gets a **4px bar** (`#006DC0` in the header nav; `#0090FB` inset shadow in the generic `aileron-tab`) and a bold label (`#006DC0` generic, `#1B1F23` in the header). Hover is a `#E0F2FF` background with blue text. Disabled is `#B9C4CB`. Labels are 16px/700 with 12px padding.
- **Links.** Aileron links are `#006DC0`, visited `#002F55`, and underline on hover for the icon variants. Legacy content links are `#0078D2` 14px Arial with a trailing "»".
- **Inputs.** Not measurable live (the form app was blocked). Legacy `core.css` gives `1px solid #9DA6AB`, **0 radius**, `#36495A` text, 8/9px padding, 16px Arial. Focus is a black border, error `#C30019`, placeholder `#536773`. The proposed 4px radius / 44px height / `#006DC0` focus brings this in line with Aileron buttons and the `aileron-select--focus { outline: 2px solid #006DC0 }` rule. It matches the third-party reference (44px, 4px, 2px blue focus) but is **not live-verified**.
- **Dropdown.** No Aileron menu was rendered. Hover and selected fills reuse Aileron's `bg-fill-hover #E0F2FF` / `bg-fill-active #D6EDFF`. The shadow is the most common popover shadow in aa.com CSS. Low confidence.
- **Header.** White, a 1px `#E6ECEF` bottom rule, nav labels `#1B1F23` 14–16px/700, and a blue "Log in" CTA. The logo slot currently shows a centennial "100" mark with oneworld. Footer `#D0DAE0` with `#1B1F23` text.
- **Typography.** `"AmericanSans Var"` (variable, weight 100–1000, width 75–125%) for Aileron components. Legacy pages use `AmericanSans`, `AmericanSansLight`, `AmericanSansMedium` and Arial body text at 14/20. Legacy headings are AmericanSansLight 400: H1 38/44 `#0078D2`, H2 30/36 `#00467F`, H3 24/30 `#627A88`. Aileron body/tab-panel text is 16/24 `#1B1F23`. American Sans is proprietary (commissioned for the 2013 rebrand). **Source Sans 3** is the suggested humanist fallback for both its light and bold cuts. That is a judgement call.
- **Status.** Legacy messages: success `#008712`, warning `#D14904`, error `#C30019`. Aileron destructive `#D6001B` / pale `#FFE2E6`.
- **Logo.** The current mark is "American" + flight symbol (blue/red/silver). The cookie modal shows the full-colour mark on white. A reversed/white-logo rule and clear space were not found publicly. **Unverified.**

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Aileron button/tab/link/focus rules, `--ads-color-*` fallbacks, fonts | Live CSS + `getComputedStyle` (Playwright, own Chromium) on https://www.aa.com/i18n/customer-service/contact-american/american-customer-service.jsp | High |
| Legacy text/heading colours, status colours, legacy input styles | Same page: `core.css`, `responsive.css`, `publishing.css` | Medium (legacy layer) |
| Homepage, booking widget, flight-status form | https://www.aa.com/homePage.do, `/booking/find-flights`: 403 Access Denied, not bypassed. https://www.aa.com/travelInformation/flights/status: shell only, form never rendered | Not available |
| Input height/radius, card radius, dropdown | Third-party https://www.shadcn.io/design/american-airlines (itself says "not live-page verified") + inference from Aileron | Low |
| Google fallback font | Judgement | Low |

## Differs from current Figma
- Current Figma: primary `#0078D2`, secondary `#C30019`.
- **Primary.** Change to **`#006DC0`**. `#0078D2` is the historic "AA blue" still used for legacy links and H1s, but Aileron's interactive fill, links and focus ring are all `#006DC0` (hover `#005CA4`). If the team wants the recognisable brand blue in the banner, keep `#0078D2` there only.
- **Secondary.** `#C30019` is correct as AA's brand/legacy red, but it is an error and logo colour, never a CTA. Don't use it for selected states. Aileron's destructive red is `#D6001B`.
- Replace the AkzoNobel copies: AmericanSans → Source Sans 3 instead of Noto Sans; 4px radii; blue-grey neutrals (`#1B1F23`, `#5E6D7A`, `#D0DAE0`, `#EDF1F3`); a 2px offset blue focus outline; and a 4px blue tab underline.
