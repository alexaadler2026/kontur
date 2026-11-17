# 0021. Forms in the apps: Signal Forms, errors shown on leaving a field or on submit, server errors mapped from Problem Details

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

The first app screen (wave 1, task 8: sign-in) needs a form. Every later screen (new
envelope, signers, receipt editor) is form-heavy. Angular 22 has two model-driven form
APIs: **Reactive Forms** (`FormGroup` / `FormControl`, RxJS) and **Signal Forms**
(`form()` / `[formField]`, signals). The component library already works with both
(ADR-0004: controls implement ControlValueAccessor, tested with `[formField]`).

We need one choice for the apps, a rule for **when** an error becomes visible, how its
text is translated (ADR-0006) and how **server errors** (ADR-0008, Problem Details with
`errors[]`) reach the right field — or the whole form.

## Decision Drivers

- Signals for state (CLAUDE.md); RxJS only for streams, converted at the edge.
- Strict typing without `any`.
- Validation rules in one place, reusable, testable.
- Server validation errors (`errors[].pointer`, ADR-0008) shown at the field they belong to.
- Accessibility (WCAG 2.1 AA): errors announced and linked to fields, focus on the first
  invalid field, no error noise while typing.
- The owner must explain the choice in German enterprise interviews, where Reactive Forms
  are the norm.

## Considered Options

1. **Signal Forms** (`@angular/forms/signals`)
2. Reactive Forms (typed `FormGroup` / `FormControl`)
3. Template-driven forms (`ngModel`)
4. Both, chosen per screen

## Decision Outcome

Chosen: **1, Signal Forms**, for every form in SignFlow and Belegscan.

### Stability — source

Signal Forms are public, stable API in our version:

- **Installed package (primary, checked 2026-11-16):** `@angular/forms` 22.2.6,
  `types/_structure-chunk.d.ts` — `form()`, `submit()`, `FieldState`, `FormSubmitOptions`
  and the `FormField` directive are marked `@publicApi 22.0`. The only `@experimental` API
  in the signals entry point is `provideExperimentalWebMcpForms` (not used).
- **Angular changelog** (<https://github.com/angular/angular/blob/main/CHANGELOG.md>),
  forms section of the 22.0.0 release (2026-06-03): "graduate signal forms APIs to public
  API". (Signal Forms first shipped as experimental in Angular 21.)
- **Secondary:** Ninja Squad, "What's new in Angular 22.0"
  (<https://blog.ninja-squad.com/2026/06/03/what-is-new-angular-22.0>): "Signal Forms are
  stable!"
- The official docs page <https://angular.dev/guide/forms/signals/overview> has no
  stability label; the Angular blog could not be fetched (HTTP 403). The package typings
  are the source we rely on, because they are exactly what we compile against.

### How a form is built

- The **model is a signal** (`signal({ email: '', password: '' })`), the form is
  `form(model, schema)`; the template binds `[formField]="loginForm.email"` on the native
  input inside `k-form-field` (or on a library control).
- **Validation is a schema function** with the built-in rules (`required`, `email`,
  `minLength`, `pattern`, …) and `validate()` for own rules. Shared schemas (e-mail,
  money) are plain functions that screens `apply()`.
- **Submit** goes through `submit(form, action)`: Angular marks all fields as touched; an
  invalid form does not call the action. The action calls the generated API client
  (ADR-0007) and returns server errors as `ValidationError`s for the fields.
- Server state stays in the feature's SignalStore; the form model is local to the
  component and is not stored globally.

### When an error is visible

- **On leaving a field** (blur) or **on a submit attempt** — never while the person is
  typing a new value.
- **While typing, a new error does not appear; a fixed error disappears at once.** The
  visible message is the one recorded at the last blur or submit, shown only while the
  field still has an error of that kind.
- On a failed submit the **focus moves to the first invalid field**
  (`focusBoundControl()`), so keyboard and screen-reader users land on the problem.
- `aria-invalid` and `aria-describedby` (hint, then error) are set by `k-form-field`
  (ADR-0004); the app passes only the translated text.

### Texts of errors (ADR-0006)

- One key scheme for client and server, the one of ADR-0008: a code becomes the key
  `errors.<code>`. Server code `validation.email` → `errors.validation.email`; the client
  rule `email` shares it (bare client kinds are read as `validation.<kind>`). Other codes
  (e.g. `auth.invalid_credentials`) map the same way.
- Parameters through ICU (`{min, number}` etc.); German uses the formal "Sie".
- **Error texts are full sentences** ("Bitte füllen Sie dieses Feld aus.", not
  "Pflichtfeld"): a screen reader reads the error as the field's description, and a
  sentence tells the person what to do. (Owner's decision, 2026-11-17.)
- An unknown code falls back to a generic message by HTTP status (ADR-0008).

### Server errors

- **Field error:** Problem Details with `errors[]` (status 422, ADR-0008). Each entry's
  JSON Pointer (`/signers/0/email`) is resolved to the field tree
  (`form.signers[0].email`) and becomes that field's error. It disappears once the person
  changes the value (Signal Forms drop submission errors on change — verified by the
  prototype's e2e). A pointer that matches no field becomes a form error.
- **Form error:** a problem without a field, e.g. wrong e-mail or password at sign-in. It
  is **one general text above the submit button**, not at the password field — a message
  at one field would reveal which part was wrong (account enumeration, ADR-0010). It is
  announced by screen readers (`role="alert"`) and stays until the next submit.
- The mapping function (Problem Details → field errors) lives in the Storybook prototype
  until task 8, then moves to a `platform:web` library (ADR-0007 tags).

### Consequences

- Good: form state is signals like the rest of the app — no `valueChanges` subscriptions,
  no `toSignal` per screen; OnPush works without extra wiring.
- Good: the value type is inferred from the model; field paths are checked by the
  compiler (`loginForm.emial` does not compile).
- Good: `submit()` has a built-in place for server errors per field.
- Bad: the API is young (public since 22.0): fewer examples and answers online; some
  behaviour must be verified by our own tests (the Storybook prototype does that).
- Bad: most German enterprise codebases use Reactive Forms; the team must know both. Our
  library controls keep working with Reactive Forms (ADR-0004), so a consumer is not
  locked in.
- CLAUDE.md changes from "Typed reactive forms" to "Signal Forms (ADR-0021)".

## Pros and Cons of the Options

### Signal Forms

- Good: signal-native; typed from the model; schema-based validation; `submit()` with
  server errors; less code per form.
- Bad: young API; fewer community answers; team members from Reactive-Forms projects need
  to learn it.

### Reactive Forms

- Good: mature (since Angular 2, typed since 14), known by almost every Angular developer
  in German enterprise projects, many examples and libraries.
- Bad: built on RxJS (`valueChanges`, `statusChanges`): every screen that wants a signal
  needs `toSignal` and subscriptions — two reactivity models side by side, against our
  "signals for state" rule.
- Bad: server errors have no standard place; they are set by hand with `setErrors()`, and
  the next validation run can silently overwrite them.
- Bad: types come from the `FormGroup` declaration, not from a model we already have; the
  value is partial when controls are disabled (`value` vs `getRawValue()`), a classic bug
  source.
- Why not, in one sentence: **it would add a second reactivity model to a signals app
  and give us nothing that Signal Forms do not already do in our Angular version.**

### Template-driven forms

- Good: least code for tiny forms.
- Bad: validation lives in the template, hard to test and to share; weaker typing. Not
  suitable for the large editors (envelope, receipt).

### Both, per screen

- Good: free choice.
- Bad: two ways to do the same thing, two sets of helpers and tests; reviewers must know
  both. Rejected.

## More Information

- ADR-0004 (controls with ControlValueAccessor, work with both APIs), ADR-0006 (i18n),
  ADR-0007 (generated API client), ADR-0008 (Problem Details), ADR-0010 (generic login
  errors).
- Prototype: Storybook story "Forms / Sign-in" with e2e (task 015).
- ~~Open for design: Kontur has no style for a form-level error and no sign-in mockup yet.
  The prototype reuses the field error markup (`.k-form-item .k-error-msg`) without new
  CSS; the sign-in screen (task 8) needs a design decision first.~~
  **Resolved 2026-11-17:** Kontur v4.4 defines the form error as `k-alert` (tone error,
  `live`, above the submit button; mockup `AnmeldenDunkel`), built in UI-17. The prototype
  uses it and re-creates it on every failed attempt (`@for (n of [submitCount()]; track n)`),
  so the same text is announced again. The decision of this ADR is unchanged.
