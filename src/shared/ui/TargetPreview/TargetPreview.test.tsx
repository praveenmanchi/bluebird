import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { TargetPreview, targetState } from './TargetPreview'

describe('targetState', () => {
  it('passes a target whose smallest side reaches the minimum', () => {
    expect(targetState({ width: 24, height: 30 })).toBe('pass')
    expect(targetState({ width: 18, height: 30 })).toBe('fail')
  })
  it('passes an undersized target when spacing keeps a 24px circle clear (2.5.8 exception)', () => {
    expect(targetState({ width: 18, height: 18, spacing: 4 })).toBe('fail')
    expect(targetState({ width: 18, height: 18, spacing: 6 })).toBe('pass')
  })
  it('measures against the enhanced size when asked', () => {
    expect(targetState({ width: 24, height: 24, minimum: 44 })).toBe('fail')
  })
})

describe('TargetPreview', () => {
  it('draws the target, the minimum box and the enhanced box at 200%', () => {
    const { container } = render(<TargetPreview width={18} height={18} spacing={4} />)
    const target = container.querySelector<HTMLElement>('.bb-target-preview__target')!
    expect(target.style.width).toBe('36px')
    expect(container.querySelector<HTMLElement>('.bb-target-preview__minimum')!.style.width).toBe('48px')
    expect(container.querySelector<HTMLElement>('.bb-target-preview__enhanced')!.style.width).toBe('88px')
    expect(container.querySelector('.bb-target-preview')).toHaveAttribute('data-state', 'fail')
    expect(screen.getByText('18 × 18')).toBeInTheDocument()
    expect(screen.getByText('4px gap')).toBeInTheDocument()
    expect(screen.getByText('200%')).toBeInTheDocument()
  })
  it('leaves out the neighbour when spacing is unknown', () => {
    const { container } = render(<TargetPreview width={16} height={16} />)
    expect(container.querySelector('.bb-target-preview__neighbour')).toBeNull()
    expect(screen.queryByText(/gap$/)).toBeNull()
  })
  it('honours an explicit state', () => {
    const { container } = render(<TargetPreview width={24} height={24} state="fail" />)
    expect(container.querySelector('.bb-target-preview')).toHaveAttribute('data-state', 'fail')
  })
  it('names the legend after the minimum and enhanced sizes', () => {
    render(<TargetPreview width={30} height={30} minimum={44} enhanced={44} />)
    expect(screen.getByText('44 × 44 minimum (AAA)')).toBeInTheDocument()
  })
})
