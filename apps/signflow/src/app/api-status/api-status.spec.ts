import { provideHttpClient } from '@angular/common/http';
import {
  getGetHealthLiveMockHandler,
  getHealthMock,
} from '@adlersoft/signflow-api-client/mocks';
import { render, screen } from '@testing-library/angular';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import de from '../../../public/i18n/de.json';
import en from '../../../public/i18n/en.json';
import ru from '../../../public/i18n/ru.json';
import { provideI18n } from '../i18n/provide-i18n';
import { ApiStatus } from './api-status';

// The network of the test: translation files plus the API handlers Orval generated
// from the contract's examples ({ status: 'ok', version: '0.1.0' }).
const translations = http.get('*/i18n/:lang.json', ({ params }) =>
  HttpResponse.json({ de, en, ru }[String(params['lang'])]),
);
const server = setupServer(translations, ...getHealthMock());

async function renderWithBrowserLang(lang: string) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue([lang]);
  return render(ApiStatus, { providers: [provideHttpClient(), provideI18n()] });
}

describe('ApiStatus', () => {
  // A request without a handler fails the test (MSW 3 calls requests "frames").
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  afterAll(() => server.close());

  it('shows the API version from GET /api/v1/health/live', async () => {
    await renderWithBrowserLang('de-DE');

    expect(
      await screen.findByText('API: OK, Version 0.1.0'),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'API: OK, Version 0.1.0',
    );
  });

  it('says that it is checking while the API has not answered yet', async () => {
    server.use(
      getGetHealthLiveMockHandler(async () => {
        await delay('infinite');
        throw new Error('never answers');
      }),
    );
    await renderWithBrowserLang('de-DE');

    expect(await screen.findByRole('status')).toHaveTextContent(
      'API wird geprüft …',
    );
  });

  it('says that the API is unreachable when it answers with an error', async () => {
    server.use(
      http.get('*/api/v1/health/live', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    await renderWithBrowserLang('de-DE');

    expect(await screen.findByText('API nicht erreichbar')).toBeInTheDocument();
  });

  it('speaks the active language', async () => {
    await renderWithBrowserLang('ru-RU');

    expect(
      await screen.findByText('API: OK, версия 0.1.0'),
    ).toBeInTheDocument();
  });
});
