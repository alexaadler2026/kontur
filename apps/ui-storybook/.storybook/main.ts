import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  // Docs pages of this host app + stories that live next to the components in libs/ui.
  stories: [
    '../src/**/*.@(mdx|stories.ts)',
    '../../../libs/ui/src/**/*.@(mdx|stories.ts)',
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/angular',
    options: {},
  },
};

export default config;
