import { AudioCommand, executeAudioCommandLocally } from '../src/audio/audioBridge';
import { trackEvent } from '../src/analytics/telemetry';

export default defineBackground(() => {
  let creatingOffscreen: Promise<void> | null = null;
  let smartPausedByTab = false;

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
      smartPausedByTab = false;
      dispatchAudio(message.cmd as AudioCommand).then(() => {
        sendResponse({ ok: true });
      });
      return true;
    }
    return false;
  });

  async function hasExternalAudibleTab(): Promise<boolean> {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        const tabs = await chrome.tabs.query({ audible: true });
        const extOrigin = chrome.runtime?.getURL ? chrome.runtime.getURL('') : '';
        return tabs.some((t) => !extOrigin || !t.url || !t.url.startsWith(extOrigin));
      }
    } catch {}
    return false;
  }

  async function runBackgroundChecks() {
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
        'smartPauseEnabled',
      ]);

      const now = Date.now();

      // 1. Sleep Timer expiration -> Gentle fade out and stop all sounds
      if (data.sleepTimerEnd && typeof data.sleepTimerEnd === 'number' && now >= data.sleepTimerEnd) {
        smartPausedByTab = false;
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
        smartPausedByTab = false;
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

      // 4. Smart Pause when another browser tab plays audible media
      const smartPauseOn = data.smartPauseEnabled !== false; // default true
      if (data.masterPlaying) {
        if (smartPauseOn) {
          const otherTabAudible = await hasExternalAudibleTab();
          if (otherTabAudible && !smartPausedByTab) {
            smartPausedByTab = true;
            await dispatchAudio({ type: 'STOP_ALL' });
          } else if (!otherTabAudible && smartPausedByTab) {
            smartPausedByTab = false;
            const currentVolumes = (data.soundVolumes as Record<string, number>) || {
              bio_ocean: 0.7,
              bio_campfire: 0.85,
            };
            await dispatchAudio({
              type: 'APPLY_MIX',
              volumes: currentVolumes,
              masterVolume: typeof data.masterVolume === 'number' ? data.masterVolume : 0.85,
              isPlaying: true,
            });
          }
        } else if (smartPausedByTab) {
          // User disabled Smart Pause while it was paused -> resume immediately
          smartPausedByTab = false;
          const currentVolumes = (data.soundVolumes as Record<string, number>) || {
            bio_ocean: 0.7,
            bio_campfire: 0.85,
          };
          await dispatchAudio({
            type: 'APPLY_MIX',
            volumes: currentVolumes,
            masterVolume: typeof data.masterVolume === 'number' ? data.masterVolume : 0.85,
            isPlaying: true,
          });
        }
      } else {
        smartPausedByTab = false;
      }
    } catch {}
  }

  // High-resolution 1s tick while background context is active
  setInterval(runBackgroundChecks, 1000);

  // Persistent MV3 alarm fallback so Chromium/Opera service workers wake up reliably
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    try {
      chrome.alarms.create('hushfloat_timer_sync', { periodInMinutes: 0.5 });
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'hushfloat_timer_sync') {
          runBackgroundChecks();
        }
      });
    } catch {}
  }
});
