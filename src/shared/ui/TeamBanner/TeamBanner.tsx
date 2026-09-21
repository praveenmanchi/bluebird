import type { ComponentChildren, JSX } from 'preact'
import { LOGOS } from '@logos'
import { BrandLogo } from '../BrandLogo/BrandLogo'
import { Icon } from '../Icon/Icon'
import './TeamBanner.css'

/** Figma text defaults (layer "Together, every step forward to Innovate’ & scale"). */
export const TEAM_BANNER_TAGLINE = 'Together, every\nstep forward to Innovate'

export interface TeamBannerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'children'> {
  /** Team credited in the footer line (Figma layer "Built with Care by the Gap Design System Team"). */
  team?: ComponentChildren
  /** Version shown in the pill next to the `version` glyph (Figma text "Version 1.3.3"). */
  version?: ComponentChildren
  /** Shows the "Fabric Logo" instance and its hairline separator before the team mark (Figma layers "Fabric Logo " + "Line 60"). */
  showFabric?: boolean
  /** Replaces the two-line tagline (Figma layer "Together, every step forward to Innovate’ & scale"). */
  tagline?: ComponentChildren
  /** Slot rendered in place of the tagline when given. */
  children?: ComponentChildren
}

/**
 * Figma "team Banner" (204:7270): a blue team header. Top row = Fabric logo,
 * hairline, team mark (the Bridge wordmark, rendered with BrandLogo so it
 * follows the active brand) and a version pill; bottom row = faded tagline
 * and a "Built with Care by the … Team" credit.
 */
export function TeamBanner({ team = 'Gap Design System', version = '1.3.3', showFabric = true, tagline = TEAM_BANNER_TAGLINE, children, class: cls, ...rest }: TeamBannerProps) {
  const fabric = LOGOS.fabric
  return (
    <header {...rest} class={`bb-team-banner ${cls ?? ''}`} data-fabric={showFabric || undefined}>
      <div class="bb-team-banner__stack">
        <div class="bb-team-banner__top">
          <div class="bb-team-banner__brand">
            {showFabric && (
              <>
                <svg class="bb-team-banner__fabric" data-logo="fabric" viewBox={fabric.viewBox} fill="none" role="img" aria-label="Fabric" dangerouslySetInnerHTML={{ __html: fabric.body }} />
                <span class="bb-team-banner__hairline" aria-hidden="true" />
              </>
            )}
            <span class="bb-team-banner__mark">
              <BrandLogo title="Team mark" />
            </span>
          </div>
          <span class="bb-team-banner__version">
            <Icon name="version" class="bb-team-banner__version-glyph" />
            <span class="bb-team-banner__version-text">Version {version}</span>
          </span>
        </div>
        <div class="bb-team-banner__bottom">
          <div class="bb-team-banner__tagline">{children ?? tagline}</div>
          <p class="bb-team-banner__credit">Built with Care by the {team} Team</p>
        </div>
      </div>
    </header>
  )
}
