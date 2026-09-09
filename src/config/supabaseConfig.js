// ============================================================================
// Centralized Supabase Configuration
// ============================================================================
// Two Supabase projects are used:
// 1. Main project (obxgfqztkbmoqyicjjuk) - app_state key-value storage
// 2. Secondary project (vayvssbxuskhyujtbtyw) - attendance check-in data (read-only)

// Values come from .env via the window.__ENV__ object vite.config.js injects at build
// time. Deliberately no hardcoded fallbacks: these keys used to sit right here in the
// source, and because vite.config.js read process.env instead of loading .env, the
// fallbacks were what every build actually shipped — .env was dead weight for months.
// A missing key is now loud (build-time warning from vite.config.js, console error here)
// rather than silently papered over.
const env = (typeof window !== 'undefined' && window.__ENV__) || {};

const required = (key) => {
  const value = env[key];
  if (!value) {
    console.error(`[config] ${key} is missing from .env — Supabase calls will fail.`);
    return '';
  }
  return value;
};

export const SUPABASE_CONFIG = {
  // Main project for app_state table
  main: {
    url: required('VITE_SUPABASE_MAIN_URL'),
    key: required('VITE_SUPABASE_MAIN_KEY'),
  },
  // Secondary project for attendance check-in times (read-only)
  secondary: {
    url: required('VITE_SUPABASE_SECONDARY_URL'),
    key: required('VITE_SUPABASE_SECONDARY_KEY'),
  },
};

// Get config from localStorage (for user-configured secondaryProject)
export const getSupabaseConfig = () => {
  try {
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.key) {
        return {
          url: parsed.url.trim(),
          key: parsed.key.trim(),
        };
      }
    }
  } catch {}
  return SUPABASE_CONFIG.secondary;
};

export const getMainSupabaseConfig = () => SUPABASE_CONFIG.main;
