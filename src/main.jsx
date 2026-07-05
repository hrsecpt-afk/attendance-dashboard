import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// Global Monkeypatch for localStorage & sessionStorage to prevent QuotaExceededError crashes on mobile/private browsers
try {
  const originalSetItem = window.localStorage.setItem;
  window.localStorage.setItem = function (key, value) {
    try {
      originalSetItem.call(window.localStorage, key, value);
    } catch (e) {
      console.warn("Storage write failed (QuotaExceededError/Restricted):", key, e);
    }
  };
} catch (e) {
  console.error("Failed to patch localStorage", e);
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
