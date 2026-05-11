import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Build-time-substituted by Vite's `define`. Declared here so
        // ESLint doesn't flag them as undefined references in source.
        __APP_VERSION__: 'readonly',
        __APP_COMMIT__: 'readonly',
        __APP_BUILT__: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
