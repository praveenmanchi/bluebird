import type { ComponentChildren, JSX } from 'preact'
import { BrandLogo } from '../BrandLogo/BrandLogo'
import { Icon } from '../Icon/Icon'
import { BUILD_VERSION, formatBuildDate } from '../../buildInfo'
import './TeamBanner.css'

/** Figma text defaults (layer "Together, every step forward to Innovate’ & scale"). */
export const TEAM_BANNER_TAGLINE = 'Together, every\nstep forward to Innovate’ & scale'

export interface TeamBannerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'children'> {
  /** Organisation in the credit, set bold with the team (Figma run "HCL"). */
  org?: ComponentChildren
  /** Team in the credit, set bold with "Team" (Figma run " Design System Team"). */
  team?: ComponentChildren
  /** Version shown in the pill next to the `version` glyph (Figma text "Version 1.3.3").
   *  Defaults to the version `npm run build` stamps into build-info.json. */
  version?: ComponentChildren
  /** Date under the version (Figma text "Updated 28 Oct 2026"); defaults to the last build's date.
   *  Pass `false` to hide the line. */
  updated?: ComponentChildren | false
  /** Shows the rule + product name/tagline after the brand logo (Figma "Frame 1430102695"). */
  showProduct?: boolean
  /** Product name (Figma text "Design Studio"). */
  product?: ComponentChildren
  /** Line under the product name (Figma text "Connecting Gap between design workflow"). */
  productTagline?: ComponentChildren
  /** Replaces the two-line tagline (Figma layer "Together, every step forward to Innovate’ & scale"). */
  tagline?: ComponentChildren
  /** Tagline size: md = the component's 16; lg = the 24 the Settings Layout instances override it to;
   *  auto = lg when the banner is wide enough (Settings S-480/S-600 frames), md when narrow (S-360). */
  taglineSize?: 'md' | 'lg' | 'auto'
  /** Slot rendered in place of the tagline when given. */
  children?: ComponentChildren
}

/**
 * Figma "team Banner" (204:7270): a blue team header. Top row = the active
 * brand's logo (BrandLogo), a rule and the "Design Studio" product lockup, and
 * a Release stack (version pill + "Updated <date>", both stamped by the build);
 * bottom row = faded tagline and a "Built with Care by the … Team" credit.
 */
export function TeamBanner({ org = 'HCL', team = 'Design System', version = BUILD_VERSION, updated = formatBuildDate(), showProduct = true, product = 'Design Studio', productTagline = 'Connecting design and development', tagline = TEAM_BANNER_TAGLINE, taglineSize = 'md', children, class: cls, ...rest }: TeamBannerProps) {
  return (
    <header {...rest} class={`bb-team-banner ${cls ?? ''}`} data-tagline={taglineSize}>
      <div class="bb-team-banner__stack">
        <div class="bb-team-banner__top">
          <div class="bb-team-banner__brand">
            <span class="bb-team-banner__mark">
              <BrandLogo title="Team mark" />
            </span>
            {showProduct && (
              <div class="bb-team-banner__product">
                <span class="bb-team-banner__rule" aria-hidden="true" />
                <div class="bb-team-banner__product-text">
                  <span class="bb-team-banner__product-name">{product}</span>
                  <span class="bb-team-banner__product-tagline">{productTagline}</span>
                </div>
              </div>
            )}
          </div>
          <div class="bb-team-banner__release">
            <span class="bb-team-banner__version">
              <Icon name="version" class="bb-team-banner__version-glyph" />
              <span class="bb-team-banner__version-text">Version {version}</span>
            </span>
            {updated !== false && updated !== '' && <span class="bb-team-banner__updated">Updated {updated}</span>}
          </div>
        </div>
        <div class="bb-team-banner__bottom">
          <div class="bb-team-banner__tagline">{children ?? tagline}</div>
          {/* Figma 264:10144 mixes weights: light lead-ins, bold "Care" and "<org> <team> Team". */}
          <p class="bb-team-banner__credit">
            <span>Built with <strong>Care</strong> by the <strong>{org} {team} Team</strong></span>
          </p>
        </div>
      </div>
    </header>
  )
}
