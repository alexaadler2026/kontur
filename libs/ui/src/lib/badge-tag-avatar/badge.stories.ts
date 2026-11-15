import type { Meta, StoryObj } from '@storybook/angular';
import { BadgeComponent } from './badge';

// Status labels are documentation examples from docs/design/components/Badge.html,
// not product text (product text goes through i18n).

const row =
  'display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 16px;';

/** All five tones from the reference: the dot shape differs too, never colour only. */
const tones = `<div style="${row}">
  <k-badge>Entwurf</k-badge>
  <k-badge tone="info">In Prüfung</k-badge>
  <k-badge tone="warning">Wartet</k-badge>
  <k-badge tone="success">Signiert</k-badge>
  <k-badge tone="error">Abgelehnt</k-badge>
</div>`;

const meta: Meta<BadgeComponent> = {
  title: 'Components/Badge',
  component: BadgeComponent,
};
export default meta;
type Story = StoryObj<BadgeComponent>;

export const Tones: Story = {
  render: () => ({ template: tones }),
};

export const DarkTheme: Story = {
  name: 'Dark theme',
  render: () => ({
    template: `<div data-theme="dark" style="background: var(--bg-page);">${tones}</div>`,
  }),
};

/** Long German and Russian statuses stay on one line inside the pill. */
export const LongLabels: Story = {
  name: 'Long labels (de, ru)',
  render: () => ({
    template: `<div style="${row}">
      <k-badge tone="warning">Wartet auf Gegenzeichnung</k-badge>
      <k-badge tone="info">На проверке у юриста</k-badge>
      <k-badge tone="error">Отклонено</k-badge>
    </div>`,
  }),
};
