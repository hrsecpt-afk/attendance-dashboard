import React from 'react';

const OverviewCards = ({ data }) => {
  if (!data || data.length === 0) return null;

  const totalEmployees = data.length;
  
  // Total sick leave days / total employees
  const totalSickDays = data.reduce((sum, item) => sum + item.leaves.sick.days, 0);
  const avgSickDays = (totalSickDays / totalEmployees).toFixed(2);
  
  // Total absent days
  const totalAbsentDays = data.reduce((sum, item) => sum + item.leaves.absent, 0);
  
  // Total late count
  const totalLateCount = data.reduce((sum, item) => sum + item.leaves.late.count, 0);

  const cards = [
    {
      label: 'บุคลากรทั้งหมด',
      value: `${totalEmployees} คน`,
      subText: 'ที่ปฏิบัติงานในหน่วยงาน',
      icon: '👥',
      color: 'var(--primary)',
    },
    {
      label: 'วันลาป่วยเฉลี่ย',
      value: `${avgSickDays} วัน/คน`,
      subText: `ลาป่วยทั้งหมด ${totalSickDays.toFixed(1)} วัน`,
      icon: '🤒',
      color: 'var(--cyan)',
    },
    {
      label: 'ขาดราชการรวม',
      value: `${totalAbsentDays} วัน`,
      subText: 'จำนวนวันที่ขาดราชการสะสม',
      icon: '⚠️',
      color: 'var(--red)',
    },
    {
      label: 'การมาสายรวม',
      value: `${totalLateCount} ครั้ง`,
      subText: 'สถิติการแสกนนิ้วสายสะสม',
      icon: '⏰',
      color: 'var(--yellow)',
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, idx) => (
        <div key={idx} className="glass-panel stat-card animate-fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
          <div className="stat-icon" style={{ color: card.color, textShadow: `0 0 10px ${card.color}40` }}>
            {card.icon}
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="stat-label" style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-main)' }}>{card.label}</div>
            <div className="stat-label" style={{ fontSize: '0.75rem', marginTop: '1px' }}>{card.subText}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OverviewCards;
