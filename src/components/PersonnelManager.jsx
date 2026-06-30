import React, { useState, useMemo } from 'react';

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────
const createEmptyLeave = (vacationRemaining = 30) => ({
  sick: { count: 0, days: 0 },
  vacation: { count: 0, days: 0, remaining: vacationRemaining },
  personal: { count: 0, days: 0 },
  absent: 0,
  maternity: { count: 0, days: 0 },
  wifeAssist: { count: 0, days: 0 },
  ordination: { count: 0, days: 0 },
  military: { count: 0, days: 0 },
  study: { count: 0, days: 0 },
  work: { count: 0, days: 0 },
  follow: { count: 0, days: 0 },
  rehab: { count: 0, days: 0 },
  total: { count: 0, days: 0 },
  late: { count: 0, days: 0 },
  outOfArea: { count: 0, hours: 0, days: 0 }
});

const POSITION_OPTIONS = [
  'ผู้อำนวยการ',
  'รองผู้อำนวยการ',
  'ครู',
  'ครูผู้ช่วย',
  'พนักงานราชการ',
  'ลูกจ้างชั่วคราว',
  'นักการภารโรง',
  'พนักงานธุรการ',
];

const LOCATION_OPTIONS = [
  'ศูนย์การศึกษาพิเศษฯ',
  'ฝ่ายบริหารงานทั่วไป',
  'ฝ่ายบริหารวิชาการ',
  'ฝ่ายบริหารงานการจัดการภายนอก',
  'ฝ่ายบริหารงานแผนงานและงบประมาณ',
  'ฝ่ายบริหารงานบุคคล',
];

const getSupabaseConfig = () => {
  try {
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (parsed.url && parsed.key) return parsed;
    return null;
  } catch { return null; }
};

// ────────────────────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────────────────────
const StatusBadge = ({ count }) => (
  <span style={{
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
    color: '#fff',
    borderRadius: '999px',
    padding: '3px 12px',
    fontSize: '0.78rem',
    fontWeight: 700,
    marginLeft: '8px'
  }}>{count} คน</span>
);

const InputField = ({ label, value, onChange, placeholder, required, type = 'text' }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
      {label}{required && <span style={{ color: 'var(--red)', marginLeft: '3px' }}>*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{
        width: '100%',
        padding: '9px 12px',
        borderRadius: '9px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-dark)',
        color: 'var(--text-main)',
        fontSize: '0.85rem',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
        outline: 'none',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, placeholder }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '9px 12px',
        borderRadius: '9px',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-dark)',
        color: 'var(--text-main)',
        fontSize: '0.85rem',
        boxSizing: 'border-box',
        cursor: 'pointer',
        outline: 'none',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

// ────────────────────────────────────────────────────────
// Employee Form Modal (Add / Edit)
// ────────────────────────────────────────────────────────
const EmployeeFormModal = ({ mode, employee, onSave, onClose }) => {
  const isEdit = mode === 'edit';
  const [name, setName] = useState(employee?.name || '');
  const [position, setPosition] = useState(employee?.position || '');
  const [location, setLocation] = useState(employee?.location || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { alert('โปรดระบุชื่อ-นามสกุล'); return; }
    setSaving(true);
    await onSave({ name: name.trim(), position: position.trim() || 'ครู', location: location.trim() || 'ศูนย์การศึกษาพิเศษฯ', phone: phone.trim(), email: email.trim() });
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '32px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        position: 'relative',
        animation: 'fadeIn 0.2s ease'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: 'var(--red)', width: '32px', height: '32px', borderRadius: '8px',
          cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>✕</button>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {isEdit ? '✏️ แก้ไขข้อมูลบุคลากร' : '➕ เพิ่มบุคลากรใหม่'}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {isEdit ? `กำลังแก้ไขข้อมูล: ${employee?.name}` : 'กรอกข้อมูลบุคลากรที่ต้องการเพิ่มเข้าระบบ'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField label="ชื่อ - นามสกุล" value={name} onChange={setName} placeholder="เช่น นายรักการเรียน ดีเด่น" required />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>ตำแหน่ง</label>
              <input
                list="position-list"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="เลือกหรือพิมพ์ตำแหน่ง"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
              />
              <datalist id="position-list">
                {POSITION_OPTIONS.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>สถานที่ / ฝ่าย</label>
              <input
                list="location-list"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="เลือกหรือพิมพ์ฝ่าย"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
              />
              <datalist id="location-list">
                {LOCATION_OPTIONS.map(l => <option key={l} value={l} />)}
              </datalist>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <InputField label="เบอร์โทรศัพท์" value={phone} onChange={setPhone} placeholder="0812345678" type="tel" />
            <InputField label="อีเมล" value={email} onChange={setEmail} placeholder="example@email.com" type="email" />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '11px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
              color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
            }}>ยกเลิก</button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '11px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              border: 'none', color: '#fff', borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '0.85rem', opacity: saving ? 0.7 : 1,
              boxShadow: '0 0 16px var(--primary-glow)'
            }}>
              {saving ? '⏳ กำลังบันทึก...' : isEdit ? '💾 บันทึกการแก้ไข' : '➕ บันทึกบุคลากร'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────
// Main PersonnelManager Component
// ────────────────────────────────────────────────────────
const PersonnelManager = ({ employeesData, setEmployeesData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add mode, employee object = edit mode
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const positionsList = useMemo(() => Array.from(new Set(employeesData.map(e => e.position))).filter(Boolean).sort(), [employeesData]);
  const locationsList = useMemo(() => Array.from(new Set(employeesData.map(e => e.location))).filter(Boolean).sort(), [employeesData]);

  const filtered = useMemo(() => {
    return employeesData.filter(emp => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || emp.name.toLowerCase().includes(q) || (emp.position || '').toLowerCase().includes(q);
      const matchPos = !filterPosition || emp.position === filterPosition;
      const matchLoc = !filterLocation || emp.location === filterLocation;
      return matchSearch && matchPos && matchLoc;
    }).sort((a, b) => a.id - b.id);
  }, [employeesData, searchQuery, filterPosition, filterLocation]);

  // ── ADD Employee ──────────────────────────────────────
  const handleAdd = async (data) => {
    const newId = employeesData.length > 0 ? Math.max(...employeesData.map(e => e.id)) + 1 : 1;
    const newEmp = {
      id: newId,
      name: data.name,
      position: data.position,
      location: data.location,
      phone: data.phone,
      email: data.email,
      leaves: {
        all: createEmptyLeave(30),
        january: createEmptyLeave(30), february: createEmptyLeave(30), march: createEmptyLeave(30),
        april: createEmptyLeave(30), may: createEmptyLeave(30), june: createEmptyLeave(30),
        july: createEmptyLeave(30), august: createEmptyLeave(30), september: createEmptyLeave(30),
        october: createEmptyLeave(30), november: createEmptyLeave(30), december: createEmptyLeave(30)
      }
    };

    const cfg = getSupabaseConfig();
    if (cfg) {
      try {
        const table = cfg.employeesTable || 'employees';
        const cols = cfg.supabaseColumns || { id: 'id', fullName: 'full_name', position: 'position', location: 'location' };
        await fetch(`${cfg.url}/rest/v1/${table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` },
          body: JSON.stringify({
            [cols.id]: newId, [cols.fullName]: newEmp.name,
            [cols.position]: newEmp.position, [cols.location]: newEmp.location
          })
        });
        await fetch(`${cfg.url}/rest/v1/leave_balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` },
          body: JSON.stringify({ employee_id: newId, sick_remaining: 30, personal_remaining: 45, maternity_remaining: 90, vacation_remaining: 30, ordination_remaining: 120 })
        }).catch(() => {});
      } catch (err) { console.error('Supabase add failed', err); }
    }

    setEmployeesData(prev => [...prev, newEmp]);
    setShowModal(false);
    setEditTarget(null);
    showSuccess(`✅ เพิ่มบุคลากร "${newEmp.name}" เรียบร้อยแล้ว!`);
  };

  // ── EDIT Employee ─────────────────────────────────────
  const handleEdit = async (data) => {
    const cfg = getSupabaseConfig();
    if (cfg) {
      try {
        const table = cfg.employeesTable || 'employees';
        const cols = cfg.supabaseColumns || { id: 'id', fullName: 'full_name', position: 'position', location: 'location' };
        await fetch(`${cfg.url}/rest/v1/${table}?${cols.id}=eq.${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` },
          body: JSON.stringify({ [cols.fullName]: data.name, [cols.position]: data.position, [cols.location]: data.location })
        });
      } catch (err) { console.error('Supabase edit failed', err); }
    }

    setEmployeesData(prev => prev.map(e => e.id === editTarget.id
      ? { ...e, name: data.name, position: data.position, location: data.location, phone: data.phone, email: data.email }
      : e
    ));
    setShowModal(false);
    setEditTarget(null);
    showSuccess(`✏️ แก้ไขข้อมูล "${data.name}" เรียบร้อยแล้ว!`);
  };

  // ── DELETE Employee ───────────────────────────────────
  const handleDelete = async (empId) => {
    const emp = employeesData.find(e => e.id === empId);
    if (!emp) return;

    const cfg = getSupabaseConfig();
    if (cfg) {
      try {
        const table = cfg.employeesTable || 'employees';
        const cols = cfg.supabaseColumns || { id: 'id' };
        await fetch(`${cfg.url}/rest/v1/${table}?${cols.id}=eq.${empId}`, {
          method: 'DELETE',
          headers: { 'apikey': cfg.key, 'Authorization': `Bearer ${cfg.key}` }
        });
      } catch (err) { console.error('Supabase delete failed', err); }
    }

    setEmployeesData(prev => prev.filter(e => e.id !== empId));
    setDeleteConfirmId(null);
    showSuccess(`🗑️ ลบ "${emp.name}" ออกจากระบบเรียบร้อยแล้ว`);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(159,122,234,0.12) 0%, rgba(99,102,241,0.08) 100%)',
        border: '1px solid rgba(159,122,234,0.25)',
        borderRadius: '18px',
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
            👥 จัดการบุคลากร
            <StatusBadge count={employeesData.length} />
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            เพิ่ม แก้ไข หรือลบข้อมูลบุคลากรในระบบ — การเปลี่ยนแปลงจะซิงค์กับ Supabase โดยอัตโนมัติ
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          style={{
            padding: '11px 22px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer',
            fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap',
            boxShadow: '0 0 18px var(--primary-glow)', transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 0 28px var(--primary-glow)'; }}
          onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 0 18px var(--primary-glow)'; }}
        >
          ➕ เพิ่มบุคลากรใหม่
        </button>
      </div>

      {/* ── Success Toast ────────────────────────────────── */}
      {successMsg && (
        <div style={{
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
          color: 'var(--green)', borderRadius: '12px', padding: '12px 18px',
          marginBottom: '16px', fontWeight: 600, fontSize: '0.88rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          {successMsg}
        </div>
      )}

      {/* ── Search & Filters ─────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: '14px', padding: '16px 20px', marginBottom: '20px',
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'end'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>🔍 ค้นหา</label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ หรือตำแหน่ง..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>ตำแหน่ง</label>
          <select
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">ทุกตำแหน่ง</option>
            {positionsList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>สถานที่ / ฝ่าย</label>
          <select
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">ทุกสถานที่</option>
            {locationsList.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* ── Stats Summary Row ────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'ทั้งหมด', value: employeesData.length, color: 'var(--primary)' },
          { label: 'ผลการค้นหา', value: filtered.length, color: 'var(--cyan)' },
          { label: 'ตำแหน่ง', value: positionsList.length, color: 'var(--yellow)' },
          { label: 'ฝ่าย/สถานที่', value: locationsList.length, color: 'var(--green)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px'
          }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Employee Table ───────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: '16px', overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: 'rgba(159,122,234,0.08)', borderBottom: '1px solid var(--border-color)' }}>
                {['#', 'ชื่อ - นามสกุล', 'ตำแหน่ง', 'สถานที่/ฝ่าย', 'เบอร์โทร', 'จัดการ'].map(col => (
                  <th key={col} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    🔍 ไม่พบบุคลากรที่ตรงกับการค้นหา
                  </td>
                </tr>
              ) : filtered.map((emp, idx) => (
                <tr
                  key={emp.id}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{emp.id}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                        background: `linear-gradient(135deg, hsl(${(emp.id * 47) % 360}, 70%, 55%) 0%, hsl(${(emp.id * 47 + 40) % 360}, 70%, 40%) 100%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: '0.85rem'
                      }}>
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{emp.name}</div>
                        {emp.email && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: 'rgba(159,122,234,0.1)', border: '1px solid rgba(159,122,234,0.2)',
                      color: 'var(--primary)', borderRadius: '6px', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600
                    }}>{emp.position || '-'}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{emp.location || '-'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{emp.phone || '-'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {deleteConfirmId === emp.id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--red)', fontWeight: 600 }}>ยืนยันลบ?</span>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                        >ลบ</button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          style={{ padding: '4px 10px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                        >ยกเลิก</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => { setEditTarget(emp); setShowModal(true); }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(159,122,234,0.1)', border: '1px solid rgba(159,122,234,0.25)',
                            color: 'var(--primary)', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => e.target.style.background = 'rgba(159,122,234,0.2)'}
                          onMouseLeave={e => e.target.style.background = 'rgba(159,122,234,0.1)'}
                        >✏️ แก้ไข</button>
                        <button
                          onClick={() => setDeleteConfirmId(emp.id)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                            color: 'var(--red)', borderRadius: '8px', cursor: 'pointer',
                            fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.15)'}
                          onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.08)'}
                        >🗑️ ลบ</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit Modal ───────────────────────────────── */}
      {showModal && (
        <EmployeeFormModal
          mode={editTarget ? 'edit' : 'add'}
          employee={editTarget}
          onSave={editTarget ? handleEdit : handleAdd}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
};

export default PersonnelManager;
