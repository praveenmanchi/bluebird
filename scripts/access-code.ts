// Print the hash to paste into plugin.config.json → brand.brands.<id>.accessCodeHash.
//   npm run access-code -- FISKARS-2026
import { hashAccessCode, normalizeAccessCode } from '../src/shared/session/sha256'

const code = process.argv.slice(2).join(' ')
if (!code.trim()) { console.error('usage: npm run access-code -- <code>'); process.exit(1) }
console.log(`${normalizeAccessCode(code)}  →  ${hashAccessCode(code)}`)
