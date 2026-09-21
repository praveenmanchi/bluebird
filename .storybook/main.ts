import type { StorybookConfig } from '@storybook/preact-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/preact-vite',
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  docs: { defaultName: 'Docs' },
}
export default config
