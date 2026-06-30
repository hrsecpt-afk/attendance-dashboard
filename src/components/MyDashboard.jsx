import React, { useState, useEffect } from 'react';
import PrintableLeavePdf from './PrintableLeavePdf';

const getSupabaseCfg = () => {
  try {
    const s = localStorage.getItem('attendance_dashboard_supabase_config');
    if (!s) return null;
    const p = JSON.parse(s);
    return p.url && p.key ? p : null;
  } catch { return null; }
};

const formatDateThai = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
};

const MyDashboard = ({ currentUser, employeesData = [] }) => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [dutyRequests, setDutyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printRequest, setPrintRequest] = useState(null);

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
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--green)' }}>{leaveStats.vacation?.remaining ?? 10}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>วันลาพักผ่อนคงเหลือ</div>
          </div>
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

    </div>
  );
};

export default MyDashboard;
