import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'k',
          style: 'kebab-case', // <input k-input> — same spelling as components (k-button), see api-contracts.d.ts
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          // element (<k-tabs>) and attribute on native elements (<button k-button>), see api-contracts.d.ts
          type: ['element', 'attribute'],
          prefix: 'k',
          style: 'kebab-case',
        },
      ],
      // ADR-0006: the published library stays i18n-agnostic. Component texts come in as
      // inputs, built-in a11y strings from KonturIntl — never from an i18n library.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@jsverse/*',
                '@ngx-translate/*',
                '@angular/localize',
                '@angular/localize/*',
              ],
              message:
                'libs/ui must not depend on an i18n library (ADR-0006). Take texts as inputs or use KonturIntl.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
