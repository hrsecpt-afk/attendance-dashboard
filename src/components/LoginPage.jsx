import React, { useState, useEffect } from 'react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../context/AuthContext';

const LoginPage = () => {
  const { login, authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  // Re-render when the logo is restored from the cloud so it appears without reload.
  const [, forceLogoRefresh] = useState(0);
  useEffect(() => {
    const onRestored = () => forceLogoRefresh(v => v + 1);
    window.addEventListener('app-settings-restored', onRestored);
    return () => window.removeEventListener('app-settings-restored', onRestored);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // tiny delay for UX
    await new Promise(r => setTimeout(r, 400));
    const ok = await login(username, password);
    setLoading(false);
    if (!ok) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-dark)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(159,122,234,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 36px',
          borderRadius: '20px',
          animation: shake ? 'shake 0.5s ease' : undefined,
        }}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 16px',
            background: localStorage.getItem('app_logo_url') ? 'transparent' : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', boxShadow: localStorage.getItem('app_logo_url') ? 'none' : '0 8px 32px rgba(159,122,234,0.35)',
            overflow: 'hidden'
          }}>
            {localStorage.getItem('app_logo_url') ? (
              <img src={localStorage.getItem('app_logo_url')} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '🏫'
            )}
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)' }}>
            ระบบบริหารงานบุคคล
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            ศูนย์การศึกษาพิเศษประจำจังหวัดปทุมธานี
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit}>
          {authError && (
            <div style={{
              padding: '12px 16px', marginBottom: '16px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              color: 'var(--red)', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
              textAlign: 'center'
            }}>
              ⚠️ {authError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              👤 ชื่อผู้ใช้ (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้"
              autoComplete="username"
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px',
                border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)',
                color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none',
                boxSizing: 'border-box', transition: '0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              🔒 รหัสผ่าน (Password)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                autoComplete="current-password"
                required
                style={{
                  width: '100%', padding: '12px 44px 12px 14px', borderRadius: '12px',
                  border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none',
                  boxSizing: 'border-box', transition: '0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)'
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glow-button"
            style={{
              width: '100%', padding: '13px', fontSize: '0.95rem', fontWeight: 800,
              borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1, letterSpacing: '0.03em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {loading ? (
              <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⌛</span> กำลังตรวจสอบ...</>
            ) : (
              <>🔑 เข้าสู่ระบบ</>
            )}
          </button>
        </form>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
