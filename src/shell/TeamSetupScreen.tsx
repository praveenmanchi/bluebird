import { useEffect, useRef, useState } from 'preact/hooks'
import { BrandLogo, Button } from '@shared/ui'
import type { BrandId } from '@shared/brand'
import { DEFAULT_INTEGRATIONS, type IntegrationSettings } from '@shared/integrations'
import { ImportStep, importCopy } from './onboarding/ImportStep'
import { FilePicker } from './integrations/SettingsFileParts'
import { useSettingsImport, type ImportFile } from './integrations/useSettingsImport'
import './OnboardingScreen.css'
import './TeamSetupScreen.css'

export interface TeamSetupScreenProps {
  brand?: BrandId
  /** The person's settings now, to say which sections will still wait for a key. */
  load: () => Promise<IntegrationSettings>
  importFile: ImportFile
  /** Skipped, or finished after an import. */
  onFinish: () => void
}

const INTRO = {
  title: 'Set up from your team’s file',
  body: 'Your design system lead can export every connection as one JSON file. Add it here and GitHub, Storybook, Jira and the rest are set up in one step.',
}

/**
 * Figma "After the tour · Team setup file" (40002775:14751): its own screen between the product
 * tour and the app, so it isn't clicked past as one more tour step. No tour tabs, counter or dots.
 */
export function TeamSetupScreen({ brand, load, importFile, onFinish }: TeamSetupScreenProps) {
  const root = useRef<HTMLElement>(null)
  const imports = useSettingsImport(importFile)
  const state = imports.state
  const [current, setCurrent] = useState<IntegrationSettings>(DEFAULT_INTEGRATIONS)
  useEffect(() => { root.current?.focus() }, [])
  useEffect(() => {
    let live = true
    load().then((settings) => { if (live) setCurrent(settings) }, () => undefined)
    return () => { live = false }
  }, [load])
  const copy = importCopy(state, INTRO)
  const applying = state.kind === 'review' && state.applying
  const choose = (file: File) => { void imports.choose(file) }

  return (
    <section ref={root} class="bb-onboarding bb-team-setup-screen" aria-label="Team setup" tabIndex={-1}>
      <FilePicker onFile={choose}>
        {(pick) => (
          <>
            <header class="bb-onboarding__header">
              <BrandLogo brand={brand} class="bb-onboarding__logo" />
            </header>
            <div class="bb-onboarding__body">
              <div class="bb-onboarding__copy" aria-live="polite">
                <span class="bb-onboarding__counter">Team setup · optional</span>
                <h2 class="bb-onboarding__title">{copy.title}</h2>
                <p class="bb-onboarding__text">{copy.body}</p>
              </div>
              <div class="bb-onboarding__media">
                <ImportStep state={state} current={current} onChoose={pick} onFile={choose} />
              </div>
            </div>
            <footer class="bb-onboarding__footer">
              <div class="bb-onboarding__nav">
                {state.kind !== 'applied' && <Button variant="secondary" disabled={applying} onClick={onFinish}>Skip for now</Button>}
                <Button
                  class="bb-onboarding__next" loading={applying}
                  onClick={() => { if (state.kind === 'review') void imports.apply(true); else if (state.kind === 'applied') onFinish(); else pick() }}
                >
                  {copy.next}
                </Button>
              </div>
            </footer>
          </>
        )}
      </FilePicker>
    </section>
  )
}
