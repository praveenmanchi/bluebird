import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import type { RpcClient } from '@shared/bridge'
import { DEFAULT_INTEGRATIONS, type IntegrationSettings } from '@shared/integrations'
import { FIGMA_KEY_MSG } from '@shared/session'
import { FigmaKeyScreen, FIGMA_KEY_STEPS } from './FigmaKeyScreen'

function setup({ token = '', check = vi.fn(async () => ({ handle: 'Ada' })) }: { token?: string; check?: ReturnType<typeof vi.fn> } = {}) {
  const settings: IntegrationSettings = { ...DEFAULT_INTEGRATIONS, dualFile: { ...DEFAULT_INTEGRATIONS.dualFile, token } }
  const client = { call: vi.fn(async (type: string, payload: unknown) => (type === FIGMA_KEY_MSG.check ? check(payload) : undefined)) } as unknown as RpcClient
  const save = vi.fn(async (_s: string, v: unknown) => v as never)
  const onFinish = vi.fn()
  render(<FigmaKeyScreen client={client} brand="bridge" load={async () => settings} save={save} onFinish={onFinish} />)
  return { client, save, onFinish, check }
}

const field = () => screen.getByPlaceholderText('Paste your token (starts with figd_)')

describe('FigmaKeyScreen', () => {
  it('shows the warning, the six steps, the screenshot and a disabled Authenticate', async () => {
    const { onFinish } = setup()
    expect(await screen.findByRole('region', { name: 'Figma API key' })).toBeInTheDocument()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText('Many features need this key')).toBeInTheDocument()
    expect(screen.getByText(/features The Bridge offers/)).toBeInTheDocument()
    for (const step of FIGMA_KEY_STEPS) expect(screen.getByText(step)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Personal access tokens/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Authenticate' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('skips itself when a Figma key is already saved', async () => {
    const { onFinish } = setup({ token: 'figd_already' })
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
  })

  it('checks the token, saves it into Dual File and continues', async () => {
    const { save, onFinish, check } = setup()
    fireEvent.input(field(), { target: { value: ' figd_abcdefghijkl ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Authenticate' }))
    expect(await screen.findByText(/Connected as Ada/)).toBeInTheDocument()
    expect(check).toHaveBeenCalledWith({ token: 'figd_abcdefghijkl' })
    expect(save).toHaveBeenCalledWith('dualFile', expect.objectContaining({ token: 'figd_abcdefghijkl' }))
    expect(screen.getByText('Added')).toBeInTheDocument()
    expect(screen.queryByText('Many features need this key')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Skip for now' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('shows the error and offers Try again; editing clears it', async () => {
    const check = vi.fn(async () => { throw new Error('Figma didn’t accept it.') })
    const { save } = setup({ check })
    fireEvent.input(field(), { target: { value: 'figd_wrongwrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Authenticate' }))
    expect(await screen.findByText('That key didn’t work')).toBeInTheDocument()
    expect(screen.getByText('Figma didn’t accept it.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
    expect(save).not.toHaveBeenCalled()
    fireEvent.input(field(), { target: { value: 'figd_wrongwrong2' } })
    expect(screen.queryByText('That key didn’t work')).toBeNull()
    expect(screen.getByRole('button', { name: 'Authenticate' })).toBeEnabled()
  })
})
