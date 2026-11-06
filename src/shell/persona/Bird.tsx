// The flock: one round bird, dressed per persona. Pure SVG so it re-skins with the brand
// (Bird.css colours every part from tokens) and costs a few hundred bytes per character.
// Everything to the right of the body (x > 84) is the persona's prop; it plays when selected.
import type { ComponentChildren } from 'preact'
import './Bird.css'

export type BirdKind = 'design-system' | 'ui-designer' | 'ux-designer' | 'content' | 'developer' | 'plain'

const GEAR: Readonly<Record<BirdKind, ComponentChildren>> = {
  // Hard hat + a stack of token blocks.
  'design-system': (
    <>
      <path class="bb-bird__gear" d="M23 33c0-16 12-24 27-24s27 8 27 24z" />
      <rect class="bb-bird__gear" x="17" y="31" width="66" height="7" rx="3.5" />
      <rect class="bb-bird__gear-alt" x="45" y="6" width="10" height="15" rx="4" />
      <g class="bb-bird__prop">
        <rect class="bb-bird__block" x="88" y="85" width="22" height="14" rx="3" />
        <rect class="bb-bird__block bb-bird__block--2" x="90" y="70" width="18" height="14" rx="3" />
        <rect class="bb-bird__block bb-bird__block--3" x="92" y="56" width="14" height="13" rx="3" />
      </g>
    </>
  ),
  // Beret + a vector curve being drawn with a pen.
  'ui-designer': (
    <>
      <path class="bb-bird__gear" d="M20 33c-3-13 14-22 31-21s29 10 25 20c-13-7-41-6-56 1z" />
      <circle class="bb-bird__gear" cx="50" cy="10" r="3.5" />
      <g class="bb-bird__prop">
        <path class="bb-bird__line bb-bird__curve" pathLength={1} d="M88 80C86 52 110 58 106 24" />
        <rect class="bb-bird__node" x="85" y="77" width="6" height="6" rx="1" />
        <path class="bb-bird__gear-alt" d="M100 8l11 3-1 11-5 4-5-5z" />
      </g>
    </>
  ),
  // Round glasses + a magnifier that sweeps.
  'ux-designer': (
    <>
      <g class="bb-bird__glasses">
        <circle cx="37" cy="50" r="12" />
        <circle cx="63" cy="50" r="12" />
        <path d="M49 49h2M25 47l-6-3M75 47l6-3" />
      </g>
      <g class="bb-bird__prop">
        <path class="bb-bird__line bb-bird__line--thick" d="M92 73 84 86" />
        <circle class="bb-bird__lens" cx="98" cy="62" r="12" />
      </g>
    </>
  ),
  // A quill behind the head + a speech bubble that writes itself.
  content: (
    <>
      <path class="bb-bird__gear-alt" d="M35 29C30 12 18 2 4-2c1 14 8 27 24 34z" />
      <path class="bb-bird__line" d="M32 30 10 4" />
      <g class="bb-bird__prop">
        <path class="bb-bird__bubble" d="M90 28h16a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H96l-8 7 1-7a6 6 0 0 1-5-6V34a6 6 0 0 1 6-6z" />
        <path class="bb-bird__text" pathLength={1} d="M91 37h14M91 45h9" />
      </g>
    </>
  ),
  // Headphones + a terminal with a blinking cursor.
  developer: (
    <>
      <path class="bb-bird__line bb-bird__line--thick" d="M19 50C17 24 33 13 50 13s33 11 31 37" />
      <rect class="bb-bird__gear" x="12" y="44" width="13" height="22" rx="6" />
      <rect class="bb-bird__gear" x="75" y="44" width="13" height="22" rx="6" />
      <g class="bb-bird__prop">
        <rect class="bb-bird__screen" x="86" y="64" width="26" height="22" rx="4" />
        <path class="bb-bird__prompt" d="M91 71l4 4-4 4" />
        <path class="bb-bird__cursor" d="M98 80h7" />
      </g>
    </>
  ),
  plain: null,
}

export interface BirdProps {
  kind?: BirdKind
  class?: string
}

export function Bird({ kind = 'plain', class: cls }: BirdProps) {
  return (
    <svg class={`bb-bird bb-bird--${kind}${cls ? ` ${cls}` : ''}`} viewBox="-12 -12 126 122" aria-hidden="true">
      <path class="bb-bird__feet" d="M41 94v7m-5 1 5-2 5 2M59 94v7m-5 1 5-2 5 2" />
      <path class="bb-bird__wing bb-bird__wing--left" d="M24 54C13 60 9 76 14 88c8-3 15-12 16-23z" />
      <path class="bb-bird__wing bb-bird__wing--right" d="M76 54c11 6 15 22 10 34-8-3-15-12-16-23z" />
      <path class="bb-bird__crest" d="M49 28c-5-7-4-13-1-17 1 4 3 6 8 6-1 5-3 8-7 11z" />
      <ellipse class="bb-bird__body" cx="50" cy="61" rx="31" ry="36" />
      <ellipse class="bb-bird__belly" cx="50" cy="73" rx="20" ry="22" />
      <g class="bb-bird__eyes">
        <circle class="bb-bird__eye" cx="37" cy="50" r="9" />
        <circle class="bb-bird__eye" cx="63" cy="50" r="9" />
        <g class="bb-bird__pupils">
          <circle cx="37" cy="51" r="4.5" />
          <circle cx="63" cy="51" r="4.5" />
        </g>
      </g>
      <path class="bb-bird__beak" d="M42 59l8-3 8 3-8 10z" />
      {GEAR[kind]}
    </svg>
  )
}
