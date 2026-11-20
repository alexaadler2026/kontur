# signflow-api-contract

`openapi.json` is the contract of `signflow-api` (ADR-0007). It is **generated** from the
NestJS controllers and DTO classes and committed, so every API change shows up as a diff in
the pull request.

- Regenerate: `pnpm nx run signflow-api:openapi`
- Never edit `openapi.json` by hand. The Angular client (task 1c) is generated from it.
