// Stamps build-info.json on every `npm run build`: bumps the patch of the version the Settings
// team banner shows and records when the build ran. Dev and Storybook read the last stamp.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve(import.meta.dirname, '../build-info.json')
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/

interface BuildInfo { version: string; updatedAt: string }

function read(): BuildInfo {
  const info = JSON.parse(readFileSync(file, 'utf8')) as Partial<BuildInfo>
  if (typeof info.version !== 'string' || !SEMVER.test(info.version)) {
    throw new Error(`[build-info] ${file}: "version" must be MAJOR.MINOR.PATCH, got ${JSON.stringify(info.version)}`)
  }
  return { version: info.version, updatedAt: String(info.updatedAt ?? '') }
}

export function bump(info: BuildInfo, now: Date): BuildInfo {
  const [, major, minor, patch] = SEMVER.exec(info.version)!
  return { version: `${major}.${minor}.${Number(patch) + 1}`, updatedAt: now.toISOString() }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const prev = read()
  const next = bump(prev, new Date())
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`)
  console.log(`[build-info] ${prev.version} → ${next.version} (${next.updatedAt})`)
}
