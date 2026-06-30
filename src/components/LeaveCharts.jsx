import React, { useState } from 'react';

const LeaveCharts = ({ data }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredSlice, setHoveredSlice] = useState(null);

  if (!data || data.length === 0) return null;

  // --- Bar Chart Data Preparation ---
  // Major position groups to show
  const positions = ['ครู', 'ครูผู้ช่วย', 'พนักงานราชการ', 'ครูอัตราจ้าง', 'พี่เลี้ยงเด็กพิการ'];
  
  const barChartData = positions.map(pos => {
    const group = data.filter(item => item.position.includes(pos));
    const count = group.length || 1;
    const sick = group.reduce((sum, item) => sum + item.leaves.sick.days, 0) / count;
    const vacation = group.reduce((sum, item) => sum + item.leaves.vacation.days, 0) / count;
    const personal = group.reduce((sum, item) => sum + item.leaves.personal.days, 0) / count;
    
    return {
      position: pos,
      sick: parseFloat(sick.toFixed(1)),
      vacation: parseFloat(vacation.toFixed(1)),
      personal: parseFloat(personal.toFixed(1)),
      total: parseFloat((sick + vacation + personal).toFixed(1))
    };
  });

  const maxVal = Math.max(...barChartData.map(d => Math.max(d.sick, d.vacation, d.personal, 1)), 10);
  const scaleY = (val) => (val / maxVal) * 120; // Max height in SVG is 120

  // --- Donut Chart Data Preparation ---
  // Leaves by location
  const locationGroups = {};
  data.forEach(item => {
    let loc = item.location;
    if (loc.startsWith('โรงเรียน') || loc.startsWith('รพ.')) {
      loc = 'สถานศึกษาร่วม/รพ.';
    }
    const leaveDays = item.leaves.sick.days + item.leaves.vacation.days + item.leaves.personal.days;
    if (leaveDays > 0) {
      locationGroups[loc] = (locationGroups[loc] || 0) + leaveDays;
    }
  });

  const totalLocationLeave = Object.values(locationGroups).reduce((sum, v) => sum + v, 0);
  
  let donutData = Object.entries(locationGroups)
    .map(([loc, value]) => ({
      name: loc,
      value: parseFloat(value.toFixed(1)),
      percentage: totalLocationLeave > 0 ? parseFloat(((value / totalLocationLeave) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5); // Take top 5, group the rest

  const top5Sum = donutData.reduce((sum, d) => sum + d.value, 0);
  if (totalLocationLeave > top5Sum) {
    donutData.push({
      name: 'อื่นๆ',
      value: parseFloat((totalLocationLeave - top5Sum).toFixed(1)),
      percentage: parseFloat((((totalLocationLeave - top5Sum) / totalLocationLeave) * 100).toFixed(1))
    });
  }

  // Colors for donut chart
  const donutColors = [
    'var(--primary)',
    'var(--cyan)',
    'var(--green)',
    'var(--yellow)',
    'var(--secondary)',
    '#6b7280'
  ];

  // Draw donut path calculation
  let accumulatedAngle = 0;
  const donutArcs = donutData.map((d, idx) => {
    const angle = (d.value / totalLocationLeave) * 360;
    const startAngle = accumulatedAngle;
    const endAngle = startAngle + angle;
    accumulatedAngle = endAngle;

    // Convert polar to cartesian coordinates
    const r = 50; // radius
    const cx = 80;
    const cy = 80;
    
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
    
    return {
      path,
      color: donutColors[idx % donutColors.length],
      ...d
    };
  });

  return (
    <div className="charts-grid">
      {/* Bar Chart Panel */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700 }}>
          วันลาเฉลี่ยแยกตามกลุ่มตำแหน่ง (วัน/คน)
        </h3>
        <div style={{ position: 'relative', width: '100%', height: '220px' }}>
          <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = 150 - ratio * 120;
              const val = (ratio * maxVal).toFixed(0);
              return (
                <g key={i}>
                  <line x1="45" y1={y} x2="480" y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4 4" />
                  <text x="35" y={y + 4} fill="var(--text-muted)" fontSize="8" textAnchor="end">{val}</text>
                </g>
              );
            })}
            
            {/* Bars */}
            {barChartData.map((d, idx) => {
              const xStart = 70 + idx * 85;
              const sickHeight = scaleY(d.sick);
              const vacationHeight = scaleY(d.vacation);
              const personalHeight = scaleY(d.personal);
              
              const totalH = sickHeight + vacationHeight + personalHeight;
              
              return (
                <g key={idx} 
                   onMouseEnter={() => setHoveredBar(idx)} 
                   onMouseLeave={() => setHoveredBar(null)}
                   style={{ cursor: 'pointer' }}>
                  
                  {/* Vacation Bar (Stacked bottom) */}
                  <rect x={xStart} y={150 - vacationHeight} width="24" height={vacationHeight} fill="var(--primary)" opacity="0.8" rx="2" />
                  
                  {/* Sick Bar (Stacked middle) */}
                  <rect x={xStart} y={150 - vacationHeight - sickHeight} width="24" height={sickHeight} fill="var(--cyan)" opacity="0.8" rx="2" />
                  
                  {/* Personal Bar (Stacked top) */}
                  <rect x={xStart} y={150 - totalH} width="24" height={personalHeight} fill="var(--yellow)" opacity="0.8" rx="2" />
                  
                  {/* Active highlight border */}
                  {hoveredBar === idx && (
                    <rect x={xStart - 2} y={150 - totalH - 2} width="28" height={totalH + 4} fill="none" stroke="#fff" strokeWidth="1" rx="4" />
                  )}

                  {/* X Axis Labels */}
                  <text x={xStart + 12} y="168" fill="var(--text-main)" fontSize="7.5" fontWeight="600" textAnchor="middle">
                    {d.position}
                  </text>
                </g>
              );
            })}
            
            {/* Bottom axis line */}
            <line x1="45" y1="150" x2="480" y2="150" stroke="var(--border-color)" strokeWidth="1.5" />
          </svg>
          
          {/* Tooltip */}
          {hoveredBar !== null && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-color)',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              backdropFilter: 'var(--glass-blur)'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                {barChartData[hoveredBar].position}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--cyan)' }}>🤒 ป่วย: {barChartData[hoveredBar].sick} วัน</span>
                <span style={{ color: 'var(--primary)' }}>🏖️ พักผ่อน: {barChartData[hoveredBar].vacation} วัน</span>
                <span style={{ color: 'var(--yellow)' }}>💼 กิจ: {barChartData[hoveredBar].personal} วัน</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '4px', paddingTop: '4px', fontWeight: 600 }}>
                รวมเฉลี่ย: {barChartData[hoveredBar].total} วัน/คน
              </div>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--cyan)', borderRadius: '3px' }}></span> ลาป่วย
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '3px' }}></span> ลาพักผ่อน
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--yellow)', borderRadius: '3px' }}></span> ลากิจ
          </div>
        </div>
      </div>

      {/* Donut Chart Panel */}
      <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700 }}>
          สัดส่วนการลาแยกตามสถานที่ปฏิบัติงาน
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', position: 'relative' }}>
          <svg viewBox="0 0 160 160" style={{ width: '150px', height: '150px' }}>
            {donutArcs.map((arc, idx) => (
              <path
                key={idx}
                d={arc.path}
                fill="none"
                stroke={arc.color}
                strokeWidth={hoveredSlice === idx ? "16" : "12"}
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
                style={{
                  transition: 'stroke-width 0.2s ease',
                  cursor: 'pointer'
                }}
              />
            ))}
            <circle cx="80" cy="80" r="38" fill="var(--bg-dark)" />
            <text x="80" y="78" textAnchor="middle" dominantBaseline="middle" fill="var(--text-muted)" fontSize="8">
              การลาทั้งหมด
            </text>
            <text x="80" y="92" textAnchor="middle" dominantBaseline="middle" fill="var(--text-main)" fontSize="11" fontWeight="700">
              {totalLocationLeave.toFixed(0)} วัน
            </text>
          </svg>
        </div>

        {/* Legend / Details list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px', fontSize: '0.75rem' }}>
          {donutData.map((d, idx) => (
            <div key={idx} 
                 onMouseEnter={() => setHoveredSlice(idx)}
                 onMouseLeave={() => setHoveredSlice(null)}
                 style={{ 
                   display: 'flex', 
                   justifyContent: 'space-between', 
                   alignItems: 'center',
                   padding: '4px 6px',
                   borderRadius: '4px',
                   background: hoveredSlice === idx ? 'rgba(255,255,255,0.03)' : 'transparent',
                   cursor: 'pointer',
                   transition: 'var(--transition-smooth)'
                 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: donutColors[idx % donutColors.length], 
                  borderRadius: '50%' 
                }}></span>
                <span style={{ color: hoveredSlice === idx ? 'var(--primary)' : 'var(--text-main)', fontWeight: hoveredSlice === idx ? 600 : 400 }}>
                  {d.name}
                </span>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                {d.value} วัน ({d.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaveCharts;
