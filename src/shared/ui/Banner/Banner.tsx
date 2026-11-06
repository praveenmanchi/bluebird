import type { ComponentChildren, JSX } from 'preact'
import { LOGOS } from '@logos'
import type { BrandId } from '../../brand/generated/tokens'
import { BrandLogo } from '../BrandLogo/BrandLogo'
import './Banner.css'

export interface BannerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title'> {
  /** Figma "HCL Logo" boolean: shows the "Powered By HCLTech" block. */
  showPoweredBy?: boolean
  /** Figma "Dual logo" boolean: shows the rule + product name/tagline next to the brand logo. */
  dualLogo?: boolean
  /** Force a brand logo instead of following [data-brand]. */
  brand?: BrandId
  /** Figma text "Design Studio". */
  title?: ComponentChildren
  /** Figma text "Connecting Gap between design workflow". */
  tagline?: ComponentChildren
  children?: ComponentChildren
}

/** Figma "Banner" (40000064:9910): brand logo · rule · product name + tagline, "Powered By HCLTech" bottom-right. */
export function Banner({ showPoweredBy = true, dualLogo = true, brand, title = 'Design Studio', tagline = 'Connecting design and development', children, class: cls, ...rest }: BannerProps) {
  const mark = LOGOS.hcltech
  return (
    <header {...rest} class={`bb-banner ${cls ?? ''}`}>
      <div class="bb-banner__row">
        <div class="bb-banner__group">
          <BrandLogo brand={brand} />
          {dualLogo && (
            <>
              <span class="bb-banner__rule" aria-hidden="true" />
              <div class="bb-banner__stack">
                <span class="bb-banner__title">{title}</span>
                <span class="bb-banner__tagline">{tagline}</span>
              </div>
            </>
          )}
        </div>
        {children}
      </div>
      {showPoweredBy && mark && (
        <div class="bb-banner__powered">
          <div class="bb-banner__powered-inner">
            <span class="bb-banner__powered-label">Powered By</span>
            <BrandLogo logo="hcltech" size="sm" title="HCLTech" class="bb-banner__mark" />
          </div>
        </div>
      )}
    </header>
  )
}
