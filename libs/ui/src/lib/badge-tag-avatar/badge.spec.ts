import { render, screen } from '@testing-library/angular';
import { BadgeComponent, type BadgeTone } from './badge';

describe('k-badge', () => {
  it('neutral by default: class k-badge without a tone modifier, the text is the status', async () => {
    await render(`<k-badge data-testid="badge">Entwurf</k-badge>`, {
      imports: [BadgeComponent],
    });

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('k-badge');
    // neutral = no modifier in the reference (like Button md), never k-badge--neutral
    expect(badge.className).toBe('k-badge');
    expect(badge).toHaveTextContent(/^Entwurf$/); // the dot is CSS ::before, not text
  });

  it.each<[BadgeTone, string]>([
    ['success', 'Signiert'],
    ['warning', 'Wartet'],
    ['error', 'Abgelehnt'],
    ['info', 'In Prüfung'],
  ])('tone "%s" adds its modifier (%s)', async (tone, text) => {
    await render(
      `<k-badge data-testid="badge" [tone]="tone">${text}</k-badge>`,
      { imports: [BadgeComponent], componentProperties: { tone } },
    );

    expect(screen.getByTestId('badge').className).toBe(
      `k-badge k-badge--${tone}`,
    );
    expect(screen.getByTestId('badge')).toHaveTextContent(text);
  });
});
