// ============================================================================
// Centralized Supabase Configuration
// ============================================================================
// Two Supabase projects are used:
// 1. Main project (obxgfqztkbmoqyicjjuk) - app_state key-value storage
// 2. Secondary project (vayvssbxuskhyujtbtyw) - attendance check-in data (read-only)

const getEnvOrDefault = (key, defaultValue) => {
  if (typeof window !== 'undefined' && window.__ENV__) {
    return window.__ENV__[key] || defaultValue;
  }
  return defaultValue;
};

export const SUPABASE_CONFIG = {
  // Main project for app_state table
  main: {
    url: getEnvOrDefault('VITE_SUPABASE_MAIN_URL', 'https://obxgfqztkbmoqyicjjuk.supabase.co'),
    key: getEnvOrDefault('VITE_SUPABASE_MAIN_KEY', 'sb_publishable_HzHy2N6TJe9cFPvsRJ7YHw_d3J8-NXn'),
  },
  // Secondary project for attendance check-in times (read-only)
  secondary: {
    url: getEnvOrDefault('VITE_SUPABASE_SECONDARY_URL', 'https://vayvssbxuskhyujtbtyw.supabase.co'),
    key: getEnvOrDefault('VITE_SUPABASE_SECONDARY_KEY', 'sb_publishable_yjyN0-SOXFwTPoOolSmKBw_QDyFe2rZ'),
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
