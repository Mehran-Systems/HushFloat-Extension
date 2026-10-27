import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  allSounds,
  curatedSoundscapes,
  decodeMix,
  defaultSavedMixes,
  encodeMix,
  findSoundById,
  SoundPreset,
} from './data/soundLibrary';
import {
  HelpContent,
  LegalContent,
  localizedPresetName,
  resolveLocaleTag,
  supportedLocales,
  t,
} from './data/i18n';
import { sendAudioCommand } from './audio/audioBridge';
import { CastSvgIcon, HushVectorIcon } from './components/Icons';
import { SoundTile } from './components/SoundTile';
import { MasterControl } from './components/MasterControl';
import { useDragScroll } from './hooks/useDragScroll';
import { trackEvent, trackScreenView } from './analytics/telemetry';

declare const __BROWSER_PROFILE_NAME__: string;

type ScreenMode = 'MIXER' | 'FAVOURITES';

interface StoredState {
  soundVolumes?: Record<string, number>;
  userCustomizedMix?: boolean;
  masterPlaying?: boolean;
  masterVolume?: number;
  sleepTimerEnd?: number | null;
  sleepTimerDuration?: number;
  wakeTimerEnd?: number | null;
  focusModeEnabled?: boolean;
  focusState?: 'WORK' | 'REST';
  focusTimerEnd?: number | null;
  smartPauseEnabled?: boolean;
  analyticsEnabled?: boolean;
  ownerName?: string | null;
  locale?: string | null;
  savedPresets?: SoundPreset[];
  presetsInitialized?: boolean;
  castState?: string | null;
}

async function loadStateFromStorage(): Promise<StoredState> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(null);
      return data as StoredState;
    }
  } catch {}
  try {
    const raw = localStorage.getItem('hushfloat_state_v2');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveStateToStorage(patch: Partial<StoredState>): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set(patch);
      return;
    }
  } catch {}
  try {
    const prevRaw = localStorage.getItem('hushfloat_state_v2');
    const prev = prevRaw ? JSON.parse(prevRaw) : {};
    localStorage.setItem('hushfloat_state_v2', JSON.stringify({ ...prev, ...patch }));
  } catch {}
}

function formatTimeRemaining(endMillis: number | null): string | null {
  if (!endMillis) return null;
  const rem = endMillis - Date.now();
  if (rem <= 0) return null;
  const min = Math.floor(rem / 60000);
  const sec = Math.floor((rem % 60000) / 1000);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export const App: React.FC = () => {
  // Default Sanctuary Showcase Mix matching Figma 10:2001 (Ocean Waves 70% & Campfire 85%)
  const [soundVolumes, setSoundVolumes] = useState<Record<string, number>>({
    bio_ocean: 0.7,
    bio_campfire: 0.85,
  });
  const lastVolumesRef = useRef<Record<string, number>>({
    bio_ocean: 0.7,
    bio_campfire: 0.85,
  });

  const [masterPlaying, setMasterPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [savedMasterVolume, setSavedMasterVolume] = useState(0.85);

  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const [sleepTimerDuration, setSleepTimerDuration] = useState<number>(45 * 60 * 1000);
  const [wakeTimerEnd, setWakeTimerEnd] = useState<number | null>(null);
  const [timeRemainingFormatted, setTimeRemainingFormatted] = useState<string | null>(null);

  const [focusModeEnabled, setFocusModeEnabled] = useState(false);
  const [focusState, setFocusState] = useState<'WORK' | 'REST'>('WORK');
  const [focusTimerEnd, setFocusTimerEnd] = useState<number | null>(null);
  const [focusTimeRemainingFormatted, setFocusTimeRemainingFormatted] = useState<string | null>(null);

  const defaultBrowserProfileName =
    typeof __BROWSER_PROFILE_NAME__ !== 'undefined' && __BROWSER_PROFILE_NAME__
      ? __BROWSER_PROFILE_NAME__
      : null;

  const [smartPauseEnabled, setSmartPauseEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [ownerName, setOwnerName] = useState<string | null>(defaultBrowserProfileName);
  const [locale, setLocale] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<SoundPreset[]>(defaultSavedMixes);
  const [castState, setCastState] = useState<string | null>(null);
  const [gridScrolled, setGridScrolled] = useState(false);

  const initialSearch =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  const [currentScreen, setCurrentScreen] = useState<ScreenMode>(
    initialSearch?.get('screen') === 'favourites' ? 'FAVOURITES' : 'MIXER'
  );
  const [showMenu, setShowMenu] = useState(initialSearch?.get('modal') === 'menu');
  const [showSleepDialog, setShowSleepDialog] = useState(initialSearch?.get('modal') === 'sleep');
  const [showCastDialog, setShowCastDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showLegalDialog, setShowLegalDialog] = useState(false);
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [showImportMixDialog, setShowImportMixDialog] = useState(false);

  const [editNameInput, setEditNameInput] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [importMixInput, setImportMixInput] = useState('');
  const [langSearchQuery, setLangSearchQuery] = useState('');
  const [wakeTimeInput, setWakeTimeInput] = useState('07:00');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const gridDragScroll = useDragScroll<HTMLDivElement>();
  const favDragScroll = useDragScroll<HTMLDivElement>();
  const langDragScroll = useDragScroll<HTMLDivElement>();
  const helpDragScroll = useDragScroll<HTMLDivElement>();
  const legalDragScroll = useDragScroll<HTMLDivElement>();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  // Load persisted state on mount + detect browser profile name
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('screen') === 'favourites') setCurrentScreen('FAVOURITES');
    if (params.get('modal') === 'menu') setShowMenu(true);
    if (params.get('modal') === 'sleep') setShowSleepDialog(true);

    loadStateFromStorage().then((state) => {
      if (state.soundVolumes && Object.keys(state.soundVolumes).length > 0) {
        setSoundVolumes(state.soundVolumes);
        lastVolumesRef.current = { ...state.soundVolumes };
      }
      if (typeof state.masterPlaying === 'boolean') {
        setMasterPlaying(state.masterPlaying);
      }
      if (typeof state.masterVolume === 'number') {
        setMasterVolume(state.masterVolume);
        setSavedMasterVolume(state.masterVolume);
      }
      if (state.sleepTimerEnd !== undefined) setSleepTimerEnd(state.sleepTimerEnd);
      if (state.sleepTimerDuration !== undefined) setSleepTimerDuration(state.sleepTimerDuration);
      if (state.wakeTimerEnd !== undefined) setWakeTimerEnd(state.wakeTimerEnd);
      if (typeof state.focusModeEnabled === 'boolean') setFocusModeEnabled(state.focusModeEnabled);
      if (state.focusState) setFocusState(state.focusState);
      if (state.focusTimerEnd !== undefined) setFocusTimerEnd(state.focusTimerEnd);
      if (typeof state.smartPauseEnabled === 'boolean') setSmartPauseEnabled(state.smartPauseEnabled);
      if (typeof state.analyticsEnabled === 'boolean') setAnalyticsEnabled(state.analyticsEnabled);
      if (state.ownerName && state.ownerName.trim()) {
        setOwnerName(state.ownerName.trim());
      } else if (defaultBrowserProfileName) {
        setOwnerName(defaultBrowserProfileName);
      }
      if (state.locale !== undefined) setLocale(state.locale);
      if (state.savedPresets) {
        setSavedPresets(state.savedPresets);
      } else if (!state.presetsInitialized) {
        saveStateToStorage({ savedPresets: defaultSavedMixes, presetsInitialized: true });
      }
      if (state.castState !== undefined) setCastState(state.castState);
    });

    // Live sync with background service worker timer & alarm transitions
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const handleStorageChange = (
        changes: Record<string, chrome.storage.StorageChange>,
        area: string
      ) => {
        if (area !== 'local') return;
        if (changes.masterPlaying !== undefined) {
          setMasterPlaying(Boolean(changes.masterPlaying.newValue));
        }
        if (changes.sleepTimerEnd !== undefined) {
          setSleepTimerEnd(changes.sleepTimerEnd.newValue ?? null);
        }
        if (changes.wakeTimerEnd !== undefined) {
          setWakeTimerEnd(changes.wakeTimerEnd.newValue ?? null);
        }
        if (changes.focusState !== undefined && changes.focusState.newValue) {
          setFocusState(changes.focusState.newValue);
        }
        if (changes.focusTimerEnd !== undefined) {
          setFocusTimerEnd(changes.focusTimerEnd.newValue ?? null);
        }
        if (changes.soundVolumes !== undefined && changes.soundVolumes.newValue) {
          setSoundVolumes(changes.soundVolumes.newValue);
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  // Tick Sleep & Focus countdowns every 1s
  useEffect(() => {
    const updateTimers = () => {
      if (sleepTimerEnd) {
        const rem = formatTimeRemaining(sleepTimerEnd);
        if (!rem) {
          setSleepTimerEnd(null);
          setTimeRemainingFormatted(null);
          setMasterPlaying(false);
        } else {
          setTimeRemainingFormatted(rem);
        }
      } else {
        setTimeRemainingFormatted(null);
      }

      if (focusModeEnabled && focusTimerEnd) {
        const rem = formatTimeRemaining(focusTimerEnd);
        setFocusTimeRemainingFormatted(rem);
      } else {
        setFocusTimeRemainingFormatted(null);
      }
    };

    updateTimers();
    const id = setInterval(updateTimers, 1000);
    return () => clearInterval(id);
  }, [sleepTimerEnd, focusModeEnabled, focusTimerEnd]);

  const timeSalutation = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 11) return 'Good morning';
    if (hour >= 12 && hour <= 13) return 'Good noon';
    if (hour >= 14 && hour <= 16) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const resumeAllActiveSounds = (volumesMap: Record<string, number>, targetMasterVol = masterVolume) => {
    setMasterPlaying(true);
    saveStateToStorage({
      soundVolumes: volumesMap,
      masterPlaying: true,
      masterVolume: targetMasterVol,
      userCustomizedMix: true,
    });
    sendAudioCommand({
      type: 'APPLY_MIX',
      volumes: volumesMap,
      masterVolume: targetMasterVol,
      isPlaying: true,
    });
  };

  // Track screen and modal views in GA4
  useEffect(() => {
    if (showSleepDialog) {
      trackScreenView('SLEEP_TIMER_MODAL');
    } else if (showCastDialog) {
      trackScreenView('CAST_AUDIO_MODAL');
    } else if (showLanguageDialog) {
      trackScreenView('LANGUAGE_PICKER_MODAL');
    } else if (showHelpDialog) {
      trackScreenView('HELP_FAQS_MODAL');
    } else if (showLegalDialog) {
      trackScreenView('TERMS_PRIVACY_MODAL');
    } else {
      trackScreenView(currentScreen);
    }
  }, [
    currentScreen,
    showSleepDialog,
    showCastDialog,
    showLanguageDialog,
    showHelpDialog,
    showLegalDialog,
  ]);

  const handleTileClick = (soundId: string) => {
    const currentVol = soundVolumes[soundId] ?? 0;
    if (currentVol > 0) {
      lastVolumesRef.current[soundId] = currentVol;
      const next = { ...soundVolumes, [soundId]: 0 };
      delete next[soundId];
      setSoundVolumes(next);
      sendAudioCommand({ type: 'STOP_SOUND', soundId });
      trackEvent('sound_toggle', { sound_id: soundId, action: 'stop', volume_pct: 0 });

      const anyRemaining = Object.values(next).some((v) => v > 0);
      if (!anyRemaining) {
        setMasterPlaying(false);
        saveStateToStorage({ soundVolumes: next, masterPlaying: false, userCustomizedMix: true });
      } else {
        saveStateToStorage({ soundVolumes: next, userCustomizedMix: true });
      }
    } else {
      const restore = lastVolumesRef.current[soundId] || 0.85;
      const next = { ...soundVolumes, [soundId]: restore };
      setSoundVolumes(next);
      trackEvent('sound_toggle', {
        sound_id: soundId,
        action: 'play',
        volume_pct: Math.round(restore * 100),
      });
      if (masterPlaying) {
        sendAudioCommand({ type: 'PLAY_SOUND', soundId, volume: restore });
        saveStateToStorage({ soundVolumes: next, userCustomizedMix: true });
      } else {
        resumeAllActiveSounds(next);
      }
    }
  };

  const handleTileVolumeChange = (soundId: string, newVol: number) => {
    const currentVol = soundVolumes[soundId] ?? 0;
    const wasPlaying = currentVol > 0;
    const next = { ...soundVolumes };
    if (newVol > 0) {
      next[soundId] = newVol;
      lastVolumesRef.current[soundId] = newVol;
    } else {
      delete next[soundId];
    }
    setSoundVolumes(next);

    if (newVol > 0) {
      if (masterPlaying) {
        if (!wasPlaying) {
          sendAudioCommand({ type: 'PLAY_SOUND', soundId, volume: newVol });
        } else {
          sendAudioCommand({ type: 'SET_VOLUME', soundId, volume: newVol });
        }
      } else {
        resumeAllActiveSounds(next);
      }
    } else if (wasPlaying) {
      sendAudioCommand({ type: 'STOP_SOUND', soundId });
    }
  };

  const handleToggleMasterPlay = () => {
    if (masterPlaying) {
      setMasterPlaying(false);
      setSavedMasterVolume(masterVolume);
      saveStateToStorage({ masterPlaying: false });
      sendAudioCommand({ type: 'STOP_ALL' });
      trackEvent('master_play_toggle', {
        action: 'pause',
        active_sounds_count: Object.values(soundVolumes).filter((v) => v > 0).length,
        master_volume_pct: Math.round(masterVolume * 100),
      });
    } else {
      const target = masterVolume > 0 ? masterVolume : savedMasterVolume > 0 ? savedMasterVolume : 0.85;
      setMasterVolume(target);
      // If no sounds are selected, default to Ocean Waves + Campfire
      let activeMap = soundVolumes;
      if (Object.values(activeMap).every((v) => v <= 0)) {
        activeMap = { bio_ocean: 0.7, bio_campfire: 0.85 };
        setSoundVolumes(activeMap);
      }
      resumeAllActiveSounds(activeMap, target);
      trackEvent('master_play_toggle', {
        action: 'play',
        active_sounds_count: Object.values(activeMap).filter((v) => v > 0).length,
        master_volume_pct: Math.round(target * 100),
      });
    }
  };

  const handleMasterVolumeChange = (newVol: number) => {
    setMasterVolume(newVol);
    sendAudioCommand({ type: 'SET_MASTER_VOLUME', volume: newVol });
    saveStateToStorage({ masterVolume: newVol });
  };

  const handleShareMix = () => {
    const activeEntries = Object.entries(soundVolumes).filter(([, v]) => v > 0);
    if (activeEntries.length === 0) {
      showToast(t('error_empty_mix', locale));
      return;
    }
    const encoded = encodeMix(soundVolumes);
    const shareUrl = `https://mehransystems.com/hushfloat/mix?d=${encoded}`;
    trackEvent('mix_shared', { sounds_count: activeEntries.length });
    navigator.clipboard
      ?.writeText(shareUrl)
      .then(() => {
        showToast('Share mix link copied to clipboard!');
      })
      .catch(() => {
        showToast(shareUrl);
      });
  };

  const handleLoadPreset = (presetVolumes: Record<string, number>, presetName = 'preset') => {
    setSoundVolumes(presetVolumes);
    lastVolumesRef.current = { ...presetVolumes };
    resumeAllActiveSounds(presetVolumes);
    setCurrentScreen('MIXER');
    trackEvent('preset_loaded', {
      preset_name: presetName,
      sounds_count: Object.keys(presetVolumes).length,
    });
  };

  const isAnyModalOpen =
    showMenu ||
    showSleepDialog ||
    showCastDialog ||
    showLanguageDialog ||
    showEditNameDialog ||
    showHelpDialog ||
    showLegalDialog ||
    showSavePresetDialog ||
    showImportMixDialog;

  const activeSoundsCount = Object.values(soundVolumes).filter((v) => v > 0).length;
  const activeLocaleCode = resolveLocaleTag(locale).toUpperCase();

  // Keyboard scrolling (ArrowUp/Down, PageUp/Down, Home/End) for the active scrollable area
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const activeScroller = showLanguageDialog
        ? langDragScroll.ref.current
        : showHelpDialog
        ? helpDragScroll.ref.current
        : showLegalDialog
        ? legalDragScroll.ref.current
        : !isAnyModalOpen && currentScreen === 'FAVOURITES'
        ? favDragScroll.ref.current
        : !isAnyModalOpen && currentScreen === 'MIXER'
        ? gridDragScroll.ref.current
        : null;

      if (!activeScroller) return;

      const step = 64;
      const pageStep = activeScroller.clientHeight * 0.85;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeScroller.scrollBy({ top: step, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeScroller.scrollBy({ top: -step, behavior: 'smooth' });
      } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        activeScroller.scrollBy({ top: pageStep, behavior: 'smooth' });
      } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        activeScroller.scrollBy({ top: -pageStep, behavior: 'smooth' });
      } else if (e.key === 'Home') {
        e.preventDefault();
        activeScroller.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'End') {
        e.preventDefault();
        activeScroller.scrollTo({ top: activeScroller.scrollHeight, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentScreen,
    isAnyModalOpen,
    showLanguageDialog,
    showHelpDialog,
    showLegalDialog,
    gridDragScroll.ref,
    favDragScroll.ref,
    langDragScroll.ref,
    helpDragScroll.ref,
    legalDragScroll.ref,
  ]);

  return (
    <div className="hf-app-root">
      <div
        className={`hf-main-content ${isAnyModalOpen ? 'hf-main-content--blurred' : ''}`}
        onWheel={(e) => {
          if (isAnyModalOpen) return;
          const target = e.target as HTMLElement | null;
          if (currentScreen === 'MIXER' && gridDragScroll.ref.current) {
            if (!gridDragScroll.ref.current.contains(target)) {
              gridDragScroll.ref.current.scrollTop += e.deltaY;
            }
          }
        }}
      >
        {currentScreen === 'MIXER' ? (
          <>
            {/* Top Header */}
            <div className="hf-header">
              <div
                className="hf-header__greeting-col"
                onClick={() => {
                  setEditNameInput(ownerName || '');
                  setShowEditNameDialog(true);
                }}
                title={t('personalize_greeting', locale)}
              >
                <div className="hf-header__salutation-row">
                  <span className="hf-header__salutation">
                    {ownerName ? `${timeSalutation},` : timeSalutation}
                  </span>
                  <HushVectorIcon name="ic_moon" size={18} />
                </div>
                {ownerName && <div className="hf-header__username">{ownerName}</div>}
                <div className="hf-header__tagline">{t('tagline_sanctuary', locale)}</div>
              </div>

              <div className="hf-header__actions">
                <button
                  type="button"
                  className="hf-icon-btn"
                  onClick={() => setShowCastDialog(true)}
                  title={t('cast', locale)}
                >
                  <CastSvgIcon size={17} color={castState ? '#FBE5C8' : '#E0E0E0'} />
                </button>

                <button
                  type="button"
                  className="hf-icon-btn"
                  onClick={handleShareMix}
                  title={t('share_mix', locale)}
                >
                  <HushVectorIcon name="ic_share_figma" size={17} tint="#E0E0E0" />
                </button>

                <button
                  type="button"
                  className="hf-icon-btn"
                  onClick={() => setShowMenu(true)}
                  title={t('menu', locale)}
                >
                  <HushVectorIcon name="ic_menu_figma" size={17} tint="#E0E0E0" />
                </button>
              </div>
            </div>

            {/* 3x3 Sound Tile Grid Viewport */}
            <div
              ref={gridDragScroll.ref}
              onMouseDown={gridDragScroll.onMouseDown}
              onClickCapture={gridDragScroll.onClickCapture}
              className={`hf-grid-viewport ${gridScrolled ? 'hf-grid-viewport--scrolled' : ''}`}
              onScroll={(e) => setGridScrolled(e.currentTarget.scrollTop > 2)}
            >
              <div className="hf-sound-grid">
                {allSounds.map((sound) => {
                  const vol = soundVolumes[sound.id] ?? 0;
                  const isTilePlaying = vol > 0;
                  return (
                    <SoundTile
                      key={sound.id}
                      sound={sound}
                      volume={vol}
                      isPlaying={isTilePlaying}
                      locale={locale}
                      onVolumeChange={(newVol) => handleTileVolumeChange(sound.id, newVol)}
                      onInteractionEnd={() =>
                        saveStateToStorage({ soundVolumes, userCustomizedMix: true })
                      }
                      onClick={() => handleTileClick(sound.id)}
                    />
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls: Sleep/Focus Capsule + Master Control */}
            <div className="hf-bottom-controls">
              <div className="hf-timer-capsule">
                <button
                  type="button"
                  className={`hf-timer-capsule__half ${
                    timeRemainingFormatted
                      ? 'hf-timer-capsule__half--sleep-active'
                      : 'hf-timer-capsule__half--sleep'
                  }`}
                  onClick={() => setShowSleepDialog(true)}
                >
                  <HushVectorIcon name="ic_timer_sleep" size={14} tint="#FBE5C8" />
                  <span>
                    {timeRemainingFormatted
                      ? `${timeRemainingFormatted} Sleep`
                      : '45:00 Sleep Timer'}
                  </span>
                </button>

                <div className="hf-timer-capsule__divider" />

                <button
                  type="button"
                  className={`hf-timer-capsule__half ${
                    focusModeEnabled
                      ? 'hf-timer-capsule__half--focus-active'
                      : 'hf-timer-capsule__half--focus'
                  }`}
                  onClick={() => {
                    if (focusModeEnabled) {
                      setFocusModeEnabled(false);
                      setFocusTimerEnd(null);
                      saveStateToStorage({ focusModeEnabled: false, focusTimerEnd: null });
                      trackEvent('focus_mode_toggle', { enabled: false });
                    } else {
                      const end = Date.now() + 25 * 60 * 1000;
                      setFocusModeEnabled(true);
                      setFocusState('WORK');
                      setFocusTimerEnd(end);
                      saveStateToStorage({
                        focusModeEnabled: true,
                        focusState: 'WORK',
                        focusTimerEnd: end,
                      });
                      trackEvent('focus_mode_toggle', { enabled: true });
                    }
                  }}
                >
                  <HushVectorIcon name="ic_timer_focus" size={14} tint="#FBE5C8" />
                  <span>
                    {!focusModeEnabled
                      ? t('focus_mode_short', locale)
                      : focusTimeRemainingFormatted
                      ? focusState === 'WORK'
                        ? t('focus_work_text', locale, focusTimeRemainingFormatted)
                        : t('focus_rest_text', locale, focusTimeRemainingFormatted)
                      : t('stop_focus', locale)}
                  </span>
                </button>
              </div>

              <div className="hf-section-label">{t('master_control', locale)}</div>

              <MasterControl
                isPlaying={masterPlaying}
                masterVolume={masterVolume}
                onVolumeChange={handleMasterVolumeChange}
                onTogglePlay={handleToggleMasterPlay}
                onFavoriteClick={() => setCurrentScreen('FAVOURITES')}
              />
            </div>
          </>
        ) : (
          /* FAVOURITES & PRESETS SCREEN */
          <div
            ref={favDragScroll.ref}
            onMouseDown={favDragScroll.onMouseDown}
            onClickCapture={favDragScroll.onClickCapture}
            className="hf-fav-screen"
          >
            <div className="hf-header" style={{ paddingLeft: 2, paddingRight: 2 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => setCurrentScreen('MIXER')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
                <span style={{ fontSize: 18, fontWeight: 700 }}>
                  {t('fav_screen_title', locale)}
                </span>
                <HushVectorIcon name="ic_moon" size={18} />
              </div>

              <div className="hf-header__actions">
                <button
                  type="button"
                  className="hf-icon-btn"
                  onClick={() => setShowImportMixDialog(true)}
                  title="Import Shared Mix Link"
                >
                  <HushVectorIcon name="ic_share_figma" size={18} tint="#FBE5C8" />
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '8px 0 10px',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
                {t('fav_my_saved', locale)}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (activeSoundsCount > 0) {
                    setNewPresetName('');
                    setShowSavePresetDialog(true);
                  } else {
                    showToast(t('no_active_sounds', locale));
                  }
                }}
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 16,
                  background: 'rgba(251, 229, 200, 0.12)',
                  border: '1px solid rgba(251, 229, 200, 0.35)',
                  color: '#FBE5C8',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Save Mix
              </button>
            </div>

            {savedPresets.map((preset, idx) => {
              const subtitle = Object.entries(preset.volumes)
                .map(([id, v]) => {
                  const snd = findSoundById(id);
                  return snd ? `${t(snd.nameKey, locale)} (${Math.round(v * 100)}%)` : null;
                })
                .filter(Boolean)
                .join(' · ');

              return (
                <div
                  key={`${preset.name}-${idx}`}
                  className="hf-fav-card"
                  onClick={() => handleLoadPreset(preset.volumes, preset.name)}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                      {localizedPresetName(preset.name, locale)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#BFB8E0',
                        marginTop: 3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {subtitle}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      className="hf-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = savedPresets.filter((_, i) => i !== idx);
                        setSavedPresets(next);
                        saveStateToStorage({ savedPresets: next });
                        showToast(t('removed_preset', locale, preset.name));
                      }}
                      title={t('delete_preset', locale)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#A8A3C7">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#FBE5C8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#0D121F">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.5,
                margin: '10px 0 8px',
              }}
            >
              {t('fav_curated', locale)}
            </div>

            {curatedSoundscapes.map((preset, idx) => {
              const subtitle = Object.entries(preset.volumes)
                .map(([id, v]) => {
                  const snd = findSoundById(id);
                  return snd ? `${t(snd.nameKey, locale)} (${Math.round(v * 100)}%)` : null;
                })
                .filter(Boolean)
                .join(' · ');

              return (
                <div
                  key={`curated-${idx}`}
                  className="hf-fav-card"
                  onClick={() => handleLoadPreset(preset.volumes, preset.name)}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
                      {localizedPresetName(preset.name, locale)}
                    </div>
                    <div style={{ fontSize: 11, color: '#BFB8E0', marginTop: 3 }}>
                      {subtitle}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#FBE5C8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0D121F">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* OVERFLOW MENU */}
      {showMenu && (
        <>
          <div className="hf-menu-backdrop" onClick={() => setShowMenu(false)} />
          <div className="hf-overflow-menu">
            <button
              type="button"
              className="hf-menu-item"
              onClick={() => {
                const next = !smartPauseEnabled;
                setSmartPauseEnabled(next);
                saveStateToStorage({ smartPauseEnabled: next });
              }}
            >
              <span>{t('menu_smart_pause_short', locale)}</span>
              <div className={`hf-toggle-switch ${smartPauseEnabled ? 'hf-toggle-switch--on' : ''}`}>
                <div className="hf-toggle-switch__knob" />
              </div>
            </button>

            <div className="hf-menu-divider" />

            <button
              type="button"
              className="hf-menu-item"
              onClick={() => {
                setShowMenu(false);
                setLangSearchQuery('');
                setShowLanguageDialog(true);
              }}
            >
              <span>{t('menu_language', locale)}</span>
              <span style={{ color: '#B8C4DB', fontSize: 11.5 }}>{activeLocaleCode} · 32</span>
            </button>

            <div className="hf-menu-divider" />

            <button
              type="button"
              className="hf-menu-item"
              onClick={() => {
                setShowMenu(false);
                setImportMixInput('');
                setShowImportMixDialog(true);
              }}
            >
              <span>Load Shared Mix Link</span>
              <span style={{ color: '#FBE5C8', fontSize: 11.5 }}>URL</span>
            </button>

            <div className="hf-menu-divider" />

            <button
              type="button"
              className="hf-menu-item"
              onClick={() => {
                setShowMenu(false);
                showToast(t('toast_rate_us', locale));
              }}
            >
              <span>{t('menu_rate_us', locale)}</span>
              <span style={{ color: '#FFD54F', fontSize: 12 }}>★★★★★</span>
            </button>

            <div className="hf-menu-divider" />

            <button
              type="button"
              className="hf-menu-item"
              onClick={() => {
                setShowMenu(false);
                window.open(
                  `mailto:support@mehransystems.com?subject=${encodeURIComponent(
                    t('email_subject', locale)
                  )}`,
                  '_blank'
                );
              }}
            >
              <div>
                <div>{t('menu_contact_us', locale)}</div>
                <div style={{ color: '#99A6BF', fontSize: 10.5, marginTop: 1 }}>
                  support@mehransystems.com
                </div>
              </div>
            </button>

            <div className="hf-menu-divider" />

            <button
              type="button"
              className="hf-menu-item"
              onClick={() => {
                setShowMenu(false);
                setShowHelpDialog(true);
              }}
            >
              <span>{t('menu_help_faqs', locale)}</span>
            </button>

            <div className="hf-menu-divider" />

            <button
              type="button"
              className="hf-menu-item"
              onClick={() => {
                setShowMenu(false);
                setShowLegalDialog(true);
              }}
            >
              <span>{t('menu_terms_privacy', locale)}</span>
            </button>

            <div className="hf-menu-divider" />

            <button
              type="button"
              className="hf-menu-item"
              onClick={() => {
                setShowMenu(false);
                setMasterPlaying(false);
                saveStateToStorage({ masterPlaying: false });
                sendAudioCommand({ type: 'STOP_ALL' });
                window.close();
              }}
              style={{ color: '#D9D1EB' }}
            >
              <span>{t('menu_exit', locale)}</span>
              <HushVectorIcon name="ic_power" size={16} tint="#D9D1EB" />
            </button>
          </div>
        </>
      )}

      {/* SLEEP TIMER & SMART WAKE-UP ALARM DIALOG */}
      {showSleepDialog && (
        <div className="hf-modal-overlay" onClick={() => setShowSleepDialog(false)}>
          <div className="hf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hf-modal-header">
              <div className="hf-modal-title-row">
                <HushVectorIcon name="ic_moon_outline" size={20} />
                <span>{t('sleep_dialog_title', locale)}</span>
              </div>
              <button
                type="button"
                className="hf-icon-btn"
                onClick={() => setShowSleepDialog(false)}
              >
                ✕
              </button>
            </div>
            <div className="hf-modal-subtitle">{t('sleep_fade_note', locale)}</div>
            <div className="hf-modal-hr" />

            <div className="hf-preset-grid-2x2">
              {[15, 30, 45, 60].map((mins) => {
                const dur = mins * 60 * 1000;
                const isSelected = timeRemainingFormatted
                  ? sleepTimerDuration === dur
                  : mins === 45;
                return (
                  <button
                    key={mins}
                    type="button"
                    className={`hf-sleep-preset-btn ${
                      isSelected ? 'hf-sleep-preset-btn--selected' : ''
                    }`}
                    onClick={() => {
                      const end = Date.now() + dur;
                      setSleepTimerDuration(dur);
                      setSleepTimerEnd(end);
                      saveStateToStorage({ sleepTimerEnd: end, sleepTimerDuration: dur });
                      trackEvent('sleep_timer_set', { duration_minutes: mins });
                      setShowSleepDialog(false);
                    }}
                  >
                    {isSelected && <span>✓</span>}
                    <span>{mins} min</span>
                  </button>
                );
              })}
            </div>

            <div className="hf-modal-hr" />

            <div
              style={{
                borderRadius: 15,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '9px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {t('wake_alarm_title', locale)}
                </div>
                <div style={{ fontSize: 10, color: '#A3A1BA' }}>
                  {wakeTimerEnd
                    ? `${new Date(wakeTimerEnd).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} · Gentle Birds`
                    : t('wake_alarm_default', locale)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <input
                  type="time"
                  value={wakeTimeInput}
                  onChange={(e) => setWakeTimeInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFF',
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 11,
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const [hh, mm] = wakeTimeInput.split(':').map(Number);
                    const target = new Date();
                    target.setHours(hh || 7, mm || 0, 0, 0);
                    if (target.getTime() <= Date.now()) {
                      target.setDate(target.getDate() + 1);
                    }
                    setWakeTimerEnd(target.getTime());
                    saveStateToStorage({ wakeTimerEnd: target.getTime() });
                    trackEvent('wake_alarm_set', { wake_time: wakeTimeInput });
                    setShowSleepDialog(false);
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 10,
                    background: 'rgba(255, 213, 79, 0.18)',
                    border: '1px solid #FFD54F',
                    color: '#FFD54F',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('button_set', locale)}
                </button>
              </div>
            </div>

            <div className="hf-modal-hr" />

            <button
              type="button"
              className="hf-pill-btn"
              onClick={() => {
                setSleepTimerEnd(null);
                setWakeTimerEnd(null);
                saveStateToStorage({ sleepTimerEnd: null, wakeTimerEnd: null });
                setShowSleepDialog(false);
              }}
            >
              {t('turn_off_sleep_timer', locale)}
            </button>

            <button
              type="button"
              className="hf-pill-btn hf-pill-btn--secondary"
              onClick={() => setShowSleepDialog(false)}
            >
              {t('close', locale)}
            </button>
          </div>
        </div>
      )}

      {/* CAST / AUDIO STREAM DIALOG */}
      {showCastDialog && (
        <div className="hf-modal-overlay" onClick={() => setShowCastDialog(false)}>
          <div className="hf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hf-modal-header">
              <div className="hf-modal-title-row">
                <HushVectorIcon name="ic_moon_outline" size={20} />
                <span>{t('cast_dialog_title', locale)}</span>
              </div>
              <button
                type="button"
                className="hf-icon-btn"
                onClick={() => setShowCastDialog(false)}
              >
                ✕
              </button>
            </div>
            <div className="hf-modal-subtitle">{t('cast_dialog_subtitle', locale)}</div>
            <div className="hf-modal-hr" />

            {[
              {
                name: 'System Default Output',
                sub: `Connected · Streaming ${Math.max(2, activeSoundsCount)} Sounds`,
              },
              {
                name: 'Living Room (Google Nest)',
                sub: 'Ready to stream',
              },
              {
                name: `${ownerName ? `${ownerName}'s` : 'My'} Wireless Headphones`,
                sub: 'Bluetooth audio route',
              },
            ].map((dev) => {
              const isConnected = (castState || 'System Default Output') === dev.name;
              return (
                <div
                  key={dev.name}
                  onClick={() => {
                    setCastState(dev.name);
                    saveStateToStorage({ castState: dev.name });
                    setShowCastDialog(false);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: '10px 14px',
                    marginBottom: 8,
                    cursor: 'pointer',
                    background: isConnected
                      ? 'rgba(251, 229, 200, 0.14)'
                      : 'rgba(255, 255, 255, 0.06)',
                    border: isConnected
                      ? '1.2px solid rgba(251, 229, 200, 0.45)'
                      : '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isConnected ? 700 : 500,
                      color: '#FFFFFF',
                    }}
                  >
                    {dev.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: isConnected ? '#FBE5C8' : '#BFB8E0',
                      marginTop: 2,
                    }}
                  >
                    {dev.sub}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="hf-pill-btn"
              style={{ marginTop: 6 }}
              onClick={() => {
                setCastState(null);
                saveStateToStorage({ castState: null });
                setShowCastDialog(false);
              }}
            >
              {t('cast_disconnect', locale)}
            </button>
            <button
              type="button"
              className="hf-pill-btn hf-pill-btn--secondary"
              onClick={() => setShowCastDialog(false)}
            >
              {t('close', locale)}
            </button>
          </div>
        </div>
      )}

      {/* LANGUAGE PICKER DIALOG (32 LANGUAGES) */}
      {showLanguageDialog && (
        <div className="hf-modal-overlay" onClick={() => setShowLanguageDialog(false)}>
          <div className="hf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hf-modal-header">
              <div className="hf-modal-title-row">
                <HushVectorIcon name="ic_moon_outline" size={20} />
                <span>{t('language_dialog_title', locale)}</span>
              </div>
              <button
                type="button"
                className="hf-icon-btn"
                onClick={() => setShowLanguageDialog(false)}
              >
                ✕
              </button>
            </div>
            <div className="hf-modal-subtitle">{t('language_dialog_subtitle', locale)}</div>

            <input
              type="text"
              placeholder={t('language_search_hint', locale)}
              value={langSearchQuery}
              onChange={(e) => setLangSearchQuery(e.target.value)}
              style={{
                marginTop: 12,
                marginBottom: 8,
                height: 36,
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                padding: '0 14px',
                fontSize: 12.5,
                outline: 'none',
              }}
            />

            <div
              ref={langDragScroll.ref}
              onMouseDown={langDragScroll.onMouseDown}
              onClickCapture={langDragScroll.onClickCapture}
              style={{
                flex: 1,
                overflowY: 'auto',
                maxHeight: 250,
                paddingRight: 4,
                scrollbarWidth: 'none',
                cursor: 'grab',
              }}
            >
              {!langSearchQuery.trim() && (
                <div
                  onClick={() => {
                    setLocale(null);
                    saveStateToStorage({ locale: null });
                    setShowLanguageDialog(false);
                  }}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: locale === null ? 'rgba(251, 229, 200, 0.15)' : 'transparent',
                    color: locale === null ? '#FBE5C8' : '#FFFFFF',
                    fontSize: 13,
                    fontWeight: locale === null ? 700 : 400,
                  }}
                >
                  <span>{t('language_system_default', locale)}</span>
                  {locale === null && <span>✓</span>}
                </div>
              )}
              {supportedLocales
                .filter(
                  (l) =>
                    !langSearchQuery.trim() ||
                    l.nativeName.toLowerCase().includes(langSearchQuery.toLowerCase()) ||
                    l.englishName.toLowerCase().includes(langSearchQuery.toLowerCase())
                )
                .map((item) => {
                  const selected = locale === item.tag;
                  return (
                    <div
                      key={item.tag}
                      onClick={() => {
                        setLocale(item.tag);
                        saveStateToStorage({ locale: item.tag });
                        trackEvent('language_changed', { locale: item.tag });
                        setShowLanguageDialog(false);
                      }}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        background: selected ? 'rgba(251, 229, 200, 0.15)' : 'transparent',
                        color: selected ? '#FBE5C8' : '#FFFFFF',
                        fontSize: 13,
                        fontWeight: selected ? 700 : 400,
                      }}
                    >
                      <span>
                        {item.nativeName}{' '}
                        <span style={{ color: '#A3A1BA', fontSize: 11.5 }}>
                          ({item.englishName})
                        </span>
                      </span>
                      {selected && <span>✓</span>}
                    </div>
                  );
                })}
            </div>

            <button
              type="button"
              className="hf-pill-btn hf-pill-btn--secondary"
              style={{ marginTop: 10 }}
              onClick={() => setShowLanguageDialog(false)}
            >
              {t('close', locale)}
            </button>
          </div>
        </div>
      )}

      {/* PERSONALIZE GREETING NAME DIALOG */}
      {showEditNameDialog && (
        <div className="hf-modal-overlay" onClick={() => setShowEditNameDialog(false)}>
          <div className="hf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {t('personalize_greeting', locale)}
            </div>
            <input
              type="text"
              placeholder={t('your_name_hint', locale)}
              value={editNameInput}
              onChange={(e) => setEditNameInput(e.target.value)}
              style={{
                marginTop: 14,
                height: 40,
                borderRadius: 12,
                background: 'rgba(30, 23, 48, 0.65)',
                border: '1px solid #FBE5C8',
                color: '#FFFFFF',
                padding: '0 12px',
                fontSize: 13.5,
                outline: 'none',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 16,
              }}
            >
              <button
                type="button"
                onClick={() => setShowEditNameDialog(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A8A3C7',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {t('cancel', locale)}
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = editNameInput.trim() || null;
                  setOwnerName(trimmed);
                  saveStateToStorage({ ownerName: trimmed });
                  setShowEditNameDialog(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FBE5C8',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {t('save', locale)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE PRESET DIALOG */}
      {showSavePresetDialog && (
        <div className="hf-modal-overlay" onClick={() => setShowSavePresetDialog(false)}>
          <div className="hf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{t('save_current_mix', locale)}</div>
            <input
              type="text"
              placeholder={t('fav_name_hint', locale)}
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              style={{
                marginTop: 14,
                height: 40,
                borderRadius: 12,
                background: 'rgba(30, 23, 48, 0.65)',
                border: '1px solid #FBE5C8',
                color: '#FFFFFF',
                padding: '0 12px',
                fontSize: 13.5,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowSavePresetDialog(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A8A3C7',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {t('cancel', locale)}
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = newPresetName.trim();
                  if (!trimmed) {
                    showToast(t('please_enter_name', locale));
                    return;
                  }
                  const activeOnly: Record<string, number> = {};
                  Object.entries(soundVolumes).forEach(([k, v]) => {
                    if (v > 0) activeOnly[k] = v;
                  });
                  const next = [{ name: trimmed, volumes: activeOnly }, ...savedPresets];
                  setSavedPresets(next);
                  saveStateToStorage({ savedPresets: next });
                  trackEvent('preset_saved', {
                    preset_name: trimmed,
                    sounds_count: Object.keys(activeOnly).length,
                  });
                  setShowSavePresetDialog(false);
                  showToast(t('mix_saved', locale, trimmed));
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FBE5C8',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {t('save', locale)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT SHARED MIX LINK DIALOG */}
      {showImportMixDialog && (
        <div className="hf-modal-overlay" onClick={() => setShowImportMixDialog(false)}>
          <div className="hf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Load Shared Mix</div>
            <div className="hf-modal-subtitle">
              Paste a HushFloat mix link or code to load its exact blend:
            </div>
            <input
              type="text"
              placeholder="https://mehransystems.com/hushfloat/mix?d=..."
              value={importMixInput}
              onChange={(e) => setImportMixInput(e.target.value)}
              style={{
                marginTop: 12,
                height: 40,
                borderRadius: 12,
                background: 'rgba(30, 23, 48, 0.65)',
                border: '1px solid #FBE5C8',
                color: '#FFFFFF',
                padding: '0 12px',
                fontSize: 12.5,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowImportMixDialog(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A8A3C7',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {t('cancel', locale)}
              </button>
              <button
                type="button"
                onClick={() => {
                  const raw = importMixInput.trim();
                  if (!raw) return;
                  const dMatch = raw.match(/[?&]d=([^&]+)/);
                  const code = dMatch ? dMatch[1] : raw;
                  const decoded = decodeMix(code);
                  if (Object.keys(decoded).length > 0) {
                    handleLoadPreset(decoded, 'imported_shared_mix');
                    trackEvent('mix_imported', { sounds_count: Object.keys(decoded).length });
                    setShowImportMixDialog(false);
                    showToast(t('toast_shared_mix_loaded', locale));
                  } else {
                    showToast('Invalid mix link');
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FBE5C8',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Load
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP & FAQS DIALOG */}
      {showHelpDialog && (
        <div className="hf-modal-overlay" onClick={() => setShowHelpDialog(false)}>
          <div className="hf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hf-modal-header">
              <div className="hf-modal-title-row">
                <HushVectorIcon name="ic_moon_outline" size={18} />
                <span>{HelpContent.TITLE}</span>
              </div>
              <button
                type="button"
                className="hf-icon-btn"
                onClick={() => setShowHelpDialog(false)}
              >
                ✕
              </button>
            </div>
            <div
              ref={helpDragScroll.ref}
              onMouseDown={helpDragScroll.onMouseDown}
              onClickCapture={helpDragScroll.onClickCapture}
              style={{
                flex: 1,
                overflowY: 'auto',
                marginTop: 10,
                paddingRight: 4,
                fontSize: 12,
                lineHeight: 1.5,
                color: '#B8C4DB',
                scrollbarWidth: 'none',
                cursor: 'grab',
              }}
            >
              <p style={{ marginTop: 0 }}>{HelpContent.INTRO}</p>
              {HelpContent.faqs.map((faq, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, marginBottom: 4 }}>
                    {faq.question}
                  </div>
                  <div style={{ whiteSpace: 'pre-line' }}>{faq.answer}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="hf-pill-btn hf-pill-btn--secondary"
              onClick={() => setShowHelpDialog(false)}
            >
              {t('close', locale)}
            </button>
          </div>
        </div>
      )}

      {/* TERMS & PRIVACY DIALOG */}
      {showLegalDialog && (
        <div className="hf-modal-overlay" onClick={() => setShowLegalDialog(false)}>
          <div className="hf-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hf-modal-header">
              <div className="hf-modal-title-row">
                <HushVectorIcon name="ic_moon_outline" size={18} />
                <span>{LegalContent.TITLE}</span>
              </div>
              <button
                type="button"
                className="hf-icon-btn"
                onClick={() => setShowLegalDialog(false)}
              >
                ✕
              </button>
            </div>
            <div
              ref={legalDragScroll.ref}
              onMouseDown={legalDragScroll.onMouseDown}
              onClickCapture={legalDragScroll.onClickCapture}
              style={{
                flex: 1,
                overflowY: 'auto',
                marginTop: 10,
                paddingRight: 4,
                fontSize: 11.5,
                lineHeight: 1.5,
                color: '#B8C4DB',
                scrollbarWidth: 'none',
                cursor: 'grab',
              }}
            >
              <div style={{ color: '#E2CCA8', fontWeight: 600, marginBottom: 10 }}>
                {LegalContent.EFFECTIVE_DATE}
              </div>
              <div
                style={{
                  color: '#FBE5C8',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  marginBottom: 6,
                }}
              >
                TERMS OF SERVICE
              </div>
              <p style={{ marginTop: 0 }}>{LegalContent.termsIntro}</p>
              {LegalContent.termsSections.map((sec, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{sec.heading}</div>
                  <div style={{ whiteSpace: 'pre-line' }}>{sec.body}</div>
                </div>
              ))}
              <div
                style={{
                  color: '#FBE5C8',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  margin: '14px 0 6px',
                }}
              >
                PRIVACY POLICY
              </div>
              <p style={{ marginTop: 0 }}>{LegalContent.privacyIntro}</p>
              {LegalContent.privacySections.map((sec, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{sec.heading}</div>
                  <div style={{ whiteSpace: 'pre-line' }}>{sec.body}</div>
                </div>
              ))}
              <div
                onClick={() => {
                  const next = !analyticsEnabled;
                  setAnalyticsEnabled(next);
                  saveStateToStorage({ analyticsEnabled: next });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 11px',
                  margin: '4px 0 8px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: 600 }}>
                  Anonymous Usage Analytics
                </span>
                <div
                  className={`hf-toggle-switch ${analyticsEnabled ? 'hf-toggle-switch--on' : ''}`}
                >
                  <div className="hf-toggle-switch__knob" />
                </div>
              </div>
            </div>
            <button
              type="button"
              className="hf-pill-btn hf-pill-btn--secondary"
              onClick={() => setShowLegalDialog(false)}
            >
              {t('close', locale)}
            </button>
          </div>
        </div>
      )}

      {toastMessage && <div className="hf-toast">{toastMessage}</div>}
    </div>
  );
};
