import { useEffect } from 'preact/hooks'
import { Stepper, useRpc } from '@shared/ui'
import { loadStatus, runExtract, runPublish } from '../actions'
import { MSG } from '../messages'
import { publishPhase, reset, step } from '../state'
import { FinalStep } from './FinalStep'
import { NotesStep } from './NotesStep'
import { ReleaseStep } from './ReleaseStep'
import { ReviewStep } from './ReviewStep'
import { STEP_LABELS } from './format'
import './publish.css'

export interface PublishTabProps {
  /** Skip the status read on mount (stories that preload state). */
  preloaded?: boolean
}

/**
 * Publish tab — Figma "Publish flow v2 · 600": Review changes → Release notes →
 * Final review → Publish. The sandbox reads the file, diffs it against the last
 * release (kept in document plugin data) and publishes to the repository in
 * Settings › GitHub: one commit, then a pull request or a push, then the CI run.
 */
export function PublishTab({ preloaded = false }: PublishTabProps) {
  const rpc = useRpc()
  useEffect(() => {
    if (!preloaded) void loadStatus(rpc)
    return () => reset()
  }, [])

  const extract = () => { void runExtract(rpc) }
  const publish = () => { void runPublish(rpc) }
  const startOver = () => { reset(); void loadStatus(rpc) }
  const open = (url: string) => { rpc.call(MSG.open, { url }).catch(() => undefined) }
  const current = step.value
  /** Stepper `current` is 0-based; past the last step every step shows done. */
  const stepperCurrent = current === 3 && publishPhase.value === 'done' ? STEP_LABELS.length : current

  return (
    <div class="bb-publish">
      <Stepper class="bb-publish__stepper" steps={STEP_LABELS.map((label) => ({ label }))} current={stepperCurrent} aria-label="Publish steps" />
      {current === 0 && <ReviewStep onExtract={extract} onRetryStatus={() => { void loadStatus(rpc) }} />}
      {current === 1 && <NotesStep />}
      {current === 2 && <FinalStep onPublish={publish} />}
      {current === 3 && <ReleaseStep onPublish={publish} onStartOver={startOver} onOpen={open} />}
    </div>
  )
}

/** Shell entry: the registry renders tabs without props. */
export function Tab() {
  return <PublishTab />
}
