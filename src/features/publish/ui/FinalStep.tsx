import { Checkbox, ConnectionRow, SectionTitle, VersionOption } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { versionOptions } from '../semver'
import { bump, currentVersion, editing, includedChanges, nextVersion, options, status, step, suggestedBump } from '../state'
import { ActionBar } from './ActionBar'
import { IncludedList, KindCounts, NoteList } from './NotesStep'

export interface FinalStepProps {
  onPublish: () => void
}

/** Step 3 — Figma "Publish v2 · 4 Final review": a read-only summary before anything leaves the file. */
export function FinalStep({ onPublish }: FinalStepProps) {
  const picked = includedChanges.value
  const repo = status.value?.repo
  const option = versionOptions(currentVersion.value).find((o) => o.bump === bump.value)!
  const set = (key: keyof typeof options.value) => (on: boolean) => { options.value = { ...options.value, [key]: on } }
  const editNote = (id: string) => { editing.value = id; step.value = 1 }
  const summary = repo?.connected
    ? `${options.value.openPr ? 'Opens a pull request on' : 'Pushes to'} ${repo.repo} · the repository’s CI builds the site`
    : 'Saves the release in this file · no repository is connected'

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
              : <ConnectionRow status="error" name="GitHub repository" detail={repo?.problem ?? 'Not connected — add it in Settings › GitHub'} showAction actionLabel="Connect" onAction={requestSettings} />}
            <ConnectionRow status={repo?.connected ? 'good' : 'issue'} name="Docs site" detail="Built by the repository’s CI when the release lands" showAction={false} />
          </div>
          <div class="bb-publish__options">
            <Checkbox checked={options.value.openPr} onChange={set('openPr')} label={`Open a pull request for review instead of pushing to ${repo?.branch ?? 'main'}`} />
            <Checkbox checked={options.value.postToTeams} onChange={set('postToTeams')} label="Post the changelog to Teams" />
            <Checkbox checked={options.value.tag} onChange={set('tag')} label={`Tag the release ${nextVersion.value} on GitHub`} />
          </div>
        </section>
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
