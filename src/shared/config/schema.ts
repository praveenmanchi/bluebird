// zod/mini: tree-shakable functional API. The full `zod` import is ~440 KB
// minified and would dominate every bundle; mini costs a few KB.
import * as z from 'zod/mini'
// The schema module, not the index: the index pulls in validate.ts, which the config doesn't need.
import { sectionSchemas } from '../integrations/schema'

const ID = /^[a-z0-9][a-z0-9-]*$/
const TOKEN_KEY = /^[a-z0-9-]+$/

const id = () => z.string().check(z.regex(ID))
const nonEmpty = () => z.string().check(z.minLength(1))

export const brandSourceSchema = z.object({
  collection: nonEmpty(),
  mode: nonEmpty(),
})

const SHA256_HEX = /^[0-9a-f]{64}$/

/** One row of a brand's tab bar: the tab and whether this brand shows it. Array order is the tab order. */
export const brandTabSchema = z.object({
  id: id(),
  enabled: z.boolean(),
})

/** Which tabs each persona gets in a brand, by persona id. Persona order unless the brand sets a tab order. */
export const brandPersonasSchema = z.record(id(), z.array(id()))

const managed = <S extends z.ZodMiniObject>(section: S) => z.optional(z.partial(section))

/** Settings sections the brand sets for everyone (dev.html › Plugin configuration). Strict, so a misspelt section fails the build. */
export const managedIntegrationsSchema = z.strictObject({
  github: managed(sectionSchemas.github),
  notifications: managed(sectionSchemas.notifications),
  storybook: managed(sectionSchemas.storybook),
  zeroheight: managed(sectionSchemas.zeroheight),
  dualFile: managed(sectionSchemas.dualFile),
  ai: managed(sectionSchemas.ai),
  mcp: managed(sectionSchemas.mcp),
  jira: managed(sectionSchemas.jira),
})

export const brandSchema = z.object({
  label: nonEmpty(),
  /** SHA-256 of the brand's access code (normalised: trimmed, upper-cased). `npm run access-code -- <code>` prints it. */
  accessCodeHash: z.string().check(z.regex(SHA256_HEX)),
  source: brandSourceSchema,
  fallbackTokens: z._default(z.record(z.string().check(z.regex(TOKEN_KEY)), nonEmpty()), {}),
  /** Tab order and visibility for this brand. Omitted: every enabled tab, in persona order. */
  tabs: z.optional(z.array(brandTabSchema)),
  /** Tabs per persona for this brand. A persona not listed keeps personas.<id>.tabs; an empty list drops it from this brand. */
  personas: z.optional(brandPersonasSchema),
  /** Settings sections this brand manages. Omitted: each person fills every section in the plugin. */
  integrations: z.optional(managedIntegrationsSchema),
})

export const personaSchema = z.object({
  label: nonEmpty(),
  /** Off keeps the persona in the file but out of the picker, Settings and every brand. */
  enabled: z._default(z.boolean(), true),
  tabs: z._default(z.array(id()), []),
})

export const tabSchema = z.object({
  enabled: z._default(z.boolean(), true),
  label: nonEmpty(),
  icon: z._default(z.string(), 'circle'),
})

export const pluginConfigSchema = z.object({
  $schema: z.optional(z.string()),
  name: z._default(nonEmpty(), 'Bluebird'),
  brand: z.object({
    active: id(),
    brands: z.record(id(), brandSchema),
  }),
  activePersona: id(),
  personas: z.record(id(), personaSchema),
  tabs: z.record(id(), tabSchema),
  window: z._default(
    z.object({
      width: z._default(z.int().check(z.gte(360), z.lte(760)), 480),
      height: z._default(z.int().check(z.gte(480), z.lte(960)), 640),
    }),
    { width: 480, height: 640 },
  ),
})

export type PluginConfig = z.infer<typeof pluginConfigSchema>
export type BrandConfig = z.infer<typeof brandSchema>
export type PersonaConfig = z.infer<typeof personaSchema>
export type TabConfig = z.infer<typeof tabSchema>
export type BrandTabConfig = z.infer<typeof brandTabSchema>
