import { scaleGaps } from '../../brand/scaleGaps'
const chip = 'Bound on the nested "Rules" Context Chip instance; the composed <ContextChip> consumes it in ContextChip.css.'
const badge = 'Bound on the nested "Status" Meta Badge instance; the composed <MetaBadge> consumes it in MetaBadge.css (per tone).'
const button = 'Bound on the nested "Action" Button instance; the composed <Button> consumes it in Button.css (variant / disabled).'

/** Figma ↔ code contract for AgentCard ("Agent Card" 40000296:8379). */
export const figma = {
  setId: '40000296:8379',
  name: 'Agent Card',
  props: {
    Name: 'name',
    Purpose: 'purpose',
    State: 'state (Ready / Running / Idle / Coming soon → coming-soon)',
    'Bot (Bot Avatar instance: Ready/Coming soon → Default, Running → Working, Idle → Sleeping)': 'agent',
    'Status (Meta Badge instance: Ready → Success, Running → Accent, Idle/Coming soon → Neutral)': 'status',
    'Rules (Context Chip instance, Type=Citation)': 'rules',
    'Footer/Meta text': 'meta',
    'Action (Button instance: Ready → Primary "Run", Running → Secondary "Stop", Idle → Secondary "Run", Coming soon → Secondary Disabled "Notify me")': 'actionLabel + onRun / onStop',
  },
  figmaGaps: {
    ...scaleGaps('border-width/default', 'uxai/border-width', 'button/primary/border-width', 'button/secondary/border-width', 'dimension/opacity/55'),
    'agents/size/bot': 'Bound on the nested "Bot" Bot Avatar instance (40 × 40, its own size); the composed <BotAvatar> consumes it in BotAvatar.css.',
    'feedback/success': badge,
    'border/accent': badge,
    'border/subtle': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
    'uxai/chip/bg': chip,
    'uxai/chip/border': chip,
    'uxai/radius/chip': chip,
    'uxai/space/tight': chip,
    'uxai/space/inline': chip,
    'uxai/space/hair': chip,
    'button/primary/bg/default': button,
    'button/primary/border/default': button,
    'button/primary/radius': button,
    'button/primary/gap': button,
    'button/primary/padding-x': button,
    'button/primary/height': button,
    'button/secondary/bg/default': button,
    'button/secondary/border/default': button,
    'button/secondary/bg/disabled': button,
    'button/secondary/border/disabled': button,
    'button/secondary/radius': button,
    'button/secondary/gap': button,
    'button/secondary/padding-x': button,
    'button/secondary/height': button,
  },
  derivedGaps: {},
  notes: 'Created 2026-10-09 for the AI Agents tab (gallery). Composes BotAvatar, MetaBadge, ContextChip and Button — no Progress Bar instance in this set (the "Running 64%" progress is the Meta Badge label). Coming soon disables the Action Button (Figma: Secondary, State=Disabled) and fades Name/Purpose by the raw 0.6 Figma sets. Ready renders a Primary button; the others Secondary. In Figma the Purpose text of State=Ready overlaps the Rules chip (183 tall frame vs 197 for the others), a canvas artefact the code does not reproduce.',
} as const
