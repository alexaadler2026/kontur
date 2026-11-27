import {
  LucideFileText,
  LucideHistory,
  LucideHouse,
  LucideInbox,
  LucideSend,
} from '@lucide/angular';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { AvatarComponent } from '../badge-tag-avatar/avatar';
import { SidenavGroupComponent } from './sidenav-group';
import { SidenavItemComponent } from './sidenav-item';
import { SidenavComponent } from './sidenav';

// Item texts follow docs/design/components/SideNav.html; they are documentation
// examples, not product text (that goes through i18n). aria-current is set by hand
// here — in the app it comes from routerLinkActive.

const nav = (
  body: string,
) => `<k-sidenav ariaLabel="Hauptnavigation" style="display: block; height: 360px;">
  <span kSidenavBrand style="padding: 4px 12px 12px; font-weight: 600;">SignFlow</span>
  ${body}
</k-sidenav>`;

const item = (icon: string, text: string, extra = '') =>
  `<a k-sidenav-item href="#" ${extra}><svg ${icon} class="k-ico"></svg>${text}</a>`;

const full = nav(`
  ${item('lucideHouse', 'Übersicht')}
  ${item('lucideInbox', 'Dokumente', 'aria-current="page" [count]="12"')}
  ${item('lucideSend', 'Gesendet')}
  ${item('lucideHistory', 'Protokoll')}
  <k-sidenav-group label="Verwaltung">
    ${item('lucideFileText', 'Vorlagen')}
  </k-sidenav-group>
  <div kSidenavFooter style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--border-subtle);">
    <k-avatar name="Max Beispiel" />
    <span class="k-caption">max.beispiel&#64;firma.de</span>
  </div>`);

const meta: Meta<SidenavComponent> = {
  title: 'Components/SideNav',
  component: SidenavComponent,
  decorators: [
    moduleMetadata({
      imports: [
        SidenavItemComponent,
        SidenavGroupComponent,
        AvatarComponent,
        LucideHouse,
        LucideInbox,
        LucideSend,
        LucideHistory,
        LucideFileText,
      ],
    }),
  ],
};
export default meta;
type Story = StoryObj<SidenavComponent>;

/** Brand, items with icons, active item with count, group, profile in the footer. */
export const Default: Story = { render: () => ({ template: full }) };

/** Active item: brand-subtle background, brand colour, weight 500, aria-current="page". */
export const ActiveItem: Story = {
  name: 'Active item',
  render: () => ({
    template: nav(`
      ${item('lucideHouse', 'Übersicht', 'aria-current="page"')}
      ${item('lucideInbox', 'Dokumente')}`),
  }),
};

/** Counts in k-count (mono); read as "Entwürfe, 3". */
export const Counts: Story = {
  render: () => ({
    template: nav(`
      ${item('lucideInbox', 'Dokumente', '[count]="12"')}
      ${item('lucideFileText', 'Entwürfe', '[count]="3"')}
      ${item('lucideSend', 'Gesendet')}`),
  }),
};

/** A group with a visible label: role="group" named by it. */
export const Group: Story = {
  render: () => ({
    template: nav(`
      ${item('lucideHouse', 'Übersicht')}
      <k-sidenav-group label="Verwaltung">
        ${item('lucideFileText', 'Vorlagen')}
      </k-sidenav-group>`),
  }),
};

/** Visible focus (focus-ring token): .is-focus mirrors :focus-visible statically. */
export const Focused: Story = {
  render: () => ({
    template: nav(`
      ${item('lucideHouse', 'Übersicht', 'aria-current="page"')}
      ${item('lucideInbox', 'Dokumente', 'class="is-focus" [count]="12"')}
      ${item('lucideSend', 'Gesendet')}`),
  }),
};

export const DarkTheme: Story = {
  name: 'Dark theme',
  render: () => ({
    template: `<div data-theme="dark" style="background: var(--bg-page);">${full}</div>`,
  }),
};
