// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { durableStore, recordCell, type CellStorage, type RecordCell } from '../../tools/connect/durable'

/** A Durable Object's storage, in memory: just the calls recordCell makes. */
function fakeStorage() {
  const data = new Map<string, unknown>()
  let alarm: number | null = null
  const storage: CellStorage = {
    async get<T>(key: string) { return data.get(key) as T | undefined },
    async put<T>(key: string, value: T) { data.set(key, value) },
    async deleteAll() { data.clear() },
    async setAlarm(at: number) { alarm = at },
    async deleteAlarm() { alarm = null },
  }
  return { storage, data, alarm: () => alarm }
}

describe('recordCell', () => {
  it('keeps a value until its TTL, and sets an alarm to clear it then', async () => {
    let clock = 1_000
    const fake = fakeStorage()
    const cell = recordCell(fake.storage, () => clock)
    await cell.put('hello', 60)
    expect(await cell.get()).toBe('hello')
    expect(fake.alarm()).toBe(61_000)
    clock = 61_000
    expect(await cell.get()).toBeNull()
  })

  it('take() reads once, then the record is gone with its alarm', async () => {
    const fake = fakeStorage()
    const cell = recordCell(fake.storage, () => 0)
    await cell.put('once', 60)
    expect(await cell.take()).toBe('once')
    expect(await cell.take()).toBeNull()
    expect(fake.data.size).toBe(0)
    expect(fake.alarm()).toBeNull()
  })

  it('take() of an expired record answers null', async () => {
    let clock = 0
    const cell = recordCell(fakeStorage().storage, () => clock)
    await cell.put('late', 1)
    clock = 1_000
    expect(await cell.take()).toBeNull()
  })

  it('delete() clears the record and its alarm', async () => {
    const fake = fakeStorage()
    const cell = recordCell(fake.storage, () => 0)
    await cell.put('x', 60)
    await cell.delete()
    expect(await cell.get()).toBeNull()
    expect(fake.alarm()).toBeNull()
  })

  it('a second put replaces the value and moves the alarm', async () => {
    let clock = 0
    const fake = fakeStorage()
    const cell = recordCell(fake.storage, () => clock)
    await cell.put('a', 60)
    clock = 10_000
    await cell.put('b', 300)
    expect(await cell.get()).toBe('b')
    expect(fake.alarm()).toBe(310_000)
  })
})

describe('durableStore', () => {
  it('puts each key in its own cell, named with a version prefix', async () => {
    const names: string[] = []
    const cells = new Map<string, RecordCell>()
    const store = durableStore((name) => {
      names.push(name)
      const cell = cells.get(name) ?? recordCell(fakeStorage().storage, () => 0)
      cells.set(name, cell)
      return cell
    })
    await store.put('r:abc', 'pending', 60)
    await store.put('w:def', 'write', 60)
    expect(await store.get('r:abc')).toBe('pending')
    expect(await store.take('w:def')).toBe('write')
    expect(await store.get('w:def')).toBeNull()
    await store.delete('r:abc')
    expect(await store.get('r:abc')).toBeNull()
    expect(new Set(names)).toEqual(new Set(['v1:r:abc', 'v1:w:def']))
  })
})
