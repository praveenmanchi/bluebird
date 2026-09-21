// zod/mini: tree-shakable functional API. The full `zod` import is ~440 KB
// minified and would dominate every bundle; mini costs a few KB.
import * as z from 'zod/mini'

const ID = /^[a-z0-9][a-z0-9-]*$/
const TOKEN_KEY = /^[a-z0-9-]+$/

const id = () => z.string().check(z.regex(ID))
const nonEmpty = () => z.string().check(z.minLength(1))

export const brandSourceSchema = z.object({
  collection: nonEmpty(),
  mode: nonEmpty(),
})

export const brandSchema = z.object({
  label: nonEmpty(),
  source: brandSourceSchema,
  fallbackTokens: z._default(z.record(z.string().check(z.regex(TOKEN_KEY)), nonEmpty()), {}),
})

export const personaSchema = z.object({
  label: nonEmpty(),
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
      width: z._default(z.int().check(z.gte(320), z.lte(760)), 400),
      height: z._default(z.int().check(z.gte(400), z.lte(960)), 580),
    }),
    { width: 400, height: 580 },
  ),
})

export type PluginConfig = z.infer<typeof pluginConfigSchema>
export type BrandConfig = z.infer<typeof brandSchema>
export type PersonaConfig = z.infer<typeof personaSchema>
export type TabConfig = z.infer<typeof tabSchema>
