export type SoundCategory = 'COLORED_NOISE' | 'BIOPHONIC' | 'ANTHROPHONIC' | 'BRAINWAVE';

export interface SoundTrack {
  id: string;
  nameKey: string;
  subtitleKey: string;
  defaultSubtitle: string;
  category: SoundCategory;
  filename: string;
  assetFile?: string; // relative to /audio/
  iconName: string;
}

export interface SoundPreset {
  name: string;
  volumes: Record<string, number>;
}

const coloredNoise: SoundTrack[] = [
  { id: 'cn_white', nameKey: 'sound_cn_white', subtitleKey: 'sub_cn_white', defaultSubtitle: '24 Sounds', category: 'COLORED_NOISE', filename: 'noise_white', iconName: 'graphic_eq' },
  { id: 'cn_pink', nameKey: 'sound_cn_pink', subtitleKey: 'sub_cn_pink', defaultSubtitle: 'Balanced Ambient', category: 'COLORED_NOISE', filename: 'noise_pink', iconName: 'graphic_eq' },
  { id: 'cn_brown', nameKey: 'sound_cn_brown', subtitleKey: 'sub_cn_brown', defaultSubtitle: 'Deep Resonance', category: 'COLORED_NOISE', filename: 'noise_brown', iconName: 'graphic_eq' },
  { id: 'cn_blue', nameKey: 'sound_cn_blue', subtitleKey: 'sub_cn_blue', defaultSubtitle: 'High Frequency', category: 'COLORED_NOISE', filename: 'noise_blue', iconName: 'graphic_eq' },
  { id: 'cn_violet', nameKey: 'sound_cn_violet', subtitleKey: 'sub_cn_violet', defaultSubtitle: 'Crisp Spectrum', category: 'COLORED_NOISE', filename: 'noise_violet', iconName: 'graphic_eq' },
];

const biophonic: SoundTrack[] = [
  { id: 'bio_light_rain', nameKey: 'sound_bio_light_rain', subtitleKey: 'sub_bio_light_rain', defaultSubtitle: '14 Sounds', category: 'BIOPHONIC', filename: 'rain_light', assetFile: 'rain_light.mp3', iconName: 'water_drop' },
  { id: 'bio_ocean', nameKey: 'sound_bio_ocean', subtitleKey: 'sub_bio_ocean', defaultSubtitle: 'Coastal Rhythms', category: 'BIOPHONIC', filename: 'ocean_waves', assetFile: 'ocean_waves.mp3', iconName: 'waves' },
  { id: 'bio_forest_wind', nameKey: 'sound_bio_forest_wind', subtitleKey: 'sub_bio_forest_wind', defaultSubtitle: 'Rustling Pines', category: 'BIOPHONIC', filename: 'wind_forest', assetFile: 'wind_forest.wav', iconName: 'air' },
  { id: 'bio_thunder', nameKey: 'sound_bio_thunder', subtitleKey: 'sub_bio_thunder', defaultSubtitle: 'Storm & Rain', category: 'BIOPHONIC', filename: 'thunder_dist', assetFile: 'thunder_dist.mp3', iconName: 'thunderstorm' },
  { id: 'bio_campfire', nameKey: 'sound_bio_campfire', subtitleKey: 'sub_bio_campfire', defaultSubtitle: 'Warm Embers', category: 'BIOPHONIC', filename: 'campfire', assetFile: 'campfire.wav', iconName: 'local_fire_department' },
  { id: 'bio_waterfall', nameKey: 'sound_bio_waterfall', subtitleKey: 'sub_bio_waterfall', defaultSubtitle: 'Cascading Flow', category: 'BIOPHONIC', filename: 'waterfall', assetFile: 'waterfall.wav', iconName: 'droplet' },
  { id: 'bio_city_rain', nameKey: 'sound_bio_city_rain', subtitleKey: 'sub_bio_city_rain', defaultSubtitle: 'Street Ambience', category: 'BIOPHONIC', filename: 'rain_city', assetFile: 'rain_city.wav', iconName: 'umbrella' },
  { id: 'bio_crickets', nameKey: 'sound_bio_crickets', subtitleKey: 'sub_bio_crickets', defaultSubtitle: 'Night Meadow', category: 'BIOPHONIC', filename: 'crickets', assetFile: 'crickets.wav', iconName: 'bug_report' },
  { id: 'bio_stream', nameKey: 'sound_bio_stream', subtitleKey: 'sub_bio_stream', defaultSubtitle: 'Babbling Brook', category: 'BIOPHONIC', filename: 'stream', assetFile: 'stream.wav', iconName: 'landscape' },
  { id: 'bio_birds', nameKey: 'sound_bio_birds', subtitleKey: 'sub_bio_birds', defaultSubtitle: 'Morning Song', category: 'BIOPHONIC', filename: 'birds', assetFile: 'birds.wav', iconName: 'flutter_dash' },
];

const anthrophonic: SoundTrack[] = [
  { id: 'ant_train', nameKey: 'sound_ant_train', subtitleKey: 'sub_ant_train', defaultSubtitle: 'Rhythmic Track', category: 'ANTHROPHONIC', filename: 'train_ride', assetFile: 'train_ride.wav', iconName: 'train' },
  { id: 'ant_fan', nameKey: 'sound_ant_fan', subtitleKey: 'sub_ant_fan', defaultSubtitle: 'Steady Whir', category: 'ANTHROPHONIC', filename: 'fan', assetFile: 'fan.wav', iconName: 'cyclone' },
  { id: 'ant_cosmic', nameKey: 'sound_ant_cosmic', subtitleKey: 'sub_ant_cosmic', defaultSubtitle: 'Deep Ambient', category: 'ANTHROPHONIC', filename: 'vacuum', assetFile: 'vacuum.flac', iconName: 'cosmic' },
  { id: 'ant_heartbeat', nameKey: 'sound_ant_heartbeat', subtitleKey: 'sub_ant_heartbeat', defaultSubtitle: 'Soothing Pulse', category: 'ANTHROPHONIC', filename: 'heartbeat', iconName: 'favorite' },
  { id: 'ant_airplane', nameKey: 'sound_ant_airplane', subtitleKey: 'sub_ant_airplane', defaultSubtitle: 'Cruising Flight', category: 'ANTHROPHONIC', filename: 'airplane_cabin', assetFile: 'airplane_cabin.mp3', iconName: 'flight' },
  { id: 'ant_cafe', nameKey: 'sound_ant_cafe', subtitleKey: 'sub_ant_cafe', defaultSubtitle: 'Soft Murmur', category: 'ANTHROPHONIC', filename: 'cafe_ambience', assetFile: 'cafe_ambience.mp3', iconName: 'coffee' },
  { id: 'ant_keyboard', nameKey: 'sound_ant_keyboard', subtitleKey: 'sub_ant_keyboard', defaultSubtitle: 'Rhythmic Typing', category: 'ANTHROPHONIC', filename: 'keyboard_typing', assetFile: 'keyboard_typing.mp3', iconName: 'keyboard' },
  { id: 'ant_womb', nameKey: 'sound_ant_womb', subtitleKey: 'sub_ant_womb', defaultSubtitle: 'Nurturing Tone', category: 'ANTHROPHONIC', filename: 'womb_sound', assetFile: 'womb_sound.mp3', iconName: 'child_care' },
];

const brainwave: SoundTrack[] = [
  { id: 'bw_delta', nameKey: 'sound_bw_delta', subtitleKey: 'sub_bw_delta', defaultSubtitle: 'Deep Sleep', category: 'BRAINWAVE', filename: 'procedural', iconName: 'moon_stars' },
  { id: 'bw_theta', nameKey: 'sound_bw_theta', subtitleKey: 'sub_bw_theta', defaultSubtitle: 'Meditation', category: 'BRAINWAVE', filename: 'procedural', iconName: 'theta' },
  { id: 'bw_alpha', nameKey: 'sound_bw_alpha', subtitleKey: 'sub_bw_alpha', defaultSubtitle: 'Relaxation', category: 'BRAINWAVE', filename: 'procedural', iconName: 'alpha' },
];

export const allSounds: SoundTrack[] = [
  // Row 1: Deep Sleep, Ocean Waves, Forest Rain
  brainwave[0],
  biophonic[1],
  biophonic[0],
  // Row 2: White Noise, Distant Thunder, Campfire
  coloredNoise[0],
  biophonic[3],
  biophonic[4],
  // Row 3: Cosmic Space, Mountain Stream, Forest Wind
  anthrophonic[2],
  biophonic[8],
  biophonic[2],
  // Remaining 17 sounds in library
  coloredNoise[1],
  coloredNoise[2],
  coloredNoise[3],
  coloredNoise[4],
  biophonic[5],
  biophonic[6],
  biophonic[7],
  biophonic[9],
  anthrophonic[0],
  anthrophonic[1],
  anthrophonic[3],
  anthrophonic[4],
  anthrophonic[5],
  anthrophonic[6],
  anthrophonic[7],
  brainwave[1],
  brainwave[2],
];

const legacyIdMap: Record<string, string> = {
  ant_vacuum: 'ant_cosmic',
  bw_4hz: 'bw_delta',
};

export function resolveSoundId(id: string): string {
  return legacyIdMap[id] ?? id;
}

export function findSoundById(id: string): SoundTrack | undefined {
  const target = resolveSoundId(id);
  return allSounds.find((s) => s.id === target);
}

export const defaultSavedMixes: SoundPreset[] = [
  {
    name: 'Deep Night Slumber',
    volumes: { bw_delta: 0.7, bio_ocean: 0.75, cn_brown: 0.55 },
  },
  {
    name: 'Thunderstorm Sanctuary',
    volumes: { bio_thunder: 0.8, bio_light_rain: 0.7, bio_forest_wind: 0.5 },
  },
  {
    name: 'Deep Focus & Study',
    volumes: { bw_alpha: 0.65, ant_cafe: 0.6, cn_pink: 0.45 },
  },
  {
    name: 'Campfire in Pines',
    volumes: { bio_campfire: 0.85, bio_forest_wind: 0.6, bio_stream: 0.5 },
  },
];

export const curatedSoundscapes: SoundPreset[] = [
  {
    name: 'Airplane Cabin Quiet',
    volumes: { ant_airplane: 0.85, cn_white: 0.4, bw_delta: 0.6 },
  },
];

export function encodeMix(mixMap: Record<string, number>): string {
  const compact = Object.entries(mixMap)
    .filter(([, vol]) => vol > 0)
    .map(([id, vol]) => {
      const index = allSounds.findIndex((s) => s.id === id);
      const volStr =
        vol === 1
          ? '1'
          : vol
              .toFixed(2)
              .replace(/0+$/, '')
              .replace(/\.$/, '');
      return `${index >= 0 ? index : id}:${volStr}`;
    })
    .join(',');
  return btoa(compact).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeMix(encoded: string): Record<string, number> {
  const mixMap: Record<string, number> = {};
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const decodedStr = atob(base64);
    for (const pair of decodedStr.split(',')) {
      const [keyPart, volPart] = pair.split(':');
      const vol = parseFloat(volPart);
      if (!isNaN(vol) && vol > 0) {
        const idx = parseInt(keyPart, 10);
        const id =
          !isNaN(idx) && idx >= 0 && idx < allSounds.length
            ? allSounds[idx].id
            : resolveSoundId(keyPart);
        mixMap[id] = Math.min(1, Math.max(0, vol));
      }
    }
  } catch (e) {
    console.error('Failed to decode mix:', e);
  }
  return mixMap;
}
