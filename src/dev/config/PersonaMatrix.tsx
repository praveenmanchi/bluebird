import { Checkbox, Icon, ICONS, type IconName } from '@shared/ui'
import { personaTabIds, resolvePersonas, type BrandTabConfig, type BrandTabRow, type PluginConfig } from '@shared/config'

export interface PersonaMatrixProps {
  /** The config with this brand's draft applied. */
  config: PluginConfig
  brandId: string
  /** The brand's tabs in its current order. */
  rows: readonly BrandTabConfig[]
  /** Label, icon and availability per tab id. */
  info: ReadonlyMap<string, BrandTabRow>
  onToggle: (personaId: string, tabId: string, on: boolean) => void
}

const iconFor = (name: string): IconName => (name in ICONS ? name as IconName : 'variables')

/** Features down the side, personas across the top: a tick gives that persona the feature in this brand. Personas turned off in the config don't appear. */
export function PersonaMatrix({ config, brandId, rows, info, onToggle }: PersonaMatrixProps) {
  const personas = Object.entries(config.personas).filter(([, persona]) => persona.enabled)
  const shown = new Map(resolvePersonas(config, brandId).map((persona) => [persona.id, persona.tabs.length]))

  return (
    <div class="cfg-matrix">
      <table class="cfg-matrix__table" aria-label="Features per persona">
        <thead>
          <tr>
            <th scope="col">Feature</th>
            {personas.map(([id, persona]) => {
              const count = shown.get(id) ?? 0
              return (
                <th key={id} scope="col" class="cfg-matrix__persona">
                  <span class="cfg-matrix__name">{persona.label}</span>
                  <span class="cfg-matrix__count">
                    {count === 0 && <span class="dh-dot" data-tone="warn" aria-hidden="true" />}
                    {count === 0 ? 'Not offered' : `${count} feature${count === 1 ? '' : 's'}`}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const tab = info.get(row.id)
            const label = tab?.label ?? row.id
            const unavailable = tab?.available === false
            const off = !row.enabled || unavailable
            return (
              <tr key={row.id} class="cfg-matrix__row" data-off={off || undefined}>
                <th scope="row">
                  <span class="cfg-matrix__feature">
                    <span class="cfg-tabs__icon"><Icon name={iconFor(tab?.icon ?? '')} size="sm" /></span>
                    <span class="cfg-matrix__label">{label}</span>
                    {off && <span class="dh-chip">{unavailable ? 'Off for every brand' : 'Hidden'}</span>}
                  </span>
                </th>
                {personas.map(([id, persona]) => (
                  <td key={id} class="cfg-matrix__cell">
                    <Checkbox aria-label={`${label} for ${persona.label}`} checked={personaTabIds(config, id, brandId).includes(row.id)} disabled={off} onChange={(on) => onToggle(id, row.id, on)} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
