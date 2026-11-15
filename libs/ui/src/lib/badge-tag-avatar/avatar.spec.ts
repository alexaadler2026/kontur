import { render, screen } from '@testing-library/angular';
import { AvatarComponent } from './avatar';
import { AvatarStackComponent } from './avatar-stack';
import { initials } from './initials';

describe('initials (first letters of the first and the last word)', () => {
  it.each([
    ['Anna Berger', 'AB'],
    ['Max', 'M'], // one word, one letter
    ['  jonas   becker ', 'JB'], // extra spaces, lower case
    ['Ursula von der Leyen', 'UL'], // last word, not the second
    ['Anna-Maria Schmidt', 'AS'], // a hyphenated first name is one word
    ['Özlem Çelik', 'ÖÇ'],
    ['Анна Беркер', 'АБ'],
    ['Émile Zola', 'ÉZ'], // É written as E + combining accent stays whole
    ['', ''],
  ])('%j → %j', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe('k-avatar', () => {
  it('is an image named by the full name; the initials are only visual', async () => {
    await render(`<k-avatar name="Anna Berger" />`, {
      imports: [AvatarComponent],
    });

    const avatar = screen.getByRole('img', { name: 'Anna Berger' });
    expect(avatar).toHaveTextContent('AB');
    expect(avatar.className).toBe('k-avatar'); // md = no modifier
  });

  it('size "sm" adds k-avatar--sm', async () => {
    await render(`<k-avatar name="Jonas Becker" size="sm" />`, {
      imports: [AvatarComponent],
    });

    expect(screen.getByRole('img', { name: 'Jonas Becker' }).className).toBe(
      'k-avatar k-avatar--sm',
    );
  });
});

describe('k-avatar-stack', () => {
  const five = [
    'Anna Berger',
    'Jonas Becker',
    'Max Beispiel',
    'Lena Vogel',
    'Ivan Petrov',
  ];

  it('shows max 3 avatars + "+N" (k-avatar--more), and is ONE image with the given label', async () => {
    await render(
      `<k-avatar-stack [names]="names" ariaLabel="Unterzeichnende: Anna Berger, Jonas Becker, Max Beispiel und 2 weitere" />`,
      { imports: [AvatarStackComponent], componentProperties: { names: five } },
    );

    // only the stack is in the accessibility tree: names are not read twice
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
    const stack = screen.getByRole('img', {
      name: 'Unterzeichnende: Anna Berger, Jonas Becker, Max Beispiel und 2 weitere',
    });
    expect(stack).toHaveClass('k-avatar-stack');

    const items = [...stack.querySelectorAll('.k-avatar')];
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'AB',
      'JB',
      'MB',
      '+2',
    ]);
    expect(items[3]).toHaveClass('k-avatar--more');
    expect(stack.querySelectorAll('.k-avatar--more')).toHaveLength(1);
  });

  it('no "+N" when all names fit', async () => {
    await render(
      `<k-avatar-stack [names]="names" ariaLabel="Unterzeichnende" />`,
      {
        imports: [AvatarStackComponent],
        componentProperties: { names: five.slice(0, 3) },
      },
    );

    const stack = screen.getByRole('img', { name: 'Unterzeichnende' });
    expect(stack.querySelectorAll('.k-avatar')).toHaveLength(3);
    expect(stack.querySelector('.k-avatar--more')).toBeNull();
  });

  it('max is configurable: max 2 of 3 → 2 avatars + "+1"', async () => {
    await render(
      `<k-avatar-stack [names]="names" [max]="2" ariaLabel="Unterzeichnende" />`,
      {
        imports: [AvatarStackComponent],
        componentProperties: { names: five.slice(0, 3) },
      },
    );

    const stack = screen.getByRole('img', { name: 'Unterzeichnende' });
    expect(
      [...stack.querySelectorAll('.k-avatar')].map((item) =>
        item.textContent?.trim(),
      ),
    ).toEqual(['AB', 'JB', '+1']);
  });
});
