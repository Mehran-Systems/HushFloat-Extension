import translationsRaw from './translations.json';

export interface AppLocale {
  tag: string;
  nativeName: string;
  englishName: string;
}

export const supportedLocales: AppLocale[] = [
  { tag: 'es', nativeName: 'Español', englishName: 'Spanish' },
  { tag: 'fr', nativeName: 'Français', englishName: 'French' },
  { tag: 'de', nativeName: 'Deutsch', englishName: 'German' },
  { tag: 'ja', nativeName: '日本語', englishName: 'Japanese' },
  { tag: 'zh-CN', nativeName: '中文 (简体)', englishName: 'Chinese' },
  { tag: 'ar', nativeName: 'العربية', englishName: 'Arabic' },
  { tag: 'ur', nativeName: 'اردو', englishName: 'Urdu' },
  { tag: 'pt', nativeName: 'Português', englishName: 'Portuguese' },
  { tag: 'it', nativeName: 'Italiano', englishName: 'Italian' },
  { tag: 'nl', nativeName: 'Nederlands', englishName: 'Dutch' },
  { tag: 'pl', nativeName: 'Polski', englishName: 'Polish' },
  { tag: 'ru', nativeName: 'Русский', englishName: 'Russian' },
  { tag: 'uk', nativeName: 'Українська', englishName: 'Ukrainian' },
  { tag: 'tr', nativeName: 'Türkçe', englishName: 'Turkish' },
  { tag: 'iw', nativeName: 'עברית', englishName: 'Hebrew' },
  { tag: 'fa', nativeName: 'فارسی', englishName: 'Persian' },
  { tag: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi' },
  { tag: 'bn', nativeName: 'বাংলা', englishName: 'Bengali' },
  { tag: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil' },
  { tag: 'te', nativeName: 'తెలుగు', englishName: 'Telugu' },
  { tag: 'mr', nativeName: 'मराठी', englishName: 'Marathi' },
  { tag: 'ko', nativeName: '한국어', englishName: 'Korean' },
  { tag: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese' },
  { tag: 'in', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian' },
  { tag: 'th', nativeName: 'ภาษาไทย', englishName: 'Thai' },
  { tag: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay' },
  { tag: 'fil', nativeName: 'Filipino', englishName: 'Filipino' },
  { tag: 'el', nativeName: 'Ελληνικά', englishName: 'Greek' },
  { tag: 'ro', nativeName: 'Română', englishName: 'Romanian' },
  { tag: 'sv', nativeName: 'Svenska', englishName: 'Swedish' },
  { tag: 'cs', nativeName: 'Čeština', englishName: 'Czech' },
  { tag: 'en', nativeName: 'English', englishName: 'English' },
];

const translations = translationsRaw as Record<string, Record<string, string>>;

export function resolveLocaleTag(selectedLocale: string | null): string {
  if (!selectedLocale) {
    const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
    if (nav.toLowerCase().startsWith('zh')) return 'zh-CN';
    const short = nav.split('-')[0].toLowerCase();
    if (short === 'he') return 'iw';
    if (short === 'id') return 'in';
    if (translations[short]) return short;
    return 'en';
  }
  if (translations[selectedLocale]) return selectedLocale;
  const short = selectedLocale.split('-')[0];
  if (translations[short]) return short;
  return 'en';
}

export function t(key: string, localeTag: string | null, ...args: (string | number)[]): string {
  const tag = resolveLocaleTag(localeTag);
  const dict = translations[tag] || translations['en'] || {};
  const fallback = translations['en'] || {};
  let raw = dict[key] ?? fallback[key] ?? key;

  args.forEach((arg, idx) => {
    const pos = idx + 1;
    // Match Android %1$s, %1$d, %1$02d, or %s
    raw = raw.replace(new RegExp(`%${pos}\\$02d`, 'g'), String(arg).padStart(2, '0'));
    raw = raw.replace(new RegExp(`%${pos}\\$[sd]`, 'g'), String(arg));
  });
  if (args.length === 1) {
    raw = raw.replace(/%[sd]/g, String(args[0]));
  }
  return raw;
}

export function localizedPresetName(presetName: string, localeTag: string | null): string {
  switch (presetName) {
    case 'Deep Night Slumber':
      return t('preset_deep_night', localeTag);
    case 'Thunderstorm Sanctuary':
      return t('preset_thunder_sanctuary', localeTag);
    case 'Deep Focus & Study':
      return t('preset_deep_focus', localeTag);
    case 'Campfire in Pines':
      return t('preset_campfire_pines', localeTag);
    case 'Airplane Cabin Quiet':
      return t('preset_airplane_quiet', localeTag);
    default:
      return presetName;
  }
}

export const HelpContent = {
  TITLE: 'Help & FAQs',
  INTRO:
    "Welcome to HushFloat. Here's everything you need to build your perfect soundscape — whether you're winding down, settling in to focus, or drifting off to sleep.",
  SUPPORT_EMAIL: 'support@mehransystems.com',
  CONTACT_CTA: 'Contact support',
  faqs: [
    {
      question: 'How does mixing work?',
      answer:
        'Click any sound tile to add it to your mix, and click it again to remove it. Each active sound has its own volume slider, so you can blend soft rain under brown noise or a gentle brainwave tone under birdsong. Mix as many layers as you like.',
    },
    {
      question: 'What are the different sound categories?',
      answer:
        'Colored Noise: steady white, pink and brown noise for masking distractions.\n\nBiophonic: nature sounds like rain, ocean, birds and wildlife.\n\nAnthrophonic: human-made ambience such as cafés, trains and city hum.\n\nBrainwave: tones designed for relaxation and focus — best enjoyed with headphones.',
    },
    {
      question: 'How do I save a mix as a favourite?',
      answer:
        'Once your mix sounds right, open Favourites (heart button on the Master Control bar) and save the current mix with a name. You can replay it anytime with one click.',
    },
    {
      question: 'Can I share a mix with someone?',
      answer:
        'Yes. Use the Share icon in the top header to copy a shareable HushFloat link. Anyone with HushFloat on Android or Browser can load your exact blend.',
    },
    {
      question: 'How does the sleep timer work?',
      answer:
        'Set a duration (15, 30, 45, or 60 minutes) and HushFloat will gently fade out and stop your mix when time is up, even if you close the popup.',
    },
    {
      question: "What's the focus timer for?",
      answer:
        'The 25m Focus Mode gives your work or study session a clear Pomodoro structure (25m Work / 5m Rest) while keeping your ambient sanctuary playing.',
    },
    {
      question: 'Does playback continue when I close the extension popup?',
      answer:
        'Yes! HushFloat runs a persistent background audio engine so your soundscape continues smoothly across all tabs until you pause it or your Sleep Timer finishes.',
    },
    {
      question: 'Can I change the extension language?',
      answer:
        'Yes. HushFloat is available in 32 languages. Change it anytime from Language in the top-right overflow menu.',
    },
    {
      question: 'How do I contact support?',
      answer:
        "Email us at support@mehransystems.com and we'll get back to you as soon as we can.",
    },
  ],
};

export const LegalContent = {
  TITLE: 'Terms & Privacy',
  EFFECTIVE_DATE: 'Effective date: October 21, 2026',
  COMPANY: 'Mehran Systems',
  SUPPORT_EMAIL: 'support@mehransystems.com',
  termsIntro:
    'These Terms apply when you use HushFloat, an application and browser extension by Mehran Systems. By using HushFloat, you agree to them.',
  termsSections: [
    {
      heading: 'Using HushFloat',
      body: "We give you a personal, non-exclusive, non-transferable license to use HushFloat on your own devices for personal, non-commercial purposes. Please don't copy, resell, reverse-engineer or redistribute the extension or its sounds.",
    },
    {
      heading: 'Wellness, not medicine',
      body: 'HushFloat provides ambient and relaxation sounds for general wellness, comfort and focus. It is not a medical device and does not diagnose, treat or cure any condition, including insomnia, tinnitus, anxiety or ADHD.',
    },
    {
      heading: 'Listen safely',
      body: "• Keep volume at a comfortable, moderate level. Long exposure to loud sound can damage hearing.\n• Don't use HushFloat in situations that need your full attention, such as driving or operating machinery — especially with brainwave sounds.\n• If you have epilepsy, a seizure disorder or a pacemaker, check with your doctor before using brainwave sounds.",
    },
    {
      heading: 'Your mixes and favourites',
      body: 'The mixes and favourites you create belong to you and are stored locally in your browser. When you share a mix, the link contains your sound settings.',
    },
    {
      heading: 'Availability',
      body: 'We work to keep HushFloat reliable, but we provide it "as is." To the extent permitted by law, Mehran Systems is not liable for indirect or incidental damages arising from your use of the software.',
    },
  ],
  privacyIntro:
    'Your quiet time is yours. HushFloat does not require an account, and we collect as little as possible.',
  privacySections: [
    {
      heading: 'What stays on your device',
      body: '• Your mixes, favourites, timer settings, custom greeting name, and language preference are stored locally via browser storage and are never uploaded to external servers.',
    },
    {
      heading: 'Anonymous usage analytics (Optional)',
      body: '• To help improve HushFloat, the extension sends anonymous, non-identifiable feature usage events (such as sound toggles and timer usage) via Google Analytics 4 Measurement Protocol using a random UUID.\n• No browsing history, web page content, personal data, or email addresses are ever collected. You can turn off anonymous analytics at any time using the toggle below.',
    },
    {
      heading: 'Permissions',
      body: 'HushFloat only asks for what it needs:\n• storage: to save your custom sound mixes, favourites, and preferences locally.\n• alarms: to run your Sleep Timer, Smart Wake-Up Alarm, and Focus Pomodoro timer accurately in the background.\n• offscreen (Chromium/Opera): to keep your relaxing audio playing smoothly when the popup is closed.',
    },
    {
      heading: 'Contact',
      body: 'Mehran Systems\nsupport@mehransystems.com',
    },
  ],
};
