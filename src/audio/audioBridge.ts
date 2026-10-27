import { globalAudioEngine } from './WebAudioEngine';

export type AudioCommand =
  | { type: 'PLAY_SOUND'; soundId: string; volume: number }
  | { type: 'STOP_SOUND'; soundId: string }
  | { type: 'STOP_ALL' }
  | { type: 'SET_VOLUME'; soundId: string; volume: number }
  | { type: 'SET_MASTER_VOLUME'; volume: number }
  | { type: 'APPLY_MIX'; volumes: Record<string, number>; masterVolume: number; isPlaying: boolean };

export function sendAudioCommand(cmd: AudioCommand): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ target: 'HUSH_BACKGROUND', cmd }).catch(() => {
        executeAudioCommandLocally(cmd);
      });
      return;
    }
  } catch {}
  executeAudioCommandLocally(cmd);
}

export function executeAudioCommandLocally(cmd: AudioCommand): void {
  switch (cmd.type) {
    case 'PLAY_SOUND':
      globalAudioEngine.playSound(cmd.soundId, cmd.volume);
      break;
    case 'STOP_SOUND':
      globalAudioEngine.stopSound(cmd.soundId);
      break;
    case 'STOP_ALL':
      globalAudioEngine.stopAllSounds();
      break;
    case 'SET_VOLUME':
      globalAudioEngine.setVolume(cmd.soundId, cmd.volume);
      break;
    case 'SET_MASTER_VOLUME':
      globalAudioEngine.setMasterVolume(cmd.volume);
      break;
    case 'APPLY_MIX':
      globalAudioEngine.setMasterVolume(cmd.masterVolume);
      globalAudioEngine.stopAllSounds();
      if (cmd.isPlaying) {
        Object.entries(cmd.volumes).forEach(([id, vol]) => {
          if (vol > 0) {
            globalAudioEngine.playSound(id, vol);
          }
        });
      }
      break;
  }
}
