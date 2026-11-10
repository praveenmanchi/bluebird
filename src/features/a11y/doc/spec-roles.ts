// What a developer needs to know about each kind of control, keyed by the role
// Bluebird infers from the component and layer names. Pure lookup tables.
import type { Platform } from '../target'

export type ControlRole =
  | 'button' | 'combobox' | 'menubutton' | 'tab' | 'radiogroup' | 'checkbox' | 'radio'
  | 'switch' | 'textbox' | 'searchbox' | 'link' | 'disclosure' | 'slider'

export interface RoleInfo {
  /** Plain words: "button that opens a listbox". */
  role: string
  /** The ARIA or element a web developer reaches for. */
  aria: string
  keyboard: string
  /** The states the component should draw. Focus is always one of them. */
  states: readonly string[]
}

export const ROLE_INFO: Readonly<Record<ControlRole, RoleInfo>> = {
  button: { role: 'button', aria: '<button>', keyboard: 'Enter or Space', states: ['Default', 'Hover', 'Focus', 'Disabled'] },
  combobox: { role: 'button that opens a listbox', aria: 'aria-haspopup="listbox", aria-expanded', keyboard: 'Enter, Space or ↓ opens · ↑ ↓ move · Esc closes', states: ['Default', 'Open', 'Focus', 'Disabled'] },
  menubutton: { role: 'menu button', aria: 'aria-haspopup="menu", aria-expanded', keyboard: 'Enter, Space or ↓ opens · Esc closes, focus returns', states: ['Default', 'Open', 'Focus'] },
  tab: { role: 'tab in a tablist', aria: 'role="tab", aria-selected', keyboard: '← → move between tabs', states: ['Default', 'Selected', 'Focus'] },
  radiogroup: { role: 'radio group', aria: 'role="radiogroup"', keyboard: '← → move and select · Tab leaves', states: ['Default', 'Selected', 'Focus'] },
  checkbox: { role: 'checkbox', aria: '<input type="checkbox">', keyboard: 'Space toggles', states: ['Unchecked', 'Checked', 'Focus', 'Disabled'] },
  radio: { role: 'radio button', aria: '<input type="radio">', keyboard: '← → move and select', states: ['Unselected', 'Selected', 'Focus', 'Disabled'] },
  switch: { role: 'switch', aria: 'role="switch", aria-checked', keyboard: 'Space toggles', states: ['Off', 'On', 'Focus', 'Disabled'] },
  textbox: { role: 'text field', aria: '<input> with a visible <label>', keyboard: 'Type · Tab moves on', states: ['Default', 'Focus', 'Error', 'Disabled'] },
  searchbox: { role: 'search field', aria: '<input type="search"> with a label', keyboard: 'Type · Enter searches · Esc clears', states: ['Default', 'Focus', 'Disabled'] },
  link: { role: 'link', aria: '<a href>', keyboard: 'Enter', states: ['Default', 'Hover', 'Focus', 'Visited'] },
  disclosure: { role: 'button that shows and hides content', aria: 'aria-expanded, aria-controls', keyboard: 'Enter or Space', states: ['Collapsed', 'Expanded', 'Focus'] },
  slider: { role: 'slider', aria: 'role="slider", aria-valuenow', keyboard: '← → change the value · Home / End jump', states: ['Default', 'Focus', 'Disabled'] },
}

// Order matters: the first match wins, so specific words come before "button".
const PATTERNS: readonly (readonly [RegExp, ControlRole])[] = [
  [/(dropdown|select|combo ?box|picker|filter ?select)/, 'combobox'],
  [/(segmented|segment|tab ?sub ?menu|toggle ?group|button ?group)/, 'radiogroup'],
  [/(^|[^a-z])tabs?([^a-z]|$)/, 'tab'],
  [/(overflow|kebab|more ?menu|menu ?button|export ?menu)/, 'menubutton'],
  [/(disclosure|accordion|expander|show ?details|collapse)/, 'disclosure'],
  [/check ?box/, 'checkbox'],
  [/(^|[^a-z])radio([^a-z]|$)/, 'radio'],
  [/(switch|toggle)/, 'switch'],
  [/search/, 'searchbox'],
  [/(input|text ?field|textarea|text ?area|field)/, 'textbox'],
  [/slider/, 'slider'],
  [/(^|[^a-z])link([^a-z]|$)/, 'link'],
  [/(button|btn|cta|icon ?button|close|dismiss|settings)/, 'button'],
]

/**
 * The role a control most likely has, from its component and layer names. A layer with a
 * prototype interaction and no telling name is a button: something happens when you press it.
 */
export function roleFor(names: readonly string[], hasReaction: boolean): ControlRole | null {
  const text = names.join(' ').toLowerCase()
  for (const [pattern, role] of PATTERNS) if (pattern.test(text)) return role
  return hasReaction ? 'button' : null
}

/** Layer names Figma or a designer gives without meaning; never used as an accessible name. */
const GENERIC = /^(frame|group|rectangle|vector|icon|instance|component|button|btn|layer|ellipse|union|container|wrapper|content|state=.*|property \d.*|.*=.*)(\s*\d+)?$/i

/** "close-button" → "Close button"; null when the name carries no meaning. */
export function humanName(name: string): string | null {
  const cleaned = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned || GENERIC.test(cleaned)) return null
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export interface ImplementationNote { title: string; body: string; code: string }

const FOCUS_NOTE: Readonly<Record<Platform, ImplementationNote>> = {
  web: { title: 'Focus ring', body: 'Every focusable element shows a 2px ring with a 2px gap. It must reach 3:1 against what it sits on (2.4.7, 1.4.11).', code: ':focus-visible {\n  outline: 2px solid var(--focus-ring);\n  outline-offset: 2px;\n}' },
  ios: { title: 'Focus', body: 'Keep the system focus effect for Full Keyboard Access and Switch Control; do not hide it (2.4.7).', code: 'Button("Settings") { … }\n  .focusable()\n  .accessibilityLabel("Settings")' },
  android: { title: 'Focus', body: 'Give every control a visible focused state for keyboard and switch users (2.4.7).', code: 'Modifier\n  .focusable()\n  .border(2.dp, if (focused) focusColor else Color.Transparent)' },
}

const ICON_NOTE: Readonly<Record<Platform, ImplementationNote>> = {
  web: { title: 'Icon-only buttons', body: 'Name the button and hide the icon from screen readers, so it is read once (4.1.2, 1.1.1).', code: '<button aria-label="Settings">\n  <svg aria-hidden="true">…</svg>\n</button>' },
  ios: { title: 'Icon-only buttons', body: 'Give the button a label; VoiceOver reads it instead of the image name (4.1.2).', code: 'Button(action: open) {\n  Image(systemName: "gearshape")\n}\n.accessibilityLabel("Settings")' },
  android: { title: 'Icon-only buttons', body: 'Set a content description on the icon button (4.1.2).', code: 'IconButton(onClick = open) {\n  Icon(Icons.Default.Settings,\n       contentDescription = "Settings")\n}' },
}

const ROLE_NOTES: readonly (readonly [readonly ControlRole[], ImplementationNote])[] = [
  [['combobox', 'menubutton'], { title: 'Menus and dropdowns', body: 'Enter, Space or ↓ opens the list. Esc closes it and returns focus to the trigger (2.1.1, 2.4.3).', code: '<button aria-haspopup="listbox"\n        aria-expanded="false">Platform: Web</button>\n<ul role="listbox">\n  <li role="option" aria-selected="true">Web</li>…\n</ul>' }],
  [['tab'], { title: 'Tabs', body: 'Arrow keys move between tabs; Tab moves into the panel. Only the selected tab is in the Tab order (2.1.1).', code: '<div role="tablist">\n  <button role="tab" aria-selected="true"\n          aria-controls="panel-1">Results</button>\n</div>' }],
  [['radiogroup'], { title: 'Segmented controls', body: 'One choice at a time: a radio group. Arrow keys move and select (2.1.1, 4.1.2).', code: '<div role="radiogroup" aria-label="Filter">\n  <button role="radio" aria-checked="true">All</button>…\n</div>' }],
  [['textbox', 'searchbox', 'checkbox', 'radio', 'switch'], { title: 'Form fields', body: 'Every field has a visible label tied to it; errors are announced and say how to fix them (3.3.1, 3.3.2).', code: '<label for="email">Email</label>\n<input id="email" aria-describedby="email-error">\n<p id="email-error">Enter an email like name@example.com</p>' }],
  [['disclosure'], { title: 'Show and hide', body: 'The toggle says whether its content is open, and points at it (4.1.2).', code: '<button aria-expanded="false"\n        aria-controls="details">Show details</button>\n<div id="details" hidden>…</div>' }],
]

/** The notes for the roles on this screen: focus always, the rest only when present. */
export function notesFor(roles: ReadonlySet<ControlRole>, iconOnly: boolean, platform: Platform): ImplementationNote[] {
  const notes = [FOCUS_NOTE[platform]]
  if (iconOnly) notes.push(ICON_NOTE[platform])
  for (const [match, note] of ROLE_NOTES) if (match.some((r) => roles.has(r))) notes.push(note)
  notes.push({ title: 'Status messages', body: 'Announce text that changes on its own (progress, results, errors) without moving focus (4.1.3).', code: '<p role="status" aria-live="polite">\n  Saved\n</p>' })
  return notes
}

export type Landmark = 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo' | 'search'

const LANDMARKS: readonly (readonly [RegExp, Landmark])[] = [
  [/(footer|status ?bar|bottom ?bar)/, 'contentinfo'],
  [/(navbar|nav ?bar|navigation|side ?bar|sidebar|tab ?bar|menu ?bar|breadcrumb)/, 'navigation'],
  [/(header|banner|top ?bar|app ?bar|masthead)/, 'banner'],
  [/search/, 'search'],
  [/(aside|side ?panel|drawer)/, 'complementary'],
  [/(^|[^a-z])(main|content|body)([^a-z]|$)/, 'main'],
]

/** The landmark a region's name suggests: "Site header" is a banner, "Footer" is contentinfo. */
export function landmarkFor(name: string): Landmark | null {
  const text = name.toLowerCase()
  for (const [pattern, role] of LANDMARKS) if (pattern.test(text)) return role
  return null
}

/** Text this size or larger, or set in a heading/title style, is treated as a heading. */
export const HEADING_MIN_SIZE = 18
const HEADING_STYLE = /(heading|title|display|h[1-6]\b)/i

/** Big numbers and symbols ("67%", "1.4.3", "Aa") are display text, not headings: a heading has words. */
const WORDS = /[a-z]{3,}/i

export function looksLikeHeading(fontSize: number, styleName: string | undefined, text: string): boolean {
  if (!WORDS.test(text)) return false
  return fontSize >= HEADING_MIN_SIZE || (styleName !== undefined && HEADING_STYLE.test(styleName))
}

/** Biggest text is H1, the next size H2, everything smaller H3. */
export function headingLevels(sizes: readonly number[]): (1 | 2 | 3)[] {
  const ranked = [...new Set(sizes)].sort((a, b) => b - a)
  return sizes.map((s) => Math.min(3, ranked.indexOf(s) + 1) as 1 | 2 | 3)
}
