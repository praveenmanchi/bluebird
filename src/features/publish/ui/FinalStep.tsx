import { useEffect } from 'preact/hooks'
import { Checkbox, CodeSnippet, ConnectionRow, SectionTitle, SegmentedControl, Spinner, VersionOption, useRpc } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { canPostToTeams, loadPreview } from '../actions'
import { versionOptions } from '../semver'
import {
  bump, currentVersion, editing, includedChanges, nextVersion, options, preview, previewError, previewFile, status, step, suggestedBump,
} from '../state'
import { ActionBar } from './ActionBar'
import { copyText } from './clipboard'
import { fileSize, plural } from './format'
import { IncludedList, KindCounts, NoteList } from './NotesStep'

export interface FinalStepProps {
  onPublish: () => void
}

const FILES_ID = 'bb-publish-commit-file'

/**
 * "Commit contents": the files the publish commit carries, each openable — what
 * Tokens Studio's push dialog shows on its Diff and JSON tabs before a push.
 */
function CommitContents() {
  const p = preview.value
  if (previewError.value) return <p class="bb-publish__hint" role="status">{previewError.value}</p>
  if (!p) return <div class="bb-publish__loading" role="status"><Spinner tone="accent" size="sm" label="Building the commit preview" /><span>Building the commit preview…</span></div>
  const shown = p.files.find((f) => f.path === previewFile.value) ?? p.files[0]!
  return (
    <>
      <p class="bb-publish__hint">{p.message.split('\n')[0]}</p>
      <SegmentedControl
        class="bb-publish__filters"
        aria-label="Files in this commit"
        controls={FILES_ID}
        options={p.files.map((f) => ({ value: f.path, label: `${f.path} · ${fileSize(f.bytes)}`, icon: 'file' as const }))}
        value={shown.path}
        onChange={(path) => { previewFile.value = path }}
      />
      <CodeSnippet id={FILES_ID} role="tabpanel" aria-label={shown.path} language={shown.language} code={shown.content} copyLabel={`Copy ${shown.path}`} onCopy={() => { void copyText(shown.content) }} />
      {shown.truncated && <p class="bb-publish__hint">Showing the start of {shown.path} ({fileSize(shown.bytes)} in the commit).</p>}
      {shown.path === 'CHANGELOG.md' && <p class="bb-publish__hint">Added above the existing entries of the repository’s CHANGELOG.md.</p>}
    </>
  )
}

/** Step 3 — Figma "Publish v2 · 4 Final review": a read-only summary before anything leaves the file. */
export function FinalStep({ onPublish }: FinalStepProps) {
  const rpc = useRpc()
  const picked = includedChanges.value
  const repo = status.value?.repo
  const option = versionOptions(currentVersion.value).find((o) => o.bump === bump.value)!
  const set = (key: keyof typeof options.value) => (on: boolean) => { options.value = { ...options.value, [key]: on } }
  const editNote = (id: string) => { editing.value = id; step.value = 1 }
  const teams = canPostToTeams()
  const webhooks = status.value?.notify.webhooks ?? 0
  const summary = repo?.connected
    ? `${options.value.openPr ? 'Opens a pull request on' : 'Pushes to'} ${repo.repo} · the repository’s CI builds the site`
    : 'Saves the release in this file · no repository is connected'

  // The preview follows the version, title, selection and notes the designer settled on the way here.
  useEffect(() => { if (repo?.connected) void loadPreview(rpc) }, [rpc, repo?.connected, nextVersion.value, picked.length])

  return (
    <>
      <div class="bb-publish__scroll">
        <section class="bb-publish__card" aria-label="Final review">
          <SectionTitle title="Version" showCount={false} showAction={false} />
          <VersionOption bump={option.bump} version={nextVersion.value} hint={option.hint} suggested={option.bump === suggestedBump.value} selected disabled />
          <SectionTitle title="Release notes" showCount count={picked.length} showAction={false} />
          <NoteList changes={picked} onEdit={editNote} />
          <SectionTitle title="Publish to" showAction actionLabel="Change" onAction={requestSettings} showCount={false} />
          <div class="bb-publish__list">
            {repo?.connected
              ? <ConnectionRow status="good" name="GitHub repository" detail={`${repo.repo} · ${repo.branch}`} showAction={false} />
              : <ConnectionRow status="error" name="GitHub repository" detail={repo?.problem ?? 'Not connected — add it in Settings › Code repository'} showAction actionLabel="Connect" onAction={requestSettings} />}
            <ConnectionRow status={repo?.connected ? 'good' : 'issue'} name="Docs site" detail="Built by the repository’s CI when the release lands" showAction={false} />
            <ConnectionRow
              status={teams ? 'good' : 'issue'}
              name="Teams"
              detail={teams ? `${plural(webhooks, 'webhook')} in Settings › Notifications` : 'No webhook — add one in Settings › Notifications to post the changelog'}
              showAction={!teams}
              actionLabel="Add"
              onAction={requestSettings}
            />
          </div>
          <div class="bb-publish__options">
            <Checkbox checked={options.value.openPr} onChange={set('openPr')} label={`Open a pull request for review instead of pushing to ${repo?.branch ?? 'main'}`} />
            <Checkbox checked={teams && options.value.postToTeams} disabled={!teams} onChange={set('postToTeams')} label="Post the changelog to Teams" />
            <Checkbox checked={options.value.tag} onChange={set('tag')} label={`Tag the release ${nextVersion.value} on GitHub`} />
          </div>
        </section>
        {repo?.connected && (
          <section class="bb-publish__card" aria-label="Commit contents">
            <SectionTitle title="Commit contents" showCount count={preview.value?.files.length ?? 0} showAction={false} />
            <CommitContents />
          </section>
        )}
        <section class="bb-publish__card" aria-label="In this release">
          <SectionTitle title="In this release" showCount count={picked.length} showAction={false} />
          <KindCounts changes={picked} />
          <IncludedList changes={picked} />
        </section>
      </div>
      <ActionBar
        summary={summary}
        secondary={{ label: 'Back', onClick: () => { step.value = 1 } }}
        primary={{ label: `Publish ${nextVersion.value}`, disabled: picked.length === 0, onClick: onPublish }}
      />
    </>
  )
}
