import type { JSX } from 'preact'
import './VoiceWave.css'

export type VoiceWaveState = 'idle' | 'listening' | 'speaking'

/** Figma draws nine bars. */
export const VOICE_WAVE_BARS = 9

const LABEL: Record<VoiceWaveState, string> = {
  idle: 'Voice idle',
  listening: 'Listening',
  speaking: 'Agent speaking',
}

export interface VoiceWaveProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'state'> {
  /** Figma "State": Idle (flat dots) / Listening (user talking, agents/wave/active) / Speaking (agent talking, agents/wave/speaking). */
  state?: VoiceWaveState
  /** Live audio levels, 0–1 per bar (first nine are used). Replaces the Figma heights and the idle loop
   *  animation, so the bars follow the microphone or the agent's voice. */
  levels?: readonly number[]
}

const clamp = (n: number) => Math.min(1, Math.max(0, n))

/** Figma "Voice Wave" (40000295:8509): a nine-bar voice level meter. */
export function VoiceWave({ state = 'idle', levels, class: cls, ...rest }: VoiceWaveProps) {
  const live = levels !== undefined && state !== 'idle'
  return (
    <span
      role="img"
      aria-label={LABEL[state]}
      {...rest}
      class={`bb-voice-wave ${cls ?? ''}`}
      data-state={state}
      data-live={live || undefined}
    >
      {Array.from({ length: VOICE_WAVE_BARS }, (_, i) => (
        <span
          key={i}
          class="bb-voice-wave__bar"
          style={live ? { height: `${Math.round(clamp(levels[i] ?? 0) * 100)}%` } : undefined}
        />
      ))}
    </span>
  )
}
