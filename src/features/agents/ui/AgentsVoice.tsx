import { useState } from 'preact/hooks'
import { AgentHeader, Button, Input, Message, PromptChip, ThinkingStep, VoiceBar, VoiceWave, type IconName } from '@shared/ui'
import { agentById, type AgentDef } from '../agents'
import { VOICE_COPY } from '../fixtures'
import type { ChatTurn, VoicePhase } from '../state'
import { BackLink } from './parts'
import './AgentsVoice.css'

export interface AgentsVoiceProps {
  agent?: AgentDef
  /** The Voice Bar state (Listening on the Figma screen). */
  phase?: VoicePhase
  /** The conversation with the agent (spoken or typed). Empty renders the Figma sample conversation. */
  turns?: readonly ChatTurn[]
  /** What the microphone has heard so far while listening. */
  transcript?: string
  /** Quick replies under the latest answer. */
  quickReplies?: readonly { label: string; icon: IconName }[]
  /** Whether a spoken request is possible here; without it the bar invites typing. */
  canListen?: boolean
  onMic?: () => void
  onQuickReply?: (text: string) => void
  /** A typed request. */
  onSend?: (text: string) => void
  onBack?: () => void
}

const STATUS: Record<VoicePhase, { label: string; tone: 'accent' | 'success' }> = {
  listening: { label: 'Listening', tone: 'accent' },
  speaking: { label: 'Speaking', tone: 'accent' },
  thinking: { label: 'Thinking', tone: 'accent' },
  idle: { label: 'Ready', tone: 'success' },
}

export const DEFAULT_QUICK_REPLIES: readonly { label: string; icon: IconName }[] = [
  { label: 'Apply the safe fixes', icon: 'status-good' },
  { label: 'Show me the findings', icon: 'inspect' },
  { label: 'Write the report to the canvas', icon: 'change-log' },
]

/** Figma "Agents body" on "AI Agents · Voice" (40000299:6304): a spoken (or typed) conversation with the agent about its run. */
export function AgentsVoice({ agent = agentById('accessibility'), phase = 'listening', turns = [], transcript, quickReplies = DEFAULT_QUICK_REPLIES, canListen = true, onMic, onQuickReply, onSend, onBack }: AgentsVoiceProps) {
  const status = STATUS[phase]
  const [draft, setDraft] = useState('')
  const send = () => { const text = draft.trim(); if (!text) return; onSend?.(text); setDraft('') }
  const sample = turns.length === 0
  return (
    <div class="bb-agents-voice">
      <BackLink class="bb-agents-voice__back" onBack={onBack} />
      <AgentHeader
        class="bb-agents-voice__header"
        name={agent.title}
        purpose={agent.headerPurpose}
        agent={agent.bot}
        botState={phase === 'idle' ? 'default' : 'working'}
        chips={agent.headerChips}
        status={status.label}
        statusTone={status.tone}
      />

      <div class="bb-agents-voice__conversation" aria-label="Conversation" aria-live="polite">
        {sample && (
          <>
            <Message class="bb-agents-voice__message" role="user" text={VOICE_COPY.userAsk} />
            <div class="bb-agents-voice__note bb-agents-voice__note--user">
              <VoiceWave class="bb-agents-voice__wave" state="listening" />
              <span class="bb-agents-voice__caption">{VOICE_COPY.userNote}</span>
            </div>
            <Message class="bb-agents-voice__message" role="assistant" text={VOICE_COPY.reply1} />
            <div class="bb-agents-voice__indent">
              <span class="bb-agents-voice__gutter" aria-hidden="true" />
              <div class="bb-agents-voice__steps">
                {VOICE_COPY.steps.map((s) => <ThinkingStep key={s} status="done">{s}</ThinkingStep>)}
              </div>
            </div>
            <Message class="bb-agents-voice__message" role="assistant" text={VOICE_COPY.reply2} />
            <div class="bb-agents-voice__note">
              <span class="bb-agents-voice__gutter" aria-hidden="true" />
              <VoiceWave class="bb-agents-voice__wave" state="speaking" />
              <span class="bb-agents-voice__caption">{VOICE_COPY.spokenNote}</span>
            </div>
          </>
        )}
        {turns.map((t, i) => (
          <div key={i} class="bb-agents-voice__turn">
            <Message class="bb-agents-voice__message" role={t.role} text={t.text} orbState={phase === 'thinking' && i === turns.length - 1 ? 'composing' : 'breathing'} />
            {t.steps && t.steps.length > 0 && (
              <div class="bb-agents-voice__indent">
                <span class="bb-agents-voice__gutter" aria-hidden="true" />
                <div class="bb-agents-voice__steps">{t.steps.map((s) => <ThinkingStep key={s} status="done">{s}</ThinkingStep>)}</div>
              </div>
            )}
          </div>
        ))}
        {phase === 'thinking' && <Message class="bb-agents-voice__message" role="assistant" text="Thinking…" orbState="composing" />}
        {phase !== 'thinking' && (
          <div class="bb-agents-voice__replies">
            <span class="bb-agents-voice__gutter" aria-hidden="true" />
            {quickReplies.map((q) => (
              <PromptChip key={q.label} icon={q.icon} onClick={() => onQuickReply?.(q.label)}>{q.label}</PromptChip>
            ))}
          </div>
        )}
      </div>

      <form class="bb-agents-voice__compose" onSubmit={(e) => { e.preventDefault(); send() }}>
        <Input class="bb-agents-voice__input" aria-label={`Ask the ${agent.title}`} placeholder={`Ask the ${agent.title} about this run…`} value={draft} onValueChange={setDraft} disabled={phase === 'thinking'} />
        <Button type="submit" variant="secondary" disabled={!draft.trim() || phase === 'thinking'}>Send</Button>
      </form>
      <VoiceBar
        class="bb-agents-voice__bar"
        state={phase === 'thinking' ? 'idle' : phase}
        transcript={phase === 'listening' ? (transcript ? `“${transcript}”` : 'Listening…') : phase === 'speaking' ? turns[turns.length - 1]?.text : canListen ? undefined : 'Type your request above; this window has no microphone access.'}
        caption={phase === 'speaking' ? `${agent.title} is speaking` : phase === 'thinking' ? `${agent.title} is thinking` : undefined}
        micLabel={phase === 'listening' ? 'Send' : phase === 'speaking' ? 'Interrupt' : 'Talk to the agent'}
        onToggle={onMic}
      />
    </div>
  )
}
