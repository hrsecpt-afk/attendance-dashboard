#!/usr/bin/env node
// ============================================================================
// Move existing leave attachments out of the database and into Cloudinary
// ============================================================================
// leave_requests.attachment_url holds the file itself as a base64 data URI —
// ~736 kB per row, ~47 MB across the table. New submissions go straight to
// Cloudinary, but the rows written before that change still carry their
// payload. This walks them, uploads each to Cloudinary, and replaces the
// column with the resulting https URL.
//
//   node scripts/migrate-attachments-to-cloudinary.mjs              # dry run
//   node scripts/migrate-attachments-to-cloudinary.mjs --limit 5 --apply
//   node scripts/migrate-attachments-to-cloudinary.mjs --apply
//
// Safe to re-run. Migrated rows no longer match the data: filter, so an
// interrupted run resumes exactly where it stopped.
//
// Every original is appended to backups/ before its row is touched. That file
// is the only copy of the base64 once the column is overwritten — keep it
// until you have confirmed the migrated attachments render.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = (() => {
  const i = args.indexOf('--limit');
  return i !== -1 && args[i + 1] ? parseInt(args[i + 1], 10) : Infinity;
})();

// Cloudinary's ceiling for unsigned uploads on the free tier. Anything larger
// is reported and left in place rather than silently dropped.
const MAX_BYTES = 10 * 1024 * 1024;
const PAGE_SIZE = 50;

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

// Exiting before main() has started is safe; once a fetch is in flight,
// process.exit() trips a libuv assertion on Windows and reports 127 instead of 1.
const bail = (msg) => {
  console.error(`\n${red('X')} ${msg}\n`);
  process.exit(1);
};

// Inside main(), unwind to the top instead and let the event loop drain.
class Fatal extends Error {}
const die = (msg) => { throw new Fatal(msg); };

// --- config -----------------------------------------------------------------

const loadEnvFile = () => {
  const p = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(p)) bail('.env not found. Run this from the project root.');
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
};

const env = loadEnvFile();
const SUPABASE_URL = env.VITE_SUPABASE_MAIN_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_MAIN_KEY;
const CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET;

for (const [k, v] of Object.entries({
  VITE_SUPABASE_MAIN_URL: SUPABASE_URL,
  VITE_SUPABASE_MAIN_KEY: SUPABASE_KEY,
  VITE_CLOUDINARY_CLOUD_NAME: CLOUD_NAME,
  VITE_CLOUDINARY_UPLOAD_PRESET: UPLOAD_PRESET,
})) {
  if (!v) bail(`${k} is missing from .env`);
}

const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const TABLE = `${SUPABASE_URL}/rest/v1/leave_requests`;
// PostgREST reads * as the LIKE wildcard.
const FILTER = 'attachment_url=like.data:*';

// --- preflight --------------------------------------------------------------

// A restricted project answers 402 to everything, which would otherwise look
// like a hundred unrelated failures halfway through the run.
const checkSupabase = async () => {
  const res = await fetch(`${TABLE}?select=id&limit=1`, { headers: HEADERS });
  if (res.status === 402) {
    const body = await res.text().catch(() => '');
    die(
      'Supabase is refusing requests: 402 Payment Required.\n' +
      `  ${body.slice(0, 300)}\n\n` +
      '  The project is over its egress quota and service is suspended. Restore it\n' +
      '  (raise or remove the spend cap, upgrade, or wait for the quota to reset)\n' +
      '  before migrating — this script has to read every attachment back out.'
    );
  }
  if (!res.ok) die(`Supabase returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  console.log(`${green('OK')} Supabase reachable`);
};

// Probing with no file returns "Missing required parameter - file" when the
// preset exists and is unsigned, and a preset-specific error when it does not.
// Cheaper and cleaner than uploading a throwaway asset to find out.
const checkCloudinary = async () => {
  const form = new FormData();
  form.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  const msg = await res.json().then((b) => b?.error?.message || '').catch(() => '');

  // Complaining about the absent file means it got past the preset itself.
  if (/missing required parameter/i.test(msg)) {
    console.log(`${green('OK')} Cloudinary preset "${UPLOAD_PRESET}" exists and is unsigned`);
    return;
  }
  if (/whitelisted for unsigned/i.test(msg)) {
    die(`Cloudinary preset "${UPLOAD_PRESET}" is set to Signed mode. Change it to Unsigned.`);
  }
  if (/preset/i.test(msg)) {
    die(
      `Cloudinary rejected preset "${UPLOAD_PRESET}" on cloud "${CLOUD_NAME}": ${msg}\n` +
      '  Create it: Cloudinary console -> Settings -> Upload -> Upload presets ->\n' +
      `  Add upload preset -> name it "${UPLOAD_PRESET}" -> Signing Mode: Unsigned.`
    );
  }

  // Anything else is a response shape this probe does not recognise. Say so and
  // carry on rather than blocking a setup that may well be fine — the upload of
  // the first row will surface a real problem soon enough, and no row is written
  // back until its upload has succeeded.
  console.log(`${yellow('?')} Cloudinary preflight inconclusive: ${msg || `HTTP ${res.status}`}`);
  console.log(`${dim('  Continuing. Use --limit 1 --apply first to confirm on a single row.')}`);
};

// --- work -------------------------------------------------------------------

const countRemaining = async () => {
  const res = await fetch(`${TABLE}?select=id&${FILTER}&limit=0`, {
    headers: { ...HEADERS, Prefer: 'count=exact' },
  });
  const range = res.headers.get('content-range') || '';
  return parseInt(range.split('/')[1], 10) || 0;
};

// id only — pulling attachment_url here would download the whole 47 MB up front,
// which is the exact mistake this migration exists to undo.
const fetchIdPage = async (offset) => {
  const res = await fetch(
    `${TABLE}?select=id&${FILTER}&order=created_at.asc&limit=${PAGE_SIZE}&offset=${offset}`,
    { headers: HEADERS }
  );
  if (!res.ok) throw new Error(`list failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

const fetchAttachment = async (id) => {
  const res = await fetch(`${TABLE}?select=attachment_url&id=eq.${id}&limit=1`, { headers: HEADERS });
  if (!res.ok) throw new Error(`read failed: ${res.status}`);
  const rows = await res.json();
  return rows?.[0]?.attachment_url || null;
};

const uploadToCloudinary = async (dataUri, id) => {
  const form = new FormData();
  // Cloudinary accepts a data URI directly as `file`, so there is no need to
  // decode it to a Blob first.
  form.append('file', dataUri);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('public_id', `leave_${id}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const msg = await res.json().then((b) => b?.error?.message || '').catch(() => '');
    throw new Error(`upload failed: ${msg || res.status}`);
  }
  const body = await res.json();
  if (!body?.secure_url) throw new Error('upload returned no secure_url');
  return body.secure_url;
};

const writeBackUrl = async (id, url) => {
  const res = await fetch(`${TABLE}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ attachment_url: url }),
  });
  if (!res.ok) throw new Error(`write failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
};

const confirm = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) => rl.question(question, r));
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
};

// --- main -------------------------------------------------------------------

const main = async () => {
  console.log(`\n${APPLY ? yellow('APPLY') : green('DRY RUN')} - migrating base64 attachments to Cloudinary\n`);

  await checkSupabase();
  await checkCloudinary();

  const total = await countRemaining();
  const target = Math.min(total, LIMIT);
  console.log(
    `${green('OK')} ${total} row(s) still hold a base64 attachment` +
    (LIMIT !== Infinity ? dim(` - processing ${target} (--limit ${LIMIT})`) : '')
  );

  if (total === 0) {
    console.log(`\n${green('Nothing to migrate.')}\n`);
    return;
  }

  if (!APPLY) {
    console.log(`\n${dim('Dry run: no uploads, no writes, no backup file.')}`);
    console.log(`${dim('Re-run with --apply to migrate. Start small: --limit 5 --apply')}\n`);
    return;
  }

  fs.mkdirSync('backups', { recursive: true });
  const backupPath = path.join(
    'backups',
    `attachment-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
  );
  console.log(`${green('OK')} originals will be appended to ${backupPath}\n`);

  if (!(await confirm(`Overwrite attachment_url on ${target} row(s)? Type "yes" to proceed: `))) {
    console.log('\nAborted. Nothing was changed.\n');
    return;
  }
  console.log();

  let done = 0;
  let skipped = 0;
  const failures = [];

  // Always page from the count of rows this run left behind: each migrated row
  // drops out of the filter, so the unprocessed rows shift down to take its
  // place, while skips and failures stay put and must be stepped over.
  while (done + skipped + failures.length < target) {
    const page = await fetchIdPage(skipped + failures.length);
    if (page.length === 0) break;

    for (const { id } of page) {
      if (done + skipped + failures.length >= target) break;
      const label = `[${done + skipped + failures.length + 1}/${target}] row ${id}`;
      try {
        const dataUri = await fetchAttachment(id);
        if (!dataUri || !dataUri.startsWith('data:')) {
          skipped++;
          console.log(`${dim(label)} ${dim('not base64, skipped')}`);
          continue;
        }

        const bytes = Math.round((dataUri.length - (dataUri.indexOf(',') + 1)) * 0.75);
        if (bytes > MAX_BYTES) {
          skipped++;
          console.log(
            `${yellow('!')} ${label} ` +
            yellow(`${(bytes / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB unsigned limit - left in place`)
          );
          continue;
        }

        // The backup lands on disk before the row is touched, never after.
        fs.appendFileSync(backupPath, JSON.stringify({ id, attachment_url: dataUri }) + '\n');

        const url = await uploadToCloudinary(dataUri, id);
        await writeBackUrl(id, url);
        done++;
        console.log(`${green('OK')} ${label} ${dim(`${(bytes / 1024).toFixed(0)} kB ->`)} ${url}`);
      } catch (err) {
        failures.push({ id, error: err.message });
        console.log(`${red('X')} ${label} ${red(err.message)}`);
      }
    }
  }

  console.log(
    `\n${green(`Migrated: ${done}`)}   ${yellow(`Skipped: ${skipped}`)}   ` +
    (failures.length ? red(`Failed: ${failures.length}`) : 'Failed: 0')
  );
  if (failures.length) {
    console.log('\nFailed rows (left untouched, safe to re-run):');
    for (const f of failures) console.log(`  ${f.id}: ${f.error}`);
  }
  console.log(`\nOriginals: ${backupPath}`);
  console.log(`${dim('Keep that file until you have confirmed the migrated attachments render.')}\n`);
};

main().catch((e) => {
  console.error(`\n${red('X')} ${e instanceof Fatal ? e.message : e.stack || e.message}\n`);
  process.exitCode = 1;
});
