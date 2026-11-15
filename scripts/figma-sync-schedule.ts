// Run `npm run figma:sync -- --notify` every weekday morning with launchd (macOS).
//
//   npm run figma:sync:schedule               # install, 09:30 Monday to Friday
//   npm run figma:sync:schedule -- --at 08:15
//   npm run figma:sync:schedule -- --remove
//
// launchd runs a missed job when the Mac next wakes. Output goes to ~/Library/Logs/bluebird-figma-sync.log.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const LABEL = 'com.bluebird.figma-sync'
const ROOT = resolve(import.meta.dirname, '..')
const WEEKDAYS = [1, 2, 3, 4, 5] as const

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function parseTime(value: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value)
  const hour = Number(m?.[1]), minute = Number(m?.[2])
  if (!m || hour > 23 || minute > 59) throw new Error(`--at must be HH:MM (24-hour), got "${value}"`)
  return { hour, minute }
}

export function plist(root: string, log: string, at: { hour: number; minute: number }): string {
  const slots = WEEKDAYS.map((day) => `    <dict><key>Weekday</key><integer>${day}</integer><key>Hour</key><integer>${at.hour}</integer><key>Minute</key><integer>${at.minute}</integer></dict>`).join('\n')
  // A login shell, so npm and node come from the same PATH as in the terminal.
  const command = `cd ${JSON.stringify(root)} && npm run --silent figma:sync -- --notify`
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array><string>/bin/zsh</string><string>-lc</string><string>${xml(command)}</string></array>
  <key>StartCalendarInterval</key>
  <array>
${slots}
  </array>
  <key>StandardOutPath</key><string>${xml(log)}</string>
  <key>StandardErrorPath</key><string>${xml(log)}</string>
</dict>
</plist>
`
}

function main() {
  if (process.platform !== 'darwin') throw new Error('The schedule uses launchd, which is macOS only. On other systems run `npm run figma:sync -- --notify` from cron.')
  const argv = process.argv.slice(2)
  const target = resolve(homedir(), 'Library/LaunchAgents', `${LABEL}.plist`)
  const domain = `gui/${userInfo().uid}`
  spawnSync('launchctl', ['bootout', `${domain}/${LABEL}`], { stdio: 'ignore' })
  if (argv.includes('--remove')) {
    if (existsSync(target)) rmSync(target)
    console.log(`[figma:sync] schedule removed (${target})`)
    return
  }
  const i = argv.indexOf('--at')
  const at = parseTime(i >= 0 ? argv[i + 1] ?? '' : '09:30')
  const log = resolve(homedir(), 'Library/Logs/bluebird-figma-sync.log')
  mkdirSync(resolve(homedir(), 'Library/LaunchAgents'), { recursive: true })
  writeFileSync(target, plist(ROOT, log, at))
  const loaded = spawnSync('launchctl', ['bootstrap', domain, target], { encoding: 'utf8' })
  if (loaded.status !== 0) throw new Error(`launchctl could not load ${target}: ${loaded.stderr.trim()}`)
  const time = `${String(at.hour).padStart(2, '0')}:${String(at.minute).padStart(2, '0')}`
  console.log(`[figma:sync] scheduled for ${time}, Monday to Friday\n  job  ${target}\n  log  ${log}\n  run it now: launchctl kickstart ${domain}/${LABEL}\n  remove it:  npm run figma:sync:schedule -- --remove`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try { main() } catch (error) { console.error(`[figma:sync] ${error instanceof Error ? error.message : String(error)}`); process.exit(1) }
}
