// ============================================================================
// Shared cloud state (Supabase `app_state` key-value table)
// ----------------------------------------------------------------------------
// The employees table has no free-form column to stash app-wide JSON blobs in
// (earlier code wrote to a non-existent `location` column, so every cloud sync
// silently failed with HTTP 400). Instead we use a dedicated key-value table:
//
//   create table public.app_state (
//     key text primary key,
//     value text,
//     updated_at timestamptz default now()
//   );
//   alter table public.app_state enable row level security;
//   create policy "Allow public read/write access"
//     on public.app_state for all using (true) with check (true);
//
// Keys in use: 'employees_data', 'daily_overrides', 'app_settings', 'app_logo'.
// ============================================================================

// Fallback config identical to the one App.jsx auto-injects, so state can sync
// even before that effect runs (e.g. on the very first paint / login screen).
const DEFAULT_CONFIG = {
  url: 'https://vayvssbxuskhyujtbtyw.supabase.co',
  key: 'sb_publishable_yjyN0-SOXFwTPoOolSmKBw_QDyFe2rZ',
};

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

// Read a single key's stored string value (or null if missing / on error).
export async function getAppState(key) {
  const cfg = getConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) return rows[0].value ?? null;
    return null;
  } catch (err) {
    console.error(`getAppState(${key}) failed`, err);
    return null;
  }
}

// Upsert a single key's string value.
export async function setAppState(key, value) {
  const cfg = getConfig();
  if (!cfg) return false;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/app_state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key, value }),
    });
    return res.ok;
  } catch (err) {
    console.error(`setAppState(${key}) failed`, err);
    return false;
  }
}
