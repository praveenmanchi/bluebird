import type { ComponentChildren, JSX } from 'preact'
import { Button } from '../Button/Button'
import { Tab } from '../Tab/Tab'
import type { IconName } from '../Icon/Icon'
import './PersonaCard.css'

/** Figma "Team Description" default. */
export const PERSONA_CARD_DESCRIPTION =
  'Your persona sets which tabs you see. Change it any time and the tour replays for your new tabs.'

export interface PersonaCardTab {
  /** Tab "Label" (read as the compact tab's accessible name). */
  label: string
  /** Tab "Icon" instance swap. */
  icon?: IconName
}

/** The five Variant3 Tab instances in the Figma component, in order. */
export const PERSONA_CARD_TABS: readonly PersonaCardTab[] = [
  { label: 'Variable Search', icon: 'variables' },
  { label: 'UXAI as assister', icon: 'uxai' },
  { label: 'Documentation', icon: 'documentation' },
  { label: 'Inspect', icon: 'inspect' },
  { label: 'MCP', icon: 'settings' },
]

export interface PersonaCardProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'name'> {
  /** Figma "Team Name". */
  name: ComponentChildren
  /** Figma "Team Description" (the 10px line under the name). */
  description?: ComponentChildren
  /** The 11px note next to the action button (Figma reuses the Team Description text there). */
  footnote?: ComponentChildren
  /** The persona illustration src (Figma instance "Delivery boy" = Userpic 05, figma/assets/persona-userpic-05.png). The plugin passes `media` instead, so the picture stays out of its bundle. */
  image?: string
  /** Alt text for the illustration; empty by default because the name is right beside it. */
  imageAlt?: string
  /** Replaces the illustration with something live, such as the persona's animated bird. */
  media?: ComponentChildren
  /** The compact Tab instances shown under the description (the tools this persona sees). */
  tabs?: readonly PersonaCardTab[]
  /** Click handler of the "variable button" instance. */
  onOpen?: JSX.MouseEventHandler<HTMLButtonElement>
  /** Label of the "variable button" instance (Figma "Button Label"). */
  actionLabel?: ComponentChildren
}

/**
 * Figma "Frame 1430102664" (264:10472) — a persona / team card: illustration,
 * team name + description, the compact tool tabs, and a footer with a note
 * and the primary action.
 */
export function PersonaCard({
  name,
  description = PERSONA_CARD_DESCRIPTION,
  footnote = PERSONA_CARD_DESCRIPTION,
  image,
  imageAlt = '',
  media,
  tabs = PERSONA_CARD_TABS,
  onOpen,
  actionLabel = 'Change the persona',
  class: cls,
  ...rest
}: PersonaCardProps) {
  return (
    <article {...rest} class={`bb-persona-card ${cls ?? ''}`}>
      <div class="bb-persona-card__body">
        {media ?? (image && <img class="bb-persona-card__image" src={image} alt={imageAlt} width={100} height={106} />)}
        <div class="bb-persona-card__content">
          <div class="bb-persona-card__heading">
            <h3 class="bb-persona-card__name">{name}</h3>
            {description !== undefined && <p class="bb-persona-card__description">{description}</p>}
          </div>
          {tabs.length > 0 && (
            <div class="bb-persona-card__tabs" role="tablist" aria-label="Tools">
              {tabs.map((tab) => (
                <Tab key={tab.label} variant="variant3" icon={tab.icon}>{tab.label}</Tab>
              ))}
            </div>
          )}
        </div>
      </div>
      <footer class="bb-persona-card__footer">
        {footnote !== undefined && <p class="bb-persona-card__footnote">{footnote}</p>}
        <Button variant="primary" class="bb-persona-card__action" onClick={onOpen}>{actionLabel}</Button>
      </footer>
    </article>
  )
}
