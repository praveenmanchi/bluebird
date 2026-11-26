# Cisco — cisco.com "Muse" web system (Magnetic product DS is private)

## Summary
Cisco's current look, from the 2025–26 rebrand as live on cisco.com, is built on **midnight navy `#07182D`** (text and dark sections), **Cisco Blue `#02C8FF`** (logo and brand highlights) and an interactive **medium blue `#0A60FF`** for CTAs, links and focus. Buttons are **full pills** (48px radius), 48px tall (38px small), 16px/600 **Inter**, with no text transform. Cards are white with 12px corners and a soft 16px-blur shadow on a cool grey page (`#F2F5F7`). The header is white with midnight text. Hero sections switch to black with white pill buttons and a blue "glow" shadow. Focus is a stacked ring: white gap, then a `#0A60FF` outer ring. The product design system, **Magnetic** (magnetic.cisco.com), is gated ("This page is private"), so these tokens come from Cisco's public web system (CSS prefix `--muse-*`). Webex's public Momentum tokens are noted as a secondary product reference.

## Proposed tokens
```json
{
  "id": "cisco",
  "theme": "light",
  "colors": { "primary": "#0A60FF", "primaryHover": "#124FC9", "primaryActive": "#0E3A99", "secondary": "#07182D",
              "accent": ["#02C8FF", "#FF007F", "#478EFF"], "link": "#0A60FF", "focusRing": "#0A60FF",
              "headerBg": "#FFFFFF", "headerText": "#07182D", "pageBg": "#F2F5F7", "surface": "#FFFFFF", "border": "#B9C1C9",
              "textPrimary": "#07182D", "textSecondary": "#536070", "textDisabled": "#A1A9B2",
              "success": "#3D851C", "warning": "#FF9000", "error": "#D91821", "info": "#0A60FF",
              "neutralRamp": { "05": "#F2F5F7", "10": "#E1E6EB", "15": "#CED4DB", "20": "#B9C1C9", "30": "#A1A9B2", "40": "#848D99", "50": "#667180",
                               "60": "#536070", "70": "#425062", "80": "#314257", "90": "#26384F", "95": "#16283D", "midnight": "#07182D" } },
  "typography": { "uiFamily": "Inter", "displayFamily": "Inter", "monoFamily": null, "proprietary": false,
                  "googleFallbackUi": "Inter", "googleFallbackDisplay": "Inter",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [60, 48, 40, 32, 24, 20, 16] },
  "radius": { "button": 48, "input": null, "card": 12, "chip": 48, "modal": 16 },
  "button": { "height": { "sm": 38, "md": 48, "lg": null }, "paddingX": 20, "minWidth": null, "fontSize": 16, "fontWeight": 600, "textTransform": "none", "borderWidth": 2,
              "primary": { "bg": "#0A60FF", "text": "#FFFFFF", "hoverBg": "#124FC9", "activeBg": "#0E3A99", "disabledBg": null, "disabledText": null },
              "secondary": { "bg": "transparent", "text": "#0A60FF", "border": "#0A60FF", "hoverBg": "transparent" },
              "ghost": { "text": "#0A60FF", "hoverBg": null },
              "focus": { "style": "box-shadow stack: 0 0 0 2px #FFFFFF, 0 0 0 4px #0A60FF (outline buttons add a 6px outer ring)", "width": 2, "offset": 2, "color": "#0A60FF" } },
  "input": { "height": 48, "border": "#848D99", "borderWidth": 1, "radius": null, "placeholder": "#536070", "focusBorder": "#0A60FF", "errorBorder": "#D91821" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": null, "itemHeight": null, "itemHoverBg": "#F2F5F7", "itemSelectedBg": "#E0EEFF", "itemSelectedText": "#07182D",
                "shadow": "0 1px 4px 0 rgba(0,0,0,0.16), 0 7px 29px 0 rgba(27,28,29,0.2)" },
  "tabs": { "style": "pill", "activeIndicator": "#FFFFFF", "activeText": "#07182D" },
  "elevation": { "card": "0 2px 16px 0 rgba(27,28,29,0.08)", "menu": "0 1px 4px 0 rgba(0,0,0,0.16), 0 7px 29px 0 rgba(27,28,29,0.2)", "modal": "0 1px 4px 0 rgba(0,0,0,0.16), 0 7px 29px 0 rgba(27,28,29,0.2)" },
  "spacingBase": 4,
  "iconStyle": "Cisco line icons (outline, round caps — stroke-linecap round in header SVG sprite)"
}
```

### Notes on the values
- **Measured buttons** (cisco.com product page, light section): primary `#0A60FF` → hover `#124FC9`, white text, 48px, padding 10px 20px, radius 48px, 2px transparent border, 16px/600. Secondary is transparent with a 1px `#0A60FF` border and text, and turns `#124FC9` on hover. The small size is 38px with 14px text. The homepage hero (black, `muse-theme-contrast-dark`) uses a **white** primary with midnight text (hover `#F2F5F7`) and a white-outline secondary.
- **primaryActive `#0E3A99`** (medium-blue-70) is inferred from the next ramp step. It was not measured. Low confidence.
- **Disabled styles** were not visible on the live site, so they are left null. Suggested from the ramp: bg `#E1E6EB`, text `#A1A9B2`. Low confidence.
- **Light-theme semantic tokens** (`--muse-theme-contrast-light-*`): surface `#FFFFFF`, surface-raised `#F2F5F7`, border `#B9C1C9`, border-interactive `#848D99`, border-hover `#314257`, text `#07182D`, text-subtle `#536070`. Status: success green-50 `#3D851C`, info medium-blue-50 `#0A60FF`, error red-50 `#D91821`, warning orange-50 `#FF9000`. Tinted "secondary" backgrounds are `#E3F7DA`, `#E0EEFF`, `#FFE8EA` and `#FFF8F0`. Note that the light-theme "accent" token itself is midnight `#07182D` (accent-hover `#16283D`). Cisco uses dark navy for emphasis and blue for interaction.
- **Brand palette ramps**: Cisco Blue (`--muse-color-brand-cisco-blue-50` `#02C8FF`), medium blue, magenta `#FF007F`, orange `#FF9000`, yellow `#E5AC00`, red `#D91821`, green `#3D851C`. Each runs 05–95.
- **Radius tokens**: 2, 4, 8, 12, 16, 20px plus circle. Cards measured 12px, promo cards 8px, media 4px.
- **Tabs**: segmented pill tabs (`cmp-tabs__tab`), 44px tall, radius 48px, 16px/400. The active tab is a white pill with midnight text on a dark band. Inactive tabs show `rgba(132,141,153,0.15)` on hover.
- **Header**: white, 120px on desktop (two-tier: utility row plus nav), nav text 14px midnight, hover/active `#0A60FF`.
- **Typography**: the root font stack is `Inter, "Noto Sans", CiscoSans, CiscoSansTT, -apple-system, system-ui, sans-serif`. Cisco has moved its web type from the proprietary **CiscoSans** to **Inter**, which is a Google Font and installs directly in Figma. Font-size tokens use a 10px root: 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60, 76px. Weights 100–700, mostly 400/600. Titles on cisco.com are light-weight (400), e.g. 20/28 teaser titles and 20/30 `#536070` section titles.
- **Inputs and dropdowns**: no visible form fields or menus on the public pages (the search field is borderless inside the header). The input and dropdown values above come from tokens: border-interactive, accent focus, error and the high elevation. The 48px input height mirrors the button height. **Low–medium confidence.**
- **Webex / Momentum** (`@momentum-design/tokens@0.19.0`, `theme/webex/light-stable.css`), a Cisco collaboration product UI: primary button `#000000F2` (near-black), accent `#1170CF`, accent text `#0353A8`, input outline `#00000080`, focus `#1170CF`, error text `#AB0A15`, success `#185E46`, warning `#7D4705`. Font stack is `Momentum, Inter, Arial`. This confirms that Cisco product UIs also use **Inter** and a mid blue for focus and interaction.

## Logo
- The Cisco "bridge" logo appears in Cisco Blue `#02C8FF` on midnight/black and in midnight on white. The header SVG sprite is monochrome (`stroke="inherit"`), which implies the mark is recoloured per theme. Brand guidelines (white-on-colour permission, clear space) were not accessible publicly, so this is **unverified**. A white logo on a midnight `#07182D` banner is consistent with the dark sections of cisco.com.

## Sources
- https://www.cisco.com/ and https://www.cisco.com/site/us/en/products/networking/index.html, measured live with Playwright after rejecting cookies (OneTrust "Reject All"). Values: `--muse-*` root tokens (996 vars), CTA styles with hover/focus, tabs, cards, header, body font. **Live computed, high** (marketing web system).
- https://magnetic.cisco.com/ returned "This page is private" (gated), so the Magnetic product tokens were **not available**.
- https://momentum.design/ (Webex Momentum docs, loads) and `@momentum-design/tokens@0.19.0` (npm): Webex light theme colours and font stack. **Design-system tokens, medium** (Webex product, not Cisco-wide).
- No third-party sources were used.

## Differs from current Figma
- **Primary `#0D274D`** is close to, but not the same as, Cisco's midnight `#07182D`. On cisco.com navy is used for text and dark surfaces, not for CTAs. Interactive elements use **`#0A60FF`**. Proposal: primary `#0A60FF`, secondary/banner `#07182D`.
- **Secondary `#049FD9`** is the legacy Cisco Blue from before the rebrand. The current brand Cisco Blue is **`#02C8FF`**, used for the logo and highlights rather than buttons. Move it into `accent`.
- Copied from AkzoNobel and should change: pill buttons (48px radius, 48/38px tall), Inter instead of Noto Sans, 12px cards with a soft 16px-blur shadow, cool grey page `#F2F5F7`, white/blue stacked focus ring, and the green/orange/red status set above.
