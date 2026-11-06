import { describe, expect, it } from 'vitest'
import { assertExpectedFile } from '../../scripts/figma-pull'

describe('assertExpectedFile', () => {
  it('accepts the file the manifest names', () => {
    expect(() => assertExpectedFile({ fileName: 'Project Bluebird UI' }, 'Project Bluebird UI')).not.toThrow()
  })

  it('refuses a pull from any other open file, naming both', () => {
    expect(() => assertExpectedFile({ fileName: 'Project Bluebird UI' }, 'Scratch')).toThrow(/"Scratch".*"Project Bluebird UI"/)
  })

  it('does not check when the manifest names no file', () => {
    expect(() => assertExpectedFile({}, 'Anything')).not.toThrow()
  })
})
