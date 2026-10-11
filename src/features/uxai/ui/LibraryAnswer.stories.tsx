import type { Meta, StoryObj } from '@storybook/preact-vite'
import { UxaiAnswer } from './UxaiAnswer'
import { UxaiSources } from './UxaiSources'
import { LibraryStatus } from './LibraryStatus'
import { MOCK_SELECTION, SAMPLE_LIBRARY, type Turn } from '../fixtures'
import { groundedAnswer, librarySources } from '../grounding'
import { Frame } from './stories.helpers'

// Not a Figma frame yet: the Dual File grounded answers, built from the UX AI components.
const meta = { title: 'Screens/UXAI/Dual File answers' } satisfies Meta
export default meta
type Story = StoryObj

const sources = librarySources(SAMPLE_LIBRARY)
const turn = (prompt: string, kind: Turn['kind']): Turn => ({
  id: prompt, prompt, kind, status: 'done', progress: 2,
  grounded: groundedAnswer(prompt, kind, SAMPLE_LIBRARY, MOCK_SELECTION),
})

/** Sources are the Dual File library files. */
export const Sources: Story = {
  render: () => (
    <Frame>
      <UxaiSources sources={sources} draft="" status={<LibraryStatus state={{ status: 'ready', index: { ...SAMPLE_LIBRARY, loadedAt: Date.now() } }} onRefresh={() => undefined} />} />
    </Frame>
  ),
}

/** Without Dual File set up: sample sources, and why. */
export const NotConfigured: Story = {
  render: () => (
    <Frame>
      <LibraryStatus state={{ status: 'not-configured', reason: 'empty', message: 'Add your library files in Settings › Dual File Mode.' }} />
    </Frame>
  ),
}

export const Variables: Story = {
  render: () => <Frame><UxaiAnswer turns={[turn('What is our primary colour?', 'color')]} sources={sources} draft="" /></Frame>,
}

export const Components: Story = {
  render: () => <Frame><UxaiAnswer turns={[turn('Show me the Button atom', 'component')]} sources={sources} draft="" onOpenUrl={() => undefined} /></Frame>,
}

/** The selection checked against the libraries: from a library, local, or from a library that isn't connected. */
export const Selection: Story = {
  render: () => <Frame><UxaiAnswer turns={[turn('What variables are used in this?', 'selection')]} sources={sources} draft="" onOpenUrl={() => undefined} /></Frame>,
}
