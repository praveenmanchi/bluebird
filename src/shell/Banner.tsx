import { Banner as BrandBanner } from '@shared/ui'
import { config } from '@shared/config'
import { connection } from './state'

/**
 * Shell header: the Figma "Banner" organism plus a slim status bar that only
 * appears while the live-mode bridge is connecting or disconnected (never in the
 * published plugin, which talks to Figma over postMessage). Brand-token notes are
 * not shown here: the generated tokens are the brand, and Settings names the token
 * source and any fault. The persona switch lives in Settings.
 */
export function Banner() {
  const status = connection.value
  const note = status === 'connecting' ? 'connecting…' : status !== 'connected' ? 'disconnected' : null
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
