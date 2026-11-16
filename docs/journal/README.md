# Journal

One entry per completed task: what was built, why, how it works, and what to say
about it in an interview. Each entry has a full Russian and English part and a short
German summary with a glossary (template: [TEMPLATE.md](TEMPLATE.md)).

| #                                   | Entry                                                                                                               | Date       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| [001](001-workspace-setup.md)       | Workspace foundation: Nx, pnpm, apps, libs/ui, Storybook, CI                                                        | 2026-11-13 |
| [002](002-ci-full-check-on-main.md) | CI: full check on main instead of an empty green run                                                                | 2026-11-14 |
| [003](003-design-tokens.md)         | Kontur design tokens: CSS generated from tokens.json (golden-tested)                                                | 2026-11-14 |
| [004](004-button.md)                | Button and IconButton: first Kontur component, axe per story, lazy font subsets                                     | 2026-11-14 |
| [005](005-text-field.md)            | TextField: FormField + Input, hint and error for screen readers, stale Storybook cache fix                          | 2026-11-14 |
| [006](006-checkbox.md)              | Checkbox: ControlValueAccessor pattern (ADR-0004), text errors, Signal Forms compatibility                          | 2026-11-14 |
| [007](007-token-contrast.md)        | Token contrast test: 27 WCAG pairs in both themes, narrowest margin 4.59                                            | 2026-11-14 |
| [007a](007a-danger-tokens.md)       | Danger button hover/active by tokens (Kontur v4) instead of filter                                                  | 2026-11-14 |
| [008](008-radio.md)                 | Radio: CVA on the group, native radios sharing name, touched on leaving the group                                   | 2026-11-14 |
| [008a](008a-e2e-ports.md)           | E2E on their own ports (4300/4301/4402), never on the dev server                                                    | 2026-11-14 |
| [009](009-switch.md)                | Switch: native checkbox with role="switch" for instant settings; red tests first                                    | 2026-11-14 |
| [010](010-storybook-pages.md)       | Storybook on GitHub Pages: build once, deploy the tested artifact (first CD)                                        | 2026-11-14 |
| [011](011-i18n.md)                  | i18n: Transloco + ICU in the apps, libs/ui i18n-agnostic, language switcher in Storybook                            | 2026-11-15 |
| [011a](011a-language-config.md)     | Language list in one languages.json, read by the app and the CI check; new language = file + line                   | 2026-11-15 |
| [012](012-badge-avatar.md)          | Badge (status by text + dot shape) and Avatar / AvatarStack (one image, one label)                                  | 2026-11-15 |
| [013](013-tag-kontur-intl.md)       | Tag (remove button named "action + text") and KonturIntl de/en/ru, Transloco adapter in Storybook; AvatarStack size | 2026-11-16 |
