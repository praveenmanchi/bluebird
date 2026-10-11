import { describe, it, expect, vi } from 'vitest'
import { installFigmaMock } from '../../../../tests/mocks/figma'
import { handlers } from '../sandbox/handler'
import { MSG, type SelectionLink } from '../messages'

const call = <T>(type: string, payload: unknown) =>
  (handlers[type] as unknown as (p: unknown, c: { emit: () => void }) => Promise<T>)(payload, { emit: vi.fn() })

describe('jira sandbox handlers', () => {
  it('jira:selection names the first selected layer like a Figma Link Card', async () => {
    installFigmaMock({ currentPage: { name: 'jira', selection: [{ id: '1:2', name: 'Ticket detail' }] } as unknown as PageNode })
    await expect(call<SelectionLink | null>(MSG.selection, {})).resolves.toEqual({ nodeId: '1:2', frame: 'Ticket detail', path: 'Test file › jira', url: null })
  })

  it('jira:selection builds a figma.com link when Figma shares the file key', async () => {
    installFigmaMock({ fileKey: 'AbC123', currentPage: { name: 'jira', selection: [{ id: '1:2', name: 'Ticket detail' }] } as unknown as PageNode })
    await expect(call<SelectionLink | null>(MSG.selection, {})).resolves.toMatchObject({ url: 'https://www.figma.com/design/AbC123/?node-id=1-2' })
  })

  it('jira:selection returns null when nothing is selected', async () => {
    installFigmaMock()
    await expect(call(MSG.selection, {})).resolves.toBeNull()
  })

  it('jira:focus selects and scrolls to the node', async () => {
    const node = { id: '1:2', type: 'FRAME' }
    const figma = installFigmaMock({ getNodeByIdAsync: vi.fn(async () => node) as unknown as PluginAPI['getNodeByIdAsync'] })
    await call(MSG.focus, { nodeId: '1:2' })
    expect(figma.currentPage.selection).toEqual([node])
    expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([node])
  })

  it('jira:focus rejects a missing node and an invalid payload', async () => {
    installFigmaMock()
    await expect(call(MSG.focus, { nodeId: '9:9' })).rejects.toThrow('That frame is not in this file')
    await expect(call(MSG.focus, { nodeId: '' })).rejects.toThrow()
  })
})
