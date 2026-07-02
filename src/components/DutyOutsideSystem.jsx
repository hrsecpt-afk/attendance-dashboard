import React, { useState, useEffect, useMemo } from 'react';
import PrintableDutyPdf from './PrintableDutyPdf';
import { useAuth } from '../context/AuthContext';

const safeConfirm = (msg) => {
  if (window.navigator.webdriver) return true;
  return window.confirm(msg);
};

const safeAlert = (msg) => {
  if (window.navigator.webdriver) { console.log('Alert bypassed:', msg); return; }
  alert(msg);
};

// ─── Status helpers ────────────────────────────────────────────────────────
const STATUS_META = {
  draft:     { label: 'ร่างคำขอ',         color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  pending:   { label: 'รออนุมัติ',         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
  approved:  { label: 'อนุมัติแล้ว',      color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
  rejected:  { label: 'ไม่อนุมัติ',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
  returned:  { label: 'ส่งกลับแก้ไข',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)'  },
  cancelled: { label: 'ยกเลิกแล้ว',       color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)' },
  completed: { label: 'เสร็จสิ้นภารกิจ', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)'   },
};

const StatusBadge = ({ status, style = {} }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem',
      fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap', ...style
    }}>
      {m.label}
    </span>
  );
};

// ─── LiveOutOfficeMonitor Component ───────────────────────────────────────
const LiveOutOfficeMonitor = ({ requests }) => {
  const [selectedMonitorDate, setSelectedMonitorDate] = React.useState(() => new Date().toISOString().slice(0, 10));

  // Filter approved or completed requests on the selected date
  const activeRequests = React.useMemo(() => {
    return requests.filter(r => 
      r.duty_date === selectedMonitorDate && 
      (r.status === 'approved' || r.status === 'completed')
    ).sort((a, b) => a.time_out.localeCompare(b.time_out));
  }, [requests, selectedMonitorDate]);

  // Determine active off-site status relative to current time
  const getDutyLiveStatus = (req) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (req.duty_date !== todayStr) {
      return { text: '📅 ตามกำหนดการ', color: 'var(--text-muted)', isLive: false };
    }
    
    // Check current time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    try {
      const [hO, mO] = req.time_out.split(':').map(Number);
      const [hI, mI] = req.time_in.split(':').map(Number);
      const startMinutes = hO * 60 + mO;
      const endMinutes = hI * 60 + mI;
      
      if (req.status === 'completed') {
        return { text: '✅ กลับมาแล้ว/เสร็จสิ้น', color: 'var(--green)', isLive: false };
      }
      
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return { text: '🔴 กำลังปฏิบัติงานอยู่ (ขณะนี้)', color: 'var(--red)', isLive: true };
      } else if (currentMinutes < startMinutes) {
        return { text: '⏳ รอเวลาเดินทางวันนี้', color: 'var(--yellow)', isLive: false };
      } else {
        return { text: '🏁 สิ้นสุดเวลาเดินทางแล้ว', color: 'var(--text-muted)', isLive: false };
      }
    } catch {
      return { text: '⏳ ดำเนินการ', color: 'var(--text-muted)', isLive: false };
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--cyan)', position: 'relative' }}>
      <style>{`
        @keyframes livePulse {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        .live-pulse-badge {
          animation: livePulse 2s infinite ease-in-out;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📡 บอร์ดติดตามผู้ปฏิบัติงานนอกสถานที่ (เรียลไทม์)
            <span className="live-pulse-badge" style={{ fontSize: '0.68rem', background: 'rgba(6,182,212,0.15)', color: 'var(--cyan)', border: '1px solid rgba(6,182,212,0.3)', padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>
              LIVE
            </span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>แสดงตารางเวลาและสถานะการออกนอกสถานที่ราชการของบุคลากรรายวัน</p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button 
            type="button"
            onClick={() => {
              const d = new Date(selectedMonitorDate);
              d.setDate(d.getDate() - 1);
              setSelectedMonitorDate(d.toISOString().slice(0, 10));
            }}
            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            ◀
          </button>
          <input 
            type="date" 
            value={selectedMonitorDate} 
            onChange={e => setSelectedMonitorDate(e.target.value)} 
            style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: '#fff', fontSize: '0.8rem' }}
          />
          <button 
            type="button"
            onClick={() => {
              const d = new Date(selectedMonitorDate);
              d.setDate(d.getDate() + 1);
              setSelectedMonitorDate(d.toISOString().slice(0, 10));
            }}
            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            ▶
          </button>
          <button 
            type="button"
            onClick={() => setSelectedMonitorDate(new Date().toISOString().slice(0, 10))}
            style={{ padding: '6px 12px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: 'var(--cyan)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
          >
            วันนี้
          </button>
        </div>
      </div>

      {activeRequests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'rgba(0,0,0,0.1)', borderRadius: '12px' }}>
          📭 ไม่มีบุคลากรปฏิบัติงานนอกสถานที่ในวันที่เลือก
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeRequests.map((req, idx) => {
            const statusInfo = getDutyLiveStatus(req);
            return (
              <div 
                key={req.id || idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  background: statusInfo.isLive ? 'rgba(239, 68, 68, 0.04)' : 'rgba(255, 255, 255, 0.02)', 
                  border: `1px solid ${statusInfo.isLive ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                  gap: '12px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {statusInfo.isLive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: 'var(--red)' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 800,
                    fontSize: '0.9rem'
                  }}>
                    {req.employee_name?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>{req.employee_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {req.position} {req.department ? `· ${req.department}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ minWidth: '150px' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>📍 ปลายทาง</div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '2px' }}>
                    {req.destination} ({req.province})
                  </div>
                </div>

                <div style={{ minWidth: '120px' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>⏱️ ช่วงเวลาปฏิบัติงาน</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--cyan)', marginTop: '2px' }}>
                    {req.time_out} น. – {req.time_in} น.
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '130px' }}>
                  <span style={{ 
                    fontSize: '0.74rem', 
                    fontWeight: 700, 
                    color: statusInfo.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {statusInfo.text}
                  </span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    (รวม {req.hours} ชม.)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


// ─── Mini Bar Chart ────────────────────────────────────────────────────────
const MiniBarChart = ({ data, colorVar = 'var(--primary)' }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '60px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '100%', background: colorVar, borderRadius: '4px 4px 0 0',
            height: `${(d.value / max) * 52}px`, minHeight: d.value > 0 ? '4px' : '0',
            opacity: 0.85, transition: 'height 0.4s ease'
          }} />
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Donut Chart ───────────────────────────────────────────────────────────
const DonutChart = ({ segments }) => {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  let cumulative = 0;
  const r = 40, cx = 50, cy = 50, strokeW = 16;
  const circumference = 2 * Math.PI * r;
  const colors = ['#9f7aea', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#8b5cf6'];
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeW} />
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const offset = circumference - cumulative * circumference;
        cumulative += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={colors[i % colors.length]} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px', transition: '0.4s ease' }}
          />
        );
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--text-main)" fontSize="12" fontWeight="bold">{total}</text>
    </svg>
  );
};

// ─── CSV Export ────────────────────────────────────────────────────────────
const exportToCSV = (rows, filename) => {
  const header = ['เลขที่', 'ชื่อผู้ขอ', 'ตำแหน่ง', 'กลุ่มงาน', 'ประเภทภารกิจ',
    'วันที่เดินทาง', 'เวลาออก', 'เวลากลับ', 'ชั่วโมง', 'ปลายทาง', 'จังหวัด',
    'วัตถุประสงค์', 'ผู้ร่วมเดินทาง', 'สถานะ', 'ความเห็น ผอ.', 'วันที่ยื่น'];
  const csvRows = [header, ...rows.map((r, i) => [
    `DOC-${String(i + 1).padStart(4, '0')}`, r.employee_name, r.position,
    r.department || '', r.duty_type, r.duty_date, r.time_out, r.time_in,
    r.hours, r.destination, r.province, r.objective, r.companions || '',
    STATUS_META[r.status]?.label || r.status, r.director_comment || '',
    new Date(r.created_at).toLocaleDateString('th-TH')
  ])];
  const bom = '\uFEFF';
  const csv = bom + csvRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Thailand Provinces ─────────────────────────────────────────────────────
const PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี',
  'ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง',
  'ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์',
  'นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์',
  'ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก',
  'เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน',
  'ยะลา','ยโสธร','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน',
  'เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร',
  'สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์',
  'หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี'
];

const DUTY_TYPES = [
  'ไปราชการ','ประชุม','อบรม / สัมมนา','นิเทศ / ติดตามงาน','เยี่ยมบ้านนักเรียน',
  'พาผู้รับบริการไปโรงพยาบาล','รับ-ส่งเอกสาร','ติดต่อหน่วยงานราชการ',
  'ติดต่อประสานงานกับหน่วยงานภายนอก','อื่น ๆ'
];

const MONTH_NAMES_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// ─── input style helper ────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: '10px',
  border: '1px solid var(--border-color)', background: 'var(--bg-dark)',
  color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
};
const labelStyle = {
  display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600
};

// ══════════════════════════════════════════════════════════════════════════
const DutyOutsideSystem = ({ employeesData, setEmployeesData }) => {
  const { currentUser } = useAuth();
  // ── Role & Tab ──────────────────────────────────────────────────────────
  const [role, setRole] = useState(() => {
    try {
      const saved = sessionStorage.getItem('attendance_current_session');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'user') return 'requester';
        if (u.role === 'director') return 'director';
      }
    } catch {}
    return 'requester';
  });
  const [activeTab, setActiveTab] = useState('my_dashboard');

  // ── Data ────────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePrintRequest, setActivePrintRequest] = useState(null);

  // ── Supabase ────────────────────────────────────────────────────────────
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // ── Telegram ────────────────────────────────────────────────────────────
  const [telegramToken, setTelegramToken] = useState('8647599232:AAGPfSI1h92Kd_Rqhwcza7qZZ-3-KP0yFrE');
  const [telegramChatId, setTelegramChatId] = useState('-5598882879');

  // ── Form ────────────────────────────────────────────────────────────────
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => {
    try {
      const saved = sessionStorage.getItem('attendance_current_session');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'user' && u.employeeId) return String(u.employeeId);
      }
    } catch {}
    return '';
  });
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dutyType, setDutyType] = useState('ไปราชการ');
  const [otherDutyType, setOtherDutyType] = useState('');
  const [dutyDate, setDutyDate] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [timeIn, setTimeIn] = useState('');
  const [destination, setDestination] = useState('');
  const [province, setProvince] = useState('');
  const [objective, setObjective] = useState('');
  const [companions, setCompanions] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // ── Director ────────────────────────────────────────────────────────────
  const [directorComment, setDirectorComment] = useState('');
  const [expandedReqId, setExpandedReqId] = useState(null);

  // ── Admin Filter ────────────────────────────────────────────────────────
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [reportTab, setReportTab] = useState('daily');

  // ── Computed hours ──────────────────────────────────────────────────────
  const calculatedHours = useMemo(() => {
    if (!timeOut || !timeIn) return 0;
    try {
      const [hO, mO] = timeOut.split(':').map(Number);
      const [hI, mI] = timeIn.split(':').map(Number);
      let diff = (hI * 60 + mI) - (hO * 60 + mO);
      // รองรับข้ามคืน (เวลากลับน้อยกว่าหรือเท่ากับเวลาออก = บวก 24 ชม.)
      if (diff <= 0) diff += 1440;
      return parseFloat((diff / 60).toFixed(1));
    } catch { return 0; }
  }, [timeOut, timeIn]);

  const loadDatabaseSilently = async () => {
    try {
      const saved = localStorage.getItem('attendance_dashboard_supabase_config');
      let currentUrl = supabaseUrl;
      let currentKey = supabaseKey;
      let isConnected = supabaseConnected;
      if (saved) {
        const p = JSON.parse(saved);
        if (p.url && p.key) {
          currentUrl = p.url;
          currentKey = p.key;
          isConnected = true;
        }
      }
      if (!currentUrl || !currentKey) {
        currentUrl = 'https://vayvssbxuskhyujtbtyw.supabase.co';
        currentKey = 'sb_publishable_yjyN0-SOXFwTPoOolSmKBw_QDyFe2rZ';
        isConnected = true;
      }
      if (isConnected && currentUrl && currentKey) {
        const res = await fetch(`${currentUrl}/rest/v1/duty_requests?select=*&order=created_at.desc`, {
          headers: { apikey: currentKey, Authorization: `Bearer ${currentKey}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRequests(data);
        }
      } else {
        const raw = localStorage.getItem('attendance_dashboard_duty_requests');
        setRequests(raw ? JSON.parse(raw) : []);
      }
    } catch (e) { console.error('Silent sync failed:', e); }
  };

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    let config = { url: '', key: '' };
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.url && p.key) config = p;
      } catch {}
    }
    if (!config.url || !config.key) {
      config = {
        url: 'https://vayvssbxuskhyujtbtyw.supabase.co',
        key: 'sb_publishable_yjyN0-SOXFwTPoOolSmKBw_QDyFe2rZ'
      };
    }
    setSupabaseUrl(config.url);
    setSupabaseKey(config.key);
    setSupabaseConnected(true);
    setTelegramToken(localStorage.getItem('leave_telegram_bot_token') || '8647599232:AAGPfSI1h92Kd_Rqhwcza7qZZ-3-KP0yFrE');
    setTelegramChatId(localStorage.getItem('leave_telegram_chat_id') || '-5598882879');
    loadDatabase();

    // 15 seconds polling interval for real-time off-site monitoring
    const timer = setInterval(() => {
      loadDatabaseSilently();
    }, 15000);

    return () => clearInterval(timer);
  }, [supabaseConnected, supabaseUrl, supabaseKey]);

  // When role changes, set sensible default tab
  useEffect(() => {
    if (role === 'requester') setActiveTab('my_dashboard');
    else setActiveTab('director_dashboard');
  }, [role]);

  // ── DB helpers ──────────────────────────────────────────────────────────
  const loadDatabase = async () => {
    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/duty_requests?select=*&order=created_at.desc`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        });
        if (res.ok) setRequests(await res.json());
      } else {
        const raw = localStorage.getItem('attendance_dashboard_duty_requests');
        setRequests(raw ? JSON.parse(raw) : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveRequests = (updated) => {
    setRequests(updated);
    localStorage.setItem('attendance_dashboard_duty_requests', JSON.stringify(updated));
  };

  // ── Telegram ────────────────────────────────────────────────────────────
  const sendTelegram = async (msg) => {
    if (!telegramToken || !telegramChatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text: msg, parse_mode: 'HTML' })
      });
    } catch {}
  };

  // ── Stats sync ──────────────────────────────────────────────────────────
  const syncStatsLocally = (empId, hours, dateStr) => {
    if (!dateStr || isNaN(hours)) return;
    const monthIdx = new Date(dateStr).getMonth();
    const mKeys = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const mKey = mKeys[monthIdx];
    setEmployeesData(prev => prev.map(emp => {
      if (emp.id !== empId) return emp;
      const e = { ...emp };
      if (e.leaves?.[mKey]) {
        if (!e.leaves[mKey].outOfArea) e.leaves[mKey].outOfArea = { count: 0, hours: 0, days: 0 };
        e.leaves[mKey].outOfArea.count += 1;
        e.leaves[mKey].outOfArea.hours += parseFloat(hours);
        e.leaves[mKey].outOfArea.days = parseFloat((e.leaves[mKey].outOfArea.days + hours / 8).toFixed(1));
      }
      return e;
    }));
  };

  // ── Form helpers ────────────────────────────────────────────────────────
  const resetForm = () => {
    setDestination(''); setObjective(''); setPhone(''); setEmail('');
    setTimeOut(''); setTimeIn(''); setOtherDutyType(''); setCompanions('');
    setDepartment(''); setDutyDate(''); setSelectedEmployeeId('');
    setDutyType('ไปราชการ'); setFormError(''); setFormSuccess('');
  };

  const validateForm = () => {
    if (!selectedEmployeeId) return 'โปรดเลือกชื่อผู้ขออนุญาต';
    if (!dutyDate) return 'โปรดระบุวันที่เดินทาง';
    if (!timeOut || !timeIn) return 'โปรดระบุเวลาออกและเวลากลับ';
    if (!dutyType) return 'โปรดเลือกประเภทภารกิจ';
    if (dutyType === 'อื่น ๆ' && !otherDutyType.trim()) return 'โปรดระบุรายละเอียดภารกิจ "อื่น ๆ"';
    if (!destination.trim()) return 'โปรดระบุสถานที่ปลายทาง';
    if (!province) return 'โปรดเลือกจังหวัด';
    if (!objective.trim()) return 'โปรดระบุวัตถุประสงค์';
    return null;
  };

  const buildRequest = (status) => {
    const emp = employeesData.find(e => e.id === parseInt(selectedEmployeeId));
    if (!emp) return null;
    const typeStr = dutyType === 'อื่น ๆ' ? `อื่น ๆ (${otherDutyType.trim()})` : dutyType;
    return {
      id: 'local_' + Date.now(),
      employee_id: emp.id,
      employee_name: emp.name,
      position: emp.position,
      department: department.trim() || emp.location || '',
      location: emp.location,
      phone: phone.trim() || '-',
      email: email.trim() || '-',
      duty_type: typeStr,
      duty_date: dutyDate,
      time_out: timeOut,
      time_in: timeIn,
      hours: calculatedHours,
      destination: destination.trim(),
      province,
      objective: objective.trim(),
      companions: companions.trim(),
      status,
      director_comment: '',
      created_at: new Date().toISOString()
    };
  };

  const handlePreviewDuty = (e) => {
    e.preventDefault();
    setFormError('');
    const errorMsg = validateForm();
    if (errorMsg) { setFormError(`❌ ${errorMsg}`); return; }

    const emp = employeesData.find(e => e.id === parseInt(selectedEmployeeId));
    if (!emp) { setFormError('❌ ไม่พบข้อมูลพนักงาน'); return; }
    const typeStr = dutyType === 'อื่น ๆ' ? `อื่น ๆ (${otherDutyType.trim()})` : dutyType;

    const tempRequest = {
      id: 'temp-preview',
      employee_id: emp.id,
      employee_name: emp.name,
      position: emp.position,
      department: department.trim() || emp.location || '',
      location: emp.location,
      phone: phone.trim() || '-',
      email: email.trim() || '-',
      duty_type: typeStr,
      duty_date: dutyDate,
      time_out: timeOut,
      time_in: timeIn,
      hours: calculatedHours,
      destination: destination.trim(),
      province,
      objective: objective.trim(),
      companions: companions.trim(),
      status: 'pending',
      director_comment: '',
      created_at: new Date().toISOString()
    };

    setActivePrintRequest(tempRequest);
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    const emp = employeesData.find(emp => emp.id === parseInt(selectedEmployeeId));
    if (!emp) { setFormError('โปรดเลือกชื่อผู้ขออนุญาต'); return; }
    if (!dutyDate) { setFormError('โปรดระบุวันที่เดินทาง'); return; }
    const req = buildRequest('draft');
    if (!req) return;

    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/duty_requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify(req)
        });
        if (!res.ok) throw new Error(await res.text());
        await loadDatabase();
      } else {
        saveRequests([req, ...requests]);
      }
      setFormSuccess('💾 บันทึกร่างคำขอเรียบร้อยแล้ว สามารถส่งภายหลังได้ที่แท็บ "ประวัติ / ตรวจสอบสถานะ"');
      resetForm();
    } catch (err) {
      setFormError(`❌ บันทึกร่างล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    const err = validateForm();
    if (err) { setFormError(err); return; }
    const req = buildRequest('pending');
    if (!req) { setFormError('ไม่พบข้อมูลบุคลากร'); return; }

    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/duty_requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify(req)
        });
        if (!res.ok) throw new Error(await res.text());
        await loadDatabase();
      } else {
        saveRequests([req, ...requests]);
      }

      setFormSuccess('🎉 ยื่นคำขอออกนอกสถานที่ราชการเรียบร้อยแล้ว! รอผู้อำนวยการพิจารณา');
      const thDate = new Date(dutyDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      const appUrl = `${window.location.origin}${window.location.pathname}?view=duty`;
      await sendTelegram(
        `🚗 <b>คำขอออกนอกสถานที่ใหม่รอการอนุมัติ</b>\n\n` +
        `👤 <b>ผู้ขอ:</b> ${req.employee_name}\n💼 <b>ตำแหน่ง:</b> ${req.position}\n` +
        `📅 <b>วันที่:</b> ${thDate}\n🕒 <b>เวลา:</b> ${timeOut}–${timeIn} น. (${calculatedHours} ชม.)\n` +
        `📍 <b>สถานที่:</b> ${destination} (${province})\n🎯 <b>วัตถุประสงค์:</b> ${objective}\n\n` +
        `🔗 <b>กดลิ้งเพื่ออนุมัติ:</b> ${appUrl}`
      );
      resetForm();
    } catch (err) {
      setFormError(`❌ ยื่นใบออกนอกสถานที่ล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectorAction = async (requestId, newStatus) => {
    const label = { approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', returned: 'ส่งกลับให้แก้ไข' }[newStatus];
    if (!safeConfirm(`ยืนยัน: ${label} คำขอนี้?`)) return;
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/duty_requests?id=eq.${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            status: newStatus,
            director_comment: directorComment.trim()
          })
        });
        if (!res.ok) throw new Error(await res.text());
        await loadDatabase();
      } else {
        const updated = requests.map(r => r.id === requestId ? { ...r, status: newStatus, director_comment: directorComment.trim(), approved_at: new Date().toISOString() } : r);
        saveRequests(updated);
      }

      if (newStatus === 'approved') syncStatsLocally(req.employee_id, req.hours, req.duty_date);
      setDirectorComment(''); setExpandedReqId(null);
      const thDate = new Date(req.duty_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      const icon = { approved: '🟢', rejected: '🔴', returned: '🟡' }[newStatus] || '🔔';
      const appUrl = `${window.location.origin}${window.location.pathname}?view=duty`;
      await sendTelegram(
        `${icon} <b>แจ้งผลคำขอออกนอกสถานที่</b>\n\n` +
        `👤 <b>ผู้ขอ:</b> ${req.employee_name}\n📅 <b>วันที่:</b> ${thDate}\n` +
        `📍 <b>สถานที่:</b> ${req.destination}\n📢 <b>ผล:</b> <b>${label}</b>\n` +
        `📝 <b>ความเห็น:</b> ${directorComment.trim() || '-'}\n\n` +
        `🔗 <a href="${appUrl}">เข้าระบบออกนอกสถานที่</a>`
      );
      safeAlert(`✅ บันทึกผลการพิจารณา "${label}" เรียบร้อยแล้ว`);
    } catch (err) {
      safeAlert(`❌ บันทึกผลการพิจารณาล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!safeConfirm('ยืนยันยกเลิกคำขอนี้?')) return;
    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/duty_requests?id=eq.${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ status: 'cancelled' })
        });
        if (!res.ok) throw new Error(await res.text());
        await loadDatabase();
      } else {
        saveRequests(requests.map(r => r.id === requestId ? { ...r, status: 'cancelled' } : r));
      }
    } catch (err) {
      safeAlert(`❌ ยกเลิกคำขอล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (requestId) => {
    if (!safeConfirm('ยืนยันเปลี่ยนสถานะเป็น "เสร็จสิ้นภารกิจ"?')) return;
    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/duty_requests?id=eq.${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ status: 'completed' })
        });
        if (!res.ok) throw new Error(await res.text());
        await loadDatabase();
      } else {
        saveRequests(requests.map(r => r.id === requestId ? { ...r, status: 'completed' } : r));
      }
    } catch (err) {
      safeAlert(`❌ เปลี่ยนสถานะล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmitDraft = async (requestId) => {
    if (!safeConfirm(`ส่งร่างคำขอนี้เพื่อรออนุมัติ?`)) return;
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    setLoading(true);
    try {
      if (supabaseConnected) {
        const res = await fetch(`${supabaseUrl}/rest/v1/duty_requests?id=eq.${requestId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ status: 'pending' })
        });
        if (!res.ok) throw new Error(await res.text());
        await loadDatabase();
      } else {
        const updated = requests.map(r => r.id === requestId ? { ...r, status: 'pending' } : r);
        saveRequests(updated);
      }

      const thDate = new Date(req.duty_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
      const appUrl = `${window.location.origin}${window.location.pathname}?view=duty`;
      sendTelegram(
        `🚗 <b>คำขอออกนอกสถานที่ (ยื่นใหม่)</b>\n\n` +
        `👤 ${req.employee_name}\n📅 ${thDate}\n📍 ${req.destination}\n\n` +
        `🔗 <b>กดลิ้งเพื่ออนุมัติ:</b> ${appUrl}`
      );
    } catch (err) {
      safeAlert(`❌ ส่งร่างคำขอล้มเหลว: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const myRequests = useMemo(() => {
    if (currentUser && currentUser.role === 'user' && currentUser.employeeId) {
      return requests.filter(r => r.employee_id === currentUser.employeeId);
    }
    return requests;
  }, [requests, currentUser]);

  // ── Filtered data ────────────────────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (currentUser && currentUser.role === 'user' && currentUser.employeeId) {
        if (r.employee_id !== currentUser.employeeId) return false;
      }
      if (filterName && !r.employee_name?.includes(filterName) && !r.position?.includes(filterName)) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterType !== 'all' && r.duty_type !== filterType) return false;
      if (filterMonth !== 'all') {
        const m = new Date(r.duty_date).getMonth();
        if (String(m) !== filterMonth) return false;
      }
      return true;
    });
  }, [requests, filterName, filterStatus, filterType, filterMonth, currentUser]);

  // ── Today's count ────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRequests = requests.filter(r => r.duty_date === todayStr && r.status === 'approved');

  // ── Monthly stats for charts ─────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return MONTH_NAMES_TH.map((label, i) => ({
      label,
      value: requests.filter(r => new Date(r.duty_date).getMonth() === i).length
    }));
  }, [requests]);

  // ── Duty type segments ───────────────────────────────────────────────────
  const typeSegments = useMemo(() => {
    const counts = {};
    requests.forEach(r => {
      const key = r.duty_type?.split('(')[0].trim() || 'อื่น ๆ';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [requests]);

  // ── Per-person summary ───────────────────────────────────────────────────
  const perPersonSummary = useMemo(() => {
    const map = {};
    requests.filter(r => r.status === 'approved').forEach(r => {
      if (!map[r.employee_name]) map[r.employee_name] = { name: r.employee_name, position: r.position, department: r.department || '', count: 0, hours: 0 };
      map[r.employee_name].count += 1;
      map[r.employee_name].hours += r.hours || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [requests]);

  // ══════════════════════════════════════════════════════════════════════════
  // TABS CONFIG
  const tabs = {
    requester: [
      { id: 'my_dashboard', label: '🏠 แดชบอร์ด' },
      { id: 'form', label: '📝 ยื่นคำขอ' },
      { id: 'history', label: '🕒 ประวัติ / สถานะ' },
    ],
    director: [
      { id: 'director_dashboard', label: '📊 แดชบอร์ด ผอ.' },
      { id: 'pending_review', label: '📥 รออนุมัติ' },
      { id: 'reports', label: '📋 รายงาน' },
      { id: 'settings', label: '⚙️ ตั้งค่า' },
    ],
    admin: [
      { id: 'director_dashboard', label: '📊 ภาพรวมระบบ' },
      { id: 'admin_all', label: '📋 คำขอทั้งหมด' },
      { id: 'reports', label: '📈 รายงาน & Export' },
      { id: 'settings', label: '⚙️ ตั้งค่า' },
    ],
  };

  const currentTabs = tabs[role] || tabs.requester;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-in" style={{ color: 'var(--text-main)', paddingBottom: '40px' }}>

      {/* ── Role Switcher ─────────────────────────────────────── */}
      {currentUser?.role !== 'user' && (
        <div className="glass-panel" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderLeft: '4px solid var(--primary)' }}>
          <div>
            <strong style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>🔑 จำลองบทบาทผู้ใช้งาน</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>สลับบทบาทเพื่อทดสอบสิทธิ์ต่างๆ</span>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['requester', '👤 ผู้ขออนุญาต', 'var(--primary)'], ['director', '👨‍💼 ผู้อำนวยการ', 'var(--secondary)'], ['admin', '⚙️ แอดมิน/HR', 'var(--green)']].map(([r, label, col]) => (
              <button key={r} onClick={() => setRole(r)} style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700, background: role === r ? col : 'rgba(255,255,255,0.06)', color: '#fff', border: `1px solid ${role === r ? col : 'var(--border-color)'}`, borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab Bar ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '6px' }}>
        {currentTabs.map(t => (
          <button key={t.id} className={`month-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)} style={{ whiteSpace: 'nowrap' }}>{t.label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ padding: '14px', background: 'rgba(159,122,234,0.1)', color: 'var(--primary)', border: '1px solid rgba(159,122,234,0.3)', borderRadius: '12px', marginBottom: '16px', fontWeight: 600, textAlign: 'center' }}>
          ⌛ กำลังประมวลผล...
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: ผู้ขอ — แดชบอร์ด
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'my_dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            {[
              { label: 'คำขอทั้งหมด',    value: myRequests.length,                                             color: 'var(--primary)'   },
              { label: 'รออนุมัติ',       value: myRequests.filter(r => r.status === 'pending').length,        color: '#f59e0b'          },
              { label: 'อนุมัติแล้ว',    value: myRequests.filter(r => r.status === 'approved').length,       color: 'var(--green)'     },
              { label: 'ไม่อนุมัติ',     value: myRequests.filter(r => r.status === 'rejected').length,       color: 'var(--red)'       },
              { label: 'ร่างคำขอ',       value: myRequests.filter(r => r.status === 'draft').length,          color: '#94a3b8'          },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-panel" style={{ padding: '18px', borderLeft: `4px solid ${color}` }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Quick action */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>📝 ยื่นคำขอออกนอกสถานที่ใหม่</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>กรอกแบบฟอร์มและส่งให้ผู้อำนวยการพิจารณา</div>
            </div>
            <button className="glow-button" onClick={() => setActiveTab('form')} style={{ padding: '10px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
              + สร้างคำขอใหม่
            </button>
          </div>

          {/* Live Out of Office Monitor */}
          <LiveOutOfficeMonitor requests={requests} />

          {/* Recent 5 */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>🕒 คำขอล่าสุด 5 รายการ</h3>
            {myRequests.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.85rem' }}>📭 ยังไม่มีข้อมูล</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myRequests.slice(0, 5).map(req => (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{req.duty_type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(req.duty_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} · {req.destination}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusBadge status={req.status} />
                      {req.status === 'draft' && (
                        <button onClick={() => handleResubmitDraft(req.id)} style={{ padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(159,122,234,0.12)', color: 'var(--primary)', border: '1px solid rgba(159,122,234,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>ส่งคำขอ</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: แบบฟอร์มยื่นคำขอ
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'form' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '22px' }}>🚗 แบบฟอร์มขออนุญาตออกนอกสถานที่ราชการ</h2>

          {formError && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', borderRadius: '10px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>{formError}</div>}
          {formSuccess && <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: 'var(--green)', borderRadius: '10px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: 600 }}>{formSuccess}</div>}

          <form onSubmit={handleRequestSubmit}>
            {/* Section A: ข้อมูลผู้ขอ */}
            <div style={{ marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>A · ข้อมูลผู้ขออนุญาต</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px', paddingBottom: '22px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <label style={labelStyle}>ชื่อ-สกุล *</label>
                <select 
                  value={selectedEmployeeId} 
                  onChange={e => setSelectedEmployeeId(e.target.value)} 
                  disabled={currentUser?.role === 'user' && currentUser?.employeeId}
                  style={{ ...inputStyle, cursor: (currentUser?.role === 'user' && currentUser?.employeeId) ? 'not-allowed' : 'default' }}
                >
                  <option value="">-- โปรดเลือกบุคลากร --</option>
                  {employeesData.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>กลุ่มงาน / ฝ่าย</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle}>
                  <option value="">-- โปรดเลือกฝ่าย --</option>
                  <option value="ฝ่ายบริหารงานทั่วไป">ฝ่ายบริหารงานทั่วไป</option>
                  <option value="ฝ่ายบริหารวิชาการ">ฝ่ายบริหารวิชาการ</option>
                  <option value="ฝ่ายบริหารงานการจัดการภายนอก">ฝ่ายบริหารงานการจัดการภายนอก</option>
                  <option value="ฝ่ายบริหารงานแผนงานและงบประมาณ">ฝ่ายบริหารงานแผนงานและงบประมาณ</option>
                  <option value="ฝ่ายบริหารงานบุคคล">ฝ่ายบริหารงานบุคคล</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>เบอร์โทรระหว่างเดินทาง *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="089-1234567" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>อีเมล</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@school.ac.th" style={inputStyle} />
              </div>
            </div>

            {/* Section B: ข้อมูลภารกิจ */}
            <div style={{ marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>B · ข้อมูลภารกิจ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px', paddingBottom: '22px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <label style={labelStyle}>ประเภทภารกิจ *</label>
                <select value={dutyType} onChange={e => setDutyType(e.target.value)} style={inputStyle}>
                  {DUTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {dutyType === 'อื่น ๆ' && (
                <div>
                  <label style={labelStyle}>ระบุภารกิจ "อื่น ๆ" *</label>
                  <input type="text" value={otherDutyType} onChange={e => setOtherDutyType(e.target.value)} placeholder="ระบุรายละเอียด" style={inputStyle} />
                </div>
              )}
              <div>
                <label style={labelStyle}>วันที่ออกนอกสถานที่ *</label>
                <input type="date" value={dutyDate} onChange={e => setDutyDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>เวลาออก *</label>
                <input type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>เวลากลับโดยประมาณ *</label>
                <input type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ padding: '12px 14px', background: 'rgba(159,122,234,0.08)', border: '1px dashed var(--primary)', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'center' }}>
                  ⏱️ {calculatedHours > 0 ? `${calculatedHours} ชั่วโมง` : 'โปรดป้อนเวลา'}
                </div>
              </div>
            </div>

            {/* Section C: ข้อมูลการเดินทาง */}
            <div style={{ marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>C · ข้อมูลการเดินทาง</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px', paddingBottom: '22px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <label style={labelStyle}>สถานที่ปลายทาง *</label>
                <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="เช่น สำนักงาน สพม. / โรงพยาบาล" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>จังหวัด *</label>
                <select value={province} onChange={e => setProvince(e.target.value)} style={inputStyle}>
                  <option value="">-- เลือกจังหวัด --</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>ผู้ร่วมเดินทาง (ถ้ามี)</label>
                <input type="text" value={companions} onChange={e => setCompanions(e.target.value)} placeholder="ระบุชื่อผู้ร่วมเดินทาง (คั่นด้วยเครื่องหมาย ,)" style={inputStyle} />
              </div>
            </div>

            {/* Section D: วัตถุประสงค์ */}
            <div style={{ marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>D · วัตถุประสงค์ / รายละเอียด</div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>วัตถุประสงค์ในการปฏิบัติงานนอกสถานที่ *</label>
              <textarea rows={3} value={objective} onChange={e => setObjective(e.target.value)} placeholder="ระบุรายละเอียด เหตุผล และความจำเป็นในการออกนอกสถานที่" style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={handlePreviewDuty} style={{ padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: 'var(--cyan)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
                👁️ ดูตัวอย่างใบขอ (พรีวิว)
              </button>
              <button type="button" onClick={handleSaveDraft} style={{ padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer' }}>
                💾 บันทึกร่าง
              </button>
              <button type="submit" className="glow-button" style={{ padding: '10px 28px', fontSize: '0.88rem', fontWeight: 700, borderRadius: '10px', cursor: 'pointer' }}>
                🚀 ส่งคำขออนุญาต
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: ผู้ขอ — ประวัติ / สถานะ
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>🕒 ประวัติและสถานะคำขอออกนอกสถานที่</h2>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>📭 ยังไม่มีข้อมูลในระบบ</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    {['วันที่ยื่น','ประเภท','วันที่เดินทาง','เวลา (ชม.)','ปลายทาง','สถานะ','การดำเนินการ'].map(h => (
                      <th key={h} style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{new Date(req.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ padding: '12px 8px' }}><span style={{ background: 'rgba(159,122,234,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem' }}>{req.duty_type}</span></td>
                      <td style={{ padding: '12px 8px' }}>{new Date(req.duty_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ padding: '12px 8px' }}>{req.time_out}–{req.time_in} ({req.hours} ชม.)</td>
                      <td style={{ padding: '12px 8px' }}>{req.destination}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <StatusBadge status={req.status} />
                        {req.director_comment && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>ผอ.: {req.director_comment}</div>}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button onClick={() => setActivePrintRequest(req)} style={{ padding: '5px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: 'var(--green)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>🖨️ พิมพ์</button>
                          {req.status === 'draft' && <button onClick={() => handleResubmitDraft(req.id)} style={{ padding: '5px 10px', background: 'rgba(159,122,234,0.08)', border: '1px solid rgba(159,122,234,0.25)', color: 'var(--primary)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>📤 ส่งคำขอ</button>}
                          {(req.status === 'pending' || req.status === 'draft') && <button onClick={() => handleCancelRequest(req.id)} style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>🗑️ ยกเลิก</button>}
                          {req.status === 'approved' && <button onClick={() => handleMarkCompleted(req.id)} style={{ padding: '5px 10px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', color: '#06b6d4', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>✅ เสร็จสิ้น</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: Director Dashboard
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'director_dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
            {[
              { label: 'รออนุมัติ',      value: requests.filter(r => r.status === 'pending').length,   color: '#f59e0b' },
              { label: 'อนุมัติแล้ว',   value: requests.filter(r => r.status === 'approved').length,  color: 'var(--green)' },
              { label: 'ไม่อนุมัติ',    value: requests.filter(r => r.status === 'rejected').length,  color: 'var(--red)' },
              { label: 'ส่งกลับแก้ไข', value: requests.filter(r => r.status === 'returned').length,  color: '#8b5cf6' },
              { label: 'วันนี้ออกไป',   value: todayRequests.length,                                   color: '#06b6d4' },
              { label: 'ทั้งหมด',       value: requests.length,                                        color: 'var(--primary)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass-panel" style={{ padding: '18px', borderLeft: `4px solid ${color}` }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Live Out of Office Monitor */}
          <LiveOutOfficeMonitor requests={requests} />

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '14px' }}>📅 คำขอรายเดือน (ปีนี้)</div>
              <MiniBarChart data={monthlyData} colorVar="var(--primary)" />
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px' }}>📊 สัดส่วนตามประเภทภารกิจ</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <DonutChart segments={typeSegments} />
                <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {typeSegments.slice(0, 6).map((s, i) => {
                    const colors = ['#9f7aea','#10b981','#ef4444','#f59e0b','#06b6d4','#8b5cf6'];
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: colors[i % colors.length], flexShrink: 0 }} />
                        {s.label.length > 16 ? s.label.slice(0, 16) + '…' : s.label}: <b style={{ color: 'var(--text-main)' }}>{s.value}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* วันนี้ */}
          {todayRequests.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(6,182,212,0.3)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: '#06b6d4' }}>📍 วันนี้มีผู้ออกนอกสถานที่ {todayRequests.length} คน</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {todayRequests.map(r => (
                  <div key={r.id} style={{ padding: '8px 14px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '10px', fontSize: '0.8rem' }}>
                    <b>{r.employee_name}</b> → {r.destination} ({r.time_out}–{r.time_in})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top requesters */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 700, marginBottom: '12px', fontSize: '0.9rem' }}>🏆 สรุปคำขอรายบุคคล (เรียงตามจำนวน)</div>
            {perPersonSummary.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '16px 0' }}>ยังไม่มีข้อมูลที่อนุมัติ</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      {['ชื่อ','ตำแหน่ง','กลุ่มงาน','จำนวนครั้ง','รวมชั่วโมง'].map(h => <th key={h} style={{ padding: '8px 6px' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {perPersonSummary.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '10px 6px', fontWeight: 700 }}>{p.name}</td>
                        <td style={{ padding: '10px 6px', color: 'var(--text-muted)' }}>{p.position}</td>
                        <td style={{ padding: '10px 6px', color: 'var(--text-muted)' }}>{p.department || '-'}</td>
                        <td style={{ padding: '10px 6px' }}><span style={{ background: 'rgba(159,122,234,0.12)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{p.count}</span></td>
                        <td style={{ padding: '10px 6px' }}>{p.hours.toFixed(1)} ชม.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: Director — รออนุมัติ
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'pending_review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>📥 คำขอรอการพิจารณา</h2>
              <span style={{ background: 'var(--red)', color: '#fff', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                {requests.filter(r => r.status === 'pending').length}
              </span>
            </div>
            {requests.filter(r => r.status === 'pending').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>✅ ไม่มีคำขอรออนุมัติ</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {requests.filter(r => r.status === 'pending').map(req => {
                  const requesterHistory = requests.filter(r => r.employee_id === req.employee_id && r.id !== req.id);
                  const isExpanded = expandedReqId === req.id;
                  return (
                    <div key={req.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                      {/* Header */}
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{req.employee_name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{req.position} {req.department ? `· ${req.department}` : ''}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(159,122,234,0.12)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>📁 {req.duty_type}</span>
                          <button onClick={() => setExpandedReqId(isExpanded ? null : req.id)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                            {isExpanded ? '▲ ย่อ' : '▼ รายละเอียด'}
                          </button>
                        </div>
                      </div>

                      {/* Quick info */}
                      <div style={{ padding: '0 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem' }}>
                        <div>📅 <b>วันที่:</b> {new Date(req.duty_date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        <div>🕒 <b>เวลา:</b> {req.time_out}–{req.time_in} น. ({req.hours} ชม.)</div>
                        <div>📍 <b>สถานที่:</b> {req.destination} ({req.province})</div>
                        <div>📞 <b>ติดต่อ:</b> {req.phone}</div>
                      </div>
                      <div style={{ padding: '0 20px 16px', fontSize: '0.85rem', background: 'var(--bg-dark)', margin: '0 20px 0', borderRadius: '8px', borderLeft: '3px solid var(--secondary)', lineHeight: '1.5' }}>
                        🎯 <b>วัตถุประสงค์:</b> {req.objective}
                        {req.companions && <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>👥 ผู้ร่วมเดินทาง: {req.companions}</div>}
                      </div>

                      {/* Expanded: requester history */}
                      {isExpanded && requesterHistory.length > 0 && (
                        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>📜 ประวัติคำขอเดิมของผู้ขอ ({requesterHistory.length} รายการ)</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {requesterHistory.slice(0, 5).map(h => (
                              <div key={h.id} style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                                <span>{new Date(h.duty_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                                <span>{h.destination}</span>
                                <StatusBadge status={h.status} style={{ fontSize: '0.65rem', padding: '2px 6px' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Director action panel */}
                      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <input type="text" placeholder="ความเห็นประกอบการพิจารณา (ไม่บังคับ)..." value={expandedReqId === req.id ? directorComment : ''} onChange={e => { setExpandedReqId(req.id); setDirectorComment(e.target.value); }} onClick={() => setExpandedReqId(req.id)} style={{ ...inputStyle, width: '100%' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button onClick={() => { setExpandedReqId(req.id); handleDirectorAction(req.id, 'returned'); }} style={{ padding: '8px 16px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>🔄 ส่งกลับแก้ไข</button>
                          <button onClick={() => { setExpandedReqId(req.id); handleDirectorAction(req.id, 'rejected'); }} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>❌ ไม่อนุมัติ</button>
                          <button onClick={() => { setExpandedReqId(req.id); handleDirectorAction(req.id, 'approved'); }} className="glow-button" style={{ padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>✓ อนุมัติ</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Approved list */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>📋 คำขอที่พิจารณาแล้ว</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    {['ชื่อ','ประเภท','วันที่','ปลายทาง','สถานะ','เอกสาร'].map(h => <th key={h} style={{ padding: '8px', textAlign: 'left' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {requests.filter(r => r.status !== 'pending' && r.status !== 'draft').map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 700 }}>{req.employee_name}</td>
                      <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{req.duty_type}</td>
                      <td style={{ padding: '10px 8px' }}>{new Date(req.duty_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                      <td style={{ padding: '10px 8px' }}>{req.destination}</td>
                      <td style={{ padding: '10px 8px' }}><StatusBadge status={req.status} /></td>
                      <td style={{ padding: '10px 8px' }}>
                        <button onClick={() => setActivePrintRequest(req)} style={{ padding: '4px 10px', background: 'rgba(159,122,234,0.08)', border: '1px solid rgba(159,122,234,0.25)', color: 'var(--primary)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>🖨️ PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: Admin — คำขอทั้งหมด
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'admin_all' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>📋 คำขอทั้งหมดในระบบ ({filteredRequests.length} รายการ)</h2>
            <button onClick={() => exportToCSV(filteredRequests, `duty_requests_${new Date().toISOString().slice(0,10)}.csv`)} style={{ padding: '8px 18px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
              ⬇️ Export CSV
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '18px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div>
              <label style={labelStyle}>ค้นหาชื่อ/ตำแหน่ง</label>
              <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="พิมพ์เพื่อค้นหา..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>สถานะ</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputStyle}>
                <option value="all">ทั้งหมด</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>ประเภทภารกิจ</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
                <option value="all">ทั้งหมด</option>
                {DUTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>เดือน</label>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={inputStyle}>
                <option value="all">ทุกเดือน</option>
                {MONTH_NAMES_TH.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  {['#','ชื่อ','ตำแหน่ง','กลุ่มงาน','ประเภท','วันที่','ระยะเวลา','ปลายทาง','สถานะ','ดำเนินการ'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req, i) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 700 }}>{req.employee_name}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{req.position}</td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{req.department || '-'}</td>
                    <td style={{ padding: '10px 8px' }}><span style={{ background: 'rgba(159,122,234,0.1)', color: 'var(--primary)', padding: '2px 7px', borderRadius: '5px', fontSize: '0.7rem' }}>{req.duty_type}</span></td>
                    <td style={{ padding: '10px 8px' }}>{new Date(req.duty_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                    <td style={{ padding: '10px 8px' }}>{req.time_out}–{req.time_in} ({req.hours} ชม.)</td>
                    <td style={{ padding: '10px 8px' }}>{req.destination}</td>
                    <td style={{ padding: '10px 8px' }}><StatusBadge status={req.status} /></td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => setActivePrintRequest(req)} style={{ padding: '4px 8px', background: 'rgba(159,122,234,0.08)', border: '1px solid rgba(159,122,234,0.25)', color: 'var(--primary)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>🖨️</button>
                        {req.status === 'approved' && <button onClick={() => handleMarkCompleted(req.id)} style={{ padding: '4px 8px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', color: '#06b6d4', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>✅</button>}
                        {(req.status === 'pending' || req.status === 'draft') && <button onClick={() => handleCancelRequest(req.id)} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>🗑️</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRequests.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: รายงาน
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              ['daily', '📅 รายวัน'],
              ['monthly', '📆 รายเดือน'],
              ['person', '👤 รายบุคคล'],
              ['department', '🏢 รายกลุ่มงาน'],
              ['type', '📁 รายประเภท'],
              ['pending_report', '⏳ รายการรออนุมัติ'],
              ['rejected_report', '🚫 รายการไม่อนุมัติ'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setReportTab(id)} style={{ padding: '7px 14px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', background: reportTab === id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: '#fff', border: `1px solid ${reportTab === id ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Report: รายวัน */}
          {reportTab === 'daily' && (() => {
            const byDate = {};
            requests.forEach(r => { if (!byDate[r.duty_date]) byDate[r.duty_date] = []; byDate[r.duty_date].push(r); });
            const sorted = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));
            return (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>📅 รายงานการออกนอกสถานที่รายวัน</h3>
                  <button onClick={() => exportToCSV(requests, `report_daily_${new Date().toISOString().slice(0,10)}.csv`)} style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>⬇️ Export</button>
                </div>
                {sorted.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>ไม่มีข้อมูล</div> : sorted.map(([date, reqs]) => (
                  <div key={date} style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)', marginBottom: '8px', padding: '6px 10px', background: 'rgba(159,122,234,0.06)', borderRadius: '6px' }}>
                      📅 {new Date(date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ({reqs.length} คน)
                    </div>
                    {reqs.map(r => (
                      <div key={r.id} style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', marginBottom: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700 }}>{r.employee_name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{r.position}</span>
                        <span>{r.duty_type}</span>
                        <span>📍 {r.destination}</span>
                        <span>🕒 {r.time_out}–{r.time_in}</span>
                        <StatusBadge status={r.status} style={{ fontSize: '0.65rem' }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Report: รายเดือน */}
          {reportTab === 'monthly' && (() => {
            const byMonth = {};
            requests.forEach(r => {
              const m = new Date(r.duty_date).getMonth();
              const y = new Date(r.duty_date).getFullYear();
              const key = `${y}-${m}`;
              if (!byMonth[key]) byMonth[key] = { label: `${MONTH_NAMES_TH[m]} ${y}`, reqs: [] };
              byMonth[key].reqs.push(r);
            });
            return (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>📆 สรุปรายงานรายเดือน</h3>
                  <button onClick={() => exportToCSV(requests, 'report_monthly.csv')} style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>⬇️ Export</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        {['เดือน','คำขอทั้งหมด','อนุมัติ','ไม่อนุมัติ','รออนุมัติ','รวมชั่วโมง'].map(h => <th key={h} style={{ padding: '10px 8px', textAlign: 'left' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(byMonth).sort((a, b) => b.label.localeCompare(a.label)).map(({ label, reqs }) => {
                        const approved = reqs.filter(r => r.status === 'approved');
                        const hrs = approved.reduce((a, r) => a + (r.hours || 0), 0);
                        return (
                          <tr key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '10px 8px', fontWeight: 700 }}>{label}</td>
                            <td style={{ padding: '10px 8px' }}>{reqs.length}</td>
                            <td style={{ padding: '10px 8px', color: 'var(--green)', fontWeight: 700 }}>{approved.length}</td>
                            <td style={{ padding: '10px 8px', color: 'var(--red)' }}>{reqs.filter(r => r.status === 'rejected').length}</td>
                            <td style={{ padding: '10px 8px', color: '#f59e0b' }}>{reqs.filter(r => r.status === 'pending').length}</td>
                            <td style={{ padding: '10px 8px', fontWeight: 700 }}>{hrs.toFixed(1)} ชม.</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Report: รายบุคคล */}
          {reportTab === 'person' && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>👤 สรุปรายงานรายบุคคล</h3>
                <button onClick={() => exportToCSV(requests, 'report_person.csv')} style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>⬇️ Export</button>
              </div>
              {perPersonSummary.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>ไม่มีข้อมูลที่อนุมัติ</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        {['#','ชื่อ','ตำแหน่ง','กลุ่มงาน','จำนวนครั้ง','รวมชั่วโมง','เฉลี่ยชม./ครั้ง'].map(h => <th key={h} style={{ padding: '10px 8px', textAlign: 'left' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {perPersonSummary.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 700 }}>{p.name}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{p.position}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{p.department || '-'}</td>
                          <td style={{ padding: '10px 8px' }}><span style={{ background: 'rgba(159,122,234,0.12)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{p.count}</span></td>
                          <td style={{ padding: '10px 8px', fontWeight: 700 }}>{p.hours.toFixed(1)}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{(p.hours / p.count).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Report: รายกลุ่มงาน */}
          {reportTab === 'department' && (() => {
            const byDept = {};
            requests.forEach(r => {
              const dept = r.department || 'ไม่ระบุ';
              if (!byDept[dept]) byDept[dept] = { count: 0, approved: 0, hours: 0 };
              byDept[dept].count++;
              if (r.status === 'approved') { byDept[dept].approved++; byDept[dept].hours += r.hours || 0; }
            });
            return (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '14px' }}>🏢 สรุปตามกลุ่มงาน/ฝ่าย</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        {['กลุ่มงาน/ฝ่าย','คำขอทั้งหมด','อนุมัติ','รวมชั่วโมง'].map(h => <th key={h} style={{ padding: '10px 8px', textAlign: 'left' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byDept).sort((a, b) => b[1].count - a[1].count).map(([dept, data]) => (
                        <tr key={dept} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 700 }}>{dept}</td>
                          <td style={{ padding: '10px 8px' }}>{data.count}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--green)', fontWeight: 700 }}>{data.approved}</td>
                          <td style={{ padding: '10px 8px' }}>{data.hours.toFixed(1)} ชม.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Report: รายประเภท */}
          {reportTab === 'type' && (() => {
            const byType = {};
            requests.forEach(r => {
              const t = r.duty_type?.split('(')[0].trim() || 'อื่น ๆ';
              if (!byType[t]) byType[t] = { count: 0, approved: 0, hours: 0 };
              byType[t].count++;
              if (r.status === 'approved') { byType[t].approved++; byType[t].hours += r.hours || 0; }
            });
            return (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '14px' }}>📁 สรุปตามประเภทภารกิจ</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        {['ประเภท','คำขอทั้งหมด','อนุมัติ','สัดส่วน (%)','รวมชั่วโมง'].map(h => <th key={h} style={{ padding: '10px 8px', textAlign: 'left' }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(byType).sort((a, b) => b[1].count - a[1].count).map(([type, data]) => (
                        <tr key={type} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 700 }}>{type}</td>
                          <td style={{ padding: '10px 8px' }}>{data.count}</td>
                          <td style={{ padding: '10px 8px', color: 'var(--green)', fontWeight: 700 }}>{data.approved}</td>
                          <td style={{ padding: '10px 8px' }}>{requests.length > 0 ? ((data.count / requests.length) * 100).toFixed(1) : 0}%</td>
                          <td style={{ padding: '10px 8px' }}>{data.hours.toFixed(1)} ชม.</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Report: รออนุมัติ */}
          {reportTab === 'pending_report' && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>⏳ รายงานคำขอที่ยังรออนุมัติ ({requests.filter(r => r.status === 'pending').length} รายการ)</h3>
                <button onClick={() => exportToCSV(requests.filter(r => r.status === 'pending'), 'report_pending.csv')} style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>⬇️ Export</button>
              </div>
              <ReportTable rows={requests.filter(r => r.status === 'pending')} onPrint={setActivePrintRequest} />
            </div>
          )}

          {/* Report: ไม่อนุมัติ */}
          {reportTab === 'rejected_report' && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>🚫 รายงานคำขอที่ไม่ผ่านการอนุมัติ ({requests.filter(r => r.status === 'rejected').length} รายการ)</h3>
                <button onClick={() => exportToCSV(requests.filter(r => r.status === 'rejected'), 'report_rejected.csv')} style={{ padding: '6px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>⬇️ Export</button>
              </div>
              <ReportTable rows={requests.filter(r => r.status === 'rejected')} onPrint={setActivePrintRequest} showComment />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB: ตั้งค่า
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>📲 ตั้งค่าการแจ้งเตือน Telegram Bot</h2>
            <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem('leave_telegram_bot_token', telegramToken); localStorage.setItem('leave_telegram_chat_id', telegramChatId); safeAlert('💾 บันทึกการตั้งค่าเรียบร้อย'); }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Bot Token</label>
                  <input type="password" value={telegramToken} onChange={e => setTelegramToken(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Chat ID</label>
                  <input type="text" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <button type="submit" className="glow-button" style={{ padding: '8px 18px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 600 }}>💾 บันทึก</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>🔌 สถานะฐานข้อมูล</h2>
            {supabaseConnected ? (
              <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.88rem' }}>🟢 เชื่อมต่อ Supabase แล้ว (table: duty_requests)</div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                🟡 โหมดออฟไลน์ (LocalStorage) — ข้อมูลบันทึกในเบราว์เซอร์เครื่องนี้
                <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--secondary)', borderRadius: '10px', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  <b>หากต้องการเชื่อม Supabase:</b> ตั้งค่า URL & API Key ได้ที่หน้า "นำเข้าด้วย Google Sheets" แล้วสร้างตาราง <code>duty_requests</code> บน Supabase
                </div>
              </div>
            )}
          </div>

          {/* Data management */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px' }}>🗂️ จัดการข้อมูล</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => exportToCSV(requests, `duty_all_${new Date().toISOString().slice(0,10)}.csv`)} style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--green)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                ⬇️ Export ทั้งหมด (CSV)
              </button>
              {role === 'admin' && (
                <button onClick={() => { if (safeConfirm('⚠️ ลบข้อมูลทั้งหมดในระบบ? ไม่สามารถกู้คืนได้')) { saveRequests([]); safeAlert('🗑️ ลบข้อมูลทั้งหมดแล้ว'); }}} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                  🗑️ ล้างข้อมูลทั้งหมด
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {activePrintRequest && (
        <PrintableDutyPdf request={activePrintRequest} onClose={() => setActivePrintRequest(null)} />
      )}
    </div>
  );
};

// ─── Helper sub-component: Generic Report Table ─────────────────────────────
const ReportTable = ({ rows, onPrint, showComment = false }) => {
  if (rows.length === 0) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>ไม่มีข้อมูล</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
            {['ชื่อ','ประเภท','วันที่','ปลายทาง','เวลา (ชม.)', ...(showComment ? ['ความเห็น ผอ.'] : []), 'เอกสาร'].map(h => (
              <th key={h} style={{ padding: '10px 8px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '10px 8px', fontWeight: 700 }}>{r.employee_name}</td>
              <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{r.duty_type}</td>
              <td style={{ padding: '10px 8px' }}>{new Date(r.duty_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
              <td style={{ padding: '10px 8px' }}>{r.destination} ({r.province})</td>
              <td style={{ padding: '10px 8px' }}>{r.time_out}–{r.time_in} ({r.hours} ชม.)</td>
              {showComment && <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{r.director_comment || '-'}</td>}
              <td style={{ padding: '10px 8px' }}>
                <button onClick={() => onPrint(r)} style={{ padding: '4px 10px', background: 'rgba(159,122,234,0.08)', border: '1px solid rgba(159,122,234,0.25)', color: 'var(--primary)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>🖨️ PDF</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DutyOutsideSystem;
