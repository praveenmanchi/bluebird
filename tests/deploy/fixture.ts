// A three-brand config for the deploy tests: small enough to read, valid under loadConfig.
import { hashAccessCode } from '../../src/shared/session'

export const rawConfig = (deploy?: unknown) => ({
  name: 'Bluebird',
  brand: {
    active: 'bridge',
    brands: {
      bridge: { label: 'Bridge', accessCodeHash: hashAccessCode('BRIDGE'), source: { collection: 'Brand UI', mode: 'Bridge' } },
      ikea: { label: 'Ikea', accessCodeHash: hashAccessCode('IKEA'), source: { collection: 'Brand UI', mode: 'Ikea' } },
      gap: { label: 'Gap Inc.', accessCodeHash: hashAccessCode('GAP'), source: { collection: 'Brand UI', mode: 'Gap' }, figmaPlugin: { id: '1234567890123', name: 'Gap Design Studio' } },
    },
  },
  activePersona: 'p',
  personas: { p: { label: 'P', tabs: ['a11y'] } },
  tabs: { a11y: { label: 'Accessibility' } },
  ...(deploy ? { deploy } : {}),
})
