# Delta Air Lines — brand UI audit

Audited 2026-11-25 (agent-delta-lowes). **delta.com blocked headless Chromium** (HTTP 444 "Access Denied" from the edge). Per the brief I did not try to bypass it. All values below come from the **Internet Archive copy of www.delta.com captured 2026-11-02** (`web.archive.org/web/20261102163351/https://www.delta.com/`), loaded in my own headless Chromium. On that copy I read the site's own CSS: the **"Mach 1" design-system tokens** (`--mds-*` semantic tokens over `--blue-*`/`--red-*`/`--neutral-*` primitives, scoped to `[data-design-system="delta-mach-1-light"]`) and the component rules (`button.button`, `.button-primary`, `button.dropdown`, `input.single-line-input`, `div.tabs`). Then I took `getComputedStyle` of real elements. Since this is published CSS three weeks old, confidence is high, but nothing is from a live session.

## Summary
- Light content pages under a **deep-navy header** (`#001122`, with a `#001932 → #001122` gradient). The white DELTA logotype and red widget sit on it, and the nav links are white 14px semibold.
- The signature CTA is **Delta red `#E01933`** ("Find Flights", "Explore Offers") with white semibold text. Hover darkens to `#AD1834` and pressed to `#661024`. Red is reserved for the primary action and the active-tab bar.
- **Navy `#001E3C`** carries headings, the outlined secondary button (2px border), checked checkboxes and the selected states. Links are mid-blue `#0066CC`.
- Corners are small: 4px on buttons (6px on the large CTA), 6px on inputs and dropdowns, 8px on cards. Controls are big and airy: inputs are 64px tall, the large button is 64px, the medium one 52px.
- The type is proprietary **Whitney** (300–600), plus **Whitney Condensed** for display. Focus is a thick **4px `#0C7DEE` outline at a 4px offset**.

## Proposed tokens
```json
{
  "id": "delta",
  "theme": "light",
  "colors": { "primary": "#E01933", "primaryHover": "#AD1834", "primaryActive": "#661024", "secondary": "#003366", "accent": ["#001E3C", "#C01933", "#0066CC"], "link": "#0066CC", "focusRing": "#0C7DEE",
              "headerBg": "#001122", "headerText": "#FFFFFF", "pageBg": "#F2F3F5", "surface": "#FFFFFF", "border": "#DFE0E6", "textPrimary": "#001E3C", "textSecondary": "#3E414F", "textDisabled": "#80859C",
              "success": "#167B3D", "warning": "#AB5300", "error": "#C01933", "info": "#0066CC",
              "neutralRamp": { "0": "#FFFFFF", "5": "#F2F3F5", "10": "#EAEBEE", "50": "#DFE0E6", "100": "#D5D6DE", "200": "#CACCD6", "300": "#C0C2CD", "400": "#AAADBD", "500": "#9599AC", "600": "#80859C", "700": "#6C718A", "800": "#5D6176", "900": "#4D5163", "1000": "#3E414F" } },
  "typography": { "uiFamily": "Whitney", "displayFamily": "Whitney Condensed", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Source Sans 3", "googleFallbackDisplay": "Fira Sans Condensed",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 }, "headingScale": [48, 36, 28, 24, 20] },
  "radius": { "button": 4, "input": 6, "card": 8, "chip": null, "modal": 8 },
  "button": { "height": { "sm": 40, "md": 52, "lg": 64 }, "paddingX": 32, "minWidth": null, "fontSize": 16, "fontWeight": 600, "textTransform": "none", "borderWidth": 2,
              "primary": { "bg": "#E01933", "text": "#FFFFFF", "hoverBg": "#AD1834", "activeBg": "#661024", "disabledBg": "#CACCD6", "disabledText": "#80859C" },
              "secondary": { "bg": "#FFFFFF", "text": "#001E3C", "border": "#001E3C", "hoverBg": "#003366" },
              "ghost": { "text": "#0066CC", "hoverBg": "#EBF5FE" },
              "focus": { "style": "outline (solid), rounded 6px, outside the control", "width": 4, "offset": 4, "color": "#0C7DEE" } },
  "input": { "height": 64, "border": "#80859C", "borderWidth": 1, "radius": 6, "placeholder": "#6C718A", "focusBorder": "#0C7DEE", "errorBorder": "#C01933" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 6, "itemHeight": 48, "itemHoverBg": "#D4E7FA", "itemSelectedBg": "#0057AD", "itemSelectedText": "#FFFFFF", "shadow": "0 38px 23px rgba(0,45,89,0.02), 0 17px 17px rgba(0,45,89,0.03), 0 4px 9px rgba(0,45,89,0.05)" },
  "tabs": { "style": "underline", "activeIndicator": "#E01933", "activeText": "#001E3C" },
  "elevation": { "card": "0 1px 1px rgba(0,45,89,0.12)", "menu": "0 38px 23px rgba(0,45,89,0.02), 0 17px 17px rgba(0,45,89,0.03), 0 4px 9px rgba(0,45,89,0.05)", "modal": "0 38px 23px rgba(0,45,89,0.02), 0 17px 17px rgba(0,45,89,0.03), 0 4px 9px rgba(0,45,89,0.05)" },
  "spacingBase": 4,
  "iconStyle": "solid/filled single-colour glyphs (plane, bed, car, ship) rendered as CSS masks; 20–24px; navy on light, white on navy"
}
```

### Notes on the values
- **Brand colours (`--mds-brand-*`).** Brand blue `#003366` (`--blue-600`), brand red `#C01933` (`--red-400`), light red `#E01933` (`--red-200`, used for the CTA), dark red `#991933`. The primary button token is `--mds-button-primary: #E01933`, so the JSON's `primary` is the CTA red and `secondary` is brand blue. Navy `#001E3C` (`--blue-900`) is the heading, secondary-button and checkbox colour.
- **Primary button.** `#E01933` with white text. Hover `#AD1834` (`--red-500`), pressed `#661024` (`--red-800`), disabled `#CACCD6` with `#80859C` text. No border, 4px radius (`--mds-radius-01`). The large size uses 6px (`--mds-radius-02`).
- **Sizes (`.button-*`).** xs 28px / 14px / pad 12. sm 40px / 14px / pad 12. md 52px / 16px / pad 32. lg 64px / 18px / pad 32. All are semibold 600 with no text-transform. The homepage CTAs measured 64px tall, 18px/600, `0 32px` padding.
- **Secondary button.** Transparent with a **2px `#001E3C` border** and navy text. Hover fills `#003366` with white text. Pressed `#001E3C`. Disabled has a `#C0C2CD` border and `#80859C` text.
- **Tertiary button.** `#EAEBEE` fill, navy text, `#AAADBD` outline token.
- **Text (ghost) button.** `#0066CC` text, padding `4px 8px`, 4px radius, hover tint `rgba(50,150,250,.1)` (≈ `#EBF5FE` on white).
- **On-colour inverse button.** White fill with navy text. Hover is `rgba(0,0,0,.5)` with white text.
- **Focus.** Global `:focus-visible` is `outline: 4px solid #0C7DEE; outline-offset: 4px; border-radius: 6px` (`--mds-stroke-focus`, `--mds-styling-stroke-03`). Dropdown items and tabs draw the same 4px ring inset or inset by −6/−8px. On navy surfaces the ring token switches to white (`--mds-stroke-inverse`).
- **Inputs (`input.single-line-input`).** 64px tall, white, 1px `#80859C` border (`--mds-stroke-03`), 6px radius, text 18px/500 `#3E414F`, floating 12px label. Placeholder `#6C718A`. On focus the border goes transparent and the 4px blue focus ring takes over. Invalid shows `box-shadow: 0 0 0 2px #C01933`. Disabled and read-only use a `#F2F3F5` fill and no border.
- **Dropdown (`button.dropdown`).** The trigger is a white 74px field with a 1px `#DFE0E6` border, 6px radius, 12px/500 navy label over an 18px/500 value, and a 12px filled caret. The menu (`ul.dropdown__list`) is white with 6px radius, 20px top and bottom padding and `--mds-shadow-03`. Items have a 48px min height and 18px/500 navy text. Hover is `#D4E7FA` (`--mds-support-surface-information`). The **selected item is a solid `#0057AD` bar with white semibold text** (`--mds-fill-highlight-02`).
- **Tabs.** Standard tabs have a **4px bottom bar in CTA red `#E01933`** with rounded top corners. The active label is `#001E3C`, inactive labels are `#6C718A`, and hover shows a navy bar. The booking widget on the header uses **boxed tabs**: white tabs with 8px top radius on navy, the active tab white with a navy label, inactive tabs white text with a `rgba(148,198,247,.15)` hover.
- **Checkbox and toggle.** The checkbox is 24px with 4px radius and a 1px `#001E3C` border, checked fill `#001E3C` with a white tick, and error border `#C01933`. The toggle is a 34×14 track, checked `#3296FA` (`--mds-icon-link`), with a 20px white knob that has a shadow.
- **Links (`a.link`).** `#0066CC`, 14–16px semibold, no underline at rest (the underline appears on hover). Visited is unchanged. Arrow and external-link icons are masked SVGs.
- **Cards.** White, 8px radius, a 1px `#DFE0E6` border plus the very soft navy-tinted `--mds-shadow-03`. Content padding is 32px.
- **Shadows.** `--shadow-01: 0 1px 1px rgba(0,45,89,.12)`. `--shadow-02` and `--shadow-03` are three-layer navy-tinted, very diffuse shadows. All shadows tint to `rgba(0,45,89,…)`, never neutral black.
- **Status (`--mds-*`).**
  - Confirmation: fill `#167B3D`, surface `#E7FBEE`.
  - Notice: text `#AB5300`, fill `#CC6400`, surface `#FFE9D4`.
  - Alert: `#C01933`, surface `#FCE3E5`.
  - Information: `#0066CC`, surface `#D4E7FA`.
- **Typography.** `--font-primary: "Whitney", sans-serif` and `--font-primary-condensed: "Whitney Condensed"`. Weights 300/400 (book)/500/600/700/900 are defined; 300–600 load on the homepage.
  - Type scale: 12, 14, 16, 18, 20, 24, 28, 36, 40, 48, 64… px.
  - Headings: heading-md is 48/54 semibold and heading-sm is 36/40, both with −1.5% tracking.
  - Body: the body element is 16/24, `text-body-md` is 18/26 and labels are 14–18px semibold.
  - The 28 and 24 heading sizes are inferred from the type scale. Whitney is a commercial Hoefler&Co face. **Source Sans 3** (or Fira Sans) is the suggested free humanist fallback, a judgement call.
- **Spacing.** Tokens are 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 72, 96 (4px base). Stroke tokens are 1, 2 and 4px. Radius tokens are 2, 4, 6, 8, 12, 16 and full.
- **Theme.** Mach 1 ships `delta-mach-1-light`, `-dark` and `-dark-v2` (plus Virgin Atlantic themes). delta.com uses light content with the navy navigation surface (`--mds-surface-navigation: #001122`). That maps directly to our brand banner: navy banner, white logo.
- **Logo.** Delta's brand guidelines page gives the clear space as **x = cap height of the DELTA logotype**, the minimum left and right, with 1.5x preferred above and below. It allows the **reversed (white type) logo** when the background is 50–100% grey value, which covers navy and red. The live header shows the white logotype and red widget on navy.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| All colour tokens (`--mds-*`, `--blue/red/neutral/green/amber-*`), radius, spacing, type scale, shadows | Published CSS of https://web.archive.org/web/20261102163351/https://www.delta.com/ (Mach 1 tokens, `delta-mach-1-light` scope) resolved with `getComputedStyle` in my own Chromium | High (published CSS, archive copy 3 weeks old) |
| Button, input, dropdown, tab, checkbox, toggle, link, focus rules | Same CSS: component rules (`.button-*`, `input.single-line-input`, `button.dropdown + ul.dropdown__list`, `div.tabs`) | High |
| Measured sizes (64px CTA, 74px dropdown trigger, 64px input, 44px booking tabs, 8px card), fonts loaded | Computed style on the archive copy | High |
| Live delta.com | Blocked (HTTP 444 Access Denied for headless Chromium); not bypassed | — |
| Logo clear space and reversed-logo rule | https://news.delta.com/delta-air-lines-logos-and-brand-guidelines (via search summary) | Medium |
| Whitney → Source Sans 3 / Fira Sans Condensed fallback; heading sizes 28/24; modal radius | Judgement / inferred from tokens | Low |

## Differs from current Figma
- **New brand.** It is not in the Figma file yet. Proposed mode: primary (CTA) `#E01933`, secondary (brand blue) `#003366`, navy `#001E3C` for text and the secondary button, banner `#001122` with the white logo.
