// What each bird says on the persona screen. Labels and tabs come from plugin.config.json;
// a persona added there without copy here still shows, as the plain bird with the fallback line.
import type { BirdKind } from './Bird'

export interface PersonaCopy {
  kind: BirdKind
  /** The bird's one-liner, shown in its speech bubble. */
  quip: string
  /** What this persona gets. */
  blurb: string
}

const COPY: Readonly<Record<string, PersonaCopy>> = {
  'design-system': {
    kind: 'design-system',
    quip: 'Tokens or it didn’t happen.',
    blurb: 'Keep variables, components and releases in shape across every brand.',
  },
  'ui-designer': {
    kind: 'ui-designer',
    quip: 'One more pixel to the left.',
    blurb: 'Design screens on the system, check them, follow your tickets and hand them off clean.',
  },
  // Turned off in plugin.config.json for now: UI/UX Designer covers it.
  'ux-designer': {
    kind: 'ux-designer',
    quip: 'But what does the user need?',
    blurb: 'Check accessibility, follow your tickets and test ideas with AI.',
  },
  content: {
    kind: 'content',
    quip: 'Let’s lose a few words.',
    blurb: 'Review copy, spelling and localisation without leaving Figma.',
  },
  developer: {
    kind: 'developer',
    quip: 'Ship it. Then ship it again.',
    blurb: 'Read the tokens and turn ready screens into a pull request.',
  },
}

const FALLBACK: PersonaCopy = { kind: 'plain', quip: 'Hello there!', blurb: 'These are the tabs set up for this role.' }

export const personaCopy = (id: string): PersonaCopy => COPY[id] ?? FALLBACK
