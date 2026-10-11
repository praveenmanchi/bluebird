import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { LevelRow } from './LevelRow'
import { scoreTone } from '../ScoreValue/ScoreValue'
import { brandCountTone } from '../BrandCount/BrandCount'

describe('LevelRow', () => {
  it('shows the pass rate and colours it by the score thresholds', () => {
    const { container } = render(<LevelRow name="Atoms" passing={15} total={18} />)
    expect(screen.getByText('83%')).toBeInTheDocument()
    expect(container.querySelector('.bb-level-row')).toHaveAttribute('data-tone', 'success')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '83')
  })
  it('renders dashes before a scan or when a level is empty', () => {
    render(<LevelRow name="Organisms" passing={0} total={0} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('tone helpers', () => {
  it('scoreTone follows ≥80 / ≥60 thresholds', () => {
    expect([scoreTone(80), scoreTone(60), scoreTone(59), scoreTone(null)]).toEqual(['success', 'warning', 'danger', 'empty'])
  })
  it('brandCountTone follows ≥8 / ≥5 thresholds', () => {
    expect([brandCountTone(8), brandCountTone(5), brandCountTone(4), brandCountTone(null)]).toEqual(['danger', 'warning', 'success', 'empty'])
  })
})
