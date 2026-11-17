# Anmelden — sign-in screen (task 8)

Screens: `Anmelden` (desktop, light, empty) · `AnmeldenMobil` (390 px, field errors after a submit) ·
`AnmeldenDunkel` (desktop, dark, form-level error).

## Layout
- Desktop: card 400 px centred on `bg-page`, logo above, invite note below, legal links at the bottom.
  Language switch top right — the visitor has no account yet, so the language must be selectable here.
- Mobile: no card, `bg-surface` full screen, touch sizes (`k-field--touch`, `k-btn--touch`).
- Both fields are required; no asterisks (all fields required — the rule is stated by the error text).

## Behaviour
- Field errors: shown after leaving the field or after a submit attempt (ADR-0021, `errorDisplay`).
  On submit with errors, focus moves to the first invalid field (`AnmeldenMobil`: e-mail).
- Form-level error: `k-alert--error`, `live`, **above the submit button** (`AnmeldenDunkel`).
  No field is marked invalid — the text must not reveal which of the two was wrong.
  A second failed attempt re-creates the alert so it is announced again (see `components/Alert.md`).
- Throttled (ADR-0010, HTTP 429): same place, `k-alert--warning` without a title — one key `errors.auth.throttled` (Alert.md), minutes from the response.
- Redirect after expired session: `k-alert` info, not live, above the form.
- While the request runs: submit button `loading`; fields stay editable.
- Inputs: `type="email" autocomplete="username"`, `type="password" autocomplete="current-password"`.
  Paste is allowed (password managers, WCAG 2.2 3.3.8). No password-reveal button in v1.

## Not active yet
- **"Passwort vergessen?"** — rendered only from task 11 (password reset). Before that: not in the DOM.
- **Datenschutz / Impressum** — needed before a public deployment (tasks 23 and 52). Until the pages
  exist, the footer is not rendered. No dead links.
- On the demo host (ADR-0019) this screen is replaced by "Demo starten" (task 51a).

Texts de/en/ru: `components/Alert.md` (alerts) and below.

| Key | de | en | ru |
| --- | --- | --- | --- |
| `auth.title` | Anmelden | Sign in | Вход |
| `auth.subtitle` | Melden Sie sich mit Ihrem SignFlow-Konto an. | Sign in with your SignFlow account. | Войдите в свою учётную запись SignFlow. |
| `auth.email` | E-Mail-Adresse | Email address | E-mail |
| `auth.password` | Passwort | Password | Пароль |
| `auth.submit` | Anmelden | Sign in | Войти |
| `auth.forgot` | Passwort vergessen? | Forgot password? | Забыли пароль? |
| `auth.inviteOnly` | Konten werden nur per Einladung vergeben. | Accounts are available by invitation only. | Учётные записи выдаются только по приглашению. |
| `app.language` (aria-label) | Sprache | Language | Язык |
| `legal.privacy` / `legal.imprint` | Datenschutz / Impressum | Privacy / Legal notice | Конфиденциальность / Выходные данные |
| `errors.validation.required` | Bitte füllen Sie dieses Feld aus. | Please fill in this field. | Заполните это поле. |
| `errors.validation.email` | Bitte geben Sie eine gültige E-Mail-Adresse ein. | Please enter a valid email address. | Введите корректный e-mail. |
