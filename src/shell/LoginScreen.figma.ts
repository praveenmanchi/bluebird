/** Figma ↔ code contract for the Login screen (frame, not a component set). */
export const figma = {
  setId: '40000100:13204',
  name: 'Login Page',
  props: { 'Design studio': 'title', Subtitle: 'subtitle', 'Access code': 'Input (password, aria-label)', Button: 'Button primary "Submit"' },
  figmaGaps: {
    'button/primary/width-md': 'Bound on the composed Button instance; Button.css consumes it.',
    'input/bg/default': 'consumed by the composed Input', 'input/border/default': 'consumed by the composed Input', 'input/radius': 'consumed by the composed Input',
    'input/fg/value': 'consumed by the composed Input', 'input/font/size': 'consumed by the composed Input', 'input/font/weight': 'consumed by the composed Input', 'input/icon/color': 'consumed by the composed Input (eye glyph)',
    'button/primary/bg/default': 'consumed by the composed Button', 'button/primary/border/default': 'consumed by the composed Button', 'button/primary/radius': 'consumed by the composed Button',
    'button/primary/gap': 'consumed by the composed Button', 'button/primary/padding-x': 'consumed by the composed Button',
  },
  notes: 'The frame is a 1074×868 desktop mock; the plugin renders it inside the 360–760px window, so the form keeps the design\'s max widths and centres. The subtitle copy in Figma is placeholder text; code shows the access-code instruction. The HCLTech mark is the "brand logos / Brand=HCL" instance scaled to 180×52.',
} as const
