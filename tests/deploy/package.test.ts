// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { planPackage, publishSteps } from '../../tools/deploy/package'
import { crc32, createZip } from '../../tools/deploy/zip'
import { rawConfig } from './fixture'

const manifest = { name: 'Design Studio', id: '1686669081925353511', main: 'dist/code.js' }

describe('planPackage', () => {
  it('ships the repo manifest for a multi-brand package', () => {
    expect(planPackage(manifest, rawConfig(), { mode: 'multi' })).toEqual({ slug: 'multi-brand', manifest, notes: [] })
  })

  it('writes the brand’s own plugin id and name for a single-brand package', () => {
    const plan = planPackage(manifest, rawConfig(), { mode: 'single', brand: 'gap' })
    expect(plan).toEqual({ slug: 'gap', manifest: { ...manifest, id: '1234567890123', name: 'Gap Design Studio' }, notes: [] })
    expect(manifest.id).toBe('1686669081925353511')
  })

  it('keeps the repo id, and says why that matters, when the brand has none', () => {
    const plan = planPackage(manifest, rawConfig(), { mode: 'single', brand: 'ikea' })
    expect(plan.manifest).toEqual(manifest)
    expect(plan.notes[0]).toMatch(/No Figma plugin ID is set for Ikea.*brand\.brands\.ikea\.figmaPlugin\.id/)
  })

  it('writes import and publish steps for the zip', () => {
    const steps = publishSteps(planPackage(manifest, rawConfig(), { mode: 'single', brand: 'gap' }), 'Gap Inc.')
    expect(steps).toMatch(/^Gap Design Studio — Gap Inc\./)
    expect(steps).toMatch(/Import plugin from manifest/)
  })
})

describe('createZip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('stores each file with a local header, a central entry and an end record', () => {
    const data = new TextEncoder().encode('hello')
    const zip = createZip([{ path: 'a/b.txt', data }, { path: 'c.txt', data }], new Date(2026, 10, 14, 10, 30, 0))
    const view = new DataView(zip.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(new TextDecoder().decode(zip.slice(30, 37))).toBe('a/b.txt')
    expect(new TextDecoder().decode(zip.slice(37, 42))).toBe('hello')
    const end = zip.length - 22
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)
    const centralAt = view.getUint32(end + 16, true)
    expect(view.getUint32(centralAt, true)).toBe(0x02014b50)
    expect(view.getUint32(centralAt + 16, true)).toBe(crc32(data))
    expect(view.getUint16(10, true)).toBe((10 << 11) | (30 << 5))
  })
})
