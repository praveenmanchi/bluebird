import { BOT_SCENE_DERIVED } from './figmaDerived'

/** Figma ↔ code contract for BotScene ("Bot Scene" 40002629:7211). */
export const figma = {
  setId: '40002629:7211',
  name: 'Bot Scene',
  props: {
    Scene: 'scene (the 14 BotSceneId values, kebab-case)',
    Character: "character ('uxai', or the agent that hit the problem; Figma's Agent variants show a sample agent)",
  },
  figmaGaps: { ...Object.fromEntries(['agents/bot/a11y', 'agents/bot/content', 'agents/bot/writing', 'agents/bot/spelling', 'agents/bot/ds'].map((name) => [name, "Painted by the shared Robot (BotAvatar), which this component composes: BotAvatar.css reads it."])), 'icon/size/lg': "Bound on the chest or prop Icon instance's Size variant; the Icon component reads icon/size/* and the artwork scales the instance inside the frame.", 'icon/size/sm': "Bound on the chest or prop Icon instance's Size variant; the Icon component reads icon/size/* and the artwork scales the instance inside the frame." },
  derivedGaps: Object.fromEntries(BOT_SCENE_DERIVED.map((token) => [token, "Artwork box, fill or stroke; the component draws the scene as SVG through the shared Robot and scenes data, so the value lives in the SVG, not in CSS."])),
  notes: 'Created 2026-11-07 on the AI scenarios page (40002629:6458). Composes the shared robot through Robot.tsx; scenes.ts holds the props around it, with colour in BotScene.css. Always decorative: AiScenario gives the title and body.',
} as const
