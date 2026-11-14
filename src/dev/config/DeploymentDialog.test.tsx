import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { loadConfig } from '@shared/config'
import { hashAccessCode } from '@shared/session'
import { DeploymentDialog } from './DeploymentDialog'

const raw = {
  brand: { active: 'ikea', brands: {
    ikea: { label: 'Ikea', accessCodeHash: hashAccessCode('IKEA'), source: { collection: 'Brand UI', mode: 'Ikea' } },
    gap: { label: 'Gap Inc.', accessCodeHash: hashAccessCode('GAP'), source: { collection: 'Brand UI', mode: 'Gap' } },
  } },
  activePersona: 'p', personas: { p: { label: 'P', tabs: [] } }, tabs: {},
}

afterEach(() => { vi.unstubAllGlobals() })

describe('DeploymentDialog', () => {
  it('saves a single-brand deployment with the brand’s Figma plugin id', async () => {
    const bodies: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const patch = JSON.parse(String(init?.body)) as { deploy: unknown; figmaPlugin: Record<string, unknown> }
      bodies.push(patch)
      return new Response(JSON.stringify({ ok: true, config: { ...raw, deploy: patch.deploy, brand: { ...raw.brand, brands: { ...raw.brand.brands, gap: { ...raw.brand.brands.gap, figmaPlugin: patch.figmaPlugin.gap } } } } }), { status: 200 })
    }))
    const onSaved = vi.fn()
    render(<DeploymentDialog open config={loadConfig(raw)} onClose={() => undefined} onSaved={onSaved} />)
    expect(screen.getByRole('button', { name: 'Multi-brand' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Single brand' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Brand' }), { target: { value: 'gap' } })
    expect(screen.getByText(/Opens straight into Gap Inc\./)).toBeInTheDocument()
    expect(screen.getByText('BB_DEPLOY=gap npm run package')).toBeInTheDocument()

    fireEvent.input(screen.getByRole('textbox', { name: 'Figma plugin ID' }), { target: { value: 'not-an-id' } })
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.input(screen.getByRole('textbox', { name: 'Figma plugin ID' }), { target: { value: '1234567890123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(bodies).toEqual([{ deploy: { mode: 'single', brand: 'gap' }, figmaPlugin: { gap: { id: '1234567890123' } } }])
    expect(onSaved.mock.calls[0]![0].deploy).toEqual({ mode: 'single', brand: 'gap' })
  })

  it('shows why a save failed and keeps the dialog open', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'deploy.brand "x" is not defined' }), { status: 400 })))
    const onSaved = vi.fn()
    render(<DeploymentDialog open config={loadConfig(raw)} onClose={() => undefined} onSaved={onSaved} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('deploy.brand "x" is not defined')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
