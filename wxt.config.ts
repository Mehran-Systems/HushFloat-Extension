import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  zip: {
    name: 'hushfloat',
    artifactTemplate: '{{name}}-{{version}}-{{browser}}.zip',
    sourcesTemplate: '{{name}}-{{version}}-sources.zip',
  },
  vite: () => ({
    define: {
      __BROWSER_PROFILE_NAME__: JSON.stringify(process.env.HUSHFLOAT_DEFAULT_PROFILE_NAME || ''),
    },
  }),
  manifest: ({ browser }) => ({
    name: 'HushFloat',
    short_name: 'HushFloat',
    description:
      'Create your sanctuary. Ambient sound mixer, sleep timer, brainwaves & focus mode by Mehran Systems.',
    version: '1.0.1',
    author: 'Mehran Systems',
    homepage_url: 'https://mehransystems.com',
    permissions: [
      'storage',
      'alarms',
      ...(browser === 'firefox' ? [] : ['offscreen']),
    ],
    icons: {
      16: 'icon/logo-v2-16.png',
      32: 'icon/logo-v2-32.png',
      48: 'icon/logo-v2-48.png',
      96: 'icon/logo-v2-96.png',
      128: 'icon/logo-v2-128.png',
    },
    action: {
      default_title: 'HushFloat — Create your sanctuary',
      default_popup: 'popup.html',
      default_icon: {
        16: 'icon/logo-v2-16.png',
        32: 'icon/logo-v2-32.png',
        48: 'icon/logo-v2-48.png',
        96: 'icon/logo-v2-96.png',
        128: 'icon/logo-v2-128.png',
      },
    },
    ...(browser === 'firefox'
      ? {
          browser_action: {
            default_title: 'HushFloat — Create your sanctuary',
            default_popup: 'popup.html',
            default_icon: {
              16: 'icon/logo-v2-16.png',
              32: 'icon/logo-v2-32.png',
              48: 'icon/logo-v2-48.png',
              96: 'icon/logo-v2-96.png',
              128: 'icon/logo-v2-128.png',
            },
          },
          browser_specific_settings: {
            gecko: {
              id: 'hushfloat@mehransystems.com',
              strict_min_version: '109.0',
            },
          },
        }
      : {}),
  }),
});

