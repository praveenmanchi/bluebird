import type { JSX } from 'preact'
import { ICONS, MARKS, type IconName, type MarkName } from '@icons'
import './Icon.css'

export type { IconName, MarkName }
export { ICONS, MARKS }

export type IconSize = 'sm' | 'md' | 'lg'
export type IconTone = 'default' | 'muted' | 'on-accent'

export interface IconProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'size' | 'name'> {
  name: IconName
  /** icon/size/sm|md|lg. Omit to let the parent size it (e.g. a Button sets its own icon size). */
  size?: IconSize
  /** icon/glyph/default|muted|on-accent. Omit to inherit currentColor from the parent. */
  tone?: IconTone
  title?: string
}

/** Glyphs exported from the Figma "Tab Icons" set; colour and size come from tokens. */
export function Icon({ name, size, tone, title, class: cls, ...rest }: IconProps) {
  const glyph = ICONS[name]
  if (!glyph) return null // not shipped in this bundle (see Icon/generated.active.ts)
  return (
    <svg
      {...rest}
      class={`bb-icon ${cls ?? ''}`}
      data-icon={name}
      data-size={size}
      data-tone={tone}
      viewBox={glyph.viewBox}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : 'true'}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + glyph.body }}
    />
  )
}

/** Non-icon vector marks (checkbox check / dash). Sized by the caller's CSS. */
export function Mark({ name, class: cls }: { name: MarkName; class?: string }) {
  const glyph = MARKS[name]
  return <svg class={cls} data-mark={name} viewBox={glyph.viewBox} fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: glyph.body }} />
}
