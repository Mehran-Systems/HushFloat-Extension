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
    plugins: [
      {
        name: 'strip-unused-react-dom-innerhtml',
        transform(code, id) {
          if (id.includes('react-dom') && code.includes('.innerHTML=')) {
            return {
              code: code
                .replace(/([a-zA-Z0-9_$]+)\.innerHTML=([a-zA-Z0-9_$]+)/g, '$1.textContent=$2')
                .replace(
                  /([a-zA-Z0-9_$]+)\.innerHTML="<svg>"\+([a-zA-Z0-9_$]+)\.valueOf\(\)\.toString\(\)\+"<\/svg>"/g,
                  '$1.textContent=""'
                ),
              map: null,
            };
          }
          return null;
        },
      },
    ],
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
              strict_min_version: '140.0',
              data_collection_permissions: {
                required: ['none'],
                optional: ['technicalAndInteraction'],
              },
            },
            gecko_android: {
              strict_min_version: '142.0',
            },
          },
        }
      : {}),
  }),
});

