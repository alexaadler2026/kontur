import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { ButtonComponent } from '../button/button';
import { TagComponent } from './tag';

// Tag texts are documentation examples from docs/design/components/Tag.html,
// not product text (product text goes through i18n). The remove button's action word
// comes from KonturIntl — in this Storybook from Transloco, so it follows the toolbar.

const row =
  'display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 16px;';

const states = `<div style="${row}">
  <k-tag>Verpflegung</k-tag>
  <k-tag removable>NDA</k-tag>
  <k-tag removable>Q4-2026</k-tag>
</div>`;

/**
 * The focus pattern after removal (Tag.md): the tag only emits `removed`; this consumer
 * deletes it and moves the focus to the next tag's button, else the previous one, else
 * the "add filter" button — so keyboard users never land on <body>.
 */
@Component({
  selector: 'k-story-filter-bar',
  imports: [TagComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="${row}" data-testid="filter-bar">
      @for (filter of filters(); track filter; let index = $index) {
        <k-tag removable (removed)="remove(index)">{{ filter }}</k-tag>
      }
      <button k-button variant="ghost" size="sm" data-testid="add-filter">
        Filter hinzufügen
      </button>
    </div>
  `,
})
class FilterBarStoryComponent {
  protected readonly filters = signal(['NDA', 'Q4-2026', 'Signiert']);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected remove(index: number): void {
    this.filters.update((list) => list.filter((_, i) => i !== index));
    // after Angular has removed the tag from the DOM
    afterNextRender(
      () => {
        const buttons = this.host.querySelectorAll<HTMLElement>('.k-tag-x');
        const next = buttons[index] ?? buttons[index - 1];
        (
          next ??
          this.host.querySelector<HTMLElement>('[data-testid="add-filter"]')
        )?.focus();
      },
      { injector: this.injector },
    );
  }
}

const meta: Meta<TagComponent> = {
  title: 'Components/Tag',
  component: TagComponent,
};
export default meta;
type Story = StoryObj<TagComponent>;

export const States: Story = {
  render: () => ({ template: states }),
};

export const DarkTheme: Story = {
  name: 'Dark theme',
  render: () => ({
    template: `<div data-theme="dark" style="background: var(--bg-page);">${states}</div>`,
  }),
};

/** Long German and Russian categories stay on one line (white-space: nowrap). */
export const LongLabels: Story = {
  name: 'Long labels (de, ru)',
  render: () => ({
    template: `<div style="${row}">
      <k-tag removable>Auftragsverarbeitungsvertrag</k-tag>
      <k-tag removable>Канцелярские товары</k-tag>
    </div>`,
  }),
};

export const FilterBar: Story = {
  name: 'Filter bar (focus after removal)',
  decorators: [moduleMetadata({ imports: [FilterBarStoryComponent] })],
  render: () => ({ template: `<k-story-filter-bar />` }),
};
