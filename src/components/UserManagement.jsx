import React, { useState } from 'react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '../context/AuthContext';

const ROLE_OPTIONS = [
  { value: 'user', label: 'ผู้ใช้งาน' },
  { value: 'director', label: 'ผู้อำนวยการ' },
  { value: 'admin', label: 'แอดมิน / งานบุคคล' },
];

const UserManagement = ({ employeesData = [] }) => {
  const { users, updateUsers } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formError, setFormError] = useState('');
  const [showPassMap, setShowPassMap] = useState({});

  const [logoBase64, setLogoBase64] = useState(localStorage.getItem('app_logo_url') || '');

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('ไฟล์ใหญ่เกินไป กรุณาใช้รูปภาพขนาดไม่เกิน 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result);
        try {
          localStorage.setItem('app_logo_url', reader.result);
          alert('บันทึกโลโก้เรียบร้อยแล้ว');
        } catch (e) {
          alert('ไม่สามารถบันทึกโลโก้ลงเบราว์เซอร์ได้ เนื่องจากหน่วยความจำเต็มหรือถูกปิดกั้น');
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleResetLogo = () => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตโลโก้กลับเป็นค่าเริ่มต้น?')) {
      setLogoBase64('');
      try {
        localStorage.removeItem('app_logo_url');
      } catch (e) {}
    }
  };

  const resetForm = () => {
    setFormUsername(''); setFormPassword(''); setFormRole('user');
    setFormDisplayName(''); setFormEmployeeId(''); setFormError(''); setEditId(null);
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setFormUsername(u.username);
    setFormPassword(u.password);
    setFormRole(u.role);
    setFormDisplayName(u.displayName);
    setFormEmployeeId(u.employeeId || '');
    setFormError('');
    setShowForm(true);
  };

  const handleDisplayNameChange = (value) => {
    setFormDisplayName(value);
    if (value.trim()) {
      const clean = (name) => name.replace(/^(นาย|นางสาว|นาง|ดร\.|ครูผู้ช่วย|ครู|ผอ\.|ผู้อำนวยการ)\s*/, '').replace(/\s+/g, '').trim();
      const targetClean = clean(value);
      const matched = employeesData.find(emp => clean(emp.name) === targetClean);
      if (matched) {
        setFormEmployeeId(String(matched.id));
      } else {
        setFormEmployeeId('');
      }
    } else {
      setFormEmployeeId('');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setFormError('');
    if (!formUsername.trim()) return setFormError('โปรดระบุชื่อผู้ใช้');
    if (!formPassword.trim()) return setFormError('โปรดระบุรหัสผ่าน');
    if (formPassword.length < 4) return setFormError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');

    const duplicate = users.find(
      u => u.username.toLowerCase() === formUsername.trim().toLowerCase() && u.id !== editId
    );
    if (duplicate) return setFormError('ชื่อผู้ใช้นี้ถูกใช้แล้ว');

    const clean = (name) => name.replace(/^(นาย|นางสาว|นาง|ดร\.|ครูผู้ช่วย|ครู|ผอ\.|ผู้อำนวยการ)\s*/, '').replace(/\s+/g, '').trim();
    const targetClean = clean(formDisplayName);
    let linkedEmpId = formEmployeeId ? String(formEmployeeId) : null;
    
    if (!linkedEmpId && formDisplayName.trim()) {
      const matched = employeesData.find(emp => clean(emp.name) === targetClean);
      if (matched) {
        linkedEmpId = matched.id;
      }
    }

    if (editId) {
      updateUsers(users.map(u =>
        u.id === editId
          ? { ...u, username: formUsername.trim(), password: formPassword.trim(), role: formRole, displayName: formDisplayName.trim() || formUsername.trim(), employeeId: linkedEmpId }
          : u
      ));
    } else {
      const newUser = {
        id: Date.now(),
        username: formUsername.trim(),
        password: formPassword.trim(),
        role: formRole,
        displayName: formDisplayName.trim() || formUsername.trim(),
        employeeId: linkedEmpId,
      };
      updateUsers([...users, newUser]);
    }
    resetForm();
    setShowForm(false);
  };

  const handleDelete = (userId) => {
    if (!window.confirm('ยืนยันลบผู้ใช้นี้?')) return;
    updateUsers(users.filter(u => u.id !== userId));
  };

  const handleBatchCreateUsers = () => {
    const unlinkedEmps = employeesData.filter(emp => !users.some(u => u.employeeId === emp.id));
    if (unlinkedEmps.length === 0) {
      alert('📌 บุคลากรทุกคนในระบบมีบัญชีผู้ใช้งานเรียบร้อยแล้ว!');
      return;
    }

    if (!window.confirm(`👥 ยืนยันสร้างบัญชีผู้ใช้งานสำหรับบุคลากรที่ยังไม่มีบัญชีจำนวน ${unlinkedEmps.length} คน โดยอัตโนมัติ?\n\n(Username จะตั้งเป็น "user_[รหัส]" และ Password จะเป็น "1234")`)) {
      return;
    }

    const newUsers = unlinkedEmps.map((emp, index) => ({
      id: Date.now() + index,
      username: `user_${emp.id}`,
      password: '1234',
      role: 'user',
      displayName: emp.name,
      employeeId: emp.id
    }));

    updateUsers([...users, ...newUsers]);
    alert(`✅ สร้างบัญชีผู้ใช้งานอัตโนมัติสำเร็จ ${newUsers.length} บัญชี!\n\n(คุณครูสามารถล็อกอินด้วย Username เช่น user_1, user_2 และรหัสผ่าน 1234)`);
  };

  const input = (value, setter, placeholder, type = 'text') => (
    <input
      type={type} value={value} onChange={e => setter(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem', boxSizing: 'border-box' }}
    />
  );

  return (
    <div className="no-print" style={{ marginTop: '8px' }}>
      {/* Settings Section (Logo) */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderRadius: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          🏫 ตั้งค่าโลโก้ระบบ (สำหรับหน้าล็อคอิน)
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '12px',
            background: logoBase64 ? 'transparent' : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', overflow: 'hidden'
          }}>
            {logoBase64 ? (
              <img src={logoBase64} alt="App Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '🏫'
            )}
          </div>
          <div>
            <label style={{
              display: 'inline-block',
              padding: '8px 16px', background: 'var(--primary)', color: '#fff',
              borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
            }}>
              อัปโหลดโลโก้ (PNG/JPG)
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            </label>
            {logoBase64 && (
              <button 
                onClick={handleResetLogo}
                style={{
                  marginLeft: '8px', padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: 'var(--red)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                }}
              >
                รีเซ็ต
              </button>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>แนะนำ: ขนาด 200x200px และไฟล์ไม่เกิน 2MB</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>👥 จัดการบัญชีผู้ใช้งาน ({users.length} บัญชี)</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleBatchCreateUsers}
            style={{ padding: '8px 16px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', color: 'var(--cyan)', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
          >
            ⚡ สร้างบัญชีให้ทุกคนอัตโนมัติ ({employeesData.filter(emp => !users.some(u => u.employeeId === emp.id)).length} คน)
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(v => !v); }}
            style={{ padding: '8px 16px', background: showForm ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${showForm ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`, color: showForm ? 'var(--red)' : 'var(--green)', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
          >
            {showForm ? '✖ ปิดฟอร์ม' : '➕ เพิ่มผู้ใช้ใหม่'}
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSave} className="glass-panel animate-fade-in" style={{ padding: '20px', marginBottom: '20px', borderRadius: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>Username</label>
              {input(formUsername, setFormUsername, 'เช่น somchai')}
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>Password</label>
              {input(formPassword, setFormPassword, 'อย่างน้อย 4 ตัว')}
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>ชื่อแสดง</label>
              {input(formDisplayName, handleDisplayNameChange, 'นายสมชาย ใจดี')}
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>บทบาท</label>
              <select value={formRole} onChange={e => setFormRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '5px' }}>ผูกกับบุคลากร (ถ้ามี)</label>
              <select value={formEmployeeId} onChange={e => setFormEmployeeId(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                <option value="">— ไม่ผูก —</option>
                {employeesData.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
          </div>
          {formError && <div style={{ color: 'var(--red)', fontSize: '0.82rem', marginBottom: '10px' }}>⚠️ {formError}</div>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="glow-button" style={{ padding: '9px 20px', fontSize: '0.85rem', borderRadius: '9px' }}>
              {editId ? '💾 บันทึกการแก้ไข' : '➕ เพิ่มผู้ใช้'}
            </button>
            <button type="button" onClick={() => { resetForm(); setShowForm(false); }} style={{ padding: '9px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '9px', cursor: 'pointer', fontSize: '0.85rem' }}>
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {/* User Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              {['Username', 'ชื่อแสดง', 'บทบาท', 'ผูกบุคลากร', 'รหัสผ่าน', 'จัดการ'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const linked = employeesData.find(emp => emp.id === u.employeeId);
              const showPass = showPassMap[u.id];
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: '0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-main)' }}>{u.username}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-main)' }}>{u.displayName}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, background: `${ROLE_COLORS[u.role]}20`, color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}40` }}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: linked ? 'var(--green)' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {linked ? `✅ ${linked.name}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {showPass ? u.password : '••••••••'}
                    </span>
                    <button onClick={() => setShowPassMap(m => ({ ...m, [u.id]: !showPass }))}
                      style={{ marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEdit(u)} style={{ padding: '5px 10px', background: 'rgba(159,122,234,0.1)', border: '1px solid rgba(159,122,234,0.25)', color: 'var(--primary)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>✏️ แก้ไข</button>
                      <button onClick={() => handleDelete(u.id)} style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>🗑️ ลบ</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
