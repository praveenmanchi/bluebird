import type { ComponentChildren, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { Avatar } from '../Avatar/Avatar'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'
import './CommentComposer.css'

export interface CommentComposerProps extends Omit<JSX.HTMLAttributes<HTMLFormElement>, 'value' | 'defaultValue' | 'onSubmit' | 'label'> {
  /** Figma "Placeholder". */
  placeholder?: string
  /** Draft text (controlled). Omit to let the composer keep its own draft. */
  value?: string
  /** Initial draft when uncontrolled. */
  defaultValue?: string
  /** Fired with the draft on every keystroke. */
  onValueChange?: (value: string) => void
  /** Fired with the draft on Save (or ⌘/Ctrl+Enter); ignored while the draft is blank. Clears an uncontrolled draft. */
  onSubmit?: (value: string) => void
  /** Fired on Cancel. Clears an uncontrolled draft. */
  onCancel?: () => void
  /** "Attach link" toolbar icon. */
  onAttachLink?: () => void
  /** "Attach file" toolbar icon. */
  onAttachFile?: () => void
  /** Nested Avatar's Initials (the current user). */
  initials?: ComponentChildren
  /** Accessible name of the text field. */
  label?: string
  /** Nested "Cancel" Button's Label. */
  cancelLabel?: ComponentChildren
  /** Nested "Save" Button's Label. */
  submitLabel?: ComponentChildren
}

/** Figma "Comment Composer" (40000268:8040): new-comment field with link / file attach and Cancel / Save. */
export function CommentComposer({
  placeholder = 'Add a comment… type @ to mention a teammate', value, defaultValue = '',
  onValueChange, onSubmit, onCancel, onAttachLink, onAttachFile, initials = 'PM',
  label = 'Comment', cancelLabel = 'Cancel', submitLabel = 'Save', class: cls, ...rest
}: CommentComposerProps) {
  const [draft, setDraft] = useState(defaultValue)
  const controlled = value !== undefined
  const text = controlled ? value : draft

  const update = (next: string) => {
    if (!controlled) setDraft(next)
    onValueChange?.(next)
  }
  const submit = () => {
    if (!text.trim()) return
    onSubmit?.(text)
    if (!controlled) setDraft('')
  }
  const cancel = () => {
    if (!controlled) setDraft('')
    onCancel?.()
  }

  return (
    <form {...rest} class={`bb-comment-composer ${cls ?? ''}`} onSubmit={(e) => { e.preventDefault(); submit() }}>
      <Avatar size="md">{initials}</Avatar>
      <div class="bb-comment-composer__field">
        <textarea
          class="bb-comment-composer__input"
          rows={1}
          value={text}
          placeholder={placeholder}
          aria-label={label}
          onInput={(e) => update(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() } }}
        />
        <div class="bb-comment-composer__toolbar">
          <div class="bb-comment-composer__attach">
            <button type="button" class="bb-comment-composer__tool" aria-label="Attach link" onClick={onAttachLink}>
              <Icon name="url" tone="default" />
            </button>
            <button type="button" class="bb-comment-composer__tool" aria-label="Attach file" onClick={onAttachFile}>
              <Icon name="file" tone="default" />
            </button>
          </div>
          <div class="bb-comment-composer__buttons">
            <Button variant="secondary" width="fixed" onClick={cancel}>{cancelLabel}</Button>
            <Button variant="primary" width="fixed" type="submit">{submitLabel}</Button>
          </div>
        </div>
      </div>
    </form>
  )
}
