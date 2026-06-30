import React, { useState, useEffect } from 'react';

const EmployeeModal = ({ employee, onClose, onUpdateEmployee, activeMonth, activeMonthLabel }) => {
  const [isEditing, setIsEditing] = useState(false);

  // Sync form state if the employee changes
  const [formData, setFormData] = useState({
    name: employee.name,
    position: employee.position,
    location: employee.location,
    sickCount: employee.leaves.sick.count,
    sickDays: employee.leaves.sick.days,
    vacationCount: employee.leaves.vacation.count,
    vacationDays: employee.leaves.vacation.days,
    vacationRemaining: employee.leaves.vacation.remaining,
    personalCount: employee.leaves.personal.count,
    personalDays: employee.leaves.personal.days,
    absent: employee.leaves.absent,
    lateCount: employee.leaves.late.count,
    lateDays: employee.leaves.late.days,
    maternityCount: employee.leaves.maternity.count,
    maternityDays: employee.leaves.maternity.days,
    wifeAssistCount: employee.leaves.wifeAssist.count,
    wifeAssistDays: employee.leaves.wifeAssist.days,
    ordinationCount: employee.leaves.ordination.count,
    ordinationDays: employee.leaves.ordination.days,
    militaryCount: employee.leaves.military.count,
    militaryDays: employee.leaves.military.days,
    studyCount: employee.leaves.study.count,
    studyDays: employee.leaves.study.days,
    workCount: employee.leaves.work.count,
    workDays: employee.leaves.work.days,
    followCount: employee.leaves.follow.count,
    followDays: employee.leaves.follow.days,
    rehabCount: employee.leaves.rehab.count,
    rehabDays: employee.leaves.rehab.days,
    outOfAreaCount: employee.leaves.outOfArea.count,
    outOfAreaHours: employee.leaves.outOfArea.hours,
    outOfAreaDays: employee.leaves.outOfArea.days,
  });

  // Re-sync form data if employee or month shifts
  useEffect(() => {
    setFormData({
      name: employee.name,
      position: employee.position,
      location: employee.location,
      sickCount: employee.leaves.sick.count,
      sickDays: employee.leaves.sick.days,
      vacationCount: employee.leaves.vacation.count,
      vacationDays: employee.leaves.vacation.days,
      vacationRemaining: employee.leaves.vacation.remaining,
      personalCount: employee.leaves.personal.count,
      personalDays: employee.leaves.personal.days,
      absent: employee.leaves.absent,
      lateCount: employee.leaves.late.count,
      lateDays: employee.leaves.late.days,
      maternityCount: employee.leaves.maternity.count,
      maternityDays: employee.leaves.maternity.days,
      wifeAssistCount: employee.leaves.wifeAssist.count,
      wifeAssistDays: employee.leaves.wifeAssist.days,
      ordinationCount: employee.leaves.ordination.count,
      ordinationDays: employee.leaves.ordination.days,
      militaryCount: employee.leaves.military.count,
      militaryDays: employee.leaves.military.days,
      studyCount: employee.leaves.study.count,
      studyDays: employee.leaves.study.days,
      workCount: employee.leaves.work.count,
      workDays: employee.leaves.work.days,
      followCount: employee.leaves.follow.count,
      followDays: employee.leaves.follow.days,
      rehabCount: employee.leaves.rehab.count,
      rehabDays: employee.leaves.rehab.days,
      outOfAreaCount: employee.leaves.outOfArea.count,
      outOfAreaHours: employee.leaves.outOfArea.hours,
      outOfAreaDays: employee.leaves.outOfArea.days,
    });
    setIsEditing(false);
  }, [employee, activeMonth]);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-update total leaves days if major fields are edited
      if (
        field === 'sickDays' || 
        field === 'vacationDays' || 
        field === 'personalDays' || 
        field === 'maternityDays' ||
        field === 'wifeAssistDays' ||
        field === 'ordinationDays' ||
        field === 'militaryDays' ||
        field === 'studyDays' ||
        field === 'workDays' ||
        field === 'followDays' ||
        field === 'rehabDays'
      ) {
        const sumDays = 
          (parseFloat(updated.sickDays) || 0) + 
          (parseFloat(updated.vacationDays) || 0) + 
          (parseFloat(updated.personalDays) || 0) +
          (parseFloat(updated.maternityDays) || 0) +
          (parseFloat(updated.wifeAssistDays) || 0) +
          (parseFloat(updated.ordinationDays) || 0) +
          (parseFloat(updated.militaryDays) || 0) +
          (parseFloat(updated.studyDays) || 0) +
          (parseFloat(updated.workDays) || 0) +
          (parseFloat(updated.followDays) || 0) +
          (parseFloat(updated.rehabDays) || 0);
          
        updated.totalDays = parseFloat(sumDays.toFixed(1));
      }

      // Auto-update total count if count fields are edited
      if (
        field === 'sickCount' ||
        field === 'vacationCount' ||
        field === 'personalCount' ||
        field === 'maternityCount' ||
        field === 'wifeAssistCount' ||
        field === 'ordinationCount' ||
        field === 'militaryCount' ||
        field === 'studyCount' ||
        field === 'workCount' ||
        field === 'followCount' ||
        field === 'rehabCount'
      ) {
        const sumCount = 
          (parseFloat(updated.sickCount) || 0) +
          (parseFloat(updated.vacationCount) || 0) +
          (parseFloat(updated.personalCount) || 0) +
          (parseFloat(updated.maternityCount) || 0) +
          (parseFloat(updated.wifeAssistCount) || 0) +
          (parseFloat(updated.ordinationCount) || 0) +
          (parseFloat(updated.militaryCount) || 0) +
          (parseFloat(updated.studyCount) || 0) +
          (parseFloat(updated.workCount) || 0) +
          (parseFloat(updated.followCount) || 0) +
          (parseFloat(updated.rehabCount) || 0);

        updated.totalCount = parseFloat(sumCount.toFixed(0));
      }

      // Auto-calculate remaining vacation if vacation days is edited
      if (field === 'vacationDays') {
        const remaining = 30 - (parseFloat(value) || 0);
        updated.vacationRemaining = parseFloat(remaining.toFixed(1));
      }

      return updated;
    });
  };

  const handleSave = (e) => {
    e.preventDefault();

    const updatedEmployee = {
      ...employee,
      name: formData.name.trim(),
      position: formData.position.trim(),
      location: formData.location.trim(),
      leaves: {
        sick: { 
          count: parseFloat(formData.sickCount) || 0, 
          days: parseFloat(formData.sickDays) || 0 
        },
        vacation: { 
          count: parseFloat(formData.vacationCount) || 0, 
          days: parseFloat(formData.vacationDays) || 0, 
          remaining: parseFloat(formData.vacationRemaining) || 0 
        },
        personal: { 
          count: parseFloat(formData.personalCount) || 0, 
          days: parseFloat(formData.personalDays) || 0 
        },
        absent: parseFloat(formData.absent) || 0,
        maternity: { 
          count: parseFloat(formData.maternityCount) || 0, 
          days: parseFloat(formData.maternityDays) || 0 
        },
        wifeAssist: { 
          count: parseFloat(formData.wifeAssistCount) || 0, 
          days: parseFloat(formData.wifeAssistDays) || 0 
        },
        ordination: { 
          count: parseFloat(formData.ordinationCount) || 0, 
          days: parseFloat(formData.ordinationDays) || 0 
        },
        military: { 
          count: parseFloat(formData.militaryCount) || 0, 
          days: parseFloat(formData.militaryDays) || 0 
        },
        study: { 
          count: parseFloat(formData.studyCount) || 0, 
          days: parseFloat(formData.studyDays) || 0 
        },
        work: { 
          count: parseFloat(formData.workCount) || 0, 
          days: parseFloat(formData.workDays) || 0 
        },
        follow: { 
          count: parseFloat(formData.followCount) || 0, 
          days: parseFloat(formData.followDays) || 0 
        },
        rehab: { 
          count: parseFloat(formData.rehabCount) || 0, 
          days: parseFloat(formData.rehabDays) || 0 
        },
        total: { 
          count: formData.totalCount !== undefined ? formData.totalCount : employee.leaves.total.count, 
          days: formData.totalDays !== undefined ? formData.totalDays : employee.leaves.total.days 
        },
        late: { 
          count: parseFloat(formData.lateCount) || 0, 
          days: parseFloat(formData.lateDays) || 0 
        },
        outOfArea: { 
          count: parseFloat(formData.outOfAreaCount) || 0, 
          hours: parseFloat(formData.outOfAreaHours) || 0, 
          days: parseFloat(formData.outOfAreaDays) || 0 
        }
      }
    };

    onUpdateEmployee(updatedEmployee);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: employee.name,
      position: employee.position,
      location: employee.location,
      sickCount: employee.leaves.sick.count,
      sickDays: employee.leaves.sick.days,
      vacationCount: employee.leaves.vacation.count,
      vacationDays: employee.leaves.vacation.days,
      vacationRemaining: employee.leaves.vacation.remaining,
      personalCount: employee.leaves.personal.count,
      personalDays: employee.leaves.personal.days,
      absent: employee.leaves.absent,
      lateCount: employee.leaves.late.count,
      lateDays: employee.leaves.late.days,
      maternityCount: employee.leaves.maternity.count,
      maternityDays: employee.leaves.maternity.days,
      wifeAssistCount: employee.leaves.wifeAssist.count,
      wifeAssistDays: employee.leaves.wifeAssist.days,
      ordinationCount: employee.leaves.ordination.count,
      ordinationDays: employee.leaves.ordination.days,
      militaryCount: employee.leaves.military.count,
      militaryDays: employee.leaves.military.days,
      studyCount: employee.leaves.study.count,
      studyDays: employee.leaves.study.days,
      workCount: employee.leaves.work.count,
      workDays: employee.leaves.work.days,
      followCount: employee.leaves.follow.count,
      followDays: employee.leaves.follow.days,
      rehabCount: employee.leaves.rehab.count,
      rehabDays: employee.leaves.rehab.days,
      outOfAreaCount: employee.leaves.outOfArea.count,
      outOfAreaHours: employee.leaves.outOfArea.hours,
      outOfAreaDays: employee.leaves.outOfArea.days,
    });
    setIsEditing(false);
  };

  const isAllYearMode = activeMonth === 'all';

  // Group leave categories for layout
  const leaveGroups = [
    {
      title: 'การลาหลัก',
      items: [
        { label: '🤒 ลาป่วย', daysKey: 'sickDays', countKey: 'sickCount', color: 'var(--cyan)' },
        { label: '🏖️ ลาพักผ่อน', daysKey: 'vacationDays', countKey: 'vacationCount', color: 'var(--primary)' },
        { label: '💼 ลากิจ', daysKey: 'personalDays', countKey: 'personalCount', color: 'var(--yellow)' },
      ]
    },
    {
      title: 'การมาสายและการขาดงาน',
      items: [
        { label: '⏰ มาสาย', daysKey: 'lateDays', countKey: 'lateCount', color: 'var(--yellow)' },
        { label: '⚠️ ขาดราชการ', daysKey: 'absent', countKey: null, color: 'var(--red)' },
      ]
    },
    {
      title: 'การลาพิเศษอื่นๆ',
      items: [
        { label: '👶 ลาคลอด', daysKey: 'maternityDays', countKey: 'maternityCount' },
        { label: '🤝 ช่วยภริยาคลอด', daysKey: 'wifeAssistDays', countKey: 'wifeAssistCount' },
        { label: '☸️ อุปสมบท / ฮัจย์', daysKey: 'ordinationDays', countKey: 'ordinationCount' },
        { label: '🎖️ ตรวจเลือกทหาร', daysKey: 'militaryDays', countKey: 'militaryCount' },
        { label: '📚 ลาศึกษาต่อ', daysKey: 'studyDays', countKey: 'studyCount' },
        { label: '🔧 ปฏิบัติงานฟื้นฟู', daysKey: 'rehabDays', countKey: 'rehabCount' },
      ]
    },
    {
      title: 'การปฏิบัติงานภายนอก',
      items: [
        { label: '🚗 ออกนอกพื้นที่ (วัน)', daysKey: 'outOfAreaDays', countKey: null },
        { label: '🕒 ออกนอกพื้นที่ (ช.ม.)', daysKey: 'outOfAreaHours', countKey: null },
        { label: '📈 รวมการลาทั้งหมด (คำนวณอัตโนมัติ)', daysKey: 'totalDays', countKey: 'totalCount', readOnly: true, color: 'var(--primary)' },
      ]
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ padding: '32px' }}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '20px',
          marginBottom: '20px'
        }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '80%' }}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  outline: 'none',
                  width: '100%'
                }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="ตำแหน่ง"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  style={{
                    fontSize: '0.85rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: 'var(--text-main)',
                    width: '48%'
                  }}
                />
                <input
                  type="text"
                  placeholder="สถานที่ปฏิบัติราชการ"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  style={{
                    fontSize: '0.85rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    color: 'var(--text-main)',
                    width: '48%'
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '6px' }}>{employee.name}</h2>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-primary">{employee.position}</span>
                <span className="badge badge-cyan">📍 {employee.location}</span>
                <span className="badge badge-green">🗓️ ดูสถิติ: {activeMonthLabel}</span>
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isEditing && !isAllYearMode && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: 'rgba(159, 122, 234, 0.1)',
                  border: '1px solid rgba(159, 122, 234, 0.25)',
                  color: 'var(--primary)',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  transition: 'var(--transition-smooth)'
                }}
              >
                ✏️ แก้ไขข้อมูลเดือนนี้
              </button>
            )}
            
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => { e.target.style.background = 'var(--red)'; e.target.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 255, 255, 0.05)'; e.target.style.color = 'var(--text-main)'; }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Warning info message for whole year overview editing block */}
        {isAllYearMode && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: 'var(--yellow)',
            borderRadius: '12px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            lineHeight: 1.5,
            fontWeight: 500
          }}>
            ⚠️ <strong>หมายเหตุ:</strong> คุณกำลังเปิดดูข้อมูล <strong>"ภาพรวมสะสมทั้งปี"</strong> ซึ่งเป็นรายงานอ่านอย่างเดียว (Read-only) หากคุณต้องการบันทึก/แก้ไขสถิติวันลาของพนักงานรายนี้ โปรดปิดหน้าต่างนี้แล้วคลิกเลือกเดือนที่ต้องการบันทึก (เช่น ตุลาคม, พฤศจิกายน) ที่แถบเมนูด้านบนก่อนแก้ไขข้อมูล ระบบจะรวมสถิติรายเดือนทั้งหมดเป็นยอดรวมสะสมทั้งปีให้โดยอัตโนมัติ
          </div>
        )}

        {/* Editing month title notice */}
        {isEditing && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(159, 122, 234, 0.08)',
            border: '1px solid rgba(159, 122, 234, 0.2)',
            color: 'var(--primary)',
            borderRadius: '12px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            fontWeight: 600
          }}>
            ✍️ กำลังทำการแก้ไขข้อมูลและสถิติวันลาประจำเดือน: <span style={{ textDecoration: 'underline' }}>{activeMonthLabel}</span>
          </div>
        )}

        {/* Vacation days box */}
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(159, 122, 234, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
          border: '1px solid rgba(159, 122, 234, 0.2)'
        }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
              โควตาวันลาพักผ่อนคงเหลือ {isAllYearMode ? 'สะสม' : 'ของเดือนนี้'}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isAllYearMode ? 'คำนวณจากโควตา 30 วัน ลบวันลาพักผ่อนสะสมปีนี้' : `วันลาพักผ่อนคงเหลือจากการหักลบของเดือน ${activeMonthLabel}`}
            </p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? (
              <>
                <input
                  type="number"
                  step="0.5"
                  value={formData.vacationRemaining}
                  onChange={(e) => handleInputChange('vacationRemaining', e.target.value)}
                  style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: 'var(--green)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    width: '90px',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>วัน</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--green)' }}>{employee.leaves.vacation.remaining}</span>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>วัน</span>
              </>
            )}
          </div>
        </div>

        {/* Leave categories grid */}
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {leaveGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="glass-panel" style={{ padding: '18px' }}>
                <h4 style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '8px',
                  marginBottom: '12px'
                }}>
                  {group.title}
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.items.map((item, itemIdx) => {
                    const hasCount = item.countKey !== null;
                    const isRedAlert = item.label.includes('ขาดราชการ') && (parseFloat(formData.absent) || 0) > 0;
                    
                    if (isEditing) {
                      return (
                        <div key={itemIdx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 12px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px'
                        }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)' }}>
                            {item.label}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {/* Times/Count Field */}
                            {hasCount && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <input
                                  type="number"
                                  disabled={item.readOnly}
                                  value={formData[item.countKey] !== undefined ? formData[item.countKey] : 0}
                                  onChange={(e) => handleInputChange(item.countKey, e.target.value)}
                                  style={{
                                    width: '44px',
                                    padding: '4px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    color: 'var(--text-main)',
                                    textAlign: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 600
                                  }}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '6px' }}>ค.</span>
                              </div>
                            )}

                            {/* Days/Hours Field */}
                            <input
                              type="number"
                              step="0.1"
                              disabled={item.readOnly}
                              value={formData[item.daysKey] !== undefined ? formData[item.daysKey] : 0}
                              onChange={(e) => handleInputChange(item.daysKey, e.target.value)}
                              style={{
                                width: '54px',
                                padding: '4px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: item.color || 'var(--text-main)',
                                textAlign: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 600
                              }}
                            />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {item.label.includes('(ช.ม.)') ? 'ช.ม.' : 'ว.'}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // View Mode calculations
                    const daysVal = employee.leaves[item.daysKey === 'absent' ? 'absent' : item.daysKey === 'totalDays' ? 'total' : item.daysKey === 'sickDays' ? 'sick' : item.daysKey === 'vacationDays' ? 'vacation' : item.daysKey === 'personalDays' ? 'personal' : item.daysKey === 'lateDays' ? 'late' : item.daysKey === 'maternityDays' ? 'maternity' : item.daysKey === 'wifeAssistDays' ? 'wifeAssist' : item.daysKey === 'ordinationDays' ? 'ordination' : item.daysKey === 'militaryDays' ? 'military' : item.daysKey === 'studyDays' ? 'study' : item.daysKey === 'rehabDays' ? 'rehab' : item.daysKey === 'outOfAreaDays' ? 'outOfArea' : item.daysKey === 'outOfAreaHours' ? 'outOfArea' : 'total'];
                    
                    let displayDays = 0;
                    let displayCount = 0;

                    if (item.daysKey === 'absent') {
                      displayDays = employee.leaves.absent;
                    } else if (item.daysKey === 'outOfAreaHours') {
                      displayDays = employee.leaves.outOfArea.hours;
                    } else if (item.daysKey === 'outOfAreaDays') {
                      displayDays = employee.leaves.outOfArea.days;
                    } else if (daysVal) {
                      displayDays = daysVal.days || 0;
                      displayCount = daysVal.count || 0;
                    }

                    return (
                      <div key={itemIdx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: isRedAlert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                        border: isRedAlert ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                        borderRadius: '8px'
                      }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: isRedAlert ? 'var(--red)' : 'var(--text-main)' }}>
                          {item.label.replace(' (คำนวณอัตโนมัติ)', '')}
                        </span>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {hasCount && (
                            <span style={{ color: 'var(--text-muted)', marginRight: '8px', fontSize: '0.8rem' }}>
                              {displayCount} ครั้ง /
                            </span>
                          )}
                          <span style={{ 
                            color: item.color || (isRedAlert ? 'var(--red)' : 'var(--text-main)')
                          }}>
                            {displayDays} {item.label.includes('(ช.ม.)') ? 'ช.ม.' : 'วัน'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons in Edit Mode */}
          {isEditing && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '28px',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '20px'
            }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'var(--transition-smooth)'
                }}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="glow-button"
                style={{
                  padding: '10px 24px',
                  fontSize: '0.9rem'
                }}
              >
                💾 บันทึกข้อมูล
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
};

export default EmployeeModal;
