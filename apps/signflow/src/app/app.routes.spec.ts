import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';
import { screen } from '@testing-library/angular';
import { provideTransloco } from '@jsverse/transloco';
import { appRoutes } from './app.routes';

describe('Start page (route "")', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        provideHttpClient(),
        provideHttpClientTesting(), // no real network: requests just stay pending
        // Texts are not under test here; ApiStatus has its own test.
        provideTransloco({
          config: { availableLangs: ['de'], defaultLang: 'de' },
        }),
      ],
    });
  });

  it('has a main landmark with the product name as heading and the API status', async () => {
    await RouterTestingHarness.create('/');

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'SignFlow' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('keeps the page title "SignFlow" (WCAG 2.4.2 Page Titled)', async () => {
    await RouterTestingHarness.create('/');

    expect(TestBed.inject(Title).getTitle()).toBe('SignFlow');
  });
});
