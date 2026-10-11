import { AgentHeader, Message, PromptChip, ThinkingStep, VoiceBar, VoiceWave } from '@shared/ui'
import { VOICE_COPY, agentById, type AgentDef } from '../fixtures'
import type { ChatTurn, VoicePhase } from '../state'
import { BackLink } from './parts'
import './AgentsVoice.css'

export interface AgentsVoiceProps {
  agent?: AgentDef
  /** The Voice Bar state (Listening on the Figma screen). */
  phase?: VoicePhase
  /** Turns added after the designed conversation (what was said or picked since). */
  turns?: readonly ChatTurn[]
  onMic?: () => void
  onQuickReply?: (text: string) => void
  onBack?: () => void
}

const STATUS: Record<VoicePhase, { label: string; tone: 'accent' | 'success' }> = {
  listening: { label: 'Listening', tone: 'accent' },
  speaking: { label: 'Speaking', tone: 'accent' },
  idle: { label: 'Ready', tone: 'success' },
}

/** Figma "Agents body" on "AI Agents · Voice" (40000299:6304): a spoken conversation with the agent. */
export function AgentsVoice({ agent = agentById('accessibility'), phase = 'listening', turns = [], onMic, onQuickReply, onBack }: AgentsVoiceProps) {
  const status = STATUS[phase]
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
        <div class="bb-agents-voice__replies">
          <span class="bb-agents-voice__gutter" aria-hidden="true" />
          {VOICE_COPY.quickReplies.map((q) => (
            <PromptChip key={q.label} icon={q.icon} onClick={() => onQuickReply?.(q.label)}>{q.label}</PromptChip>
          ))}
        </div>
        {turns.map((t, i) => <Message key={i} class="bb-agents-voice__message" role={t.role} text={t.text} />)}
      </div>

      <VoiceBar
        class="bb-agents-voice__bar"
        state={phase}
        transcript={phase === 'listening' ? VOICE_COPY.listening : phase === 'speaking' ? VOICE_COPY.speaking : undefined}
        caption={phase === 'speaking' ? `${agent.title} is speaking` : undefined}
        micLabel={phase === 'listening' ? 'Send' : phase === 'speaking' ? 'Interrupt' : 'Talk to the agent'}
        onToggle={onMic}
      />
    </div>
  )
}
