// ============================================================================
// Cloud settings sync
// ----------------------------------------------------------------------------
// Keeps device-local "settings" (logo, Telegram config, Google Calendar key,
// notification read-state, holiday cache) in sync across devices by storing
// them as JSON blobs in dedicated Supabase "system" rows, mirroring the pattern
// already used for employeesData (…999) and daily_overrides (…998).
//
// Keys are split into buckets by size / change-frequency so that a frequent,
// tiny change (e.g. marking a notification read) never re-uploads the large,
// rarely-changed logo image:
//
//   • …997  SYSTEM_APP_SETTINGS – small, frequently-changed settings
//   • …996  SYSTEM_APP_LOGO     – the (potentially multi-MB) logo image
// ============================================================================

// Fallback config identical to the one App.jsx auto-injects, so settings can be
// synced even before that effect has run (e.g. on the very first paint).
const DEFAULT_CONFIG = {
  url: 'https://vayvssbxuskhyujtbtyw.supabase.co',
  key: 'sb_publishable_yjyN0-SOXFwTPoOolSmKBw_QDyFe2rZ',
};

// Each bucket = one Supabase system row holding a JSON blob of its keys.
const BUCKETS = [
  {
    id: '99999999-9999-9999-9999-999999999997',
    name: 'SYSTEM_APP_SETTINGS',
    keys: [
      'leave_telegram_bot_token', // Telegram notification bot token
      'leave_telegram_chat_id',   // Telegram notification chat id
      'gcal_api_key',             // Google Calendar API key
      'notif_read_ids',           // which notifications have been read
      'thai_public_holidays',     // cached Thai public holidays
    ],
  },
  {
    id: '99999999-9999-9999-9999-999999999996',
    name: 'SYSTEM_APP_LOGO',
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

function getConfig() {
  try {
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    if (saved) {
      const cfg = JSON.parse(saved);
      if (cfg && cfg.url && cfg.key) return cfg;
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_CONFIG;
}

// Upload a single bucket's keys as one JSON blob. Absent keys are stored as null
// so that a reset/removal on one device propagates to the others.
async function pushBucket(bucket) {
  const cfg = getConfig();
  if (!cfg) return;
  try {
    const blob = {};
    bucket.keys.forEach((k) => {
      const v = localStorage.getItem(k);
      blob[k] = v == null ? null : v;
    });

    await fetch(`${cfg.url}/rest/v1/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: bucket.id,
        full_name: bucket.name,
        position: 'SYSTEM',
        location: JSON.stringify(blob),
      }),
    });
    console.log(`☁️ Synced ${bucket.name} to Supabase Cloud`);
  } catch (err) {
    console.error(`Failed to sync ${bucket.name} to cloud`, err);
  }
}

// Download one bucket's blob and apply it to localStorage. Returns true if any
// value actually changed.
async function restoreBucket(bucket) {
  const cfg = getConfig();
  if (!cfg) return false;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/employees?id=eq.${bucket.id}&select=location`,
      { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } }
    );
    if (!res.ok) return false;

    const rows = await res.json();
    if (!rows || !rows.length || !rows[0].location) return false;

    const blob = JSON.parse(rows[0].location);
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
  } catch (err) {
    console.error(`Failed to restore ${bucket.name} from cloud`, err);
    return false;
  }
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
  if (pushTimers.has(bucket.id)) clearTimeout(pushTimers.get(bucket.id));
  pushTimers.set(
    bucket.id,
    setTimeout(() => {
      pushTimers.delete(bucket.id);
      pushBucket(bucket);
    }, 1500)
  );
}
