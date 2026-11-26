# Hyundai Motor Group — brand UI audit

Audited 2026-11-25 by agent-hyundai-bentley-siemens. Scope: **Hyundai Motor Group** (the group, hyundaimotorgroup.com), compared with Hyundai Motor Company (hyundai.com, the car brand).

## Summary
- No public design system. Everything below was measured with Playwright on hyundaimotorgroup.com (home, Newsroom, About › Strategy, one news article).
- The group site is **black and white only**. It uses no brand colour: black header (`#000000`), `#222222` sub-nav, `#111111`/`#1F1F1F` cards, white type, and greys from white at reduced opacity. Content pages switch to a white body. The only blue is inline article links (`#4485F7`, `#01428B`).
- Shapes are soft. Cards, image tiles and the affiliate selector use a **10px radius**; action buttons are **pills** (radius 50px, 54px tall); arrow and icon buttons are circles.
- Type is **Spoqa Han Sans Neo** (free, OFL). Body text is large (17px / 25.5px). Headings are regular weight (400–500), not bold.
- **The current Figma colours belong to the car brand, not the group.** `#002C5F` (Hyundai Blue) and `#00AAD2` (Active Blue) come from hyundai.com, which also uses its own "Hyundai Sans" font and 2px radii. hyundaimotorgroup.com uses neither colour.

## Proposed tokens
The group UI has no accent colour, so the primary button is the **inverted** one: a white or light-grey pill with black text on a dark surface (measured: "Load more" is `#F0F0F0` with black text; slider arrows are `#FFFFFF`). Using it in the plugin needs on-primary text set to `#000000`. If Bluebird needs a coloured accent for selected states, use `secondary` (`#01428B`, the group's own link blue). Do not keep `#002C5F`.

```json
{
  "id": "hyundaimotorgroup",
  "theme": "dark",
  "colors": { "primary": "#FFFFFF", "primaryHover": "#F0F0F0", "primaryActive": "#D0D0D0", "secondary": "#01428B", "accent": ["#4485F7", "#002C5F", "#00AAD2"], "link": "#4485F7", "focusRing": "#005FCC",
              "headerBg": "#000000", "headerText": "#FFFFFF", "pageBg": "#000000", "surface": "#1F1F1F", "border": "#4D4D4D", "textPrimary": "#FFFFFF", "textSecondary": "#999999", "textDisabled": "#666666",
              "success": null, "warning": null, "error": null, "info": null,
              "neutralRamp": { "0": "#000000", "50": "#111111", "100": "#1F1F1F", "150": "#222222", "200": "#292929", "300": "#424242", "500": "#7F7F7F", "600": "#9F9F9F", "700": "#D0D0D0", "800": "#DDDDDD", "850": "#E5E5E5", "900": "#F0F0F0", "950": "#F5F5F5", "1000": "#FFFFFF" } },
  "typography": { "uiFamily": "Spoqa Han Sans Neo", "displayFamily": "Spoqa Han Sans Neo", "monoFamily": null, "proprietary": false, "googleFallbackUi": "Noto Sans KR", "googleFallbackDisplay": "Noto Sans KR",
                  "bodySize": 17, "bodyLineHeight": 25.5, "weights": { "regular": 400, "medium": 500, "semibold": 500, "bold": 700 }, "headingScale": [40, 36, 30, 24, 20, 17] },
  "radius": { "button": 50, "input": 27, "card": 10, "chip": 30, "modal": 10 },
  "button": { "height": { "sm": 30, "md": 54, "lg": 56 }, "paddingX": 58, "minWidth": 200, "fontSize": 17, "fontWeight": 500, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#F0F0F0", "text": "#000000", "hoverBg": null, "activeBg": null, "disabledBg": null, "disabledText": null },
              "secondary": { "bg": "transparent", "text": "#FFFFFF", "border": "#7F7F7F", "hoverBg": null },
              "ghost": { "text": "#FFFFFF", "hoverBg": "#333333" },
              "focus": { "style": "browser default outline (1px auto)", "width": 1, "offset": 0, "color": "#005FCC" } },
  "input": { "height": 54, "border": "transparent", "borderWidth": 0, "radius": 27, "placeholder": "#999999", "focusBorder": null, "errorBorder": null },
  "dropdown": { "menuBg": "#1F1F1F", "menuRadius": 10, "itemHeight": null, "itemHoverBg": null, "itemSelectedBg": null, "itemSelectedText": "#FFFFFF", "shadow": "0 0 5px rgba(0,0,0,0.5)" },
  "tabs": { "style": "underline", "activeIndicator": "#FFFFFF", "activeText": "#FFFFFF" },
  "elevation": { "card": "none", "menu": "0 0 5px rgba(0,0,0,0.5)", "modal": null },
  "spacingBase": 10,
  "iconStyle": "thin outline line icons (arrow, plus, hash, search), white on dark; no named library"
}
```

### Measured details (live, hyundaimotorgroup.com)
| Element | Measured |
|---|---|
| Body | `SpoqaHanSansNeo, "Malgun Gothic", sans-serif`; 17px / 25.5px; weights seen 300, 400, 500, 700 |
| Header | 80px tall; `rgba(0,0,0,0.7)` over the hero, solid `#000000` on inner pages; logo centred, white lock-up |
| Sub-nav (Newsroom) | `#222222` bar, 70px tall; tabs 20px; active tab is white, weight 700, with a 3px white underline (`::after`); inactive tabs are `rgba(255,255,255,0.5)`, weight 400 |
| Hero / home | `#000000` page; cards `#111111` with a 10px radius; text white or white at 80/60/40% opacity |
| News cards | image on top, `#1F1F1F` footer with radius `0 0 10px 10px`; 30px/500 title; circular "+" button `rgba(255,255,255,0.2)` |
| "Load more" button | 54px tall, 58px side padding, 50px radius, `#F0F0F0` background, black 17px/500 text |
| "Shortcut to Affiliates" | 54px, transparent, `1px solid rgba(255,255,255,0.5)`, 10px radius, padding 12px 15px 12px 20px |
| Slider arrows | 56px white circles, shadow `0 0 5px rgba(0,0,0,0.5)` |
| Search field | 54px pill, about 360px wide, dark translucent grey with a grey placeholder; round "AI pick" button 54px `rgba(66,66,66,0.7)` |
| Article body (light page) | white background; text `#111111` 17px; table borders `#DDDDDD`; table header `#EFEFEF`; links `#4485F7` and `#01428B` with no underline |
| Focus | no custom focus style; Chromium default (`1px auto #005FCC`) |
| Footer | black; 14px/300 links in white |

Equivalent hex values for the white-opacity text used on black: 80% ≈ `#CCCCCC`, 60% ≈ `#999999`, 50% ≈ `#7F7F7F`, 40% ≈ `#666666`, 30% (borders) ≈ `#4D4D4D`.

### Group vs Hyundai Motor Company (hyundai.com/worldwide/en)
| | Hyundai Motor Group | Hyundai Motor Company |
|---|---|---|
| Colour | monochrome (black, white, greys) | Hyundai Blue `#002C5F` (text, 1px borders, one filled block), sand `#F6F3F2` surfaces |
| Font | Spoqa Han Sans Neo (free) | HyundaiMedium / HyundaiRegular = Hyundai Sans (proprietary) |
| Radius | 10px cards, pill buttons | 2px |
| Mood | dark, editorial, video-led | light, premium, automotive |

## Typography notes
- Spoqa Han Sans Neo is free under the SIL OFL but is **not on Google Fonts**. Its Korean glyphs are derived from Noto Sans CJK / Source Han Sans, so **Noto Sans KR** (Google, installable in Figma) is the closest fallback. Use Noto Sans for Latin-only UI. If you want the exact font, it can be installed locally from the Spoqa GitHub release.
- Sizes measured: 40/500 (article title), 36/500, 30/400–500 (card titles), 24/400 (section h1), 20/400–500, 17/400–700 (body), 14/300–400, 13/400 (meta).

## Not verified
- Status colours (success, warning, error, info): the site has no forms or alerts.
- Button hover and pressed states: Playwright hover showed no colour change on the pills or the affiliate button.
- Dropdown menu items, and modal radius and shadow (the affiliate menu was not opened).
- Logo rules: the site shows a white group lock-up on black. No public clear-space rule was found.

## Sources
- https://www.hyundaimotorgroup.com/en/ — live computed style (Playwright): colours, font, header, cards, buttons, search. Confidence **high** for what is measured.
- https://www.hyundaimotorgroup.com/en/news/newsMain — live: sub-nav tabs (3px underline), news cards, white content body. **High**.
- https://www.hyundaimotorgroup.com/en/about-us/strategy — live: colour and radius frequency check. **High**.
- https://www.hyundaimotorgroup.com/en/news/hyundai-motor-unveils-the-all-new-elantra-bringing-dynamic-confidence-to-the-compact-sedan — live: article links `#4485F7` and `#01428B`, table borders. **High** for values; **medium** that they are system-wide.
- https://www.hyundai.com/worldwide/en — live: Hyundai Motor Company comparison (`#002C5F`, Hyundai Sans, 2px radius). **High**.
- Google font fallback (Noto Sans KR): based on Spoqa's published lineage, not measured. **Medium**.
- Primary active `#D0D0D0`, spacing base 10 and dropdown values: inferred from repeated measurements (the grey occurs as a skeleton fill; 10px recurs in radii and spacing). **Low**.

## Differs from current Figma
| | Figma now | Proposed | Note |
|---|---|---|---|
| primary | `#002C5F` | `#FFFFFF` (inverted white pill on a black banner); chromatic fallback `#01428B` | `#002C5F` is Hyundai Motor Company's Hyundai Blue. It does not appear anywhere on hyundaimotorgroup.com. |
| secondary | `#00AAD2` | `#01428B` | `#00AAD2` (Active Blue) is also a car-brand colour and is absent from the group site. |
| font | Noto Sans | Spoqa Han Sans Neo → Noto Sans KR | |
| radius | AkzoNobel copy | 10px cards, pill buttons | |
| theme | light | dark chrome (black banner, `#222222` sub-nav, `#1F1F1F` cards) | Article pages are light; the banner stays black in both. |

If the client actually means the Hyundai car brand rather than the group, keep `#002C5F` / `#00AAD2` and use 2px radii instead. Confirm which one with the account team.
