import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// Every VITE_* value the browser is allowed to see. `window.__ENV__` is replaced with
// this object at build time, and src/config/supabaseConfig.js + src/utils/cloudinaryUpload.js
// read it. A key listed here but absent from .env is simply dropped by JSON.stringify,
// which is why a typo used to disappear without a trace — hence the warning below.
const PUBLIC_KEYS = [
  'VITE_SUPABASE_MAIN_URL',
  'VITE_SUPABASE_MAIN_KEY',
  'VITE_SUPABASE_SECONDARY_URL',
  'VITE_SUPABASE_SECONDARY_KEY',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_CLOUDINARY_UPLOAD_PRESET',
];

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv, not process.env: Vite does not load .env into process.env for the config
  // file itself. Reading process.env here left every key undefined, so the built app ran
  // entirely on the hardcoded fallbacks in the source and .env had no effect at all.
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '');

  const publicEnv = {};
  const missing = [];
  for (const key of PUBLIC_KEYS) {
    if (env[key]) publicEnv[key] = env[key];
    else missing.push(key);
  }
  if (missing.length) {
    console.warn(
      `\n[env] Missing from .env: ${missing.join(', ')}\n` +
      `      The app will fall back to whatever default the source defines, or fail at runtime.\n`
    );
  }

  return {
    base: '/attendance-dashboard/',
    plugins: [
      react(),
      legacy({
        targets: ['defaults', 'not IE 11', 'iOS >= 12', 'Safari >= 12']
      })
    ],
    define: {
      'window.__ENV__': JSON.stringify(publicEnv),
    }
  };
})
