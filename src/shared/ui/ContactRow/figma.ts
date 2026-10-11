/** Figma ↔ code contract for ContactRow ("Contact Row" 40000324:8452). */
export const figma = {
  setId: '40000324:8452',
  name: 'Contact Row',
  props: { Prompt: 'prompt', Email: 'email (mailto: link)', Channel: 'channel (+ channelHref)' },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-contact-row-root-width': 'The component is fixed at 344; instances fill the footer, so code fills its container.',
  },
  codeOnly: { channelHref: 'Figma has no link target for the channel; without it the channel renders as link-styled text.' },
  notes: 'Email and channel are Figma placeholders ("until the team confirms them"). Links wrap onto a second line in narrow plugin windows.',
} as const
