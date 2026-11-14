import { render } from '@testing-library/angular';
import { ErrorIconComponent } from './error-icon';

describe('svg[k-error-icon]', () => {
  it('renders decorative SVG paths in the SVG namespace (otherwise the browser draws nothing)', async () => {
    const { container } = await render(`<svg k-error-icon></svg>`, {
      imports: [ErrorIconComponent],
    });

    const svg = container.querySelector('svg');
    const paths = svg?.querySelectorAll('path') ?? [];
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(paths).toHaveLength(2);
    expect(paths[0]?.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });
});
