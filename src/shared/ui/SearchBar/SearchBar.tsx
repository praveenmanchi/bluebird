import type { JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './SearchBar.css'

export interface SearchBarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'value' | 'label' | 'onInput' | 'onSubmit'> {
  /** Current query (controlled). */
  value?: string
  /** Figma "Enter Variables here " placeholder text. */
  placeholder?: string
  /** Accessible name of the search field. */
  label?: string
  disabled?: boolean
  /** Fired with the new query on every keystroke. */
  onValueChange?: (value: string) => void
  /** Fired when Enter is pressed in the field. */
  onSubmit?: (value: string) => void
  /** Native attributes for the inner <input> (name, autoFocus, …). */
  inputProps?: Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value' | 'placeholder' | 'disabled' | 'type' | 'class' | 'onInput'>
}

/** Figma "search bar" (7:44532): a bordered field with the `search` glyph trailing the query. */
export function SearchBar({ value, placeholder = 'Search variables', label = 'Search', disabled, onValueChange, onSubmit, inputProps, class: cls, ...rest }: SearchBarProps) {
  return (
    <div {...rest} role="search" class={`bb-search-bar ${cls ?? ''}`} data-disabled={disabled || undefined}>
      <input
        {...inputProps}
        type="search"
        class="bb-search-bar__control"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
        onInput={(e) => onValueChange?.((e.currentTarget as HTMLInputElement).value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit?.((e.currentTarget as HTMLInputElement).value) }}
      />
      <span class="bb-search-bar__icon"><Icon name="search" /></span>
    </div>
  )
}
