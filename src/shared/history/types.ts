// One entry in the team History: something a person did with the plugin
// (an extraction, a report, a Code Connect template, an MCP push, a UX AI
// answer). Entries live in the GitHub repository from Settings › GitHub, so
// everyone on the team reads the same list. They come back from GitHub, so
// every read is validated against this schema.
import * as z from 'zod/mini'

export const HISTORY_TYPES = ['extraction', 'changelog', 'report', 'code-connect', 'mcp', 'ux-ai'] as const
export type HistoryType = typeof HISTORY_TYPES[number]

const text = (max: number) => z.string().check(z.maxLength(max))
const opt = (max: number) => z.optional(text(max))

const changeRow = z.object({
  name: text(200),
  valueKind: z.enum(['color', 'number', 'text']),
  old: opt(120),
  new: opt(120),
  /** Which brands it changed in, e.g. "Bridge, Ikea" or "All brands". */
  scope: opt(120),
  /** One line under the row, e.g. "Used by Button, Date picker". */
  note: opt(300),
  breaking: z.optional(z.boolean()),
})

const section = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('changes'),
    title: text(80),
    /** What a row is, for the count beside each group ("3 components"); absent = variable. */
    unit: z.optional(z.enum(['variable', 'component'])),
    groups: z.array(z.object({ change: z.enum(['added', 'modified', 'removed']), rows: z.array(changeRow).check(z.maxLength(500)) })).check(z.maxLength(3)),
  }),
  z.object({
    kind: z.literal('items'),
    title: text(80),
    hint: opt(300),
    rows: z.array(z.object({ title: text(200), detail: text(300), status: z.enum(['pass', 'warning', 'fail']) })).check(z.maxLength(500)),
  }),
  z.object({ kind: z.literal('code'), title: text(80), language: text(40), code: text(20_000) }),
  z.object({
    kind: z.literal('messages'),
    title: text(80),
    rows: z.array(z.object({ role: z.enum(['user', 'assistant']), text: text(4000) })).check(z.maxLength(100)),
  }),
])

export const historyEntrySchema = z.object({
  schema: z.literal(1),
  id: z.string().check(z.regex(/^[A-Za-z0-9_-]{6,64}$/)),
  type: z.enum(HISTORY_TYPES),
  /** `review`: a changelog waiting for a teammate to approve it. */
  status: z.enum(['done', 'failed', 'review']),
  /** The card title, e.g. "Button refresh". */
  title: text(160),
  /** The action line, e.g. "Extraction pushed to develop · PR #74 · Project Bluebird UI". */
  summary: text(300),
  at: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}T/)),
  by: z.object({ name: text(120), team: opt(80) }),
  /** The Figma file it happened in. */
  file: text(200),
  /** Jira key, e.g. BB-342. */
  ticket: z.optional(z.string().check(z.regex(/^[A-Z][A-Z0-9]{1,9}-\d{1,7}$/))),
  /** Card footer: what changed in variables / components. */
  variables: opt(160),
  components: opt(160),
  /** Who approved a changelog, and when. */
  review: z.optional(z.object({ by: text(120), at: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}T/)) })),
  /** Where it landed: a pull request, commit or report. https only. */
  link: z.optional(z.object({ url: z.string().check(z.regex(/^https:\/\/\S+$/), z.maxLength(2048)), label: text(80) })),
  details: z.optional(z.object({
    description: opt(2000),
    facts: z.optional(z.array(z.object({ label: text(60), value: text(300) })).check(z.maxLength(12))),
    stats: z.optional(z.array(z.object({ value: text(20), label: text(60) })).check(z.maxLength(6))),
    notice: z.optional(z.object({ tone: z.enum(['info', 'error']), title: text(120), body: text(600) })),
    sections: z.optional(z.array(section).check(z.maxLength(12))),
    activity: z.optional(z.array(z.object({ title: text(160), detail: text(300), time: text(20) })).check(z.maxLength(30))),
  })),
})

export type HistoryEntry = z.infer<typeof historyEntrySchema>
export type HistorySection = NonNullable<NonNullable<HistoryEntry['details']>['sections']>[number]
