import { defineConfig } from 'orval';

// Angular client and MSW mocks for signflow-api, generated from the committed contract
// (ADR-0007). Output in src/generated/ is git-ignored; run `nx run signflow-api-client:generate`.
export default defineConfig({
  signflow: {
    input: { target: '../api-contract/openapi.json' },
    output: {
      client: 'angular',
      mode: 'tags-split',
      target: 'src/generated/endpoints',
      schemas: 'src/generated/model',
      clean: true,
      override: {
        // Reads: httpResource helpers (signals). Writes: HttpClient services.
        angular: { retrievalClient: 'both' },
      },
      mock: {
        generators: [
          // Deterministic mocks from the contract's `example` values, not random data.
          { type: 'msw', useExamples: true, delay: false },
        ],
      },
    },
  },
});
