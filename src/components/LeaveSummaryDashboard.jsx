import React, { useState, useMemo } from 'react';

const FISCAL_MONTHS = [
  { key: 'october', label: 'ต.ค.', fullLabel: 'ตุลาคม' },
  { key: 'november', label: 'พ.ย.', fullLabel: 'พฤศจิกายน' },
  { key: 'december', label: 'ธ.ค.', fullLabel: 'ธันวาคม' },
  { key: 'january', label: 'ม.ค.', fullLabel: 'มกราคม' },
  { key: 'february', label: 'ก.พ.', fullLabel: 'กุมภาพันธ์' },
  { key: 'march', label: 'มี.ค.', fullLabel: 'มีนาคม' },
  { key: 'april', label: 'เม.ย.', fullLabel: 'เมษายน' },
  { key: 'may', label: 'พ.ค.', fullLabel: 'พฤษภาคม' },
  { key: 'june', label: 'มิ.ย.', fullLabel: 'มิถุนายน' },
  { key: 'july', label: 'ก.ค.', fullLabel: 'กรกฎาคม' },
  { key: 'august', label: 'ส.ค.', fullLabel: 'สิงหาคม' },
  { key: 'september', label: 'ก.ย.', fullLabel: 'กันยายน' }
];

const LEAVE_TYPES = [
  { key: 'absent', label: 'ขาดงาน', unit: 'วัน', color: 'var(--red)', icon: '🚨', desc: 'ขาดราชการ / ไม่มาปฏิบัติงาน' },
  { key: 'sick', label: 'ลาป่วย', unit: 'วัน', color: 'var(--cyan)', icon: '🤒', desc: 'ลาป่วยตามใบรับรองแพทย์/ไม่มีใบ' },
  { key: 'late', label: 'มาสาย', unit: 'ครั้ง', color: 'var(--yellow)', icon: '⏰', desc: 'ลงเวลาสายกว่ากำหนด' },
  { key: 'vacation', label: 'ลาพักผ่อน', unit: 'วัน', color: 'var(--primary)', icon: '🌴', desc: 'ลาพักผ่อนประจำปีคงเหลือ' },
  { key: 'outOfArea', label: 'ออกนอกสถานที่', unit: 'ครั้ง', color: 'var(--green)', icon: '🚗', desc: 'ขออนุญาตออกนอกสถานที่ปฏิบัติงาน' },
  { key: 'work', label: 'ไปราชการ', unit: 'วัน', color: 'var(--secondary)', icon: '💼', desc: 'ปฏิบัติราชการ / ปฏิบัติงานนอกสำนักงาน' }
];

const getLeaveValue = (leavesObj, type) => {
  if (!leavesObj) return 0;
  switch (type) {
    case 'absent':
      return leavesObj.absent || 0;
    case 'sick':
      return leavesObj.sick?.days || 0;
    case 'late':
      return leavesObj.late?.count || 0;
    case 'vacation':
      return leavesObj.vacation?.days || 0;
    case 'outOfArea':
      return leavesObj.outOfArea?.count || 0;
    case 'work':
      return leavesObj.work?.days || 0;
    default:
      return 0;
  }
};

export default function LeaveSummaryDashboard({
  employeesData,
  selectedYear,
  onYearChange,
  positionsList,
  locationsList
}) {
  const [selectedLeaveType, setSelectedLeaveType] = useState('sick');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);
  
  // Table search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // 1. Calculate overall sums for KPI cards
  const kpiStats = useMemo(() => {
    const stats = {
      absent: 0,
      sick: 0,
      late: 0,
      vacation: 0,
      outOfArea: 0,
      work: 0
    };

    employeesData.forEach(emp => {
      FISCAL_MONTHS.forEach(m => {
        const leavesObj = emp.leaves[m.key];
        if (leavesObj) {
          stats.absent += leavesObj.absent || 0;
          stats.sick += leavesObj.sick?.days || 0;
          stats.late += leavesObj.late?.count || 0;
          stats.vacation += leavesObj.vacation?.days || 0;
          stats.outOfArea += leavesObj.outOfArea?.count || 0;
          stats.work += leavesObj.work?.days || 0;
        }
      });
    });

    // Round values
    Object.keys(stats).forEach(k => {
      stats[k] = parseFloat(stats[k].toFixed(1));
    });

    return stats;
  }, [employeesData]);

  // 2. Calculate monthly trends for the selected leave type
  const monthlyTrendData = useMemo(() => {
    return FISCAL_MONTHS.map(m => {
      let total = 0;
      employeesData.forEach(emp => {
        total += getLeaveValue(emp.leaves[m.key], selectedLeaveType);
      });
      return {
        monthKey: m.key,
        label: m.label,
        fullLabel: m.fullLabel,
        value: parseFloat(total.toFixed(1))
      };
    });
  }, [employeesData, selectedLeaveType]);

  const maxMonthlyValue = useMemo(() => {
    const max = Math.max(...monthlyTrendData.map(d => d.value), 0);
    return max === 0 ? 10 : max * 1.15; // padding top
  }, [monthlyTrendData]);

  // 3. Get top 3 employees for the hovered month or last month with values
  const activeHoverIndex = hoveredMonthIndex !== null ? hoveredMonthIndex : 0;
  const activeHoverMonth = monthlyTrendData[activeHoverIndex];

  const topEmployeesForHoveredMonth = useMemo(() => {
    if (!activeHoverMonth) return [];
    return employeesData
      .map(emp => {
        const val = getLeaveValue(emp.leaves[activeHoverMonth.monthKey], selectedLeaveType);
        return {
          name: emp.name,
          position: emp.position,
          location: emp.location,
          value: val
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [employeesData, activeHoverMonth, selectedLeaveType]);

  // 4. Filtered employee table
  const filteredEmployees = useMemo(() => {
    return employeesData.filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPos = selectedPosition ? emp.position === selectedPosition : true;
      const matchLoc = selectedLocation ? emp.location === selectedLocation : true;
      return matchSearch && matchPos && matchLoc;
    });
  }, [employeesData, searchQuery, selectedPosition, selectedLocation]);

  // Calculate totals per month for the summary row at the bottom of the table
  const tableSummaryRow = useMemo(() => {
    const monthlySums = {};
    let grandTotal = 0;
    
    FISCAL_MONTHS.forEach(m => {
      let sum = 0;
      filteredEmployees.forEach(emp => {
        sum += getLeaveValue(emp.leaves[m.key], selectedLeaveType);
      });
      monthlySums[m.key] = parseFloat(sum.toFixed(1));
      grandTotal += sum;
    });

    return {
      monthlySums,
      grandTotal: parseFloat(grandTotal.toFixed(1))
    };
  }, [filteredEmployees, selectedLeaveType]);

  // CSV Export handler
  const handleExportCSV = () => {
    const activeTypeObj = LEAVE_TYPES.find(t => t.key === selectedLeaveType);
    const header = [
      'ลำดับ', 'ชื่อ - สกุล', 'ตำแหน่ง', 'สถานที่ปฏิบัติราชการ',
      ...FISCAL_MONTHS.map(m => m.fullLabel),
      `รวม${activeTypeObj.label}(${activeTypeObj.unit})`
    ].join(',');

    const rows = filteredEmployees.map((emp, index) => {
      const monthlyValues = FISCAL_MONTHS.map(m => {
        const val = getLeaveValue(emp.leaves[m.key], selectedLeaveType);
        return val === 0 ? '0' : val.toString();
      });
      const totalVal = FISCAL_MONTHS.reduce((sum, m) => sum + getLeaveValue(emp.leaves[m.key], selectedLeaveType), 0);
      
      return [
        index + 1,
        `"${emp.name}"`,
        `"${emp.position}"`,
        `"${emp.location}"`,
        ...monthlyValues,
        totalVal.toFixed(1)
      ].join(',');
    });

    const csvContent = "\uFEFF" + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `summary_${selectedLeaveType}_FY${selectedYear}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPosition('');
    setSelectedLocation('');
  };

  const activeTypeObj = LEAVE_TYPES.find(t => t.key === selectedLeaveType);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ---------------------------------------------------- Year and Overview Title */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 แดชบอร์ดสรุปรายงานสถิติการปฏิบัติงานและการลา
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            รวบรวมและวิเคราะห์ข้อมูล ขาด ลา มาสาย ขอออกนอกสถานที่ ไปราชการ รายเดือนตามปีงบประมาณ
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label htmlFor="fy-selector" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>ปีงบประมาณ:</label>
          <select
            id="fy-selector"
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            style={{
              padding: '8px 16px',
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="2568">ปีงบประมาณ 2568</option>
            <option value="2569">ปีงบประมาณ 2569</option>
            <option value="2570">ปีงบประมาณ 2570</option>
          </select>
        </div>
      </div>

      {/* ---------------------------------------------------- KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {LEAVE_TYPES.map(type => {
          const isActive = selectedLeaveType === type.key;
          const totalVal = kpiStats[type.key];
          return (
            <div
              key={type.key}
              onClick={() => setSelectedLeaveType(type.key)}
              style={{
                background: isActive ? `rgba(${isActive ? '159, 122, 234, 0.08' : '255,255,255,0.02'})` : 'var(--bg-card)',
                border: `1.5px solid ${isActive ? type.color : 'var(--border-color)'}`,
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isActive ? `0 0 16px ${type.color}22` : 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                if (!isActive) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (!isActive) e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              {/* Backglow for active state */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '90px',
                  height: '90px',
                  background: type.color,
                  opacity: 0.1,
                  filter: 'blur(30px)',
                  borderRadius: '50%'
                }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{type.icon}</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: type.color,
                  background: `${type.color}15`,
                  padding: '2px 8px',
                  borderRadius: '20px'
                }}>
                  {type.unit}
                </span>
              </div>

              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {type.label}
              </div>

              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: isActive ? type.color : 'var(--text-main)', marginTop: '4px' }}>
                {totalVal}
              </div>

              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {type.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------- Charts and Insights Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'stretch' }} className="responsive-chart-row">
        {/* Trend Chart (SVG) */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>
              📈 แนวโน้ม{activeTypeObj.label} รายเดือน ปีงบประมาณ {selectedYear}
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '8px' }}>
              คลิกที่แท่งเพื่อเจาะลึก
            </span>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '180px', marginTop: '10px' }}>
            <svg viewBox="0 0 720 180" width="100%" height="100%" style={{ overflow: 'visible' }}>
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                const y = 20 + (1 - r) * 120;
                const valueLabel = (maxMonthlyValue * r).toFixed(0);
                return (
                  <g key={i}>
                    <line x1="40" y1={y} x2="700" y2={y} stroke="var(--border-color)" strokeWidth="0.8" strokeDasharray="4 4" />
                    <text x="32" y={y + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{valueLabel}</text>
                  </g>
                );
              })}

              {/* Bars rendering */}
              {monthlyTrendData.map((d, index) => {
                const barWidth = 28;
                const xSpacing = 660 / 12;
                const x = 50 + index * xSpacing + (xSpacing - barWidth) / 2;
                const barHeight = (d.value / maxMonthlyValue) * 120;
                const y = 140 - barHeight;
                const isHovered = index === hoveredMonthIndex;

                return (
                  <g
                    key={index}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredMonthIndex(index)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                  >
                    {/* Shadow/Glow bar behind */}
                    {isHovered && (
                      <rect
                        x={x - 2}
                        y={y - 2}
                        width={barWidth + 4}
                        height={barHeight + 4}
                        rx="4"
                        fill={activeTypeObj.color}
                        opacity="0.15"
                      />
                    )}

                    {/* Main Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)} // ensure at least a thin line for 0
                      rx="4"
                      fill={isHovered ? 'white' : activeTypeObj.color}
                      opacity={d.value === 0 ? 0.25 : 0.85}
                      style={{ transition: 'all 0.2s ease' }}
                    />

                    {/* Value text above bar */}
                    {d.value > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        fill={isHovered ? 'white' : 'var(--text-main)'}
                        fontSize="9"
                        fontWeight={isHovered ? 700 : 500}
                        textAnchor="middle"
                      >
                        {d.value}
                      </text>
                    )}

                    {/* Month Label */}
                    <text
                      x={x + barWidth / 2}
                      y="158"
                      fill={isHovered ? 'white' : 'var(--text-muted)'}
                      fontSize="9.5"
                      fontWeight={isHovered ? 700 : 500}
                      textAnchor="middle"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
              
              {/* Bottom axis line */}
              <line x1="40" y1="140" x2="700" y2="140" stroke="var(--border-color)" strokeWidth="1.2" />
            </svg>
          </div>
        </div>

        {/* Dynamic Month Insights card */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '1.2rem' }}>🔍</span>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>เจาะลึกรายเดือน</h3>
            </div>
            
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ข้อมูลประจำเดือน</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: activeTypeObj.color, marginTop: '2px' }}>
                {activeHoverMonth?.fullLabel}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>{activeHoverMonth?.value}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeTypeObj.unit}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>
                ยอดลารวมสูงสุด 3 อันดับแรก
              </div>
              {topEmployeesForHoveredMonth.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  ไม่มีข้อมูลการ{activeTypeObj.label}ในเดือนนี้
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topEmployeesForHoveredMonth.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{item.position}</div>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: activeTypeObj.color }}>
                        {item.value} {activeTypeObj.unit}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '16px', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            * เลือกประเภทการลาด้านบน และเลื่อนเมาส์ผ่านกราฟเพื่อดูรายละเอียดผู้ลาสูงสุดรายเดือน
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- Detailed Employee Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Table Header controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              📋 รายละเอียดสถิติ{activeTypeObj.label}รายบุคคล ({activeTypeObj.unit})
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              สรุปตารางสถิติตลอดทั้งปี แยกย่อยตามรายเดือนเพื่อเปรียบเทียบผลรายปี
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleExportCSV}
              className="glow-button"
              style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--green)', boxShadow: 'none' }}
            >
              📥 ส่งออกรายงาน CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: '12px' }}>
          {/* Search Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ค้นหาชื่อ</label>
            <input
              type="text"
              placeholder="🔍 พิมพ์ค้นหา..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Position Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ตำแหน่ง</label>
            <select
              value={selectedPosition}
              onChange={e => setSelectedPosition(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">ทั้งหมด</option>
              {positionsList.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Location Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ฝ่าย</label>
            <select
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">ทั้งหมด</option>
              {locationsList.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleClearFilters}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            >
              🧹 ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ width: '100%', overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1.5px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, width: '60px' }}>ลำดับ</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>ชื่อ - สกุล</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>ตำแหน่ง</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>ฝ่าย</th>
                {FISCAL_MONTHS.map(m => (
                  <th key={m.key} style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'center', width: '50px' }}>
                    {m.label}
                  </th>
                ))}
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center', width: '70px', color: activeTypeObj.color, background: 'rgba(255,255,255,0.01)' }}>
                  รวม
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5 + FISCAL_MONTHS.length} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    ❌ ไม่พบรายชื่อพนักงานตรงตามตัวกรอง
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => {
                  let totalVal = 0;
                  const rowValues = FISCAL_MONTHS.map(m => {
                    const v = getLeaveValue(emp.leaves[m.key], selectedLeaveType);
                    totalVal += v;
                    return v;
                  });

                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: index % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent',
                        transition: 'var(--transition-smooth)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = index % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>{index + 1}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{emp.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{emp.position}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{emp.location}</td>
                      
                      {rowValues.map((v, idx) => (
                        <td key={idx} style={{ padding: '12px 8px', textAlign: 'center', fontWeight: v > 0 ? 700 : 400, color: v > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                          {v > 0 ? v : '-'}
                        </td>
                      ))}

                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: totalVal > 0 ? activeTypeObj.color : 'var(--text-muted)', background: 'rgba(255,255,255,0.01)' }}>
                        {totalVal > 0 ? parseFloat(totalVal.toFixed(1)) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Bottom Summary Row */}
              {filteredEmployees.length > 0 && (
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderTop: '2px solid var(--border-color)', fontWeight: 800 }}>
                  <td colSpan="4" style={{ padding: '16px', textAlign: 'right', color: 'var(--text-main)' }}>
                    รวมทั้งหมด
                  </td>
                  {FISCAL_MONTHS.map(m => {
                    const monthSum = tableSummaryRow.monthlySums[m.key];
                    return (
                      <td key={m.key} style={{ padding: '16px 8px', textAlign: 'center', color: monthSum > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {monthSum > 0 ? monthSum : '-'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '16px', textAlign: 'center', color: activeTypeObj.color, background: 'rgba(255,255,255,0.02)', fontSize: '0.9rem' }}>
                    {tableSummaryRow.grandTotal > 0 ? tableSummaryRow.grandTotal : '-'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
