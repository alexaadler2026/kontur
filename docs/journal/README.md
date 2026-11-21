# Journal

One entry per completed task: what was built, why, how it works, and what to say
about it in an interview. Each entry has a full Russian and English part and a short
German summary with a glossary (template: [TEMPLATE.md](TEMPLATE.md)).

| #                                          | Entry                                                                                                                      | Date       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| [001](001-workspace-setup.md)              | Workspace foundation: Nx, pnpm, apps, libs/ui, Storybook, CI                                                               | 2026-11-13 |
| [002](002-ci-full-check-on-main.md)        | CI: full check on main instead of an empty green run                                                                       | 2026-11-14 |
| [003](003-design-tokens.md)                | Kontur design tokens: CSS generated from tokens.json (golden-tested)                                                       | 2026-11-14 |
| [004](004-button.md)                       | Button and IconButton: first Kontur component, axe per story, lazy font subsets                                            | 2026-11-14 |
| [005](005-text-field.md)                   | TextField: FormField + Input, hint and error for screen readers, stale Storybook cache fix                                 | 2026-11-14 |
| [006](006-checkbox.md)                     | Checkbox: ControlValueAccessor pattern (ADR-0004), text errors, Signal Forms compatibility                                 | 2026-11-14 |
| [007](007-token-contrast.md)               | Token contrast test: 27 WCAG pairs in both themes, narrowest margin 4.59                                                   | 2026-11-14 |
| [007a](007a-danger-tokens.md)              | Danger button hover/active by tokens (Kontur v4) instead of filter                                                         | 2026-11-14 |
| [008](008-radio.md)                        | Radio: CVA on the group, native radios sharing name, touched on leaving the group                                          | 2026-11-14 |
| [008a](008a-e2e-ports.md)                  | E2E on their own ports (4300/4301/4402), never on the dev server                                                           | 2026-11-14 |
| [009](009-switch.md)                       | Switch: native checkbox with role="switch" for instant settings; red tests first                                           | 2026-11-14 |
| [010](010-storybook-pages.md)              | Storybook on GitHub Pages: build once, deploy the tested artifact (first CD)                                               | 2026-11-14 |
| [011](011-i18n.md)                         | i18n: Transloco + ICU in the apps, libs/ui i18n-agnostic, language switcher in Storybook                                   | 2026-11-15 |
| [011a](011a-language-config.md)            | Language list in one languages.json, read by the app and the CI check; new language = file + line                          | 2026-11-15 |
| [012](012-badge-avatar.md)                 | Badge (status by text + dot shape) and Avatar / AvatarStack (one image, one label)                                         | 2026-11-15 |
| [013](013-tag-kontur-intl.md)              | Tag (remove button named "action + text") and KonturIntl de/en/ru, Transloco adapter in Storybook; AvatarStack size        | 2026-11-16 |
| [014](014-architecture-waves.md)           | ADR waves 1–2 in the repo: how to read diagram → explanation → ADR → task plan                                             | 2026-11-16 |
| [015](015-forms-signal-forms.md)           | ADR-0021 (wave 1, before task 8): Signal Forms, error timing, server and form errors; sign-in prototype                    | 2026-11-17 |
| [016](016-architecture-wave3-roadmap.md)   | Wave 3 (Belegscan) and the cross-wave roadmap in the repo; ADR-0027 XML guards clarified                                   | 2026-11-17 |
| [017](017-icons-lucide.md)                 | ADR-0022: icons via @lucide/angular; libs/ui icons migrated; why a refactoring has no red test                             | 2026-11-17 |
| [018](018-alert.md)                        | UI-17 Alert: InlineAlert + Banner, live roles, re-announce via @for track, controlled visibility, focus on close           | 2026-11-17 |
| [019](019-sign-in-alert.md)                | Sign-in prototype: form error as k-alert re-created per attempt, design texts; an accidental green test proven by mutation | 2026-11-17 |
| [020](020-signflow-api-health-contract.md) | Task 1a: signflow-api on Nest 12 (ESM, tsc + swagger plugin, also in tests), /api/v1/health/live, OpenAPI 3.1 contract     | 2026-11-21 |
| [021](021-signflow-transloco.md)           | Task 1b: Transloco in SignFlow, start language from the browser; a failed translation load never blocks the app            | 2026-11-21 |
