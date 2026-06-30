import React, { useState, useMemo } from 'react';

// ==========================================
// Individual Focus Report Card Component
// ==========================================
const IndividualReportCard = ({ employee, onClick }) => {
  const l = employee.leaves;
  const hasAlert = l.absent > 0 || l.late.count >= 5;
  const totalLeave = (l.sick.days || 0) + (l.vacation.days || 0) + (l.personal.days || 0);

  return (
    <div
      onClick={() => onClick(employee)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hasAlert ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-color)'}`,
        borderRadius: '14px',
        padding: '18px',
        cursor: 'pointer',
        transition: 'var(--transition-smooth)',
        backdropFilter: 'var(--glass-blur)'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-card-hover)';
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.25)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-card)';
        e.currentTarget.style.borderColor = hasAlert ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-color)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Name & Position */}
      <div style={{ marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '4px', lineHeight: 1.3 }}>
          {employee.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {employee.position} · {employee.location}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {/* Sick */}
        <div style={{ textAlign: 'center', background: 'rgba(6, 182, 212, 0.06)', borderRadius: '8px', padding: '8px 4px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cyan)' }}>{l.sick.days}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>ลาป่วย (วัน)</div>
        </div>

        {/* Vacation */}
        <div style={{ textAlign: 'center', background: 'rgba(159, 122, 234, 0.06)', borderRadius: '8px', padding: '8px 4px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{l.vacation.days}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>พักผ่อน (วัน)</div>
        </div>

        {/* Personal */}
        <div style={{ textAlign: 'center', background: 'rgba(245, 158, 11, 0.06)', borderRadius: '8px', padding: '8px 4px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--yellow)' }}>{l.personal.days}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>ลากิจ (วัน)</div>
        </div>

        {/* Absent */}
        <div style={{ textAlign: 'center', background: l.absent > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 4px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: l.absent > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{l.absent}</div>
          <div style={{ fontSize: '0.68rem', color: l.absent > 0 ? 'var(--red)' : 'var(--text-muted)', marginTop: '1px' }}>ขาดงาน (วัน)</div>
        </div>

        {/* Late */}
        <div style={{ textAlign: 'center', background: l.late.count > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '8px 4px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: l.late.count > 0 ? 'var(--yellow)' : 'var(--text-muted)' }}>{l.late.count}</div>
          <div style={{ fontSize: '0.68rem', color: l.late.count > 0 ? 'var(--yellow)' : 'var(--text-muted)', marginTop: '1px' }}>มาสาย (ครั้ง)</div>
        </div>

        {/* Out of area */}
        <div style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.06)', borderRadius: '8px', padding: '8px 4px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--green)' }}>{l.outOfArea.count}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>ออกนอกพื้นที่</div>
        </div>
      </div>

      {/* Bottom bar: Vacation remaining indicator */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>วันพักผ่อนคงเหลือ</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              borderRadius: '3px',
              width: `${Math.min((l.vacation.remaining / 30) * 100, 100)}%`,
              background: l.vacation.remaining < 10 ? 'var(--red)' : l.vacation.remaining < 20 ? 'var(--yellow)' : 'var(--green)',
              transition: 'width 0.8s ease'
            }} />
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green)' }}>{l.vacation.remaining} วัน</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// Employee Detail Panel (Right Sidebar)
// ==========================================
const DetailPanel = ({ employee, onClose }) => {
  if (!employee) return null;
  const l = employee.leaves;

  const items = [
    { icon: '🤒', label: 'ลาป่วย', count: l.sick.count, days: l.sick.days, unit: 'วัน', color: 'var(--cyan)' },
    { icon: '🏖️', label: 'ลาพักผ่อน', count: l.vacation.count, days: l.vacation.days, unit: 'วัน', color: 'var(--primary)', sub: `คงเหลือ ${l.vacation.remaining} วัน` },
    { icon: '💼', label: 'ลากิจ', count: l.personal.count, days: l.personal.days, unit: 'วัน', color: 'var(--yellow)' },
    { icon: '⚠️', label: 'ขาดราชการ', count: null, days: l.absent, unit: 'วัน', color: l.absent > 0 ? 'var(--red)' : 'var(--text-muted)' },
    { icon: '⏰', label: 'มาสาย', count: l.late.count, days: l.late.days, unit: 'ครั้ง/วัน', color: l.late.count > 0 ? 'var(--yellow)' : 'var(--text-muted)' },
    { icon: '🚗', label: 'ออกนอกพื้นที่', count: l.outOfArea.count, days: l.outOfArea.days, unit: 'ครั้ง/วัน', color: 'var(--green)', sub: `${l.outOfArea.hours} ช.ม.` },
    { icon: '👶', label: 'ลาคลอด', count: l.maternity.count, days: l.maternity.days, unit: 'วัน', color: 'var(--text-muted)' },
    { icon: '🤝', label: 'ช่วยภริยาคลอด', count: l.wifeAssist.count, days: l.wifeAssist.days, unit: 'วัน', color: 'var(--text-muted)' },
    { icon: '☸️', label: 'อุปสมบท/ฮัจย์', count: l.ordination.count, days: l.ordination.days, unit: 'วัน', color: 'var(--text-muted)' },
    { icon: '🎖️', label: 'ตรวจเลือกทหาร', count: l.military.count, days: l.military.days, unit: 'วัน', color: 'var(--text-muted)' },
    { icon: '📚', label: 'ลาศึกษาต่อ', count: l.study.count, days: l.study.days, unit: 'วัน', color: 'var(--text-muted)' },
    { icon: '🔧', label: 'ปฏิบัติงานฟื้นฟู', count: l.rehab.count, days: l.rehab.days, unit: 'วัน', color: 'var(--text-muted)' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '380px',
      height: '100vh',
      background: 'rgba(13, 17, 24, 0.98)',
      borderLeft: '1px solid var(--border-color)',
      backdropFilter: 'blur(20px)',
      zIndex: 500,
      overflowY: 'auto',
      padding: '28px 24px',
      animation: 'slideInRight 0.3s ease'
    }}>
      {/* Close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px', lineHeight: 1.3 }}>{employee.name}</div>
          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{employee.position}</span>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          width: '32px', height: '32px',
          borderRadius: '50%',
          cursor: 'pointer',
          fontWeight: 'bold',
          flexShrink: 0,
          fontSize: '0.85rem'
        }}>✕</button>
      </div>

      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        📍 {employee.location}
      </div>

      {/* Total summary box */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(159, 122, 234, 0.12) 0%, rgba(236, 72, 153, 0.06) 100%)',
        border: '1px solid rgba(159, 122, 234, 0.2)',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{l.total.days}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>รวมวันลาทั้งหมด</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--green)' }}>{l.vacation.remaining}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>วันพักผ่อนคงเหลือ</div>
        </div>
      </div>

      {/* Leave items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, idx) => {
          const isEmpty = (item.days === 0 || item.days === null) && (item.count === 0 || item.count === null);
          return (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              background: isEmpty ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isEmpty ? 'var(--border-color)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '8px',
              opacity: isEmpty ? 0.5 : 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)' }}>{item.label}</div>
                  {item.sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.sub}</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {item.count !== null && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.count} ครั้ง</div>
                )}
                <div style={{ fontSize: '1rem', fontWeight: 700, color: item.color }}>{item.days} {item.unit !== 'ครั้ง/วัน' ? item.unit : 'วัน'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// Individual Report View Main Component
// ==========================================
const IndividualReportView = ({ data }) => {
  const [search, setSearch] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [focusFilter, setFocusFilter] = useState('all'); // all | absent | late | outOfArea | highLeave
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const positions = useMemo(() => Array.from(new Set(data.map(d => d.position))).sort(), [data]);
  const locations = useMemo(() => Array.from(new Set(data.map(d => d.location))).sort(), [data]);

  const filtered = useMemo(() => {
    let result = data.filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase());
      const matchPos = filterPosition ? emp.position === filterPosition : true;
      const matchLoc = filterLocation ? emp.location === filterLocation : true;
      let matchFocus = true;

      if (focusFilter === 'absent') matchFocus = emp.leaves.absent > 0;
      else if (focusFilter === 'late') matchFocus = emp.leaves.late.count > 0;
      else if (focusFilter === 'outOfArea') matchFocus = emp.leaves.outOfArea.count > 0;
      else if (focusFilter === 'highLeave') matchFocus = (emp.leaves.sick.days + emp.leaves.vacation.days + emp.leaves.personal.days) >= 10;

      return matchSearch && matchPos && matchLoc && matchFocus;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'absent') return b.leaves.absent - a.leaves.absent;
      if (sortBy === 'late') return b.leaves.late.count - a.leaves.late.count;
      if (sortBy === 'sick') return b.leaves.sick.days - a.leaves.sick.days;
      if (sortBy === 'vacation') return b.leaves.vacation.days - a.leaves.vacation.days;
      if (sortBy === 'outOfArea') return b.leaves.outOfArea.count - a.leaves.outOfArea.count;
      if (sortBy === 'total') return b.leaves.total.days - a.leaves.total.days;
      return a.id - b.id;
    });

    return result;
  }, [data, search, filterPosition, filterLocation, sortBy, focusFilter]);

  const focusButtons = [
    { key: 'all', label: '👥 ทั้งหมด', count: data.length },
    { key: 'absent', label: '⚠️ มีขาดงาน', count: data.filter(e => e.leaves.absent > 0).length },
    { key: 'late', label: '⏰ มีมาสาย', count: data.filter(e => e.leaves.late.count > 0).length },
    { key: 'outOfArea', label: '🚗 ออกนอกพื้นที่', count: data.filter(e => e.leaves.outOfArea.count > 0).length },
    { key: 'highLeave', label: '📅 ลา ≥ 10 วัน', count: data.filter(e => (e.leaves.sick.days + e.leaves.vacation.days + e.leaves.personal.days) >= 10).length },
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Section title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>
            📋 รายงานสถิติรายบุคคล
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            แสดงข้อมูลสะสมทั้งปี: ขาด ลา สาย พักผ่อน ออกนอกพื้นที่ ของบุคลากรแต่ละคน
          </p>
        </div>
        <div style={{
          background: 'rgba(159, 122, 234, 0.1)',
          border: '1px solid rgba(159, 122, 234, 0.2)',
          borderRadius: '10px',
          padding: '8px 16px',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--primary)'
        }}>
          แสดง {filtered.length} / {data.length} คน
        </div>
      </div>

      {/* Focus filter buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {focusButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFocusFilter(btn.key)}
            style={{
              padding: '8px 14px',
              background: focusFilter === btn.key ? 'var(--primary)' : 'var(--bg-card)',
              border: `1px solid ${focusFilter === btn.key ? 'var(--primary)' : 'var(--border-color)'}`,
              color: '#fff',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'var(--transition-smooth)',
              boxShadow: focusFilter === btn.key ? '0 0 10px var(--primary-glow)' : 'none'
            }}
          >
            {btn.label}
            <span style={{ marginLeft: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '1px 6px', fontSize: '0.72rem' }}>
              {btn.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filter controls */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="ค้นหาชื่อพนักงาน..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="select-input" value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
          <option value="">ทุกตำแหน่ง</option>
          {positions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select className="select-input" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
          <option value="">ทุกสถานที่</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select className="select-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ minWidth: '160px' }}>
          <option value="id">เรียงตามลำดับ</option>
          <option value="absent">ขาดงานมากสุด</option>
          <option value="late">มาสายมากสุด</option>
          <option value="sick">ลาป่วยมากสุด</option>
          <option value="vacation">ลาพักผ่อนมากสุด</option>
          <option value="outOfArea">ออกนอกพื้นที่มากสุด</option>
          <option value="total">รวมวันลามากสุด</option>
        </select>

        {(search || filterPosition || filterLocation || focusFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setFilterPosition(''); setFilterLocation(''); setFocusFilter('all'); setSortBy('id'); }}
            style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--red)',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontSize: '1rem', fontWeight: 600 }}>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</div>
          <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>กรุณาลองเปลี่ยนตัวกรองใหม่</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {filtered.map(emp => (
            <IndividualReportCard
              key={emp.id}
              employee={emp}
              onClick={setSelectedEmployee}
            />
          ))}
        </div>
      )}

      {/* Detail sidebar panel */}
      {selectedEmployee && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 499 }}
            onClick={() => setSelectedEmployee(null)}
          />
          <DetailPanel
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
          />
        </>
      )}
    </div>
  );
};

export default IndividualReportView;
