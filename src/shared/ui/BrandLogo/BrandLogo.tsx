import { LOGOS, type LogoName } from '@logos'
import type { BrandId } from '../../brand/generated/tokens'
import { BRANDS } from '../../brand/generated/tokens'
import './BrandLogo.css'

export type { LogoName }

export interface BrandLogoProps {
  /** Figma "Brand" variant. Omit to follow the surrounding [data-brand] (how the Figma variable `brand logos` works). */
  brand?: BrandId
  /** Figma "Brand=HCL" and other non-client artwork: force a specific logo regardless of the brand. */
  logo?: LogoName
  title?: string
  class?: string
}

/**
 * Figma "brand logos" (40000064:9865). Renders one logo per brand and lets CSS
 * pick the active one, or a single forced logo when `brand` / `logo` is given.
 */
export function BrandLogo({ brand, logo, title, class: cls }: BrandLogoProps) {
  const forced = logo ?? brand
  const names: readonly string[] = forced ? [forced] : BRANDS
  return (
    <>
      {names.map((name) => {
        const art = LOGOS[name as LogoName]
        if (!art) return null
        return (
          <svg
            key={name}
            class={`bb-brand-logo ${cls ?? ''}`}
            data-logo={name}
            data-forced={forced ? '' : undefined}
            viewBox={art.viewBox}
            fill="none"
            role={title ? 'img' : 'presentation'}
            aria-hidden={title ? undefined : 'true'}
            dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + art.body }}
          />
        )
      })}
    </>
  )
}
