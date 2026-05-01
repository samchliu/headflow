import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    const basePath = process.env.STORYBOOK_BASE_PATH
    if (basePath && basePath.length > 0) {
      const normalized = basePath.endsWith('/') ? basePath : `${basePath}/`
      config.base = normalized
    }
    return config
  },
}

export default config
