import type { ComponentChildren, JSX } from 'preact'
import './DropdownMenu.css'

export interface DropdownMenuProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: ComponentChildren
}

/** Figma "Dropdown menu" (40000047:5251). A listbox surface for MenuItem rows. */
export function DropdownMenu({ children, class: cls, ...rest }: DropdownMenuProps) {
  return (
    <div {...rest} role="listbox" class={`bb-dropdown-menu ${cls ?? ''}`}>
      {children}
    </div>
  )
}

function Divider() {
  return <hr class="bb-dropdown-menu__divider" aria-hidden="true" />
}

DropdownMenu.Divider = Divider
