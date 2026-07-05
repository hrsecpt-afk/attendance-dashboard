import React, { useState, useMemo, useEffect } from 'react';

const FISCAL_MONTHS = [
  { key: 'october', label: 'ตุลาคม', BE_offset: -1 },
  { key: 'november', label: 'พฤศจิกายน', BE_offset: -1 },
  { key: 'december', label: 'ธันวาคม', BE_offset: -1 },
  { key: 'january', label: 'มกราคม', BE_offset: 0 },
  { key: 'february', label: 'กุมภาพันธ์', BE_offset: 0 },
  { key: 'march', label: 'มีนาคม', BE_offset: 0 },
  { key: 'april', label: 'เมษายน', BE_offset: 0 },
  { key: 'may', label: 'พฤษภาคม', BE_offset: 0 },
  { key: 'june', label: 'มิถุนายน', BE_offset: 0 },
  { key: 'july', label: 'กรกฎาคม', BE_offset: 0 },
  { key: 'august', label: 'สิงหาคม', BE_offset: 0 },
  { key: 'september', label: 'กันยายน', BE_offset: 0 }
];

const LEAVE_CATEGORIES = [
  { key: 'absent', label: 'ขาดงาน', hasDays: true, hasCount: false },
  { key: 'sick', label: 'ลาป่วย', hasDays: true, hasCount: true },
  { key: 'personal', label: 'ลากิจ', hasDays: true, hasCount: true },
  { key: 'late', label: 'มาสาย', hasDays: false, hasCount: true },
  { key: 'vacation', label: 'ลาพักผ่อน', hasDays: true, hasCount: true },
  { key: 'outOfArea', label: 'ออกนอกสถานที่', hasDays: true, hasCount: true }
];

const getLeaveValueMonthly = (leavesObj, catKey, mode) => {
  if (!leavesObj) return 0;
  if (catKey === 'absent') {
    return mode === 'days' ? (leavesObj.absent || 0) : 0;
  }
  if (catKey === 'sick') {
    return mode === 'days' ? (leavesObj.sick?.days || 0) : (leavesObj.sick?.count || 0);
  }
  if (catKey === 'personal') {
    return mode === 'days' ? (leavesObj.personal?.days || 0) : (leavesObj.personal?.count || 0);
  }
  if (catKey === 'late') {
    return mode === 'count' ? (leavesObj.late?.count || 0) : 0;
  }
  if (catKey === 'vacation') {
    return mode === 'days' ? (leavesObj.vacation?.days || 0) : (leavesObj.vacation?.count || 0);
  }
  if (catKey === 'outOfArea') {
    return mode === 'days' ? (leavesObj.outOfArea?.days || 0) : (leavesObj.outOfArea?.count || 0);
  }
  return 0;
};

// Helper to convert date YYYY-MM-DD into "วันที d เดือน พ.ศ. BE"
const formatDateThaiBE = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const yearBE = year + 543;
  return `${day} ${monthNames[month - 1]} พ.ศ. ${yearBE}`;
};

export default function IndividualLeaveSummaryReport({
  employeesData,
  selectedYear
}) {
  const [reportType, setReportType] = useState('daily'); // 'daily' or 'monthly'
  
  // Daily Date Range states
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    let yyyy = today.getFullYear();
    if (yyyy > 2400) yyyy -= 543;
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    let yyyy = today.getFullYear();
    if (yyyy > 2400) yyyy -= 543;
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Monthly Range states
  const [startMonthIdx, setStartMonthIdx] = useState(6); // Default: April (index 6)
  const [endMonthIdx, setEndMonthIdx] = useState(8);     // Default: June (index 8)
  const [customEndDay, setCustomEndDay] = useState('');

  // Month-range selectors. Keep the end month at or after the start month.
  const handleStartMonthChange = (e) => {
    const v = parseInt(e.target.value, 10);
    setStartMonthIdx(v);
    if (endMonthIdx < v) setEndMonthIdx(v);
  };
  const handleEndMonthChange = (e) => {
    setEndMonthIdx(parseInt(e.target.value, 10));
  };

  // Column checkboxes
  const [checkedCats, setCheckedCats] = useState({
    absent: true,
    sick: true,
    personal: true,
    late: true,
    vacation: false,
    outOfArea: false
  });

  const activeEndMonth = FISCAL_MONTHS[endMonthIdx];
  const calculatedEndYearBE = parseInt(selectedYear, 10) + activeEndMonth.BE_offset;

  const defaultEndDay = useMemo(() => {
    const monthKey = activeEndMonth.key;
    const yearBE = calculatedEndYearBE;
    const daysMap = {
      january: 31,
      february: (yearBE - 543) % 4 === 0 ? 29 : 28,
      march: 31,
      april: 30,
      may: 31,
      june: 30,
      july: 31,
      august: 31,
      september: 30,
      october: 31,
      november: 30,
      december: 31
    };
    return daysMap[monthKey] || 30;
  }, [endMonthIdx, calculatedEndYearBE]);

  // Sync custom end day
  useEffect(() => {
    if (!customEndDay) {
      setCustomEndDay(defaultEndDay.toString());
    }
  }, [defaultEndDay]);

  // Load daily overrides from LocalStorage
  const dailyOverrides = useMemo(() => {
    const saved = localStorage.getItem('attendance_dashboard_daily_overrides');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse daily overrides", e);
      }
    }
    return {};
  }, [employeesData]); // Refresh when employees list or tab changes

  // Generate list of dates in the range (daily mode)
  const datesList = useMemo(() => {
    if (reportType !== 'daily' || !startDate || !endDate) return [];
    const dates = [];
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    
    let current = new Date(sYear, sMonth - 1, sDay);
    const end = new Date(eYear, eMonth - 1, eDay);
    
    let safety = 0;
    while (current <= end && safety < 1000) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
      safety++;
    }
    return dates;
  }, [reportType, startDate, endDate]);

  // Active months for monthly mode
  const activeMonthsKeys = useMemo(() => {
    const keys = [];
    for (let i = startMonthIdx; i <= endMonthIdx; i++) {
      keys.push(FISCAL_MONTHS[i].key);
    }
    return keys;
  }, [startMonthIdx, endMonthIdx]);

  // Process and aggregate stats per employee
  const processedEmployees = useMemo(() => {
    return employeesData.map(emp => {
      const aggregates = {};
      let totalDays = 0;
      let totalCount = 0;

      LEAVE_CATEGORIES.forEach(cat => {
        let catDays = 0;
        let catCount = 0;

        if (reportType === 'daily') {
          // Aggregate from daily logs (localStorage overrides)
          datesList.forEach(date => {
            const dayRecord = dailyOverrides[date];
            if (dayRecord && dayRecord.statuses) {
              const status = dayRecord.statuses[emp.id];
              if (status) {
                if (status === cat.key) {
                  catDays += cat.hasDays ? 1 : 0;
                  catCount += cat.hasCount ? 1 : 0;
                } else if (cat.key === 'outOfArea' && (status === 'gov' || status === 'work')) {
                  catDays += 1;
                  catCount += 1;
                }
              }
            }
          });
        } else {
          // Aggregate from monthly records
          activeMonthsKeys.forEach(mKey => {
            const mLeaves = emp.leaves[mKey];
            if (mLeaves) {
              catDays += getLeaveValueMonthly(mLeaves, cat.key, 'days');
              catCount += getLeaveValueMonthly(mLeaves, cat.key, 'count');
            }
          });
        }

        aggregates[cat.key] = {
          days: parseFloat(catDays.toFixed(1)),
          count: catCount
        };

        if (checkedCats[cat.key]) {
          totalDays += catDays;
          totalCount += catCount;
        }
      });

      return {
        ...emp,
        aggregates,
        total: {
          days: parseFloat(totalDays.toFixed(1)),
          count: totalCount
        }
      };
    });
  }, [employeesData, reportType, datesList, dailyOverrides, activeMonthsKeys, checkedCats]);

  // Split into left and right tables
  const halfLength = Math.ceil(processedEmployees.length / 2);
  const leftColEmployees = processedEmployees.slice(0, halfLength);
  const rightColEmployees = processedEmployees.slice(halfLength);

  // Dynamic Header Title BE
  const headerTitleText = useMemo(() => {
    if (reportType === 'daily') {
      return `รายงานการขาดลามาสาย ตั้งแต่วันที่ ${formatDateThaiBE(startDate)} ถึง ${formatDateThaiBE(endDate)}`;
    } else {
      const startMonthObj = FISCAL_MONTHS[startMonthIdx];
      const startYearBE = parseInt(selectedYear, 10) + startMonthObj.BE_offset;
      return `รายงานการขาดลามาสาย ตั้งแต่วันที่ 1 ${startMonthObj.label} พ.ศ. ${startYearBE} ถึง วันที่ ${customEndDay || defaultEndDay} ${activeEndMonth.label} พ.ศ. ${calculatedEndYearBE}`;
    }
  }, [reportType, startDate, endDate, startMonthIdx, endMonthIdx, customEndDay, defaultEndDay, selectedYear, calculatedEndYearBE]);

  const toggleCategory = (key) => {
    setCheckedCats(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderTableHeader = () => {
    const activeCats = LEAVE_CATEGORIES.filter(c => checkedCats[c.key]);
    return (
      <>
        <tr style={{ borderBottom: '1px solid #000' }}>
          <th rowSpan="2" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '35px' }}>ที่</th>
          <th rowSpan="2" style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>ชื่อ - สกุล</th>
          {activeCats.map(cat => (
            <th key={cat.key} colSpan="2" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '7.5pt' }}>
              {cat.label}
            </th>
          ))}
          <th colSpan="2" style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>รวม</th>
        </tr>
        <tr style={{ borderBottom: '1px solid #000' }}>
          {activeCats.map(cat => (
            <React.Fragment key={cat.key}>
              <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', fontSize: '7pt', width: '28px' }}>วัน</th>
              <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', fontSize: '7pt', width: '28px' }}>ครั้ง</th>
            </React.Fragment>
          ))}
          <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', fontSize: '7pt', fontWeight: 'bold', width: '28px' }}>วัน</th>
          <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', fontSize: '7pt', fontWeight: 'bold', width: '28px' }}>ครั้ง</th>
        </tr>
      </>
    );
  };

  const renderRow = (emp, displayIndex) => {
    const activeCats = LEAVE_CATEGORIES.filter(c => checkedCats[c.key]);
    return (
      <tr key={emp.id} style={{ borderBottom: '1px dashed #ccc' }}>
        <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', color: '#333' }}>{displayIndex}</td>
        <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'left', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{emp.name}</td>
        {activeCats.map(cat => {
          const val = emp.aggregates[cat.key];
          return (
            <React.Fragment key={cat.key}>
              <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center' }}>
                {cat.hasDays && val.days > 0 ? val.days : '-'}
              </td>
              <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center' }}>
                {cat.hasCount && val.count > 0 ? val.count : '-'}
              </td>
            </React.Fragment>
          );
        })}
        <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', fontWeight: 'bold', background: '#f9f9f9' }}>
          {emp.total.days > 0 ? emp.total.days : '-'}
        </td>
        <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', fontWeight: 'bold', background: '#f9f9f9' }}>
          {emp.total.count > 0 ? emp.total.count : '-'}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ---------------------------------------------------- Configuration Panel (no-print) */}
      <div className="glass-panel no-print" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>📋 ตั้งค่าเอกสารรายงานการขาดลามาสาย</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              สามารถเลือกทำรายงานจำแนกตามช่วงวันที่บันทึกสถิติรายวัน หรือตามช่วงเดือนสรุปรายปีได้
            </p>
          </div>
          <button onClick={() => window.print()} className="glow-button" style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem' }}>
            🖨️ สั่งพิมพ์ใบรายงาน (Print / PDF)
          </button>
        </div>

        {/* Report Type Selector */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <button
            onClick={() => setReportType('daily')}
            style={{
              padding: '8px 16px',
              background: reportType === 'daily' ? 'rgba(159, 122, 234, 0.1)' : 'transparent',
              border: reportType === 'daily' ? '1px solid rgba(159, 122, 234, 0.25)' : '1px solid transparent',
              color: reportType === 'daily' ? 'var(--primary)' : 'var(--text-muted)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            📅 สรุปตามช่วงวันที่ (สถิติรายวัน)
          </button>
          <button
            onClick={() => setReportType('monthly')}
            style={{
              padding: '8px 16px',
              background: reportType === 'monthly' ? 'rgba(159, 122, 234, 0.1)' : 'transparent',
              border: reportType === 'monthly' ? '1px solid rgba(159, 122, 234, 0.25)' : '1px solid transparent',
              color: reportType === 'monthly' ? 'var(--primary)' : 'var(--text-muted)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            📊 สรุปตามช่วงเดือน (สถิติรายเดือน)
          </button>
        </div>

        {/* Dynamic Filters depending on reportType */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {reportType === 'daily' ? (
            <>
              {/* Date pickers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ตั้งแต่วันที่</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: '8px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ถึงวันที่</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ padding: '8px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', padding: '10px', borderRadius: '8px' }}>
                💡 ระบบจะดึงข้อมูลการลงเวลาทำงานที่บันทึกไว้ในเมนู "ออกรายงานประจำวัน" ประจำแต่ละวันมาประมวลผลสรุปรวมให้
              </div>
            </>
          ) : (
            <>
              {/* Month selectors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>เริ่มต้นเดือน</label>
                <select
                  value={startMonthIdx}
                  onChange={handleStartMonthChange}
                  style={{ padding: '8px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}
                >
                  {FISCAL_MONTHS.map((m, i) => (
                    <option key={m.key} value={i}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>สิ้นสุดเดือน</label>
                <select
                  value={endMonthIdx}
                  onChange={handleEndMonthChange}
                  style={{ padding: '8px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}
                >
                  {FISCAL_MONTHS.map((m, i) => (
                    <option key={m.key} value={i} disabled={i < startMonthIdx}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ระบุวันที่สิ้นสุดแบบกำหนดเอง</label>
                <input
                  type="text"
                  placeholder={defaultEndDay.toString()}
                  value={customEndDay}
                  onChange={e => setCustomEndDay(e.target.value)}
                  style={{ padding: '8px 12px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Category checkboxes */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
            เลือกหมวดหมู่ข้อมูลที่ต้องการแสดงผลในตาราง:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            {LEAVE_CATEGORIES.map(cat => (
              <label key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checkedCats[cat.key]}
                  onChange={() => toggleCategory(cat.key)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <span style={{ color: checkedCats[cat.key] ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: checkedCats[cat.key] ? 600 : 400 }}>
                  {cat.label}
                </span>
              </label>
            ))}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--yellow)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⚠️</span>
            <span>แนะนำเลือก 3-4 ประเภท (เช่น มาสาย, ลากิจ, ลาป่วย เหมือนในรูปตัวอย่าง) เพื่อความพอดีในการจัดหน้ากระดาษแนวตั้งตอนพิมพ์ตารางคู่</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- Report Sheet (Print Target) */}
      <div className="print-container" style={{
        background: 'white',
        color: 'black',
        padding: '30px 20px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        fontFamily: 'Sarabun, sans-serif'
      }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{
            fontSize: '13.5pt',
            fontWeight: 'bold',
            color: 'black',
            margin: '0',
            lineHeight: 1.5,
            letterSpacing: '0.5px'
          }}>
            {headerTitleText}
          </h2>
        </div>

        {/* 2 Column side-by-side Table Area */}
        <div className="print-columns" style={{ display: 'flex', gap: '16px' }}>
          
          {/* Left Table half */}
          <div className="print-column" style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', border: '1px solid #000' }}>
              <thead>
                {renderTableHeader()}
              </thead>
              <tbody>
                {leftColEmployees.map((emp, idx) => renderRow(emp, idx + 1))}
              </tbody>
            </table>
          </div>

          {/* Right Table half */}
          <div className="print-column" style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', border: '1px solid #000' }}>
              <thead>
                {renderTableHeader()}
              </thead>
              <tbody>
                {rightColEmployees.map((emp, idx) => renderRow(emp, halfLength + idx + 1))}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
