# Anthropic — brand UI audit

Audited 2026-11-25 (agent-vanguard-optum-anthropic). **www.anthropic.com** and **claude.com** loaded normally in headless Chromium and expose a full token set (`--color-gray-*`, `--color-clay-*`, `--theme-*`, `--button-*`, type and spacing scales). **claude.ai showed a Cloudflare "Just a moment…" challenge**, which was not bypassed. As the closest product-UI proxy, **docs.claude.com** was read; it ships the Claude Design System tokens (`--cds-*`). There is no public Anthropic design-system site or package.

## Summary
- Light, warm **"ivory" UI**: page and header `#FAF9F5`, cards `#F5F4ED`, hairlines `#E8E6DC`, ink text `#141413`. Greys are warm (slate/cloud/ivory), never neutral.
- **The CTA is ink, not orange.** "Try Claude" is a `#141413` fill with ivory `#FAF9F5` text, 8–10px radius and 36px height. **Clay `#D97757`** is the brand spark (Claude logo, accents, illustrations). Its interactive shade `#C6613F` is used for clay buttons.
- Nav items are **small pill chips** (28px, `#F5F4ED` with a 1px `#E8E6DC` border). Menus are white with a 16px radius, a 1px `#DEDCD1` border and a whisper shadow.
- Custom typefaces **Anthropic Sans / Anthropic Serif / Anthropic Mono**. Serif carries headlines; sans carries UI and body. The live CSS no longer references Styrene or Tiempos.
- Focus is a **2px outline with 4px offset**, in deep periwinkle `#154C92` on anthropic.com and clay-dark `#C46849` on claude.com.

## Proposed tokens
```json
{
  "id": "anthropic",
  "theme": "light",
  "colors": { "primary": "#D97757", "primaryHover": "#C6613F", "primaryActive": "#BA5B3C", "secondary": "#141413", "accent": ["#6A9BCC", "#788C5D", "#C46686", "#E3DACC", "#CBCADB", "#BCD1CA"], "link": "#141413", "focusRing": "#154C92",
              "headerBg": "#FAF9F5", "headerText": "#141413", "pageBg": "#FAF9F5", "surface": "#FFFFFF", "border": "#E8E6DC", "textPrimary": "#141413", "textSecondary": "#5E5D59", "textDisabled": "#B0AEA5",
              "success": "#10A122", "warning": "#FBB315", "error": "#BF4D43", "info": "#257DE0",
              "neutralRamp": { "0": "#FFFFFF", "50": "#FAF9F5", "100": "#F5F4ED", "150": "#F0EEE6", "200": "#E8E6DC", "250": "#DEDCD1", "300": "#D1CFC5", "400": "#B0AEA5", "500": "#87867F", "600": "#5E5D59", "650": "#4D4C48", "700": "#3D3D3A", "750": "#30302E", "800": "#262624", "900": "#1A1918", "950": "#141413" } },
  "typography": { "uiFamily": "Anthropic Sans", "displayFamily": "Anthropic Serif", "monoFamily": "Anthropic Mono", "proprietary": true, "googleFallbackUi": "Inter", "googleFallbackDisplay": "Source Serif 4",
                  "bodySize": 17, "bodyLineHeight": 26, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 }, "headingScale": [72, 64, 52, 44, 36, 32, 25, 19] },
  "radius": { "button": 8, "input": 8, "card": 16, "chip": 9999, "modal": 16 },
  "button": { "height": { "sm": 28, "md": 36, "lg": 44 }, "paddingX": 16, "minWidth": null, "fontSize": 15, "fontWeight": 500, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#141413", "text": "#FAF9F5", "hoverBg": "#141413", "activeBg": null, "disabledBg": null, "disabledText": null },
              "secondary": { "bg": "#FAF9F5", "text": "#5E5D59", "border": "#D1CFC5", "hoverBg": "#F5F4ED" },
              "ghost": { "text": "#3D3D3A", "hoverBg": "#E8E6DC" },
              "focus": { "style": "outline 2px solid, offset 4px (2px on large controls)", "width": 2, "offset": 4, "color": "#154C92" } },
  "input": { "height": null, "border": "#E8E6DC", "borderWidth": 1, "radius": 8, "placeholder": "#87867F", "focusBorder": "#154C92", "errorBorder": "#BF4D43" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 16, "itemHeight": 28, "itemHoverBg": null, "itemSelectedBg": null, "itemSelectedText": "#141413", "shadow": "0 4px 24px 0 rgba(0,0,0,0.05)" },
  "tabs": { "style": "pill", "activeIndicator": "#FFFFFF", "activeText": "#141413" },
  "elevation": { "card": "none", "menu": "0 4px 24px 0 rgba(0,0,0,0.05)", "modal": null },
  "spacingBase": 4,
  "iconStyle": "thin outline line icons (search, chevrons, menu); custom 'Anthropicons' variable icon font on Claude docs"
}
```

### Notes on the values
- **Primary vs CTA.** Brand primary = **Clay `#D97757`** (`--color-clay` / `--color-clay-primary`). White on clay is only **3.1:1**. The clay interactive shade `#C6613F` is 4.05:1, and the CDS `--cds-fill-brand` `#BA5B3C` is 4.5:1. Every measured primary CTA, though, is **ink `#141413` with `#FAF9F5` text** (17.5:1): `--theme-button-primary-background: var(--color-gray-950)`. For our plugin, map **CTA → `#141413`**, use clay for the banner/logo accent and selected highlights, and if a clay button is wanted use `#C6613F`/`#BA5B3C` (claude.com's `--theme-button-clay-bg` = `#C6613F` with white text).
- **Button states.**
  - claude.com "Try Claude": 36px, 8px radius, 16px padding, 15px/500. On hover it keeps the colour and adds a **2px same-colour ring** (`box-shadow 0 0 0 2px #141413`). Focus is a 2px `#C46849` outline at 4px offset.
  - anthropic.com hero buttons: 36px, 10px radius, 24px padding, 1px border. Header nav chips are 28px pills, `#F5F4ED` with a 1px `#E8E6DC` border, 13px. On hover they go to `#E8E6DC`; the "Try Claude" chip goes to ink `#141413` with ivory text. Focus is a 2px `#154C92` outline at 4px offset.
  - The dark-section secondary is `#E8E6DC` with a `#DEDCD1` border, hover `#DEDCD1`.
  - Disabled/active colours were not exposed.
- **Secondary/outline.** claude.com "Contact sales" is a `#FAF9F5` fill with a 1px `#D1CFC5` ring and `#5E5D59` text. On hover the text goes `#141413` and the ring 2px. "Continue with Google" is 44px, 9.6px radius, 1px `#D1CFC5` border, hover bg `#F5F4ED`. Theme tokens: secondary `bg #F0EEE6 / fg #3D3D3A / border #DEDCD1`, tertiary `bg #FFF / fg #4D4C48 / border #E8E6DC`.
- **Inputs.** The only unauthenticated input is the header search: 30px, `#F5F4ED` fill, 1px `#E8E6DC` border, 8px radius, 13px text, `#87867F` placeholder. Product-size inputs (claude.ai) could not be measured, so `input.height` is null. 36–44px matches the button row. Error colour `--color-error #BF4D43` is shared by anthropic.com and claude.com. Focus border is **inferred** from the focus-ring token.
- **Menu.** The "Company ▾" popup is white, 16px radius, 1px `#DEDCD1` border, `0 4px 24px rgba(0,0,0,.05)` shadow, with ~28px link rows at 16.7px ink and 16px side padding. Hover/selected rows were not captured.
- **Tabs.** claude.com tokens `--theme-tab-selected-bg: var(--theme-background-primary)` and `--theme-tab-selected-fg: var(--theme-foreground-primary)` describe a **segmented pill**: the selected tab takes the page's primary background (white in the light theme) and ink text. Medium-low confidence; not observed live.
- **Status.** Only `--color-error #BF4D43` exists on the marketing sites. Success `#10A122`, warning `#FBB315` and info/accent `#257DE0` come from **docs.claude.com `--cds-role-*` / `--cds-fill-*`** (danger there is `#C83839`). CDS also gives radius 8px (`--cds-radius`), a composer radius of 14px, `--cds-fill-primary #191919` (hover `#3C3C3C`) and a 1px focus ring + glow in `#257DE0`. The docs theme uses neutral rather than warm greys, so treat CDS as the Claude product's *system*, not the ivory skin.
- **Surfaces.** The page and sticky header are `#FAF9F5` (`--color-ivory-light`) with no border. Cards are flat `#F5F4ED` with a 16px radius (`--radius-md`) and no shadow, and media has a 4px radius. Dark sections and the footer are `#141413` with `#87867F` links and `#3D3D3A` dividers. Brand accents from `--color-*`: oat `#E3DACC`, olive `#788C5D`, cactus `#BCD1CA`, sky `#6A9BCC`, heather `#CBCADB`, fig `#C46686`, coral `#EBCECE`, periwinkle-deep `#184F95`.
- **Typography.** `--anthropic-sans` / `--anthropic-serif` (`@font-face` names `anthropicSans`, `anthropicSerif`, `anthropicMono`, variable 300–800). anthropic.com also loads JetBrains Mono. Body is fluid at 16.7/25.5 on anthropic.com and 17 on claude.com. The type scale tokens are display 72/64, headline 52/44/36/32/25/19, body 25/23/20/17/15/12, caption 14 and micro 10. Headlines are serif 400–500 with 100–116% leading. H3/card titles are sans 700, and nav and labels are 13–15px. **The Styrene/Tiempos names in the brief are outdated**: neither appears in the live CSS. **Inter / Source Serif 4** are the suggested free fallbacks (judgement; Source Serif is close to the Tiempos-like serif).
- **Spacing.** `--spacing-2…200` and `--sp-*` on a 4px base, with 8px steps dominant. Grid margin is 80px, gutter 16px, reading width 640–720px.
- **Logo.** The "ANTHROP\C" wordmark is black on ivory and is reversed to ivory on the dark footer/sections in Anthropic's own UI. The Claude logo is a clay spark plus a serif "Claude" wordmark. No public clear-space rule was found.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Colour ramps, theme/button tokens, type/spacing/radius scales | Live CSS custom properties, https://www.anthropic.com/ | High |
| Button sizes, hover/focus, nav chips, menu popup, search input, cards, fonts | Live `getComputedStyle` + hover/focus/open (Playwright, own Chromium), https://www.anthropic.com/ | High |
| CTA/secondary/Google button, clay button + tab tokens, focus colour | Live, https://claude.com/ | High |
| Status colours (success/warning/info), product radius, CDS fills | Live `--cds-*` tokens, https://docs.claude.com/en/home | Medium (docs theme, not claude.ai) |
| claude.ai product UI | https://claude.ai/login: **Cloudflare challenge, not measured** | n/a |
| Input height, disabled/active button, menu hover/selected, modal radius | Not found (modal 16 inferred from menu/card radius) | Low |
| Google fallback fonts | Judgement | Low |

## Differs from current Figma
- **This is a new brand** with no Figma mode and no earlier quick value.
- Proposed primary **`#D97757` (Clay)** as the brand colour, with **`#141413` (ink)** as secondary and as the actual CTA fill. Interactive clay shades are `#C6613F` (hover) and `#BA5B3C` (pressed / AA-safe fill).
- Do not copy the AkzoNobel defaults. Use warm ivory `#FAF9F5` surfaces with warm greys, 8px-radius buttons, pill nav chips, 16px flat cards, 16px menus with a 0.05 shadow, Anthropic Sans/Serif → Inter/Source Serif 4, and the 2px/4px-offset focus outline.
