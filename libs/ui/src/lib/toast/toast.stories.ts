import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  inject,
  input,
  type OnInit,
} from '@angular/core';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { ButtonComponent } from '../button/button';
import { provideKonturToast } from './provide-toast';
import { KonturToast, type ToastOptions } from './toast.service';

// Texts are documentation examples from docs/design/components/Toast.html, not product
// text (product text goes through i18n). The toasts live in <k-toast-region> at the end of
// <body>, outside the story root: bottom right, at the top below 960 px.

const EXAMPLES: { message: string; options: ToastOptions }[] = [
  {
    message: '„AVV Stadtwerke" ist abgeschlossen und archiviert.',
    options: { tone: 'success', title: 'Signiert.' },
  },
  { message: 'Erinnerung an Anna Berger wurde gesendet.', options: {} },
  {
    message: 'Offline — der Beleg wird verarbeitet, sobald Verbindung besteht.',
    options: { tone: 'warning' },
  },
  {
    message: 'Datei überschreitet 25 MB.',
    options: {
      tone: 'error',
      title: 'Upload fehlgeschlagen.',
      action: { label: 'Wiederholen', run: () => undefined },
    },
  },
];

/**
 * Buttons that call KonturToast.show(); `initial` shows all four tones at once.
 * `dark`: the region is in <body>, outside the story, so the theme goes on <html>.
 */
@Component({
  selector: 'k-toast-demo',
  imports: [ButtonComponent],
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 8px; padding: 16px;">
      @for (example of examples; track example.message) {
        <button k-button (click)="show(example)">
          {{ example.options.tone ?? 'info' }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ToastDemoComponent implements OnInit {
  readonly initial = input(false);
  readonly dark = input(false);
  protected readonly examples = EXAMPLES;
  private readonly toast = inject(KonturToast);
  private readonly root = inject(DOCUMENT).documentElement;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.root.removeAttribute('data-theme'));
  }

  ngOnInit(): void {
    if (this.dark()) this.root.setAttribute('data-theme', 'dark');
    if (this.initial()) this.examples.forEach((e) => this.show(e));
  }

  protected show(example: (typeof EXAMPLES)[number]): void {
    this.toast.show(example.message, example.options);
  }
}

const meta: Meta<ToastDemoComponent> = {
  title: 'Components/Toast',
  component: ToastDemoComponent,
  decorators: [applicationConfig({ providers: [provideKonturToast()] })],
};
export default meta;
type Story = StoryObj<ToastDemoComponent>;

/** Press a button: info/success leave after 5 s (pause on hover/focus), the rest stay. */
export const Playground: Story = {};

/** All four tones of the mockup at once (only three are visible; the fourth waits). */
export const AllTones: Story = {
  name: 'All tones',
  args: { initial: true },
};

export const DarkTheme: Story = {
  name: 'Dark theme',
  args: { initial: true, dark: true },
};
