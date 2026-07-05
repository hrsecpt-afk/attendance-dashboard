import React, { useState, useEffect } from 'react';
import PrintableLeavePdf from './PrintableLeavePdf';
import { useAuth } from '../context/AuthContext';

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

const formatDateThai = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
};

const getTodayDateString = () => {
  const today = new Date();
  let yyyy = today.getFullYear();
  if (yyyy > 2400) yyyy -= 543;
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const extractTimeOnly = (val) => {
  if (!val) return '-';
  if (String(val).includes('T')) {
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      }
    } catch {}
    const match = String(val).match(/T(\d{2}:\d{2}:\d{2})/);
    if (match) return match[1];
  }
  return String(val);
};

const MyDashboard = ({ currentUser, employeesData = [] }) => {
  const { users, updateProfile } = useAuth();
  
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [dutyRequests, setDutyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printRequest, setPrintRequest] = useState(null);

  // Today Check-in Status States
  const [todayStatus, setTodayStatus] = useState('absent');
  const [todayTime, setTodayTime] = useState('-');
  const [checkingTodayStatus, setCheckingTodayStatus] = useState(true);

  // Settings States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Fetch today's check-in status
  useEffect(() => {
    if (!currentUser.employeeId) return;

    const fetchTodayStatus = async () => {
      setCheckingTodayStatus(true);
      const todayStr = getTodayDateString();
      
      // 1. Check local overrides first
      try {
        const overridesRaw = localStorage.getItem('attendance_dashboard_daily_overrides');
        if (overridesRaw) {
          const overrides = JSON.parse(overridesRaw);
          if (overrides[todayStr] && overrides[todayStr].statuses) {
            const status = overrides[todayStr].statuses[currentUser.employeeId];
            const time = overrides[todayStr].times?.[currentUser.employeeId] || '-';
            if (status) {
              setTodayStatus(status);
              setTodayTime(time);
              setCheckingTodayStatus(false);
              return;
            }
          }
        }
      } catch (e) {
        console.error("Error reading local overrides", e);
      }

      // 2. Fallback to Supabase fetch
      const cfg = getSupabaseCfg();
      if (cfg) {
        try {
          const res = await fetch(`${cfg.url}/rest/v1/attendance_logs?employee_id=eq.${currentUser.employeeId}&work_date=eq.${todayStr}`, {
            headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              const checkInLog = data.find(log => log.check_type === 'check_in' || log.check_type === 'checkin') || data[0];
              setTodayStatus(checkInLog.status || 'present');
              const logTime = extractTimeOnly(checkInLog.checked_at || checkInLog.check_time);
              setTodayTime(logTime === '00:00:00' || logTime === '00:00' ? '-' : logTime || '-');
            } else {
              setTodayStatus('absent');
              setTodayTime('-');
            }
          } else {
            setTodayStatus('absent');
            setTodayTime('-');
          }
        } catch (e) {
          console.error("Failed to fetch today status from Supabase", e);
          setTodayStatus('absent');
          setTodayTime('-');
        }
      } else {
        setTodayStatus('absent');
        setTodayTime('-');
      }
      setCheckingTodayStatus(false);
    };

    fetchTodayStatus();
  }, [currentUser.employeeId]);

  // Find user details in list to populate form
  useEffect(() => {
    if (showSettingsModal && currentUser) {
      const entry = users.find(u => u.id === currentUser.id);
      setFormUsername(currentUser.username || '');
      setFormPassword(entry ? entry.password : '');
      setFormDisplayName(currentUser.displayName || '');
      setSettingsError('');
      setSettingsSuccess('');
    }
  }, [showSettingsModal, currentUser, users]);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');

    if (!formUsername.trim()) return setSettingsError('โปรดระบุ Username');
    if (!formPassword.trim()) return setSettingsError('โปรดระบุรหัสผ่าน');
    if (formPassword.length < 4) return setSettingsError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');

    const duplicate = users.find(u => u.username.toLowerCase() === formUsername.trim().toLowerCase() && u.id !== currentUser.id);
    if (duplicate) return setSettingsError('Username นี้ถูกใช้งานแล้ว');

    try {
      updateProfile(currentUser.id, formUsername, formPassword, formDisplayName);
      setSettingsSuccess('💾 บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว!');
      setTimeout(() => setShowSettingsModal(false), 800);
    } catch (err) {
      setSettingsError(`ล้มเหลว: ${err.message}`);
    }
  };

  const employee = employeesData.find(e => e.id === currentUser.employeeId);

  useEffect(() => {
    if (!currentUser.employeeId) return;

    const fetchMyRequests = async () => {
      setLoading(true);
      const cfg = getSupabaseCfg();
      if (cfg) {
        try {
          // Fetch leave requests from Supabase
          const leaveRes = await fetch(`${cfg.url}/rest/v1/leave_requests?employee_id=eq.${currentUser.employeeId}&order=created_at.desc`, {
            headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
          });
          if (leaveRes.ok) {
            const data = await leaveRes.json();
            setLeaveRequests(data);
          }

          // Fetch duty requests from Supabase
          const dutyRes = await fetch(`${cfg.url}/rest/v1/duty_requests?employee_id=eq.${currentUser.employeeId}&order=created_at.desc`, {
            headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
          });
          if (dutyRes.ok) {
            const data = await dutyRes.json();
            setDutyRequests(data);
          }
        } catch (e) {
          console.error("Failed to fetch my requests from Supabase", e);
        }
      } else {
        // Fallback to localStorage
        try {
          const lr = localStorage.getItem('leave_requests_v2');
          if (lr) {
            const filtered = JSON.parse(lr).filter(r => r.employee_id === currentUser.employeeId);
            setLeaveRequests(filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
          }
          const dr = localStorage.getItem('duty_requests');
          if (dr) {
            const filtered = JSON.parse(dr).filter(r => r.employee_id === currentUser.employeeId);
            setDutyRequests(filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
          }
        } catch {}
      }
      setLoading(false);
    };

    fetchMyRequests();
  }, [currentUser.employeeId]);

  if (!currentUser.employeeId) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '32px', textAlign: 'center', margin: '40px auto', maxWidth: '600px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--red)', margin: '0 0 12px 0' }}>บัญชีของคุณยังไม่ได้ผูกกับรายชื่อบุคลากร</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
          โปรดแจ้งผู้ดูแลระบบ (แอดมิน) ให้ทำการเชื่อมโยงบัญชีผู้ใช้งานของคุณเข้ากับรายชื่อพนักงานในแท็บ <b>"จัดการบัญชีผู้ใช้งาน"</b> เพื่อเปิดใช้งานระบบสถิติวันลาสะสมและประวัติคำขอลาของคุณครับ
        </p>
      </div>
    );
  }

  // Fallback default leave totals if no record found
  const leaveStats = employee?.leaves?.all || {
    sick: { days: 0 },
    vacation: { days: 0, remaining: 10 },
    personal: { days: 0 },
    maternity: { days: 0 }
  };

  // Compute today's true status combining attendance, leave, and duty
  let computedStatus = todayStatus;
  let leaveLabel = '';
  const todayStr = getTodayDateString();
  const todayTimestamp = new Date(todayStr).getTime();
  
  if (computedStatus === 'absent' && !loading && !checkingTodayStatus) {
    const isDuty = dutyRequests.some(r => (r.status === 'approved' || r.status === 'completed') && r.duty_date === todayStr);
    const leave = leaveRequests.find(r => {
      if (r.status !== 'approved') return false;
      const start = new Date(r.start_date).getTime();
      const end = new Date(r.end_date).getTime();
      return todayTimestamp >= start && todayTimestamp <= end;
    });

    if (isDuty) {
      computedStatus = 'gov';
    } else if (leave) {
      if (leave.leave_type.includes('ป่วย')) {
        computedStatus = 'sick';
      } else {
        computedStatus = 'leave';
        leaveLabel = leave.leave_type;
      }
    } else {
      // Check if it's weekend or holiday
      const dow = new Date(todayStr).getDay();
      if (dow === 0 || dow === 6) {
        computedStatus = 'holiday';
        leaveLabel = 'วันหยุดสุดสัปดาห์';
      } else {
        try {
          const holidays = JSON.parse(localStorage.getItem('thai_public_holidays') || '[]');
          const hol = holidays.find(h => h.date === todayStr);
          if (hol) {
            computedStatus = 'holiday';
            leaveLabel = hol.name;
          }
        } catch {}
      }
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(159,122,234,0.15) 0%, rgba(99,102,241,0.08) 100%)',
        border: '1px solid rgba(159,122,234,0.25)',
        borderRadius: '20px',
        padding: '24px 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
            👋 สวัสดีครับ, คุณ{employee?.name || currentUser.displayName}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            ตำแหน่ง: <b>{employee?.position || '-'}</b> | สังกัด: <b>{employee?.location || '-'}</b>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowSettingsModal(true)}
            style={{ 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px', 
              padding: '12px 18px', 
              color: 'var(--text-main)', 
              fontWeight: 700, 
              fontSize: '0.82rem', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
          >
            ⚙️ ตั้งค่าบัญชีผู้ใช้
          </button>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--green)' }}>{leaveStats.vacation?.remaining ?? 10}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>วันลาพักผ่อนคงเหลือ</div>
          </div>
        </div>
      </div>

      {/* Today Check-in Status Card */}
      <div className="glass-panel animate-fade-in" style={{
        padding: '20px 24px',
        borderRadius: '20px',
        border: '1px solid rgba(159, 122, 234, 0.18)',
        background: 'rgba(255, 255, 255, 0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: computedStatus === 'present' ? 'rgba(16, 185, 129, 0.12)' :
                        computedStatus === 'late' ? 'rgba(245, 158, 11, 0.12)' :
                        computedStatus === 'gov' ? 'rgba(6, 182, 212, 0.12)' :
                        computedStatus === 'sick' ? 'rgba(239, 68, 68, 0.12)' :
                        computedStatus === 'leave' ? 'rgba(245, 158, 11, 0.12)' :
                        computedStatus === 'holiday' ? 'rgba(139, 92, 246, 0.12)' :
                        'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
                        computedStatus === 'present' ? 'var(--green)' :
                        computedStatus === 'late' ? 'var(--yellow)' :
                        computedStatus === 'gov' ? 'var(--cyan)' :
                        computedStatus === 'sick' ? 'var(--red)' :
                        computedStatus === 'leave' ? 'var(--yellow)' :
                        computedStatus === 'holiday' ? 'var(--primary)' :
                        'var(--red)'
                    }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.65rem',
            boxShadow: computedStatus === 'present' ? '0 0 12px rgba(16, 185, 129, 0.15)' : 'none'
          }}>
            {computedStatus === 'present' ? '🟢' :
             computedStatus === 'late' ? '⏰' :
             computedStatus === 'gov' ? '🚗' :
             computedStatus === 'sick' ? '🤕' :
             computedStatus === 'leave' ? '📌' :
             computedStatus === 'holiday' ? '🎉' :
             '🔴'}
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              🗓️ ผลการสแกนใบหน้าและลงเวลาปฏิบัติงานของวันนี้ ({formatDateThai(new Date())})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 
                computedStatus === 'present' ? 'var(--green)' :
                computedStatus === 'late' ? 'var(--yellow)' :
                computedStatus === 'gov' ? 'var(--cyan)' :
                computedStatus === 'sick' ? 'var(--red)' :
                computedStatus === 'leave' ? 'var(--yellow)' :
                computedStatus === 'holiday' ? 'var(--primary)' :
                'var(--red)'
              }}>
                {checkingTodayStatus || loading ? 'กำลังตรวจสอบ...' :
                 computedStatus === 'present' ? 'มาปฏิบัติราชการปกติ' :
                 computedStatus === 'late' ? 'มาสาย' :
                 computedStatus === 'gov' ? 'ไปราชการ' :
                 computedStatus === 'sick' ? 'ลาป่วย' :
                 computedStatus === 'leave' ? leaveLabel :
                 computedStatus === 'holiday' ? 'วันหยุด' :
                 'ขาดงาน'}
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                {checkingTodayStatus || loading ? '...' : 
                 (computedStatus === 'present' || computedStatus === 'late') ? `เวลาลงทำงาน: ${todayTime}` : 
                 computedStatus === 'gov' ? 'ไปราชการนอกสถานที่' :
                 computedStatus === 'holiday' ? leaveLabel :
                 'ไม่ได้สแกนเข้าหน้าเครื่อง'}
              </span>
            </div>
          </div>
        </div>

        {/* Status indicator message */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '340px', lineHeight: 1.4 }}>
          {checkingTodayStatus || loading ? 'กำลังโหลดข้อความ...' :
           computedStatus === 'present' ? '👍 ยอดเยี่ยม! รักษาเวลาในการมาปฏิบัติหน้าที่ราชการอย่างสม่ำเสมอครับ' :
           computedStatus === 'late' ? '⚠️ วันนี้คุณสแกนหน้าเข้างานสาย โปรดรักษาเวลาในวันทำการถัดไปนะครับ' :
           computedStatus === 'gov' ? '🚗 ปฏิบัติภารกิจนอกสถานที่ราชการ ขอให้เดินทางและทำงานอย่างปลอดภัยครับ' :
           computedStatus === 'sick' ? '🤕 พักผ่อนและรักษาตัวให้แข็งแรง ขอให้หายป่วยในเร็ววันครับ' :
           computedStatus === 'leave' ? '📌 ขอให้ใช้วันลาอย่างมีความสุขและจัดการธุระส่วนตัวให้เรียบร้อยครับ' :
           computedStatus === 'holiday' ? '🎉 สุขสันต์วันหยุด พักผ่อนเติมพลังให้เต็มที่นะครับ!' :
           '❌ ยังไม่มีข้อมูลสแกนเข้างานในวันนี้ หากมาปฏิบัติหน้าที่แล้ว โปรดแจ้งแอดมินเพื่อแก้ไขบันทึกครับ'}
        </div>
      </div>

      {/* Grid of Leave Balances */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: '🤒 ลาป่วยสะสม', value: `${leaveStats.sick?.days || 0} วัน`, color: 'var(--primary)' },
          { label: '📌 ลากิจสะสม', value: `${leaveStats.personal?.days || 0} วัน`, color: 'var(--cyan)' },
          { label: '👶 ลาคลอดสะสม', value: `${leaveStats.maternity?.days || 0} วัน`, color: 'var(--yellow)' },
          { label: '🌴 ลาพักผ่อนสะสม', value: `${leaveStats.vacation?.days || 0} วัน`, color: 'var(--green)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Main split sections: Leave History vs Out of Office */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Left: Leave History */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--primary)' }}>📬 ประวัติคำขอลาของคุณ</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>กำลังโหลดประวัติ...</div>
          ) : leaveRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ไม่มีรายการขอลาในระบบ</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {leaveRequests.map(req => {
                const statusColor = req.status === 'approved' ? 'var(--green)' : req.status === 'rejected' ? 'var(--red)' : 'var(--yellow)';
                const statusBg = req.status === 'approved' ? 'rgba(16,185,129,0.12)' : req.status === 'rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
                const statusBorder = req.status === 'approved' ? 'rgba(16,185,129,0.3)' : req.status === 'rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)';
                const statusText = req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'rejected' ? 'ไม่อนุมัติ' : 'รอพิจารณา';

                return (
                  <div key={req.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{req.leave_type}</span>
                      <span style={{
                        background: statusBg,
                        border: `1px solid ${statusBorder}`,
                        color: statusColor,
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}>{statusText}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      วันที่: <b>{formatDateThai(req.start_date)}</b> ถึง <b>{formatDateThai(req.end_date)}</b> ({req.days} วัน)
                    </div>
                    {req.reason && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>เหตุผล: {req.reason}</div>}
                    {req.director_comment && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--red)', background: 'rgba(239,68,68,0.05)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                        หมายเหตุ ผอ.: {req.director_comment}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button 
                        onClick={() => setPrintRequest(req)}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(159,122,234,0.08)',
                          border: '1px solid rgba(159,122,234,0.25)',
                          color: 'var(--primary)',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >🖨️ พิมพ์ใบลา</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Out of Office History */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', color: 'var(--cyan)' }}>🚗 ประวัติออกนอกสถานที่ราชการ</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>กำลังโหลดประวัติ...</div>
          ) : dutyRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>ไม่มีรายการออกนอกสถานที่ในระบบ</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {dutyRequests.map(req => {
                const statusColor = req.status === 'approved' ? 'var(--green)' : req.status === 'rejected' ? 'var(--red)' : req.status === 'completed' ? 'var(--cyan)' : 'var(--yellow)';
                const statusBg = req.status === 'approved' ? 'rgba(16,185,129,0.12)' : req.status === 'rejected' ? 'rgba(239,68,68,0.12)' : req.status === 'completed' ? 'rgba(6,182,212,0.12)' : 'rgba(245,158,11,0.12)';
                const statusBorder = req.status === 'approved' ? 'rgba(16,185,129,0.3)' : req.status === 'rejected' ? 'rgba(239,68,68,0.3)' : req.status === 'completed' ? 'rgba(6,182,212,0.3)' : 'rgba(245,158,11,0.3)';
                const statusText = req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'rejected' ? 'ไม่อนุมัติ' : req.status === 'completed' ? 'เสร็จสิ้นภารกิจ' : 'รอพิจารณา';

                return (
                  <div key={req.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>🚗 {req.destination}</span>
                      <span style={{
                        background: statusBg,
                        border: `1px solid ${statusBorder}`,
                        color: statusColor,
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}>{statusText}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      วันที่: <b>{formatDateThai(req.duty_date)}</b> เวลา: <b>{req.time_out || req.timeOut} - {req.time_in || req.timeIn} น.</b>
                    </div>
                    {req.objective && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>วัตถุประสงค์: {req.objective}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Print PDF Modal integration */}
      {printRequest && (
        <PrintableLeavePdf 
          request={printRequest} 
          onClose={() => setPrintRequest(null)} 
        />
      )}

      {/* Account Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '400px', padding: '28px',
            borderRadius: '20px', border: '1px solid rgba(159,122,234,0.3)',
            animation: 'fadeIn 0.25s ease'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800 }}>⚙️ แก้ไขข้อมูลบัญชีผู้ใช้งาน</h3>
            
            {settingsError && <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginBottom: '12px' }}>⚠️ {settingsError}</div>}
            {settingsSuccess && <div style={{ color: 'var(--green)', fontSize: '0.8rem', marginBottom: '12px' }}>✅ {settingsSuccess}</div>}

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Username</label>
                <input 
                  type="text" 
                  value={formUsername} 
                  onChange={e => setFormUsername(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Password (รหัสผ่าน)</label>
                <input 
                  type="text" 
                  value={formPassword} 
                  onChange={e => setFormPassword(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>ชื่อแสดงในระบบ (Display Name)</label>
                <input 
                  type="text" 
                  value={formDisplayName} 
                  onChange={e => setFormDisplayName(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="glow-button" style={{ flex: 1, padding: '10px', fontSize: '0.85rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>บันทึกข้อมูล</button>
                <button type="button" onClick={() => setShowSettingsModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyDashboard;
