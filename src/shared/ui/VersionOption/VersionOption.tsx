import type { JSX } from 'preact'
import { useId } from 'preact/hooks'
import { MetaBadge } from '../MetaBadge/MetaBadge'
import './VersionOption.css'

export type VersionBump = 'patch' | 'minor' | 'major'

/** The Bump title each variant draws. */
const BUMP_LABEL: Record<VersionBump, string> = { patch: 'Patch', minor: 'Minor', major: 'Major' }

export interface VersionOptionProps extends Omit<JSX.HTMLAttributes<HTMLLabelElement>, 'name' | 'onSelect' | 'selected' | 'value'> {
  /** Figma "Bump": Patch / Minor / Major — the title text and the radio value. */
  bump?: VersionBump
  /** Hides the Bump title, for option cards that aren't a version bump (Audit's scope cards). Not a Figma variant. */
  showBump?: boolean
  /** Figma "Version". */
  version?: string
  /** Figma "Hint". */
  hint?: string
  /** Figma "Show suggested" — the Accent "Suggested" Meta Badge beside the title. */
  suggested?: boolean
  /** Figma "Selected": Yes paints publish/version/selected + selected-border. */
  selected?: boolean
  /** Fires when the option is chosen (click, Space, or arrow keys inside its radio group). */
  onSelect?: () => void
  /** Native radio group name, so sibling options in one role="radiogroup" share arrow-key navigation. */
  name?: string
  /** Disables the native radio. Not a Figma variant. */
  disabled?: boolean
}

/** Figma "Version Option" (40000341:8566): one selectable semver bump card — a native radio inside a label. */
export function VersionOption({
  bump = 'patch',
  showBump = true,
  version = 'v2.5.0',
  hint = 'New tokens or components',
  suggested = false,
  selected = false,
  onSelect,
  name,
  disabled,
  class: cls,
  ...rest
}: VersionOptionProps) {
  const id = useId()
  const bumpId = `${id}-bump`
  const versionId = `${id}-version`
  const hintId = `${id}-hint`
  const suggestedId = `${id}-suggested`
  return (
    <label {...rest} class={`bb-version-option ${cls ?? ''}`} data-bump={bump} data-selected={selected || undefined} data-disabled={disabled || undefined}>
      <input
        type="radio"
        class="bb-version-option__input"
        name={name}
        value={bump}
        checked={selected}
        disabled={disabled}
        aria-labelledby={showBump ? `${bumpId} ${versionId}` : versionId}
        aria-describedby={suggested ? `${suggestedId} ${hintId}` : hintId}
        onChange={() => onSelect?.()}
      />
      {(showBump || suggested) && (
        <span class="bb-version-option__top">
          {showBump && <span id={bumpId} class="bb-version-option__bump">{BUMP_LABEL[bump]}</span>}
          {suggested && <MetaBadge id={suggestedId} tone="accent" class="bb-version-option__suggested">Suggested</MetaBadge>}
        </span>
      )}
      <span id={versionId} class="bb-version-option__version">{version}</span>
      <span id={hintId} class="bb-version-option__hint">{hint}</span>
    </label>
  )
}
