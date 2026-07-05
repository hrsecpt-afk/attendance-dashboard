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
//
// IMPORTANT: the app talks to TWO Supabase projects. The `app_state` table
// lives in the MAIN project (obxgfqztkbmoqyicjjuk). The other project
// (vayvssbxuskhyujtbtyw, stored in the 'attendance_dashboard_supabase_config'
// localStorage key) is ONLY a read source for attendance check-in times and
// must never be written to — so this module deliberately does NOT read that
// config and always uses the main project below.
// ============================================================================

const APP_STATE_CONFIG = {
  url: 'https://obxgfqztkbmoqyicjjuk.supabase.co',
  key: 'sb_publishable_HzHy2N6TJe9cFPvsRJ7YHw_d3J8-NXn',
};

function getConfig() {
  return APP_STATE_CONFIG;
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
    if (!res.ok) {
      if (res.status === 404) {
        console.error(
          `getAppState(${key}) failed: ตาราง app_state ยังไม่ถูกสร้างใน Supabase — ` +
          'รัน SQL ในไฟล์ supabase_schema.sql (ส่วน app_state) ผ่าน SQL Editor ก่อน'
        );
      }
      return null;
    }
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
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(
        `setAppState(${key}) failed: HTTP ${res.status}. ` +
        (res.status === 404
          ? 'ตาราง app_state ยังไม่ถูกสร้างใน Supabase — รัน SQL ในไฟล์ supabase_schema.sql (ส่วน app_state) ผ่าน SQL Editor ก่อน'
          : body)
      );
    }
    return res.ok;
  } catch (err) {
    console.error(`setAppState(${key}) failed`, err);
    return false;
  }
}
