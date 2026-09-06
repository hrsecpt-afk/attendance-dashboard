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

import { getMainSupabaseConfig } from '../config/supabaseConfig.js';

function getConfig() {
  return getMainSupabaseConfig();
}

// ── Change detection ────────────────────────────────────────────────────────
// The values here are large: `employees_data` is roughly 780 KB (123 people ×
// 13 months × 15 leave types) and `app_logo` is a base64 image. They were being
// re-downloaded in full on every mount and every time a tab regained focus,
// which is what drained the project's egress quota.
//
// The table already carries `updated_at`, so a re-read can ask the cheap
// question first — "has this changed?" costs ~150 bytes — and download the
// value only when the answer is yes. Nothing here changes minute to minute, so
// in normal use the answer is almost always no.
const cache = new Map(); // key → { updatedAt, value }

// Set to false if the column turns out not to exist, so a project whose
// app_state predates `updated_at` still works — just without the saving.
let hasUpdatedAt = true;

// One read of one key. Returns the row, plus whether the request itself
// succeeded, so a missing row (null) can be told apart from a failed request.
async function fetchRow(key, select) {
  const cfg = getConfig();
  if (!cfg) return { ok: false, row: null, status: 0 };
  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=${select}&limit=1`,
      { headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` } }
    );
    if (!res.ok) {
      if (res.status === 404) {
        console.error(
          `getAppState(${key}) failed: ตาราง app_state ยังไม่ถูกสร้างใน Supabase — ` +
          'รัน SQL ในไฟล์ supabase_schema.sql (ส่วน app_state) ผ่าน SQL Editor ก่อน'
        );
      }
      return { ok: false, row: null, status: res.status };
    }
    const rows = await res.json();
    return {
      ok: true,
      row: Array.isArray(rows) && rows.length > 0 ? rows[0] : null,
      status: res.status,
    };
  } catch (err) {
    console.error(`getAppState(${key}) failed`, err);
    return { ok: false, row: null, status: 0 };
  }
}

// Just the timestamp — a few hundred bytes regardless of how big the value is.
// Returns { ok, found, updatedAt }. `ok: false` means the question could not be
// asked, which callers must not mistake for "unchanged"; `found: false` means
// the row is genuinely absent, which a null timestamp on an existing row is not.
export async function getAppStateUpdatedAt(key) {
  if (!hasUpdatedAt) return { ok: false, found: false, updatedAt: null };
  const { ok, row, status } = await fetchRow(key, 'updated_at');
  if (!ok) {
    // A 400 here means the column is missing, not that the read failed.
    if (status === 400) hasUpdatedAt = false;
    return { ok: false, found: false, updatedAt: null };
  }
  return { ok: true, found: row != null, updatedAt: row?.updated_at ?? null };
}

// Read a key's value together with the timestamp it was last written at, so a
// caller that will re-read later can remember the timestamp and skip the body.
export async function getAppStateWithMeta(key) {
  const cached = cache.get(key);

  // Ask the cheap question first, but only once we have something to compare
  // against — on a cold load there is nothing to save.
  if (cached) {
    const probe = await getAppStateUpdatedAt(key);
    if (probe.ok) {
      if (!probe.found) {
        // The row is gone; so is anything we remembered about it.
        cache.delete(key);
        return { value: null, updatedAt: null };
      }
      // A row whose timestamp is null tells us nothing about whether it moved,
      // so it falls through to a full read rather than being trusted.
      if (probe.updatedAt !== null && probe.updatedAt === cached.updatedAt) {
        return { value: cached.value, updatedAt: cached.updatedAt };
      }
    }
  }

  const select = hasUpdatedAt ? 'value,updated_at' : 'value';
  let full = await fetchRow(key, select);
  if (!full.ok && full.status === 400 && hasUpdatedAt) {
    hasUpdatedAt = false;
    full = await fetchRow(key, 'value');
  }
  // A failed read must not look like an empty one: fall back on what we last
  // saw rather than telling the caller the cloud has nothing.
  if (!full.ok) {
    return cached
      ? { value: cached.value, updatedAt: cached.updatedAt }
      : { value: null, updatedAt: null };
  }
  if (!full.row) {
    cache.delete(key);
    return { value: null, updatedAt: null };
  }

  const value = full.row.value ?? null;
  const updatedAt = full.row.updated_at ?? null;
  cache.set(key, { updatedAt, value });
  return { value, updatedAt };
}

// Read a single key's stored string value (or null if missing / on error).
export async function getAppState(key) {
  const { value } = await getAppStateWithMeta(key);
  return value;
}

// Upsert a single key's string value.
export async function setAppState(key, value) {
  const cfg = getConfig();
  if (!cfg) return false;

  const headers = {
    'Content-Type': 'application/json',
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
  };
  // `updated_at` has to be written explicitly. Its `default now()` applies only
  // to a fresh INSERT, so an upsert that resolves to an UPDATE — or a PATCH —
  // would leave the old timestamp in place, and every other device would go on
  // believing nothing had changed. The whole read path above depends on this.
  const stamp = () => (hasUpdatedAt ? { updated_at: new Date().toISOString() } : {});
  const encodedKey = encodeURIComponent(key);

  try {
    let res = await fetch(`${cfg.url}/rest/v1/app_state?on_conflict=key`, {
      method: 'POST',
      headers: {
        ...headers,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key, value, ...stamp() }),
    });

    // A 400 on a project whose app_state predates `updated_at` means the column,
    // not the write, is the problem. Drop it and try once more before treating
    // this as a real failure.
    if (!res.ok && res.status === 400 && hasUpdatedAt) {
      hasUpdatedAt = false;
      res = await fetch(`${cfg.url}/rest/v1/app_state?on_conflict=key`, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ key, value }),
      });
    }

    // Some Supabase projects keep a stale PostgREST schema cache or were
    // created without the expected primary key. In that case, update by the
    // text key first, then insert the row if it does not exist yet.
    if (!res.ok) {
      const firstError = await res.text().catch(() => '');
      console.error(`setAppState(${key}) upsert failed: HTTP ${res.status}. ${firstError}`);

      res = await fetch(`${cfg.url}/rest/v1/app_state?key=eq.${encodedKey}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ value, ...stamp() }),
      });

      if (res.ok) {
        cache.delete(key);
        return true;
      }

      const patchError = await res.text().catch(() => '');
      console.error(`setAppState(${key}) patch failed: HTTP ${res.status}. ${patchError}`);

      res = await fetch(`${cfg.url}/rest/v1/app_state`, {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ key, value, ...stamp() }),
      });
    }

    // The remembered copy is now behind the cloud — and we deliberately do not
    // rewrite it from what we just sent, because another device may have
    // written in between. Forget it and let the next read fetch the truth.
    if (res.ok) cache.delete(key);

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
