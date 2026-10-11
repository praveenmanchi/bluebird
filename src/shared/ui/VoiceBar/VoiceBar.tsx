import type { ComponentChildren, JSX } from 'preact'
import { VoiceWave, type VoiceWaveState } from '../VoiceWave/VoiceWave'
import './VoiceBar.css'

export type VoiceBarState = VoiceWaveState

/** Figma default copy per State. */
const COPY: Record<VoiceBarState, { transcript: string; caption: string }> = {
  idle: { transcript: 'Hold the mic to talk to the agent, or type a request…', caption: 'Voice or text' },
  listening: { transcript: '“Check only the checkout frames and fix contrast in Ikea”', caption: 'Listening… release to send' },
  speaking: { transcript: '“I found 6 contrast issues in 3 frames. Should I fix the 4 safe ones?”', caption: 'Accessibility agent is speaking' },
}

export interface VoiceBarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'state' | 'onToggle'> {
  /** Figma "State": Idle / Listening (Beam border, red mic) / Speaking (agent reply plays with the wave). */
  state?: VoiceBarState
  /** Figma "Transcript" text layer — the prompt, what the user said, or what the agent says. */
  transcript?: ComponentChildren
  /** Figma "Caption" text layer. */
  caption?: ComponentChildren
  /** Live audio levels passed to the nested Voice Wave (0–1 per bar). */
  levels?: readonly number[]
  /** Accessible name of the mic button. */
  micLabel?: string
  /** Mic pressed: start listening when idle, send when listening, interrupt when speaking. */
  onToggle?: () => void
}

/** Figma "Voice Bar" (40000296:8535): talk to an agent — mic, live transcript and the Voice Wave. */
export function VoiceBar({ state = 'idle', transcript, caption, levels, micLabel = 'Microphone', onToggle, class: cls, ...rest }: VoiceBarProps) {
  const copy = COPY[state]
  return (
    <div {...rest} class={`bb-voice-bar ${cls ?? ''}`} data-state={state}>
      <button type="button" class="bb-voice-bar__mic" aria-label={micLabel} aria-pressed={state === 'listening'} onClick={onToggle}>
        <MicGlyph />
      </button>
      <div class="bb-voice-bar__text" aria-live="polite">
        <p class="bb-voice-bar__transcript">{transcript ?? copy.transcript}</p>
        <p class="bb-voice-bar__caption">{caption ?? copy.caption}</p>
      </div>
      <VoiceWave state={state} levels={levels} class="bb-voice-bar__wave" />
    </div>
  )
}

/** Figma "Mic glyph" (20 × 20 frame, one stroked vector) — not a Tab Icons instance, so drawn here. */
function MicGlyph() {
  return (
    <svg class="bb-voice-bar__glyph" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 10C5 11.3261 5.52678 12.5979 6.46447 13.5355C7.40215 14.4732 8.67392 15 10 15M10 15C11.3261 15 12.5979 14.4732 13.5355 13.5355C14.4732 12.5979 15 11.3261 15 10M10 15V17.5M10 2.5C9.20435 2.5 8.44129 2.81607 7.87868 3.37868C7.31607 3.94129 7 4.70435 7 5.5V10C7 10.7956 7.31607 11.5587 7.87868 12.1213C8.44129 12.6839 9.20435 13 10 13C10.7956 13 11.5587 12.6839 12.1213 12.1213C12.6839 11.5587 13 10.7956 13 10V5.5C13 4.70435 12.6839 3.94129 12.1213 3.37868C11.5587 2.81607 10.7956 2.5 10 2.5Z" />
    </svg>
  )
}
