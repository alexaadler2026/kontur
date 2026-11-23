import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ProgressComponent } from './progress';
import { ProgressRingComponent } from './progress-ring';
import { SpinnerComponent } from './spinner';

// Labels are documentation examples from docs/design/components/Progress.html,
// not product text (product text goes through i18n). The percent follows the
// toolbar language (KonturIntl.locale): de "68 %", en "68%", ru "68 %".

const states = `<div style="display: flex; flex-wrap: wrap; gap: 48px; align-items: flex-start; padding: 16px;">
  <div style="width: 280px; display: flex; flex-direction: column; gap: 16px;">
    <k-progress label="Text erkennen" [value]="68" />
    <k-progress label="Abgeschlossen" [value]="100" tone="success" />
    <k-progress label="Fehlgeschlagen" [value]="34" tone="error" />
    <k-progress label="Wird vorbereitet" [value]="null" />
  </div>
  <div style="display: flex; gap: 24px; align-items: center;">
    <k-spinner label="Lädt" />
    <k-progress-ring label="Text erkennen" [value]="68" />
    <k-progress-ring label="Text erkennen" [value]="68" [size]="64" showValue />
  </div>
</div>`;

const meta: Meta<ProgressComponent> = {
  title: 'Components/Progress',
  component: ProgressComponent,
  decorators: [
    moduleMetadata({ imports: [SpinnerComponent, ProgressRingComponent] }),
  ],
};
export default meta;
type Story = StoryObj<ProgressComponent>;

/** Every state of the mockup, plus indeterminate and the ring with its value. */
export const States: Story = {
  render: () => ({ template: states }),
};

export const DarkTheme: Story = {
  name: 'Dark theme',
  render: () => ({
    template: `<div data-theme="dark" style="background: var(--bg-page);">${states}</div>`,
  }),
};
