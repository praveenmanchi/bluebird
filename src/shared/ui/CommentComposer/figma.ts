import { scaleGaps } from '../../brand/scaleGaps'
const avatar = 'Bound on the nested Avatar (Size=Medium) instance; the composed <Avatar size="md"> (Avatar.css) consumes it.'
const cancel = 'Bound on the nested "Cancel" Button (Type=Secondary) instance; the composed <Button variant="secondary"> (Button.css) consumes it.'
const save = 'Bound on the nested "Save" Button (Type=Primary) instance; the composed <Button variant="primary"> (Button.css) consumes it.'

/** Figma ↔ code contract for CommentComposer ("Comment Composer" 40000268:8040). */
export const figma = {
  setId: '40000268:8040',
  name: 'Comment Composer',
  props: {
    Placeholder: 'placeholder',
    'Avatar (instance) › Initials': 'initials',
    'Field › Placeholder text': 'value / defaultValue + onValueChange (the text becomes a real <textarea>)',
    'Toolbar › Attach link / Attach file (Tab Icons URL / file)': 'onAttachLink / onAttachFile',
    'Toolbar › Cancel (Button instance) › Label': 'cancelLabel (+ onCancel)',
    'Toolbar › Save (Button instance) › Label': 'submitLabel (+ onSubmit)',
    'Cancel / Save › width FIXED (button/*/width-md)': 'width="fixed" on both Buttons (120 wide in Figma, not hugging the label)',
  },
  figmaGaps: {
    ...scaleGaps('button/secondary/border-width', 'button/primary/border-width'),
    'jira/avatar/bg': avatar,
    'jira/radius/pill': avatar,
    'jira/size/avatar': avatar,
    'button/secondary/bg/default': cancel,
    'button/secondary/border/default': cancel,
    'button/secondary/radius': cancel,
    'button/secondary/gap': cancel,
    'button/secondary/padding-x': cancel,
    'button/secondary/height': cancel,
    'button/secondary/width-md': `${cancel} Read under [data-width="fixed"], which CommentComposer sets.`,
    'button/primary/bg/default': save,
    'button/primary/border/default': save,
    'button/primary/radius': save,
    'button/primary/gap': save,
    'button/primary/padding-x': save,
    'button/primary/height': save,
    'button/primary/width-md': `${save} Read under [data-width="fixed"], which CommentComposer sets.`,
  },
  derivedGaps: {},
  notes: 'Created 2026-10-09 for the Jira ticket detail. The Figma "Placeholder" text layer becomes a one-row auto-growing <textarea> (field-sizing: content) whose placeholder reads jira/text/placeholder; typed text reads jira/text/body, which Figma does not show. Controlled via value/onValueChange or uncontrolled via defaultValue; Save and ⌘/Ctrl+Enter call onSubmit and ignore a blank draft. The attach glyphs are Tab Icons URL / file at jira/size/icon with the Tab Icons colour (icon/glyph/default) — jira/icon/default exists but Figma does not bind it here. The field border turns border/focus while the textarea has focus (code-only).',
} as const
