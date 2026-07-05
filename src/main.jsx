import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SYNCED_SETTING_KEYS, schedulePush, restoreSettingsFromCloud } from './utils/cloudSettings.js'

// Global Monkeypatch for localStorage & sessionStorage to prevent QuotaExceededError crashes on mobile/private browsers.
// Also triggers a debounced cloud push whenever a shared "settings" key changes,
// so device-local settings (logo, Telegram, etc.) stay in sync across devices.
try {
  const originalSetItem = window.localStorage.setItem;
  window.localStorage.setItem = function (key, value) {
    try {
      originalSetItem.call(window.localStorage, key, value);
    } catch (e) {
      console.warn("Storage write failed (QuotaExceededError/Restricted):", key, e);
    }
    if (SYNCED_SETTING_KEYS.includes(key)) schedulePush(key);
  };

  const originalRemoveItem = window.localStorage.removeItem;
  window.localStorage.removeItem = function (key) {
    try {
      originalRemoveItem.call(window.localStorage, key);
    } catch (e) {
      console.warn("Storage remove failed:", key, e);
    }
    if (SYNCED_SETTING_KEYS.includes(key)) schedulePush(key);
  };
} catch (e) {
  console.error("Failed to patch localStorage", e);
}

// Pull shared settings from the cloud as early as possible so they land in
// localStorage before (or shortly after) the first paint.
try {
  restoreSettingsFromCloud();
} catch (e) {
  console.error("Initial settings restore failed", e);
}

try {
  const originalSessionSetItem = window.sessionStorage.setItem;
  window.sessionStorage.setItem = function (key, value) {
    try {
      originalSessionSetItem.call(window.sessionStorage, key, value);
    } catch (e) {
      console.warn("SessionStorage write failed (QuotaExceededError/Restricted):", key, e);
    }
  };
} catch (e) {
  console.error("Failed to patch sessionStorage", e);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
