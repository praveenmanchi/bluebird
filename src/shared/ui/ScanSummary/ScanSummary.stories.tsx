import type { Meta, StoryObj } from '@storybook/preact-vite'
import { ScanSummary, type ScanSummaryProps } from './ScanSummary'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const results: ScanSummaryProps = {
  state: 'results',
  stats: '3,412 nodes · 840 ms',
  status: { tone: 'danger', label: '9 fail AA' },
  score: 68,
  meterScore: '26 / 38',
  caption: '12 components fail at least one check',
  kpis: [
    { label: 'Components', value: '38', caption: 'across 3 levels', tone: 'neutral', icon: 'component' },
    { label: 'Passing', value: '26', caption: '68% of components', tone: 'success', icon: 'status-good' },
    { label: 'Failing', value: '12', caption: '32% · 23 findings', tone: 'danger', icon: 'status-error' },
    { label: 'Frames', value: '0 / 1', caption: 'Login screen fails AA', tone: 'warning', icon: 'layers' },
  ],
  levels: [
    { name: 'Atoms', hint: 'No nested components', passing: 15, total: 18 },
    { name: 'Molecules', hint: 'Built from atoms', passing: 8, total: 12 },
    { name: 'Organisms', hint: 'Built from molecules', passing: 3, total: 8 },
  ],
  principles: [
    { tone: 'perceivable', label: 'Perceivable', value: 19 },
    { tone: 'operable', label: 'Operable', value: 4 },
    { tone: 'understandable', label: 'Understandable', value: 0 },
    { tone: 'robust', label: 'Robust', value: 0 },
  ],
  severity: [
    { tone: 'critical', label: 'Critical', value: 9 },
    { tone: 'serious', label: 'Serious', value: 8 },
    { tone: 'moderate', label: 'Moderate', value: 4 },
    { tone: 'minor', label: 'Minor', value: 2 },
  ],
  brands: [{ brand: 'Bridge', count: 12 }, { brand: 'Ikea', count: 4 }, { brand: 'Richemont', count: 6 }, { brand: 'Disney', count: 9 }, { brand: 'Fiskars', count: 3 }],
}

const empty: ScanSummaryProps = {
  ...results,
  state: 'empty',
  stats: '1 frame selected',
  status: { tone: 'neutral', label: 'Not scanned yet' },
  score: null,
  meterScore: '— / —',
  caption: 'Run a scan to see which components pass in every brand mode',
  kpis: results.kpis.map((k, i) => (i === 0 ? { ...k, value: '—', caption: 'waiting for scan', tone: 'empty' } : { ...k, value: '—', caption: 'waiting for scan', tone: 'empty' })),
  levels: undefined,
  principles: results.principles.map((r) => ({ ...r, value: '—' })),
  severity: results.severity.map((r) => ({ ...r, value: '—' })),
  brands: results.brands!.map((b) => ({ ...b, count: null })),
}

const meta = {
  title: 'Organisms/ScanSummary',
  component: ScanSummary,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  args: results,
  decorators: [(Story) => <div style={{ width: '568px' }}><Story /></div>],
} satisfies Meta<typeof ScanSummary>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Results: Story = { parameters: v('State=Results, Expanded=No') }
export const ResultsExpanded: Story = { args: { defaultExpanded: true }, parameters: v('State=Results, Expanded=Yes') }
export const Empty: Story = { args: empty, parameters: v('State=Empty, Expanded=No') }
export const EmptyExpanded: Story = { args: { ...empty, defaultExpanded: true }, parameters: v('State=Empty, Expanded=Yes') }
export const Narrow: Story = { args: { defaultExpanded: true }, decorators: [(Story) => <div style={{ width: '330px' }}><Story /></div>] }
export const AcrossBrands: Story = { render: (args) => <BrandGrid width="568px"><ScanSummary {...args} /></BrandGrid> }
