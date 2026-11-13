// Atlassian Document Format (Jira Cloud's rich text) ⇄ plain text. The board
// shows descriptions and comments as plain paragraphs, so only text, breaks,
// mentions, emoji, inline cards and block boundaries matter.

export interface AdfNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  content?: AdfNode[]
}

const BLOCKS = new Set(['paragraph', 'heading', 'blockquote', 'codeBlock', 'listItem', 'panel', 'rule', 'mediaSingle', 'table', 'tableRow'])

function inline(node: AdfNode): string {
  switch (node.type) {
    case 'text': return node.text ?? ''
    case 'hardBreak': return '\n'
    case 'mention': return String(node.attrs?.text ?? '@someone')
    case 'emoji': return String(node.attrs?.text ?? node.attrs?.shortName ?? '')
    case 'inlineCard': return String(node.attrs?.url ?? '')
    case 'date': return node.attrs?.timestamp ? new Date(Number(node.attrs.timestamp)).toISOString().slice(0, 10) : ''
    default: return (node.content ?? []).map(walk).join('')
  }
}

function walk(node: AdfNode): string {
  const text = inline(node)
  return node.type && BLOCKS.has(node.type) ? `${text}\n` : text
}

/** Plain text of an ADF document (or of a Server/DC plain string). Blank lines collapse to one. */
export function adfToText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (!value || typeof value !== 'object') return ''
  return walk(value as AdfNode).replace(/\n{3,}/g, '\n\n').trim()
}

export interface AdfDoc { version: 1; type: 'doc'; content: AdfNode[] }

export interface AdfText extends AdfNode { marks?: { type: 'link'; attrs: { href: string } }[] }

const URL_PART = /(https:\/\/[^\s<>"]+)/

/** One line as text nodes; https links become clickable (link mark). */
function lineNodes(line: string): AdfText[] {
  return line.split(URL_PART).filter(Boolean).map((part) => URL_PART.test(part)
    ? { type: 'text', text: part, marks: [{ type: 'link', attrs: { href: part } }] }
    : { type: 'text', text: part })
}

/** An ADF document for comment bodies (Jira Cloud): blank lines split paragraphs, single newlines become hard breaks. */
export function textToAdf(text: string): AdfDoc {
  const paragraphs = text.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/)
  return {
    version: 1,
    type: 'doc',
    content: paragraphs.map((p) => ({
      type: 'paragraph',
      content: p.split('\n').flatMap((line, i): AdfNode[] => [
        ...(i === 0 ? [] : [{ type: 'hardBreak' }]),
        ...lineNodes(line),
      ]),
    })),
  }
}
