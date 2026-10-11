import type { ComponentChildren, JSX } from 'preact'
import { Button } from '../Button/Button'
import { Icon, type IconName } from '../Icon/Icon'
import './PublishEmptyState.css'

export type PublishEmptyStateKind = 'no-changes' | 'not-connected' | 'failed' | 'first-release' | 'empty-file' | 'ready-to-extract'

export interface PublishEmptyStateAction {
  label: string
  /** Figma Button "Type". */
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  disabled?: boolean
}

interface StateDefaults {
  /** Status error icons (16) or Tab Icons (24) glyph in the Icon box. */
  icon: IconName
  /** "status" for the 16 Status error icons, "tab" for the 24 Tab Icons. */
  iconKind: 'status' | 'tab'
  title: string
  body: string
  actions: PublishEmptyStateAction[]
}

/** Figma copy, glyph and Buttons per State variant. */
const DEFAULTS: Record<PublishEmptyStateKind, StateDefaults> = {
  'no-changes': {
    icon: 'status-good',
    iconKind: 'status',
    title: 'Everything is published',
    body: 'No variable or component changes since v2.5.0. Edits made in this file show up here automatically.',
    actions: [{ label: 'View live site', variant: 'secondary' }],
  },
  'not-connected': {
    icon: 'git-merg',
    iconKind: 'tab',
    title: 'Connect a repository',
    body: 'Pick the GitHub repository your docs site builds from. Bluebird commits extracted tokens and component data there, and your CI deploys the site.',
    actions: [{ label: 'Connect GitHub', variant: 'primary' }],
  },
  failed: {
    icon: 'status-error',
    iconKind: 'status',
    title: 'Site build failed',
    body: 'GitHub Actions run #482 failed at "Build docs". Nothing was deployed; v2.4.0 is still live.',
    actions: [{ label: 'View log', variant: 'secondary' }, { label: 'Retry build', variant: 'primary' }],
  },
  'first-release': {
    icon: 'change-log',
    iconKind: 'tab',
    title: 'Ready for your first release',
    body: 'Repository connected and nothing has been published yet. Review the variables and components in this file, write release notes, and publish v1.0.0 to create your docs site.',
    actions: [{ label: 'Start review', variant: 'primary' }],
  },
  'empty-file': {
    icon: 'layers',
    iconKind: 'tab',
    title: 'Nothing to publish yet',
    body: 'This file has no local variables or components. Open your design system library file, or add variables and components here, and they show up for review.',
    actions: [{ label: 'How publishing works', variant: 'secondary' }],
  },
  'ready-to-extract': {
    icon: 'extract',
    iconKind: 'tab',
    title: 'Extract changes from this file',
    body: 'Compares the variables, styles and components in this file with v3.0.0, the last published release. Nothing is committed until you publish.',
    actions: [{ label: 'Run extract', variant: 'primary' }],
  },
}

export interface PublishEmptyStateProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Figma "State": No changes / Not connected / Failed / First release / Empty file / Ready to extract. */
  state?: PublishEmptyStateKind
  /** Overrides the State's Title text. */
  title?: ComponentChildren
  /** Overrides the State's Body text. */
  body?: ComponentChildren
  /** Overrides the State's Buttons (1–2, Figma order: secondary before primary). Defaults carry no handlers. */
  actions?: PublishEmptyStateAction[]
  /** Overrides the State's glyph with a Tab Icons glyph (24, like the tab-kind states) — Figma instances swap it, e.g. the MCP tab's cards. */
  icon?: IconName
}

/** Figma "Publish Empty State" (40000346:8697): the Publish tab's centred empty / not-connected / failed / first-run states. */
export function PublishEmptyState({ state = 'no-changes', title, body, actions, icon, class: cls, ...rest }: PublishEmptyStateProps) {
  const d = icon ? { ...DEFAULTS[state], icon, iconKind: 'tab' as const } : DEFAULTS[state]
  return (
    <div {...rest} class={`bb-publish-empty-state ${cls ?? ''}`} data-state={state} role={state === 'failed' ? 'alert' : undefined}>
      <span class="bb-publish-empty-state__icon-box" data-kind={d.iconKind}>
        {d.iconKind === 'status'
          ? <Icon name={d.icon} class="bb-publish-empty-state__status" />
          : <Icon name={d.icon} size="lg" tone="default" />}
      </span>
      <h3 class="bb-publish-empty-state__title">{title ?? d.title}</h3>
      <p class="bb-publish-empty-state__body">{body ?? d.body}</p>
      <div class="bb-publish-empty-state__actions">
        {(actions ?? d.actions).map((a) => (
          <Button key={a.label} variant={a.variant ?? 'primary'} width="fixed" disabled={a.disabled} onClick={a.onClick}>{a.label}</Button>
        ))}
      </div>
    </div>
  )
}
