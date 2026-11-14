import { describe, it, expect, afterEach } from 'vitest'
import { EDITOR_MSG, editorMode, inDevMode, loadEditorMode } from '..'
import type { RpcClient } from '@shared/bridge'

const client = (answer: () => Promise<unknown>): RpcClient => ({ call: answer } as unknown as RpcClient)

afterEach(() => { editorMode.value = 'design' })

describe('loadEditorMode', () => {
  it('asks the sandbox and switches to Dev Mode', async () => {
    let asked = ''
    const rpc = { call: (type: string) => { asked = type; return Promise.resolve('dev') } } as unknown as RpcClient
    await expect(loadEditorMode(rpc)).resolves.toBe('dev')
    expect(asked).toBe(EDITOR_MSG.mode)
    expect(inDevMode.value).toBe(true)
  })

  it('stays in Design Mode when the sandbox has no answer', async () => {
    editorMode.value = 'dev'
    await expect(loadEditorMode(client(() => Promise.reject(new Error('No handler'))))).resolves.toBe('design')
    expect(inDevMode.value).toBe(false)
  })

  it('ignores an answer it does not know', async () => {
    await expect(loadEditorMode(client(() => Promise.resolve('slides')))).resolves.toBe('design')
  })
})
