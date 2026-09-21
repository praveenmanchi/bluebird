import { Banner as BrandBanner } from '@shared/ui'
import { config, personas } from '@shared/config'
import { activePersona, brandStatus, connection, selectPersona } from './state'

/** Shell header: the Figma "Banner" organism plus a slim bar for status and persona. */
export function Banner() {
  const brand = brandStatus.value
  const status = connection.value
  const showSubBar = brand?.source === 'fallback' || status !== 'connected' || personas.length > 1
  return (
    <div>
      <BrandBanner title={config.name} />
      {showSubBar && (
        <div class="bb-app-subbar" role="status">
          <span class="bb-app-subbar__note truncate">
            {brand?.source === 'fallback' ? (brand.note ?? 'Using generated brand tokens.') : status !== 'connected' ? (status === 'connecting' ? 'connecting…' : 'disconnected') : (brand ? config.brand.brands[brand.brandId]?.label : '')}
          </span>
          {personas.length > 1 && (
            <select
              aria-label="Persona"
              value={activePersona.value?.id}
              onChange={(e) => selectPersona((e.target as HTMLSelectElement).value)}
              class="bb-app-subbar__select"
            >
              {personas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
