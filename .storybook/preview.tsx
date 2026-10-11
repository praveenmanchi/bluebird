import type { Preview } from '@storybook/preact-vite'
import { BRANDS, BRAND_LABELS, type BrandId } from '../src/shared/brand/generated/tokens'
import './preview.css'

const preview: Preview = {
  globalTypes: {
    brand: {
      description: 'Figma Brand collection mode',
      toolbar: {
        title: 'Brand',
        icon: 'paintbrush',
        items: BRANDS.map((id) => ({ value: id, title: BRAND_LABELS[id] })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { brand: 'bridge' satisfies BrandId },
  decorators: [
    (Story, context) => {
      const brand = (context.globals.brand as BrandId | undefined) ?? 'bridge'
      document.documentElement.dataset.brand = brand
      return (
        <div class="bb-story-canvas" data-brand={brand}>
          <Story />
        </div>
      )
    },
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    options: {
      storySort: {
        order: [
          'Home',
          'Style guide', ['Colour', 'Typography', 'Iconography', 'Spacing & shape', 'Brands', 'Token reference'],
          'Components', ['Overview'],
          'Atoms', 'Molecules', 'Organisms', 'Screens', 'Shell',
        ],
      },
    },
  },
}
export default preview
