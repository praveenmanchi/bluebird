import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/preact'
import { UxaiAnswer } from '../ui/UxaiAnswer'
import { UxaiComponent } from '../ui/UxaiComponent'
import { UxaiThinking } from '../ui/UxaiThinking'
import { UxaiSelection } from '../ui/UxaiSelection'
import { UxaiSources } from '../ui/UxaiSources'
import { SCREEN_THREADS, SOURCES, VARIABLES, answerKindFor } from '../fixtures'

describe('uxai screens on Figma fixtures', () => {
  it('Answer: Sources bar collapses past four chips, Thought for, Color Artifact, follow-ups', () => {
    render(<UxaiAnswer turns={SCREEN_THREADS.answer} sources={SOURCES} draft="" />)
    const bar = screen.getByLabelText('Sources in use')
    for (const chip of ['Brand UI variables', 'Components', 'Icons', 'Type styles', '+1']) expect(within(bar).getByText(chip)).toBeInTheDocument()
    expect(screen.getByText('Thought for 2s')).toBeInTheDocument()
    expect(screen.getByText('Matched surface/accent via button/primary/bg/default')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check contrast in every brand' })).toBeInTheDocument()
    expect(screen.getByText('5 sources')).toBeInTheDocument()
    expect(screen.queryByText('Ticket Row · State=Selected')).toBeNull()
  })

  it('Component: the live Button preview and its code citation, no follow-ups', () => {
    render(<UxaiComponent turns={SCREEN_THREADS.component} sources={SOURCES} draft="" />)
    expect(screen.getByText('Thought for 3s')).toBeInTheDocument()
    expect(screen.getByText('src/shared/ui/Button · Code Connect ✓')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /contrast/ })).toBeNull()
  })

  it('Thinking: the earlier Type answer, a running step and a Generating Chat Input with the prompt', () => {
    render(<UxaiThinking turns={SCREEN_THREADS.thinking} sources={SOURCES} draft="" />)
    expect(screen.getByText('Type scale · Noto Sans')).toBeInTheDocument()
    expect(screen.getByText('Searching your iconography…')).toBeInTheDocument()
    expect(screen.getByText('Matching “status” in names, tags and usage…').closest('[data-status]')?.getAttribute('data-status')).toBe('running')
    expect(screen.getByRole('textbox', { name: 'Ask UX AI' })).toHaveValue('Which icons do we use for status?')
    expect(screen.getByRole('button', { name: 'Stop generating' })).toBeInTheDocument()
    expect(screen.getByText('Searching Iconography…')).toBeInTheDocument()
  })

  it('Selection: preview on top, the pending first row and the Selection chip', () => {
    render(<UxaiSelection turns={SCREEN_THREADS.selection} sources={SOURCES} draft="" variables={VARIABLES} panelMode="swap" />)
    expect(screen.queryByLabelText('Sources in use')).toBeNull()
    expect(screen.getByText('Fill · root · pending: surface/accent')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Swap binding' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('1 change · 3 variants')).toBeInTheDocument()
    expect(screen.getByText('Ticket Row · State=Selected')).toBeInTheDocument()
  })

  it('Sources: status badges and the unchecked failed source', () => {
    render(<UxaiSources sources={SOURCES} draft="" />)
    expect(screen.getByText('Indexing 62%')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Include tokens-export.json' })).not.toBeChecked()
    expect(screen.getByRole('heading', { name: 'Ask anything about your design system' })).toBeInTheDocument()
  })

  it('routes prompts to the matching canned answer', () => {
    expect(answerKindFor('What is our primary colour?')).toBe('color')
    expect(answerKindFor('Show me the Button atom')).toBe('component')
    expect(answerKindFor('Which type styles does the Banner use?')).toBe('type')
    expect(answerKindFor('Which icons mean status?')).toBe('icons')
    expect(answerKindFor('What variables does my selection use?')).toBe('selection')
    expect(answerKindFor('Swap it on my selection')).toBe('selection')
    expect(answerKindFor('Check contrast in every brand')).toBe('color')
  })
})
