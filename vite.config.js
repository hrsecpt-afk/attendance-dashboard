import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// eslint-disable-next-line no-undef
const env = process.env;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'iOS >= 12', 'Safari >= 12']
    })
  ],
  define: {
    'window.__ENV__': {
      VITE_SUPABASE_MAIN_URL: JSON.stringify(env.VITE_SUPABASE_MAIN_URL),
      VITE_SUPABASE_MAIN_KEY: JSON.stringify(env.VITE_SUPABASE_MAIN_KEY),
      VITE_SUPABASE_SECONDARY_URL: JSON.stringify(env.VITE_SUPABASE_SECONDARY_URL),
      VITE_SUPABASE_SECONDARY_KEY: JSON.stringify(env.VITE_SUPABASE_SECONDARY_KEY),
    }
  }
})
