// Angular 22 reads the global `ngServerMode` at runtime. The Angular CLI (esbuild)
// replaces it at build time with `false` for browser builds; Storybook builds with
// webpack and does not, so rendering any component throws
// "ngServerMode is not defined". Storybook is browser-only, so `false` is correct.
(globalThis as { ngServerMode?: boolean }).ngServerMode = false;
