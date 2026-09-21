import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import figmaPlugin from '@figma/eslint-plugin-figma-plugins'
import boundaries from './tools/eslint-boundaries.js'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/**/registry.generated.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { bluebird: boundaries },
    rules: {
      // Feature isolation. See tools/eslint-boundaries.js.
      'bluebird/feature-boundaries': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/sandbox/**/*.ts', 'src/features/*/sandbox/**/*.ts', 'src/shared/figma/**/*.ts', 'src/shared/brand/resolve*.ts'],
    plugins: { '@figma/figma-plugins': figmaPlugin },
    rules: { ...figmaPlugin.configs.recommended.rules },
  },
  {
    files: ['scripts/**', 'tools/**', 'tests/**', '*.config.{js,ts}'],
    rules: { 'no-console': 'off' },
  },
)
