// ============================================================================
// Cloud settings sync
// ----------------------------------------------------------------------------
// Keeps device-local "settings" (logo, Telegram config, Google Calendar key,
// notification read-state, holiday cache) in sync across devices by storing
// them in the Supabase `app_state` key-value table (see ./appState.js).
//
// Keys are split into two buckets by size / change-frequency so that a frequent,
// tiny change (e.g. marking a notification read) never re-uploads the large,
// rarely-changed logo image:
//
//   • app_state['app_settings'] – small, frequently-changed settings
//   • app_state['app_logo']     – the (potentially multi-MB) logo image
// ============================================================================

import { getAppState, setAppState } from './appState.js';

// Each bucket = one app_state key holding a JSON blob of its localStorage keys.
const BUCKETS = [
  {
    stateKey: 'app_settings',
    keys: [
      'leave_telegram_bot_token', // Telegram notification bot token
      'leave_telegram_chat_id',   // Telegram notification chat id
      'gcal_api_key',             // Google Calendar API key
      'notif_read_ids',           // which notifications have been read
      'thai_public_holidays',     // cached Thai public holidays
    ],
  },
  {
    stateKey: 'app_logo',
    keys: ['app_logo_url'],       // app logo / branding (can be large base64)
  },
];

// Flat list of every synced key, for the localStorage patch to test against.
export const SYNCED_SETTING_KEYS = BUCKETS.flatMap((b) => b.keys);

function bucketForKey(key) {
  return BUCKETS.find((b) => b.keys.includes(key)) || null;
}

// While true, writes performed BY restore itself must not re-trigger a push.
let suspendSync = false;

// Upload a single bucket's keys as one JSON blob. Absent keys are stored as null
// so that a reset/removal on one device propagates to the others.
async function pushBucket(bucket) {
  const blob = {};
  bucket.keys.forEach((k) => {
    const v = localStorage.getItem(k);
    blob[k] = v == null ? null : v;
  });
  const ok = await setAppState(bucket.stateKey, JSON.stringify(blob));
  if (ok) console.log(`☁️ Synced ${bucket.stateKey} to Supabase Cloud`);
}

// Download one bucket's blob and apply it to localStorage. Returns true if any
// value actually changed.
async function restoreBucket(bucket) {
  const raw = await getAppState(bucket.stateKey);
  if (!raw) return false;

  let blob;
  try {
    blob = JSON.parse(raw);
  } catch {
    return false;
  }

  let changed = false;
  suspendSync = true;
  try {
    bucket.keys.forEach((k) => {
      if (!Object.prototype.hasOwnProperty.call(blob, k)) return;
      const val = blob[k];
      if (val == null) {
        if (localStorage.getItem(k) !== null) {
          try { localStorage.removeItem(k); changed = true; } catch {}
        }
      } else if (localStorage.getItem(k) !== val) {
        try { localStorage.setItem(k, val); changed = true; } catch {}
      }
    });
  } finally {
    suspendSync = false;
  }
  return changed;
}

// Restore every bucket. Dispatches an `app-settings-restored` event when any
// value changed so live UI (e.g. the logo) can refresh without a manual reload.
export async function restoreSettingsFromCloud() {
  const results = await Promise.all(BUCKETS.map((b) => restoreBucket(b)));
  const changed = results.some(Boolean);
  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('app-settings-restored'));
  }
  return changed;
}

// Push every bucket (used rarely — e.g. an explicit "sync now").
export async function pushSettingsToCloud() {
  await Promise.all(BUCKETS.map((b) => pushBucket(b)));
}

// Debounced push, called from the global localStorage patch whenever a
// whitelisted key changes. Only the bucket that owns the key is uploaded, so a
// tiny frequent change never re-sends the large logo. No-ops while restoring.
const pushTimers = new Map();
export function schedulePush(key) {
  if (suspendSync) return;
  const bucket = bucketForKey(key);
  if (!bucket) return;
  if (pushTimers.has(bucket.stateKey)) clearTimeout(pushTimers.get(bucket.stateKey));
  pushTimers.set(
    bucket.stateKey,
    setTimeout(() => {
      pushTimers.delete(bucket.stateKey);
      pushBucket(bucket);
    }, 1500)
  );
}
