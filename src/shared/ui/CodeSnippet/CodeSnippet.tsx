import type { JSX } from 'preact'
import { Icon } from '../Icon/Icon'
import './CodeSnippet.css'

export interface CodeSnippetProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'onCopy'> {
  /** Figma "Code". */
  code: string
  /** Figma "Language" — the disclosure caption. */
  language?: string
  copyLabel?: string
  onCopy?: () => void
}

/** Figma "Code Snippet" (40000160:7266): the implementation the developer copies. */
export function CodeSnippet({ code, language = 'Code', copyLabel = 'Copy snippet', onCopy, class: cls, ...rest }: CodeSnippetProps) {
  const copy = () => {
    onCopy?.()
    void navigator.clipboard?.writeText(code).catch(() => undefined)
  }
  return (
    <div {...rest} class={`bb-code-snippet ${cls ?? ''}`}>
      <div class="bb-code-snippet__summary">
        <span class="bb-code-snippet__language">{language}</span>
        <button type="button" class="bb-code-snippet__copy" title={copyLabel} aria-label={copyLabel} onClick={copy}>
          <Icon name="copy" />
        </button>
      </div>
      <pre class="bb-code-snippet__code"><code>{code}</code></pre>
    </div>
  )
}
