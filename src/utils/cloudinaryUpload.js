// ============================================================================
// Cloudinary unsigned upload for leave attachments
// ============================================================================
// Attachments used to be written straight into leave_requests.attachment_url as
// base64 data URIs — ~736 kB per row, 47 MB across the table, which drained the
// Supabase egress quota and was on course to hit the 500 MB database cap too.
// Files now go to Cloudinary and only the resulting URL is stored.
//
// This app is a static SPA (deployed with gh-pages), so there is no server to
// sign an upload with. That leaves an *unsigned* upload preset, which is the
// supported path for browser-only uploads: the preset name is public by design
// and carries no secret — the API secret never reaches the browser.

// Read-only view of the values vite.config.js injects at build time. Deliberately no
// fallbacks: a hardcoded default here would silently paper over a missing .env entry,
// which is exactly how the Supabase keys ended up living in the source instead of .env.
const env = (typeof window !== 'undefined' && window.__ENV__) || {};

export const CLOUDINARY_CONFIG = {
  cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || '',
  // Must be an *unsigned* preset. Create it at:
  // Cloudinary console → Settings → Upload → Upload presets → Add upload preset
  // → Signing Mode: Unsigned. Name it to match VITE_CLOUDINARY_UPLOAD_PRESET in .env.
  uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
};

// Cloudinary's own ceiling for unsigned uploads on the free tier.
const MAX_BYTES = 10 * 1024 * 1024;

export const isCloudinaryConfigured = () =>
  Boolean(CLOUDINARY_CONFIG.cloudName && CLOUDINARY_CONFIG.uploadPreset);

/**
 * Upload one attachment and return its https URL.
 * Throws with a message meant to be shown to the person filling in the form.
 */
export async function uploadAttachment(file) {
  if (!file) return null;

  if (!isCloudinaryConfigured()) {
    throw new Error('ยังไม่ได้ตั้งค่า Cloudinary (cloud name หรือ upload preset)');
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new Error(`ไฟล์ใหญ่เกินไป (${mb} MB) รองรับสูงสุด 10 MB`);
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  // 'auto' so images and PDFs both work through one endpoint.
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`;

  let res;
  try {
    res = await fetch(endpoint, { method: 'POST', body: form });
  } catch {
    throw new Error('เชื่อมต่อ Cloudinary ไม่ได้ ตรวจสอบอินเทอร์เน็ต');
  }

  if (!res.ok) {
    // Cloudinary reports the real reason here — an unsigned preset that does not
    // exist, or one still set to signed mode, is the usual cause.
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) detail = body.error.message;
    } catch { /* keep the status code */ }
    throw new Error(detail);
  }

  const data = await res.json();
  if (!data?.secure_url) {
    throw new Error('Cloudinary ไม่ได้ส่ง URL กลับมา');
  }
  return data.secure_url;
}
