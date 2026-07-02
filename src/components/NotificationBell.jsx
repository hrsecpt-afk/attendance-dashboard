import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
const getSupabaseCfg = () => {
  try {
    const s = localStorage.getItem('attendance_dashboard_supabase_config');
    if (s) {
      const p = JSON.parse(s);
      if (p.url && p.key) return p;
    }
  } catch {}
  return {
    url: 'https://vayvssbxuskhyujtbtyw.supabase.co',
    key: 'sb_publishable_yjyN0-SOXFwTPoOolSmKBw_QDyFe2rZ'
  };
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'เมื่อกี้';
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 86400)} วันที่แล้ว`;
};

const typeIcon = (type) => {
  if (!type) return '📋';
  if (type.includes('ป่วย')) return '🤒';
  if (type.includes('พักผ่อน')) return '🌴';
  if (type.includes('คลอด')) return '👶';
  if (type.includes('กิจ')) return '📌';
  return '📋';
};

// ─────────────────────────────────────────────────
// NotificationBell Component
// ─────────────────────────────────────────────────
const NotificationBell = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [leaveNotifs, setLeaveNotifs] = useState([]);
  const [dutyNotifs, setDutyNotifs] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_read_ids') || '[]')); }
    catch { return new Set(); }
  });
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  // ── Load notifications ──────────────────────────
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const cfg = getSupabaseCfg();

    let leaveItems = [];
    let dutyItems = [];

    if (cfg) {
      // Fetch pending leave requests from Supabase
      try {
        const res = await fetch(`${cfg.url}/rest/v1/leave_requests?status=eq.pending&order=created_at.desc&limit=30`, {
          headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
        });
        if (res.ok) leaveItems = await res.json();
      } catch (e) { console.error('Notif: leave fetch failed', e); }

      // Fetch pending duty requests from Supabase
      try {
        const res = await fetch(`${cfg.url}/rest/v1/duty_requests?status=eq.pending&order=created_at.desc&limit=30`, {
          headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
        });
        if (res.ok) dutyItems = await res.json();
      } catch (e) { console.error('Notif: duty fetch failed', e); }
    } else {
      // Fallback to localStorage
      try {
        const lr = localStorage.getItem('attendance_dashboard_leave_requests') || localStorage.getItem('leave_requests_v2');
        if (lr) leaveItems = JSON.parse(lr).filter(r => r.status === 'pending');
      } catch {}
      try {
        const dr = localStorage.getItem('duty_requests');
        if (dr) dutyItems = JSON.parse(dr).filter(r => r.status === 'pending');
      } catch {}
    }

    setLeaveNotifs(leaveItems);
    setDutyNotifs(dutyItems);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
    // Refresh every 60 seconds
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // ── Close on outside click ──────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Badge count ─────────────────────────────────
  const unreadLeave = leaveNotifs.filter(n => !readIds.has(`leave_${n.id}`)).length;
  const unreadDuty = dutyNotifs.filter(n => !readIds.has(`duty_${n.id}`)).length;
  const totalUnread = unreadLeave + unreadDuty;

  const markAllRead = () => {
    const newIds = new Set(readIds);
    leaveNotifs.forEach(n => newIds.add(`leave_${n.id}`));
    dutyNotifs.forEach(n => newIds.add(`duty_${n.id}`));
    setReadIds(newIds);
    localStorage.setItem('notif_read_ids', JSON.stringify([...newIds]));
  };

  const markRead = (key) => {
    const newIds = new Set(readIds);
    newIds.add(key);
    setReadIds(newIds);
    localStorage.setItem('notif_read_ids', JSON.stringify([...newIds]));
  };

  const handleLeaveClick = (item) => {
    markRead(`leave_${item.id}`);
    setOpen(false);
    if (onNavigate) onNavigate('leave_system');
  };

  const handleDutyClick = (item) => {
    markRead(`duty_${item.id}`);
    setOpen(false);
    if (onNavigate) onNavigate('out_of_office');
  };

  const allNotifs = [
    ...leaveNotifs.map(n => ({ ...n, _kind: 'leave', _key: `leave_${n.id}` })),
    ...dutyNotifs.map(n => ({ ...n, _kind: 'duty', _key: `duty_${n.id}` })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* ── Bell Button ─── */}
      <button
        id="notification-bell-btn"
        onClick={() => { setOpen(o => !o); if (!open) loadNotifications(); }}
        style={{
          position: 'relative',
          padding: '10px',
          background: open ? 'rgba(159,122,234,0.15)' : 'var(--bg-card)',
          border: open ? '1px solid rgba(159,122,234,0.4)' : '1px solid var(--border-color)',
          color: 'var(--text-main)',
          borderRadius: '12px',
          cursor: 'pointer',
          fontSize: '1.15rem',
          transition: 'all 0.2s',
          lineHeight: 1,
        }}
        title="การแจ้งเตือน"
      >
        🔔
        {totalUnread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px', right: '-5px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff',
            borderRadius: '999px',
            fontSize: '0.65rem',
            fontWeight: 800,
            minWidth: '18px',
            height: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--bg-dark)',
            animation: 'pulse 1.8s infinite',
          }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ─── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '360px',
          maxHeight: '500px',
          background: 'var(--bg-dark, #1a1a2e)',
          border: '1px solid var(--border-color)',
          borderRadius: '18px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease',
          isolation: 'isolate',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(159,122,234,0.12)',
            backdropFilter: 'none'
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                🔔 การแจ้งเตือน
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {loading ? 'กำลังโหลด...' : `${totalUnread} รายการยังไม่อ่าน`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {totalUnread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 8px', borderRadius: '6px' }}
                >
                  อ่านทั้งหมด
                </button>
              )}
              <button
                onClick={loadNotifications}
                style={{ fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}
                title="รีเฟรช"
              >🔄</button>
            </div>
          </div>

          {/* Summary chips */}
          <div style={{ padding: '10px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{
              background: unreadLeave > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${unreadLeave > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
              color: unreadLeave > 0 ? 'var(--red)' : 'var(--text-muted)',
              borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700,
              cursor: 'pointer'
            }}
              onClick={() => { onNavigate && onNavigate('leave_system'); setOpen(false); }}
            >
              📬 ใบลารอ {leaveNotifs.length} รายการ
            </span>
            <span style={{
              background: unreadDuty > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${unreadDuty > 0 ? 'rgba(245,158,11,0.3)' : 'var(--border-color)'}`,
              color: unreadDuty > 0 ? 'var(--yellow)' : 'var(--text-muted)',
              borderRadius: '8px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700,
              cursor: 'pointer'
            }}
              onClick={() => { onNavigate && onNavigate('out_of_office'); setOpen(false); }}
            >
              🚗 ออกนอกพื้นที่รอ {dutyNotifs.length} รายการ
            </span>
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ⏳ กำลังโหลดการแจ้งเตือน...
              </div>
            )}
            {!loading && allNotifs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>ไม่มีคำขอที่รอดำเนินการ</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>ทุกคำขอได้รับการดำเนินการแล้ว</div>
              </div>
            )}
            {!loading && allNotifs.map((item, idx) => {
              const isLeave = item._kind === 'leave';
              const isRead = readIds.has(item._key);
              return (
                <div
                  key={item._key}
                  onClick={() => isLeave ? handleLeaveClick(item) : handleDutyClick(item)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < allNotifs.length - 1 ? '1px solid var(--border-color)' : 'none',
                    cursor: 'pointer',
                    background: isRead ? 'transparent' : 'rgba(159,122,234,0.05)',
                    transition: 'background 0.15s',
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = isRead ? 'transparent' : 'rgba(159,122,234,0.05)'}
                >
                  {/* Icon */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: isLeave
                      ? 'linear-gradient(135deg, rgba(159,122,234,0.2), rgba(99,102,241,0.15))'
                      : 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,179,8,0.15))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.15rem',
                    border: `1px solid ${isLeave ? 'rgba(159,122,234,0.25)' : 'rgba(245,158,11,0.25)'}`
                  }}>
                    {isLeave ? typeIcon(item.leave_type) : '🚗'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <div style={{ fontWeight: isRead ? 500 : 700, fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.3 }}>
                        {item.employee_name || 'ไม่ทราบชื่อ'}
                      </div>
                      {!isRead && (
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: 'var(--primary)', flexShrink: 0, marginTop: '4px'
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                      {isLeave
                        ? `${item.leave_type || 'ขอลา'} — ${item.days || '?'} วัน`
                        : `ออกนอกสถานที่ — ${item.destination || item.objective || '?'}`
                      }
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                      <span style={{
                        background: isLeave ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                        color: isLeave ? 'var(--red)' : 'var(--yellow)',
                        border: `1px solid ${isLeave ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                        borderRadius: '5px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700
                      }}>⏳ รออนุมัติ</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{timeAgo(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {allNotifs.length > 0 && (
            <div style={{
              padding: '10px 16px', borderTop: '1px solid var(--border-color)',
              textAlign: 'center'
            }}>
              <button
                onClick={() => { onNavigate && onNavigate('leave_system'); setOpen(false); }}
                style={{
                  background: 'rgba(159,122,234,0.08)', border: '1px solid rgba(159,122,234,0.2)',
                  color: 'var(--primary)', borderRadius: '8px', padding: '6px 16px',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
                }}
              >
                ดูคำขอทั้งหมดในระบบลาออนไลน์ →
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
