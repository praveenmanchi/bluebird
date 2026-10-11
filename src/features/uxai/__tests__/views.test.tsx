import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/preact'
import { UxaiAnswer } from '../ui/UxaiAnswer'
import { UxaiComponent } from '../ui/UxaiComponent'
import { UxaiThinking } from '../ui/UxaiThinking'
import { UxaiSelection } from '../ui/UxaiSelection'
import { UxaiSources } from '../ui/UxaiSources'
import { Composer } from '../ui/Composer'
import { SCREEN_THREADS, SOURCES, VARIABLES, answerKindFor } from '../fixtures'

describe('uxai screens on Figma fixtures', () => {
  it('Answer: no screen Sources bar (Figma 2026-10-12); Thought for, Color Artifact, follow-ups; sources in the Chat Input', () => {
    const { container } = render(<UxaiAnswer turns={SCREEN_THREADS.answer} sources={SOURCES} draft="" />)
    expect(container.querySelector('.bb-uxai-sources-bar')).toBeNull()
    expect(screen.queryByLabelText('Sources in use')).toBeNull()
    expect(screen.getByText('Thought for 2s')).toBeInTheDocument()
    expect(screen.getByText('Matched surface/accent via button/primary/bg/default')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check contrast in every brand' })).toBeInTheDocument()
    expect(screen.queryByText('Ticket Row · State=Selected')).toBeNull()
    // The chips now live in the Chat Input's Sources bar, still collapsing past four.
    fireEvent.click(screen.getByRole('button', { name: '5 sources' }))
    const bar = screen.getByLabelText('Sources in use')
    for (const chip of ['Brand UI variables', 'Components', 'Icons', 'Type styles', '+1']) expect(within(bar).getByText(chip)).toBeInTheDocument()
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

  it('Sources, first run: the welcome over the Chat Input, no sources list (Figma "UX AI body")', () => {
    render(<UxaiSources sources={SOURCES} draft="" />)
    expect(screen.getByRole('heading', { name: 'Ask anything about your design system' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Knowledge sources' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Sources' })).toBeNull()
    expect(screen.getByRole('button', { name: '5 sources' })).toBeInTheDocument()
    // Figma hides the Selection chip on this screen.
    expect(screen.queryByText('Ticket Row · State=Selected')).toBeNull()
  })

  it('Sources, managing: status badges and the unchecked failed source', () => {
    render(<UxaiSources sources={SOURCES} draft="" managing onBack={() => undefined} />)
    expect(screen.getByRole('heading', { name: 'Knowledge sources' })).toBeInTheDocument()
    expect(screen.getByText('Indexing 62%')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Include tokens-export.json' })).not.toBeChecked()
    expect(screen.queryByRole('heading', { name: 'Ask anything about your design system' })).toBeNull()
  })

  it('Composer: the sources chip expands into the Sources bar; Manage sources and Send collapse it', () => {
    const onManageSources = vi.fn()
    const { container } = render(<Composer sources={SOURCES} draft="Hi" onManageSources={onManageSources} />)
    const state = () => container.querySelector('.bb-chat-input')!.getAttribute('data-state')
    const toggle = screen.getByRole('button', { name: '5 sources' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(state()).toBe('sources')
    expect(screen.getByLabelText('Sources in use')).toHaveTextContent(/Brand UI variables.*Components.*Icons.*Type styles.*\+1/)
    fireEvent.click(screen.getByRole('button', { name: 'Manage sources' }))
    expect(onManageSources).toHaveBeenCalledTimes(1)
    expect(state()).toBe('idle')
    fireEvent.click(screen.getByRole('button', { name: '5 sources' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(state()).toBe('idle')
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
