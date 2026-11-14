# 0004. Form controls: ControlValueAccessor over a native input, state in signals

- Status: Accepted
- Date: 2026-11-14

## Context and Problem Statement

Checkbox, Radio group, Switch and later Select and DatePicker are form controls whose
value lives in the component, not in a native field the consumer writes (TextField keeps
the native `<input>` and needs nothing, see task 005). `api-contracts.d.ts`: "Form controls
implement ControlValueAccessor; their value is NOT an input." We need one pattern for all
of them that works with typed reactive forms (`formControlName`, `[formControl]`),
keeps keyboard and screen-reader behaviour correct and is easy to explain.

## Decision Drivers

- Accessibility (WCAG 2.1 AA) with as little custom keyboard code as possible.
- Works with Angular's typed reactive forms without adapters in the apps.
- State in signals (CLAUDE.md), OnPush.
- The DOM matches the reference markup (`<label class="k-check"><input type="checkbox">…`).

## Considered Options

1. **ControlValueAccessor + a real native `<input>` inside, state in signals**
2. Custom element with `role="checkbox"` / `role="radio"` on a `<div>`
3. Angular Signal Forms custom control (`FormCheckboxControl` / `FormValueControl` from `@angular/forms/signals`)

## Decision Outcome

Chosen option: **1**.

- **Native input inside.** Focus, Space, label click, `:checked`, `:indeterminate`,
  arrow keys in a radio group (same `name`) and the screen-reader role all come from the
  browser.
- **ControlValueAccessor.** The component provides itself as `NG_VALUE_ACCESSOR`
  (`useExisting` + `forwardRef`, because the class is referenced inside its own decorator)
  and maps the four methods to signals:
  - `writeValue(v)` → `value.set(v)` (form → component);
  - `registerOnChange(fn)` → the component calls `fn(v)` on the native `change` event
    (component → form);
  - `registerOnTouched(fn)` → called on `blur` (`touched` drives "show error after blur");
  - `setDisabledState(d)` → `disabled.set(d)`, bound to the native `disabled` attribute.
- **Disabled comes from the form** (`control.disable()`), as the contract has no
  `disabled` input on Checkbox/Switch/RadioGroup. Single radio options have
  `disabled` (`RadioProps`).
- **Texts arrive translated** (`label`, `hint`, `error`); hint and error are linked with
  `aria-describedby` (hint, then error), like FormField (ADR-0003, task 005).

### Consequences

- Good: almost no keyboard code; behaviour is the browser's, tested in real Chromium (e2e).
- Good: the same four-method pattern for every control; apps use plain reactive forms.
- Bad: CVA is boilerplate and has a classic trap (`forwardRef`) — explained in the journal.
- Bad: no value without a form (no `value` input by contract); `ngModel` works as well.
- Good: the same components also work with **Signal Forms** through their `[formField]`
  directive (CVA compatibility path), so the later forms-API decision for the apps does not
  break the library. Covered by a test next to the reactive-forms test.

## Pros and Cons of the Options

### Native input + CVA

- Good: native semantics, minimal code, reference markup.
- Bad: CVA boilerplate.

### `role="checkbox"` on a `<div>`

- Good: full styling freedom.
- Bad: re-implements focus, Space, label click, states and arrow keys — easy to get
  wrong; the reference CSS styles the native input anyway.

### Signal Forms custom control

Verified facts (`@angular/forms` 22.2.6, `types/signals.d.ts` and
`types/_structure-chunk.d.ts`, checked 2026-11-14):

- Signal Forms are **stable**: `form()`, the `FormField` directive (`[formField]`),
  `FormValueControl` and `FormCheckboxControl` are marked `@publicApi 22.0`. The only
  `@experimental` API is `provideExperimentalWebMcpForms`.
- The `FormField` directive accepts a native input, a `FormValueControl` /
  `FormCheckboxControl`, or a component that provides a `ControlValueAccessor` — the latter
  "only for backwards compatibility with reactive forms. Prefer options (1) and (2)."

Assessment:

- Good: signal-native, less boilerplate; the form passes errors, disabled and required to
  the control automatically.
- Bad: CLAUDE.md prescribes typed reactive forms and `api-contracts.d.ts` prescribes CVA;
  a library control that implements only `FormCheckboxControl` does not work with
  `formControlName`. Which forms API the apps use is not decided yet.

Revisit: the ADR "forms API for the apps (Reactive Forms vs Signal Forms)" is due before
the first SignFlow screen. If it chooses Signal Forms, the library components additionally
implement `FormCheckboxControl` / `FormValueControl` (automatic errors/disabled/required)
without breaking their API.
