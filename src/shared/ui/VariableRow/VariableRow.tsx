import type { ComponentChildren, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { ColorSwatch } from '../ColorSwatch/ColorSwatch'
import { Dropdown } from '../Dropdown/Dropdown'
import { DropdownMenu } from '../DropdownMenu/DropdownMenu'
import { MenuItem } from '../MenuItem/MenuItem'
import './VariableRow.css'

export type VariableRowKind = 'color' | 'number'
export type VariableRowState = 'default' | 'changed'

/** Figma's default Swap value per Kind. */
const VALUE: Record<VariableRowKind, string> = {
  color: 'surface/accent-subtle',
  number: 'space/inset-lg-alt',
}

export interface VariableRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Figma "Token" — the variable bound on the layer today. */
  token?: ComponentChildren
  /** Figma "Where" — property · layer · current value. */
  where?: ComponentChildren
  /** Figma "Kind": Color (Color Swatch preview) / Number (value tile). */
  kind?: VariableRowKind
  /** Figma "State": Changed = the binding has been swapped and is pending (highlighted row, focus-bordered Swap). */
  state?: VariableRowState
  /** Kind=Color: the swatch colour (CSS colour or `var(--bb-…)`). Omit for the Color Swatch default fill. */
  color?: string
  /** Kind=Number: the value shown in the preview tile. */
  amount?: ComponentChildren
  /** The Swap Dropdown's "Value" — the variable to bind instead. Defaults to the Kind's Figma value. */
  value?: string
  /** Variables offered by the Swap menu. Without options the Swap is a plain trigger. */
  options?: readonly string[]
  /** Fired with the chosen variable name when one is picked from the Swap menu. */
  onChange?: (variable: string) => void
}

/** Figma "Variable Row" (40000287:8277): one bound variable with its preview, where it is used, and a Dropdown to swap it. */
export function VariableRow({
  token = 'jira/row/bg/selected',
  where = 'Fill · root · #0B3A6E',
  kind = 'color',
  state = 'default',
  color,
  amount = '12',
  value,
  options = [],
  onChange,
  class: cls,
  ...rest
}: VariableRowProps) {
  const [open, setOpen] = useState(false)
  const current = value ?? VALUE[kind]
  const choose = (v: string) => { setOpen(false); onChange?.(v) }
  return (
    <div {...rest} class={`bb-variable-row ${cls ?? ''}`} data-kind={kind} data-state={state}>
      {kind === 'color'
        ? <ColorSwatch size="small" color={color} class="bb-variable-row__preview" />
        : <span class="bb-variable-row__preview bb-variable-row__amount">{amount}</span>}
      <div class="bb-variable-row__text">
        <span class="bb-variable-row__token">{token}</span>
        <span class="bb-variable-row__where">{where}</span>
      </div>
      <div class="bb-variable-row__swap" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}>
        <Dropdown
          value={current}
          open={open && options.length > 0}
          onOpenChange={(next) => setOpen(next && options.length > 0)}
          aria-label={`Swap ${typeof token === 'string' ? token : 'variable'}`}
        />
        {open && options.length > 0 && (
          <DropdownMenu class="bb-variable-row__menu">
            {options.map((o) => (
              <MenuItem key={o} icon="variables" label={o} selected={o === current} onSelect={() => choose(o)} />
            ))}
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
