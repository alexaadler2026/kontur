import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { AvatarComponent } from './avatar';
import { AvatarStackComponent } from './avatar-stack';

// Names and labels are documentation examples, not product text (that goes through i18n).

const row =
  'display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px;';

const signers = [
  'Anna Berger',
  'Jonas Becker',
  'Max Beispiel',
  'Lena Vogel',
  'Ivan Petrov',
];

/** Sizes md / sm and the stack with "+N"; signing progress is text next to it (Avatar.md). */
const overview = `<div style="${row}">
  <k-avatar name="Anna Berger" />
  <k-avatar name="Jonas Becker" size="sm" />
  <k-avatar-stack
    data-testid="stack"
    [names]="signers"
    ariaLabel="Unterzeichnende: Anna Berger, Jonas Becker, Max Beispiel und 2 weitere"
  />
  <span class="k-caption k-num">2/3</span>
</div>`;

const meta: Meta<AvatarComponent> = {
  title: 'Components/Avatar',
  component: AvatarComponent,
  decorators: [moduleMetadata({ imports: [AvatarStackComponent] })],
};
export default meta;
type Story = StoryObj<AvatarComponent>;

export const Overview: Story = {
  render: () => ({ props: { signers }, template: overview }),
};

export const DarkTheme: Story = {
  name: 'Dark theme',
  render: () => ({
    props: { signers },
    template: `<div data-theme="dark" style="background: var(--bg-page);">${overview}</div>`,
  }),
};

/** Initials from German, Turkish-German and Cyrillic names; a single name gives one letter. */
export const Names: Story = {
  name: 'Names (de, ru)',
  render: () => ({
    template: `<div style="${row}">
      <k-avatar name="Ursula von der Leyen" />
      <k-avatar name="Özlem Çelik" />
      <k-avatar name="Анна Беркер" />
      <k-avatar name="Max" />
    </div>`,
  }),
};

/** sm stack (22 px) as in table cells of the DataTable mockup, with progress next to it. */
export const SmallStack: Story = {
  name: 'Stack sm (table cell)',
  render: () => ({
    props: { signers },
    template: `<div style="${row}">
      <k-avatar-stack
        data-testid="stack-sm"
        size="sm"
        [names]="signers"
        ariaLabel="Unterzeichnende: Anna Berger, Jonas Becker, Max Beispiel und 2 weitere"
      />
      <span class="k-caption k-num">2/3</span>
    </div>`,
  }),
};
