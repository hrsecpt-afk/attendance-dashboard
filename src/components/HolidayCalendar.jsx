import React, { useState, useEffect, useMemo, useCallback } from 'react';

export const HOLIDAYS_STORAGE_KEY = 'thai_public_holidays';

export const DEFAULT_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: 'วันขึ้นปีใหม่', type: 'official' },
  { date: '2025-02-12', name: 'วันมาฆบูชา', type: 'official' },
  { date: '2025-04-06', name: 'วันจักรี', type: 'official' },
  { date: '2025-04-07', name: 'วันหยุดชดเชยวันจักรี', type: 'substitute' },
  { date: '2025-04-13', name: 'วันสงกรานต์', type: 'official' },
  { date: '2025-04-14', name: 'วันสงกรานต์', type: 'official' },
  { date: '2025-04-15', name: 'วันสงกรานต์', type: 'official' },
  { date: '2025-04-16', name: 'วันหยุดชดเชยวันสงกรานต์', type: 'substitute' },
  { date: '2025-05-01', name: 'วันแรงงานแห่งชาติ', type: 'official' },
  { date: '2025-05-04', name: 'วันฉัตรมงคล', type: 'official' },
  { date: '2025-05-05', name: 'วันหยุดชดเชยวันฉัตรมงคล', type: 'substitute' },
  { date: '2025-05-09', name: 'วันพืชมงคล', type: 'official' },
  { date: '2025-05-11', name: 'วันวิสาขบูชา', type: 'official' },
  { date: '2025-05-12', name: 'วันหยุดชดเชยวันวิสาขบูชา', type: 'substitute' },
  { date: '2025-06-02', name: 'วันหยุดราชการ (กรณีพิเศษ)', type: 'special' },
  { date: '2025-06-03', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ', type: 'official' },
  { date: '2025-07-10', name: 'วันอาสาฬหบูชา', type: 'official' },
  { date: '2025-07-11', name: 'วันเข้าพรรษา', type: 'official' },
  { date: '2025-07-28', name: 'วันเฉลิมพระชนมพรรษา รัชกาลที่ 10', type: 'official' },
  { date: '2025-08-11', name: 'วันหยุดราชการ (กรณีพิเศษ)', type: 'special' },
  { date: '2025-08-12', name: 'วันแม่แห่งชาติ', type: 'official' },
  { date: '2025-10-13', name: 'วันนวมินทรมหาราช', type: 'official' },
  { date: '2025-10-23', name: 'วันปิยมหาราช', type: 'official' },
  { date: '2025-12-05', name: 'วันพ่อแห่งชาติ', type: 'official' },
  { date: '2025-12-10', name: 'วันรัฐธรรมนูญ', type: 'official' },
  { date: '2025-12-31', name: 'วันสิ้นปี', type: 'official' },
];

export const loadHolidays = () => {
  try {
    const saved = localStorage.getItem(HOLIDAYS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(DEFAULT_HOLIDAYS_2025));
  return DEFAULT_HOLIDAYS_2025;
};

// Count working days excluding weekends AND public holidays
export const countWorkingDays = (start, end, holidays = []) => {
  if (!start || !end) return 0;
  const sDate = new Date(start);
  const eDate = new Date(end);
  if (isNaN(sDate.getTime()) || isNaN(eDate.getTime()) || sDate > eDate) return 0;
  const holidaySet = new Set(holidays.map(h => h.date));
  let count = 0;
  const current = new Date(sDate);
  while (current <= eDate) {
    const dow = current.getDay();
    const dateStr = current.toISOString().slice(0, 10);
    if (dow !== 0 && dow !== 6 && !holidaySet.has(dateStr)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

// Count how many holidays fall in a date range (weekdays only)
export const countHolidaysInRange = (start, end, holidays = []) => {
  if (!start || !end) return 0;
  const sDate = new Date(start);
  const eDate = new Date(end);
  return holidays.filter(h => {
    const d = new Date(h.date);
    const dow = d.getDay();
    return d >= sDate && d <= eDate && dow !== 0 && dow !== 6;
  }).length;
};

const MONTH_NAMES = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const DOW_HEADERS = ['อา','จ','อ','พ','พฤ','ศ','ส'];

const getTypeInfo = (type) => {
  if (type === 'substitute') return { label: 'ชดเชย', color: 'var(--yellow)' };
  if (type === 'special') return { label: 'พิเศษ', color: 'var(--secondary)' };
  if (type === 'custom') return { label: 'กำหนดเอง', color: 'var(--cyan)' };
  return { label: 'ราชการ', color: 'var(--red)' };
};

const HolidayCalendar = ({ role, holidays: propHolidays, setHolidays: propSetHolidays }) => {
  const [localHolidays, setLocalHolidays] = useState([]);
  
  const holidays = propHolidays !== undefined ? propHolidays : localHolidays;
  const setHolidays = propSetHolidays !== undefined ? propSetHolidays : setLocalHolidays;

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('official');
  const [gcalApiKey, setGcalApiKey] = useState('');
  const [gcalFetching, setGcalFetching] = useState(false);
  const [gcalStatus, setGcalStatus] = useState('');
  const [hovered, setHovered] = useState(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (propHolidays === undefined) {
      setLocalHolidays(loadHolidays());
    }
    setGcalApiKey(localStorage.getItem('gcal_api_key') || '');
  }, [propHolidays]);

  const saveHolidays = useCallback((list) => {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(sorted);
    localStorage.setItem(HOLIDAYS_STORAGE_KEY, JSON.stringify(sorted));
  }, [setHolidays]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) return;
    if (holidays.some(h => h.date === newDate)) { alert('วันหยุดนี้มีอยู่แล้ว'); return; }
    saveHolidays([...holidays, { date: newDate, name: newName.trim(), type: newType }]);
    setNewDate(''); setNewName(''); setNewType('official'); setShowAddForm(false);
  };

  const handleDelete = (date) => {
    if (!window.confirm(`ลบวันหยุด ${date} ออก?`)) return;
    saveHolidays(holidays.filter(h => h.date !== date));
  };

  const handleReset = () => {
    if (!window.confirm('รีเซ็ตวันหยุดทั้งหมดเป็นค่าเริ่มต้นปี 2568 (2025)?')) return;
    saveHolidays([...DEFAULT_HOLIDAYS_2025]);
  };

  const handleFetchGoogle = async () => {
    if (!gcalApiKey.trim()) { alert('โปรดใส่ Google Calendar API Key'); return; }
    setGcalFetching(true);
    setGcalStatus('⏳ กำลังดึงข้อมูล...');
    try {
      const calId = 'th.th%23holiday%40group.v.calendar.google.com';
      const url = `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?key=${gcalApiKey.trim()}&timeMin=${viewYear}-01-01T00:00:00Z&timeMax=${viewYear}-12-31T23:59:59Z&maxResults=60&singleEvents=true&orderBy=startTime`;
      const res = await fetch(url);
      if (!res.ok) { const e = await res.json(); throw new Error(e?.error?.message || 'API Error'); }
      const data = await res.json();
      const fetched = (data.items || [])
        .map(item => ({ date: item.start?.date || item.start?.dateTime?.slice(0, 10), name: item.summary, type: 'official' }))
        .filter(h => h.date);
      const custom = holidays.filter(h => h.type === 'custom');
      saveHolidays([...custom, ...fetched]);
      localStorage.setItem('gcal_api_key', gcalApiKey.trim());
      setGcalStatus(`✅ สำเร็จ! พบ ${fetched.length} วันหยุดในปี ค.ศ. ${viewYear}`);
    } catch (err) {
      setGcalStatus(`❌ ล้มเหลว: ${err.message}`);
    } finally {
      setGcalFetching(false);
    }
  };

  const calCells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);
    const cells = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const m = String(viewMonth + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${m}-${day}`;
      const dow = new Date(viewYear, viewMonth, d).getDay();
      cells.push({ d, dateStr, dow, isSun: dow === 0, isSat: dow === 6, isToday: dateStr === todayStr, holiday: holidays.find(h => h.date === dateStr) || null });
    }
    return cells;
  }, [viewYear, viewMonth, holidays]);

  const yearHolidays = useMemo(() => holidays.filter(h => h.date.startsWith(String(viewYear))), [holidays, viewYear]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem', boxSizing: 'border-box' };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>📅 ปฏิทินวันหยุดราชการไทย</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            ใช้คำนวณ <b>วันทำการสุทธิ</b> ในระบบขอลา — พบ <b>{yearHolidays.length} วัน</b>หยุดในปี พ.ศ. {viewYear + 543}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setShowAddForm(s => !s)} style={{ padding: '7px 14px', background: showAddForm ? 'rgba(239,68,68,0.08)' : 'rgba(159,122,234,0.08)', border: `1px solid ${showAddForm ? 'rgba(239,68,68,0.3)' : 'rgba(159,122,234,0.3)'}`, color: showAddForm ? 'var(--red)' : 'var(--primary)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
              {showAddForm ? '✕ ปิด' : '➕ เพิ่มวันหยุด'}
            </button>
            <button onClick={handleReset} style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--yellow)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>🔄 รีเซ็ต 2568</button>
          </div>
        )}
      </div>

      {/* Add Form */}
      {isAdmin && showAddForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '16px', border: '1px solid rgba(159,122,234,0.25)' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>➕ เพิ่มวันหยุดราชการ</h4>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', alignItems: 'end' }}>
            <div><label style={{ display: 'block', fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>📅 วันที่</label><input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required style={inputStyle} /></div>
            <div><label style={{ display: 'block', fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>🏷️ ชื่อวันหยุด</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="เช่น วันหยุดพิเศษ" required style={inputStyle} /></div>
            <div><label style={{ display: 'block', fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>📌 ประเภท</label>
              <select value={newType} onChange={e => setNewType(e.target.value)} style={inputStyle}>
                <option value="official">ราชการ</option><option value="substitute">ชดเชย</option><option value="special">พิเศษ</option><option value="custom">กำหนดเอง</option>
              </select>
            </div>
            <button type="submit" style={{ padding: '8px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>✅ บันทึก</button>
          </form>
        </div>
      )}

      {/* Google Calendar Panel */}
      {isAdmin && (
        <div className="glass-panel" style={{ padding: '14px 18px', border: '1px solid rgba(6,182,212,0.15)' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: '10px' }}>🌐 ดึงข้อมูลจาก Google Calendar API <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: 400 }}>(optional — ไม่ต้องมีก็ใช้งานได้)</span></div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="password" value={gcalApiKey} onChange={e => setGcalApiKey(e.target.value)} placeholder="Google Calendar API Key..." style={{ flex: '1 1 200px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }} />
            <button onClick={handleFetchGoogle} disabled={gcalFetching} style={{ padding: '8px 16px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.3)', color: 'var(--cyan)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: gcalFetching ? 'not-allowed' : 'pointer', opacity: gcalFetching ? 0.6 : 1 }}>
              {gcalFetching ? '⏳ กำลังดึง...' : `📥 ดึงปี ค.ศ. ${viewYear}`}
            </button>
          </div>
          {gcalStatus && <div style={{ marginTop: '8px', fontSize: '0.78rem', color: gcalStatus.startsWith('✅') ? 'var(--green)' : gcalStatus.startsWith('❌') ? 'var(--red)' : 'var(--text-muted)', fontWeight: 600 }}>{gcalStatus}</div>}
          <div style={{ marginTop: '6px', fontSize: '0.70rem', color: 'var(--text-muted)' }}>
            💡 API Key ฟรีจาก <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>console.cloud.google.com</a> → Enable Google Calendar API → Create Credentials
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: '16px' }}>

        {/* Calendar Grid */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <button onClick={prevMonth} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{MONTH_NAMES[viewMonth]}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>พ.ศ. {viewYear + 543} (ค.ศ. {viewYear})</div>
            </div>
            <button onClick={nextMonth} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem' }}>›</button>
          </div>
          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
            {[2024, 2025, 2026, 2027].map(y => (
              <button key={y} onClick={() => setViewYear(y)} style={{ padding: '3px 10px', borderRadius: '6px', border: 'none', background: viewYear === y ? 'var(--primary)' : 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>{y + 543}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '5px' }}>
            {DOW_HEADERS.map((d, i) => <div key={d} style={{ textAlign: 'center', fontSize: '0.70rem', fontWeight: 700, color: i === 0 ? 'var(--red)' : i === 6 ? 'rgba(159,122,234,0.8)' : 'var(--text-muted)', padding: '4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
            {calCells.map((cell, idx) => {
              if (!cell) return <div key={`e${idx}`} />;
              let bg = 'transparent', color = 'var(--text-main)', border = '1px solid transparent';
              if (cell.holiday) { bg = 'rgba(239,68,68,0.12)'; color = 'var(--red)'; border = '1px solid rgba(239,68,68,0.28)'; }
              else if (cell.isSun) color = 'rgba(239,68,68,0.55)';
              else if (cell.isSat) color = 'rgba(159,122,234,0.7)';
              if (cell.isToday) { bg = 'rgba(159,122,234,0.2)'; border = '1px solid var(--primary)'; }
              if (hovered === cell.dateStr && cell.holiday) bg = 'rgba(239,68,68,0.22)';
              return (
                <div key={cell.dateStr} title={cell.holiday ? cell.holiday.name : cell.isSun || cell.isSat ? 'วันหยุดสุดสัปดาห์' : ''}
                  onMouseEnter={() => setHovered(cell.dateStr)} onMouseLeave={() => setHovered(null)}
                  style={{ textAlign: 'center', padding: '6px 2px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: cell.holiday || cell.isToday ? 700 : 400, color, background: bg, border, cursor: cell.holiday ? 'pointer' : 'default', minHeight: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}>
                  {cell.d}
                  {cell.holiday && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--red)', marginTop: '2px' }} />}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'inline-block' }} />วันหยุดราชการ</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(159,122,234,0.2)', border: '1px solid var(--primary)', display: 'inline-block' }} />วันนี้</span>
            <span style={{ color: 'rgba(239,68,68,0.6)' }}>อา = อาทิตย์</span>
            <span style={{ color: 'rgba(159,122,234,0.7)' }}>ส = เสาร์</span>
          </div>
        </div>

        {/* Holiday List */}
        <div className="glass-panel" style={{ padding: '14px', overflowY: 'auto', maxHeight: '520px' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: '0 0 10px' }}>
            📋 วันหยุดปี {viewYear + 543}
            <span style={{ fontSize: '0.68rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px' }}>({yearHolidays.length} วัน)</span>
          </h4>
          {yearHolidays.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px 0' }}>
              ไม่มีข้อมูลวันหยุดในปีนี้
              {isAdmin && <><br /><small style={{ fontSize: '0.70rem' }}>ลองดึงจาก Google Calendar หรือรีเซ็ตค่าเริ่มต้น</small></>}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {yearHolidays.map(h => {
              const ti = getTypeInfo(h.type);
              const d = new Date(h.date);
              return (
                <div key={h.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${ti.color}`, gap: '6px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                    <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>{d.getDate()} {MONTH_SHORT[d.getMonth()]}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.60rem', color: ti.color, background: `${ti.color}15`, border: `1px solid ${ti.color}40`, padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>{ti.label}</span>
                    {isAdmin && <button onClick={() => handleDelete(h.date)} style={{ padding: '2px 5px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red)', borderRadius: '4px', fontSize: '0.60rem', cursor: 'pointer' }}>✕</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayCalendar;

