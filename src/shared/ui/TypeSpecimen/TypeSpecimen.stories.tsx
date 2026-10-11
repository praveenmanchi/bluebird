import type { Meta, StoryObj } from '@storybook/preact-vite'
import { TypeSpecimen } from './TypeSpecimen'
import { figma } from './figma'
import { BrandGrid } from '../../../../.storybook/helpers'

const meta = {
  title: 'Atoms/TypeSpecimen',
  component: TypeSpecimen,
  parameters: { figma: { setId: figma.setId, name: figma.name } },
  argTypes: { level: { control: 'inline-radio', options: ['title', 'label', 'body', 'caption'] } },
  args: { level: 'title' },
} satisfies Meta<typeof TypeSpecimen>
export default meta
type Story = StoryObj<typeof meta>

const v = (variant: string) => ({ figma: { variant } })
export const Title: Story = { parameters: v('Level=Title') }
export const Label: Story = { args: { level: 'label' }, parameters: v('Level=Label') }
export const Body: Story = { args: { level: 'body' }, parameters: v('Level=Body') }
export const Caption: Story = { args: { level: 'caption' }, parameters: v('Level=Caption') }

export const AcrossBrands: Story = {
  render: () => (
    <BrandGrid width="560px">
      <TypeSpecimen level="title" />
      <TypeSpecimen level="caption" />
    </BrandGrid>
  ),
}
