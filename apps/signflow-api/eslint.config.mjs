import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  // The Prisma client is generated (prisma-generate) and not ours to lint.
  { ignores: ['src/generated/**'] },
  {
    // ADR-0009: settings are read once, validated, in src/config/load-config.ts. Everything
    // else gets the AppConfig object. Tests may set the environment of a child process.
    files: ['src/**/*.ts'],
    ignores: [
      'src/config/load-config.ts',
      'src/**/*.spec.ts',
      'src/**/*.int-spec.ts',
      // Test helpers that start the Prisma CLI as a child process with its environment.
      'src/**/testing/**',
    ],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Read settings through loadConfig() / AppConfig (src/config/load-config.ts, ADR-0009).',
        },
      ],
    },
  },
];
