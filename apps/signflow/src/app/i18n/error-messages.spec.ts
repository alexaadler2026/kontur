import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  HttpClient,
  type HttpErrorResponse,
  provideHttpClient,
} from '@angular/common/http';
import {
  type ErrorMessage,
  type ProblemDetailsDto,
  problemCodeKey,
  problemMessage,
} from '@adlersoft/signflow-api-client';
import { TranslocoPipe } from '@jsverse/transloco';
import { render, screen } from '@testing-library/angular';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import de from '../../../public/i18n/de.json';
import en from '../../../public/i18n/en.json';
import ru from '../../../public/i18n/ru.json';
import { provideI18n } from './provide-i18n';

// SignFlow has no screen with input yet (the first is sign-in, task 8), so a component
// that exists only in this test sends a request and shows the error, the way a form will.
const PROBE_URL = '/api/v1/probe';

/** 422 as signflow-api sends it (task 3a), typed with the generated model. */
const validationProblem: ProblemDetailsDto = {
  type: 'urn:kontur:problem:validation.failed',
  title: 'The request failed validation',
  status: 422,
  code: 'validation.failed',
  instance: PROBE_URL,
  traceId: '0193a1c2-7b4e-7c1a-9f00-3c5d2e1b0a99',
  errors: [
    { pointer: '/email', code: 'validation.email', params: {} },
    { pointer: '/name', code: 'validation.required', params: {} },
  ],
};

@Component({
  selector: 'sf-error-probe',
  imports: [TranslocoPipe],
  template: `
    @if (message(); as message) {
      <p role="alert">{{ message.key | transloco: message.params }}</p>
      <ul>
        @for (field of fields(); track field.pointer) {
          <li>{{ field.pointer }}: {{ field.key | transloco }}</li>
        }
      </ul>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ErrorProbe {
  protected readonly message = signal<ErrorMessage | undefined>(undefined);
  protected readonly fields = signal<{ pointer: string; key: string }[]>([]);

  constructor() {
    inject(HttpClient)
      .post(PROBE_URL, { email: 'x', name: '' })
      .subscribe({
        error: (failure: HttpErrorResponse) => {
          this.message.set(problemMessage(failure));
          const body = failure.error as Partial<ProblemDetailsDto> | null;
          this.fields.set(
            (body?.errors ?? []).map(({ pointer, code }) => ({
              pointer,
              key: problemCodeKey(code),
            })),
          );
        },
      });
  }
}

const server = setupServer(
  http.get('*/i18n/:lang.json', ({ params }) =>
    HttpResponse.json({ de, en, ru }[String(params['lang'])]),
  ),
  http.post(`*${PROBE_URL}`, () =>
    HttpResponse.json(validationProblem, {
      status: 422,
      headers: { 'Content-Type': 'application/problem+json' },
    }),
  ),
);

async function renderWithBrowserLang(lang: string) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue([lang]);
  return render(ErrorProbe, {
    providers: [provideHttpClient(), provideI18n()],
  });
}

describe('a validation error from the API, translated (ADR-0008)', () => {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());

  const expected = {
    'de-DE': {
      form: 'Bitte überprüfen Sie Ihre Eingaben.',
      email: '/email: Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      name: '/name: Bitte füllen Sie dieses Feld aus.',
    },
    'en-GB': {
      form: 'Please check your entries.',
      email: '/email: Please enter a valid email address.',
      name: '/name: Please fill in this field.',
    },
    'ru-RU': {
      form: 'Проверьте введённые данные.',
      email: '/email: Введите корректный e-mail.',
      name: '/name: Заполните это поле.',
    },
  };

  for (const [lang, text] of Object.entries(expected)) {
    it(`${lang}: the form message and one message per field`, async () => {
      await renderWithBrowserLang(lang);

      expect(await screen.findByRole('alert')).toHaveTextContent(text.form);
      expect(screen.getByText(text.email)).toBeInTheDocument();
      expect(screen.getByText(text.name)).toBeInTheDocument();
    });
  }

  it('no answer (network) → the network text, not a crash', async () => {
    server.use(http.post(`*${PROBE_URL}`, () => HttpResponse.error()));
    await renderWithBrowserLang('de-DE');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Keine Verbindung zum Server. Bitte prüfen Sie Ihre Internetverbindung.',
    );
  });
});
