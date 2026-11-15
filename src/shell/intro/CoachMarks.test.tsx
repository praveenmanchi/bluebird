import { describe, expect, it, vi, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { CoachMarks, targetsOf } from './CoachMarks'
import { tabIntroSteps, TAB_INTROS } from './steps'

afterEach(() => { document.body.innerHTML = '' })

/** jsdom lays nothing out: give the fixture elements a box. */
function box(el: HTMLElement, x: number, y: number, w: number, h: number) {
  el.getBoundingClientRect = () => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect
}

function fixture() {
  const host = document.createElement('div')
  host.innerHTML = '<button class="target-a">A</button><span class="target-b">B</span><span class="hidden-target"></span>'
  document.body.appendChild(host)
  box(host.querySelector('.target-a')!, 10, 100, 80, 32)
  box(host.querySelector('.target-b')!, 200, 100, 40, 32)
}

describe('CoachMarks', () => {
  it('walks the steps with Start, Next, Back and Done, then reports completion', () => {
    fixture()
    const onClose = vi.fn()
    render(<CoachMarks label="Test intro" onClose={onClose} steps={[
      { target: '.target-a', title: 'First', body: 'One' },
      { target: ['.target-a', '.target-b'], title: 'Second', body: 'Two' },
      { title: 'Third', body: 'Three' },
    ]} />)
    expect(screen.getByRole('dialog', { name: 'Test intro' })).toBeInTheDocument()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByText('Second')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('First')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByRole('button', { name: /Skip tour/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledWith(true)
  })

  it('Skip tour and Escape close without completing', () => {
    fixture()
    const onClose = vi.fn()
    render(<CoachMarks label="Test intro" onClose={onClose} steps={[{ target: '.target-a', title: 'First', body: 'One' }, { title: 'Second', body: 'Two' }]} />)
    fireEvent.click(screen.getByRole('button', { name: /Skip tour/ }))
    expect(onClose).toHaveBeenLastCalledWith(false)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('arrow keys move between steps', () => {
    fixture()
    render(<CoachMarks label="Test intro" onClose={vi.fn()} steps={[{ title: 'First', body: 'One' }, { title: 'Second', body: 'Two' }]} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('Second')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText('First')).toBeInTheDocument()
  })

  it('drops optional steps whose target is not rendered and rings the target', () => {
    fixture()
    const { container } = render(<CoachMarks label="Test intro" onClose={vi.fn()} steps={[
      { target: '.target-a', title: 'Shown', body: 'One' },
      { target: '.hidden-target', optional: true, title: 'Dropped', body: 'Two' },
      { target: '.nowhere', optional: true, title: 'Also dropped', body: 'Three' },
    ]} />)
    expect(screen.getByText('1 of 1')).toBeInTheDocument()
    expect(container.ownerDocument.querySelector('.bb-intro__ring')).not.toBeNull()
  })

  it('a single pointer hides the progress but keeps its skip', () => {
    fixture()
    render(<CoachMarks label="New tab" hideProgress skipLabel="Not now" doneLabel="Open tab" onClose={vi.fn()} steps={[{ target: '.target-a', title: 'Here', body: 'Click it' }]} />)
    expect(screen.queryByText('1 of 1')).toBeNull()
    expect(screen.getByRole('button', { name: /Not now/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open tab' })).toBeInTheDocument()
  })
})

describe('targetsOf', () => {
  it('matches every element, or the first per selector, and survives a bad selector', () => {
    fixture()
    expect(targetsOf({ target: ['.target-a', '.target-b'], title: '', body: '' })).toHaveLength(2)
    expect(targetsOf({ target: 'span', first: true, title: '', body: '' })).toHaveLength(1)
    expect(targetsOf({ target: '::bogus((', title: '', body: '' })).toEqual([])
    expect(targetsOf({ title: '', body: '' })).toEqual([])
  })
})

describe('tab intros', () => {
  it('open on the tab, end on the footer replay, and cover every configured tab', () => {
    const steps = tabIntroSteps('varsearch', 'Variable search')
    expect(steps[0]!.title).toBe('Welcome to Variable search')
    expect(steps.at(-1)!.target).toBe('.bb-footer__help')
    expect(Object.keys(TAB_INTROS).sort()).toEqual(['a11y', 'agents', 'audit', 'documentation', 'extraction', 'history', 'jira', 'mcp', 'publish', 'uxai', 'varmapper', 'varsearch'])
  })
  it('falls back for a tab without its own copy', () => {
    expect(tabIntroSteps('unknown', 'Mystery')).toHaveLength(2)
  })
})
