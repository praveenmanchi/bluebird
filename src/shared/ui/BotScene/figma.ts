/** Figma ↔ code contract for BotScene ("Bot Scene" 40002629:7211). */
export const figma = {
  setId: '40002629:7211',
  name: 'Bot Scene',
  props: {
    Scene: 'scene (the 14 BotSceneId values, kebab-case)',
    Character: "character ('uxai', or the agent that hit the problem; Figma's Agent variants show a sample agent)",
  },
  figmaGaps: {},
  notes: 'Created 2026-11-07 on the AI scenarios page (40002629:6458). Composes the shared robot through Robot.tsx; scenes.ts holds the props around it, with colour in BotScene.css. Always decorative: AiScenario gives the title and body.',
} as const
