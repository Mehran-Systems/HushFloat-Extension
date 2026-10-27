import { AudioCommand, executeAudioCommandLocally } from '../src/audio/audioBridge';
import { trackEvent } from '../src/analytics/telemetry';

export default defineBackground(() => {
  let creatingOffscreen: Promise<void> | null = null;

  if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        trackEvent('extension_installed', {
          reason: details.reason,
        });
      } else if (details.reason === 'update') {
        trackEvent('extension_updated', {
          previous_version: details.previousVersion || 'unknown',
        });
      }
    });
  }

  async function ensureOffscreenDocument(): Promise<boolean> {
    // Firefox background script has direct DOM & AudioContext access
    if (typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined') {
      return false;
    }

    const offscreenApi = (chrome as unknown as { offscreen?: {
      createDocument: (opts: { url: string; reasons: string[]; justification: string }) => Promise<void>;
      hasDocument?: () => Promise<boolean>;
    } }).offscreen;

    if (!offscreenApi) {
      return false;
    }

    if (offscreenApi.hasDocument) {
      const exists = await offscreenApi.hasDocument();
      if (exists) return true;
    }

    if (creatingOffscreen) {
      await creatingOffscreen;
      return true;
    }

    try {
      creatingOffscreen = offscreenApi.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Continuous HushFloat ambient soundscape playback in background',
      });
      await creatingOffscreen;
      return true;
    } catch {
      return true;
    } finally {
      creatingOffscreen = null;
    }
  }

  async function dispatchAudio(cmd: AudioCommand) {
    const useOffscreen = await ensureOffscreenDocument();
    if (useOffscreen) {
      try {
        await chrome.runtime.sendMessage({ target: 'HUSH_OFFSCREEN', cmd });
      } catch {}
    } else if (typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined') {
      executeAudioCommandLocally(cmd);
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.target === 'HUSH_BACKGROUND' && message.cmd) {
      dispatchAudio(message.cmd as AudioCommand).then(() => {
        sendResponse({ ok: true });
      });
      return true;
    }
    return false;
  });

  // Background check for Sleep Timer, Smart Wake-Up Alarm & Focus Pomodoro Timer
  setInterval(async () => {
    try {
      const data = await chrome.storage.local.get([
        'sleepTimerEnd',
        'wakeTimerEnd',
        'focusModeEnabled',
        'focusTimerEnd',
        'focusState',
        'masterPlaying',
        'masterVolume',
        'soundVolumes',
      ]);

      const now = Date.now();

      // 1. Sleep Timer expiration -> Gentle fade out and stop all sounds
      if (data.sleepTimerEnd && typeof data.sleepTimerEnd === 'number' && now >= data.sleepTimerEnd) {
        await chrome.storage.local.set({
          sleepTimerEnd: null,
          masterPlaying: false,
        });
        const startVol = typeof data.masterVolume === 'number' ? data.masterVolume : 0.85;
        for (let i = 1; i <= 10; i++) {
          await dispatchAudio({
            type: 'SET_MASTER_VOLUME',
            volume: startVol * (1 - i / 10),
          });
          await new Promise((r) => setTimeout(r, 40));
        }
        await dispatchAudio({ type: 'STOP_ALL' });
        await dispatchAudio({ type: 'SET_MASTER_VOLUME', volume: startVol });
        trackEvent('sleep_timer_completed');
      }

      // 2. Smart Wake-Up Alarm -> Gentle Birds Ambient
      if (data.wakeTimerEnd && typeof data.wakeTimerEnd === 'number' && now >= data.wakeTimerEnd) {
        const currentVolumes = (data.soundVolumes as Record<string, number>) || {};
        const updatedVolumes = { ...currentVolumes, bio_birds: 0.75 };
        await chrome.storage.local.set({
          wakeTimerEnd: null,
          masterPlaying: true,
          soundVolumes: updatedVolumes,
        });
        await dispatchAudio({
          type: 'APPLY_MIX',
          volumes: updatedVolumes,
          masterVolume: typeof data.masterVolume === 'number' ? data.masterVolume : 0.85,
          isPlaying: true,
        });
        trackEvent('wake_alarm_triggered');
      }

      // 3. Focus Mode (Pomodoro 25m Work / 5m Rest)
      if (
        data.focusModeEnabled &&
        data.focusTimerEnd &&
        typeof data.focusTimerEnd === 'number' &&
        now >= data.focusTimerEnd
      ) {
        const nextState = data.focusState === 'WORK' ? 'REST' : 'WORK';
        const nextDuration = nextState === 'WORK' ? 25 * 60 * 1000 : 5 * 60 * 1000;
        await chrome.storage.local.set({
          focusState: nextState,
          focusTimerEnd: now + nextDuration,
        });
        trackEvent('focus_cycle_transition', { next_state: nextState });
      }
    } catch {}
  }, 1000);
});
