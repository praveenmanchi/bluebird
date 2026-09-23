import type { ComponentChildren, JSX } from 'preact'
import { BrandModeChip } from '../BrandModeChip/BrandModeChip'
import './BrandModes.css'

export interface BrandModesVerdict {
  /** Brand label as plugin.config.json spells it, e.g. "Bridge". */
  brand: string
  pass: boolean
  ratio?: ComponentChildren
  /** Marks the mode the plugin is currently themed with. */
  current?: boolean
}

export interface BrandModesProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'label'> {
  modes: readonly BrandModesVerdict[]
  /** Figma "Label". */
  label?: ComponentChildren
}

/** Figma "Brand Modes" (40000159:7074): the same pair judged in every brand mode. */
export function BrandModes({ modes, label = 'Brand modes', class: cls, ...rest }: BrandModesProps) {
  return (
    <div {...rest} class={`bb-brand-modes ${cls ?? ''}`}>
      <span class="bb-brand-modes__label">{label}</span>
      <ul class="bb-brand-modes__list">
        {modes.map((m) => (
          <li key={m.brand}>
            <BrandModeChip
              brand={m.brand}
              pass={m.pass}
              current={m.current}
              ratio={m.ratio}
              title={`${m.brand}: ${m.pass ? 'passes' : 'fails'}${m.ratio ? ` (${String(m.ratio)})` : ''}`}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
