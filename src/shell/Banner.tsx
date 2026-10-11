import { Banner as BrandBanner } from '@shared/ui'
import { config } from '@shared/config'
import { brandStatus, connection } from './state'

/**
 * Shell header: the Figma "Banner" organism plus a slim status bar that only
 * appears when something needs attention (generated tokens, or the bridge is
 * not connected). The persona switch lives in Settings.
 */
export function Banner() {
  const brand = brandStatus.value
  const status = connection.value
  const fallback = brand?.source === 'fallback'
  const note = fallback
    ? (brand.note ?? 'Using generated brand tokens.')
    : status === 'connecting' ? 'connecting…' : status !== 'connected' ? 'disconnected' : null
  return (
    <div>
      <BrandBanner title={config.name} />
      {note !== null && (
        <div class="bb-app-subbar" role="status">
          <span class="bb-app-subbar__note truncate">{note}</span>
        </div>
      )}
    </div>
  )
}
