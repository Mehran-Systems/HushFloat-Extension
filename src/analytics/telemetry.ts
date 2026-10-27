/**
 * HushFloat Extension — Google Analytics 4 (GA4) Measurement Protocol Telemetry
 *
 * Linked to Firebase / Google Cloud Project:
 *   - project_id: "hushfloat"
 *   - project_number: "268016127556"
 *   - package_name: "com.mehransystems.hushfloat"
 *
 * Why Measurement Protocol (`https://www.google-analytics.com/mp/collect`)?
 *   Browser extensions (Manifest V3 in Chrome/Edge/Opera/Brave & Firefox AMO) prohibit remote
 *   `<script src="https://www.googletagmanager.com/gtag/js">` tags and third-party cookies.
 *   Google's official Chrome Extension GA4 guide recommends sending JSON events over `fetch()`
 *   to the GA4 Measurement Protocol endpoint with an anonymous `client_id` and `session_id`.
 */

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

// Configure via `.env` (VITE_GA4_MEASUREMENT_ID / VITE_GA4_API_SECRET) or directly below:
export const GA4_CONFIG = {
  firebaseProjectId: 'hushfloat',
  firebaseProjectNumber: '268016127556',
  measurementId:
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GA4_MEASUREMENT_ID) ||
    'G-HUSHFLOAT01',
  apiSecret:
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GA4_API_SECRET) ||
    '',
};

const SESSION_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes standard GA4 session timeout
const DEFAULT_ENGAGEMENT_TIME_MS = 100;

export type TelemetryParams = Record<string, string | number | boolean | undefined>;

interface StoredTelemetryMeta {
  ga_client_id?: string;
  ga_session_id?: string;
  ga_session_last_ts?: number;
  analyticsEnabled?: boolean;
  analytics_event_log?: Array<{
    name: string;
    params: TelemetryParams;
    ts: number;
  }>;
}

function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function readTelemetryMeta(): Promise<StoredTelemetryMeta> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get([
        'ga_client_id',
        'ga_session_id',
        'ga_session_last_ts',
        'analyticsEnabled',
        'analytics_event_log',
      ]);
      return data as StoredTelemetryMeta;
    }
  } catch {}
  try {
    const raw = localStorage.getItem('hushfloat_telemetry_meta');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeTelemetryMeta(patch: Partial<StoredTelemetryMeta>): Promise<void> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set(patch);
      return;
    }
  } catch {}
  try {
    const prev = await readTelemetryMeta();
    localStorage.setItem('hushfloat_telemetry_meta', JSON.stringify({ ...prev, ...patch }));
  } catch {}
}

async function getOrCreateClientAndSessionId(): Promise<{
  clientId: string;
  sessionId: string;
  analyticsEnabled: boolean;
  eventLog: NonNullable<StoredTelemetryMeta['analytics_event_log']>;
}> {
  const meta = await readTelemetryMeta();
  const analyticsEnabled = meta.analyticsEnabled !== false; // default true
  const now = Date.now();

  let clientId = meta.ga_client_id;
  let sessionId = meta.ga_session_id;
  const lastTs = meta.ga_session_last_ts || 0;
  let dirty = false;

  if (!clientId) {
    clientId = generateUuidV4();
    dirty = true;
  }

  if (!sessionId || now - lastTs > SESSION_EXPIRATION_MS) {
    sessionId = String(Math.floor(now / 1000));
    dirty = true;
  }

  if (dirty || now - lastTs > 15000) {
    await writeTelemetryMeta({
      ga_client_id: clientId,
      ga_session_id: sessionId,
      ga_session_last_ts: now,
    });
  }

  return {
    clientId,
    sessionId,
    analyticsEnabled,
    eventLog: Array.isArray(meta.analytics_event_log) ? meta.analytics_event_log : [],
  };
}

/**
 * Sends an anonymous GA4 event via the Measurement Protocol and records it in the local telemetry buffer.
 */
export async function trackEvent(
  eventName: string,
  params: TelemetryParams = {}
): Promise<void> {
  try {
    const { clientId, sessionId, analyticsEnabled, eventLog } =
      await getOrCreateClientAndSessionId();

    if (!analyticsEnabled) return;

    const cleanParams: Record<string, string | number> = {
      session_id: sessionId,
      engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_MS,
      app_platform:
        typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox')
          ? 'firefox_extension'
          : 'chromium_extension',
      app_version: '1.0.1',
    };

    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        cleanParams[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
      }
    }

    // Persist last 50 events locally for diagnostics/verification
    const updatedLog = [
      ...eventLog.slice(-49),
      { name: eventName, params: cleanParams, ts: Date.now() },
    ];
    await writeTelemetryMeta({ analytics_event_log: updatedLog });

    // Dispatch to Google Analytics 4 Measurement Protocol when API secret is configured
    if (GA4_CONFIG.measurementId && GA4_CONFIG.apiSecret) {
      const url = `${GA_ENDPOINT}?measurement_id=${encodeURIComponent(
        GA4_CONFIG.measurementId
      )}&api_secret=${encodeURIComponent(GA4_CONFIG.apiSecret)}`;

      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          events: [
            {
              name: eventName,
              params: cleanParams,
            },
          ],
        }),
      });
    }
  } catch {
    // Telemetry must never interrupt audio playback or UI responsiveness
  }
}

export async function trackScreenView(screenName: string): Promise<void> {
  await trackEvent('page_view', {
    page_title: `HushFloat - ${screenName}`,
    page_location: `extension://hushfloat/${screenName.toLowerCase()}`,
    screen_name: screenName,
  });
}
