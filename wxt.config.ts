import { defineConfig } from 'wxt';
import fs from 'node:fs';
import path from 'node:path';

function detectBrowserProfileName(): string {
  try {
    const candidates: string[] = [];
    if (process.env.APPDATA) {
      candidates.push(path.join(process.env.APPDATA, 'Mozilla', 'Firefox'));
    }
    if (process.env.LOCALAPPDATA) {
      const pkgDir = path.join(process.env.LOCALAPPDATA, 'Packages');
      if (fs.existsSync(pkgDir)) {
        for (const d of fs.readdirSync(pkgDir)) {
          if (d.startsWith('Mozilla.Firefox')) {
            candidates.push(path.join(pkgDir, d, 'LocalCache', 'Roaming', 'Mozilla', 'Firefox'));
          }
        }
      }
    }

    for (const ffRoot of candidates) {
      if (!fs.existsSync(ffRoot)) continue;

      // 1. Check Firefox Profile Groups SQLite / WAL for custom profile name (e.g. "Jawad Millan")
      const pgDir = path.join(ffRoot, 'Profile Groups');
      if (fs.existsSync(pgDir)) {
        const files = fs.readdirSync(pgDir).sort((a, b) => (b.endsWith('-wal') ? 1 : -1));
        for (const f of files) {
          if (!f.includes('.sqlite')) continue;
          const buf = fs.readFileSync(path.join(pgDir, f));
          const text = buf.toString('utf8');
          const regex =
            /Profiles\\[A-Za-z0-9._ -]+?\.Profile \d+([A-Za-z0-9 _.-]{2,35}?)(?:shopping|heart|star|flower|book|briefcase|default-theme|nova-)/g;
          let m: RegExpExecArray | null;
          while ((m = regex.exec(text)) !== null) {
            const name = m[1].trim();
            if (name && !/^Profile \d+$/i.test(name) && name !== 'Original profile') {
              return name;
            }
          }
        }
      }

      // 2. Check signedInUser.json in Firefox profiles
      const profilesDir = path.join(ffRoot, 'Profiles');
      if (fs.existsSync(profilesDir)) {
        for (const prof of fs.readdirSync(profilesDir)) {
          const signedInPath = path.join(profilesDir, prof, 'signedInUser.json');
          if (fs.existsSync(signedInPath)) {
            const raw = JSON.parse(fs.readFileSync(signedInPath, 'utf8'));
            const displayName = raw?.accountData?.displayName;
            if (displayName && typeof displayName === 'string') return displayName.trim();
            const email = raw?.accountData?.email;
            if (email && typeof email === 'string') return email.split('@')[0];
          }
        }
      }
    }
  } catch {}
  return '';
}

const detectedProfileName = detectBrowserProfileName();

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    define: {
      __BROWSER_PROFILE_NAME__: JSON.stringify(detectedProfileName),
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
      ...(browser === 'firefox' ? [] : ['offscreen', 'identity', 'identity.email']),
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
