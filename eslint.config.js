import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import figmaPlugin from '@figma/eslint-plugin-figma-plugins'
import boundaries from './tools/eslint-boundaries.js'

export default tseslint.config(
  { ignores: ['dist/**', 'release/**', 'coverage/**', 'node_modules/**', 'storybook-static/**', 'figma/visual/**', 'src/**/registry.generated.ts'] },
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
    // This rule needs type information, which this config doesn't load, and crashes on any
    // setBoundVariable call. The call here passes a Variable, the form the rule asks for.
    files: ['src/features/varmapper/sandbox/apply.ts'],
    rules: { '@figma/figma-plugins/ban-deprecated-id-params': 'off' },
  },
  {
    // Same missing type information, on any find call. These search a single main component,
    // or (mcp impact) a page right after `page.loadAsync()`, which is what the advice asks for.
    files: ['src/features/audit/sandbox/scan.ts', 'src/features/a11y/sandbox/spec-collect.ts', 'src/features/mcp/sandbox/impact.ts'],
    rules: { '@figma/figma-plugins/dynamic-page-find-method-advice': 'off' },
  },
  {
    files: ['scripts/**', 'tools/**', 'tests/**', '*.config.{js,ts}'],
    rules: { 'no-console': 'off' },
  },
)
