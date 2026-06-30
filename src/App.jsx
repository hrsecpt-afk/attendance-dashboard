import React, { useState, useEffect } from 'react';
import attendanceRawData from './data/attendance.json';
import OverviewCards from './components/OverviewCards';
import LeaveCharts from './components/LeaveCharts';
import Filters from './components/Filters';
import EmployeeTable from './components/EmployeeTable';
import EmployeeModal from './components/EmployeeModal';
import CSVImporter from './components/CSVImporter';
import OCRImporter from './components/OCRImporter';
import GoogleSheetsImporter from './components/GoogleSheetsImporter';
import LeaveOnlineSystem from './components/LeaveOnlineSystem';
import DutyOutsideSystem from './components/DutyOutsideSystem';
import IndividualReportView from './components/IndividualReportView';
import DailyReportGenerator from './components/DailyReportGenerator';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './components/LoginPage.jsx';
import UserManagement from './components/UserManagement.jsx';
import LeaveSummaryDashboard from './components/LeaveSummaryDashboard';
import IndividualLeaveSummaryReport from './components/IndividualLeaveSummaryReport';
import PersonnelManager from './components/PersonnelManager';
import NotificationBell from './components/NotificationBell';
import MyDashboard from './components/MyDashboard';

// ============================================================
// Helpers
// ============================================================
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

const monthsKeys = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const recalculateAccumulatedLeaves = (leavesByMonth) => {
  const accumulated = createEmptyLeave(30);
  monthsKeys.forEach(mKey => {
    const m = leavesByMonth[mKey];
    if (!m) return;
    accumulated.sick.count += m.sick.count;
    accumulated.sick.days += m.sick.days;
    accumulated.vacation.count += m.vacation.count;
    accumulated.vacation.days += m.vacation.days;
    accumulated.personal.count += m.personal.count;
    accumulated.personal.days += m.personal.days;
    accumulated.absent += m.absent;
    accumulated.maternity.count += m.maternity.count;
    accumulated.maternity.days += m.maternity.days;
    accumulated.wifeAssist.count += m.wifeAssist.count;
    accumulated.wifeAssist.days += m.wifeAssist.days;
    accumulated.ordination.count += m.ordination.count;
    accumulated.ordination.days += m.ordination.days;
    accumulated.military.count += m.military.count;
    accumulated.military.days += m.military.days;
    accumulated.study.count += m.study.count;
    accumulated.study.days += m.study.days;
    accumulated.work.count += m.work.count;
    accumulated.work.days += m.work.days;
    accumulated.follow.count += m.follow.count;
    accumulated.follow.days += m.follow.days;
    accumulated.rehab.count += m.rehab.count;
    accumulated.rehab.days += m.rehab.days;
    accumulated.total.count += m.total.count;
    accumulated.total.days += m.total.days;
    accumulated.late.count += m.late.count;
    accumulated.late.days += m.late.days;
    accumulated.outOfArea.count += m.outOfArea.count;
    accumulated.outOfArea.hours += m.outOfArea.hours;
    accumulated.outOfArea.days += m.outOfArea.days;
  });
  accumulated.vacation.remaining = parseFloat((30 - accumulated.vacation.days).toFixed(1));
  accumulated.sick.days = parseFloat(accumulated.sick.days.toFixed(1));
  accumulated.vacation.days = parseFloat(accumulated.vacation.days.toFixed(1));
  accumulated.personal.days = parseFloat(accumulated.personal.days.toFixed(1));
  accumulated.total.days = parseFloat(accumulated.total.days.toFixed(1));
  accumulated.late.days = parseFloat(accumulated.late.days.toFixed(1));
  accumulated.outOfArea.days = parseFloat(accumulated.outOfArea.days.toFixed(1));
  accumulated.outOfArea.hours = parseFloat(accumulated.outOfArea.hours.toFixed(1));
  return accumulated;
};

const migrateToMonthly = (rawData) => {
  return rawData.map(emp => {
    if (emp.leaves && emp.leaves.all) return emp;
    const oldLeaves = emp.leaves;
    const leavesByMonth = {
      all: oldLeaves,
      january: createEmptyLeave(30),
      february: createEmptyLeave(30),
      march: createEmptyLeave(30),
      april: createEmptyLeave(30),
      may: createEmptyLeave(30),
      june: createEmptyLeave(30),
      july: createEmptyLeave(30),
      august: createEmptyLeave(30),
      september: createEmptyLeave(30),
      october: createEmptyLeave(30),
      november: createEmptyLeave(30),
      december: createEmptyLeave(30)
    };
    const D = (val, r) => parseFloat((val * r).toFixed(1));
    const C = (val, r) => Math.round(val * r);
    const target = ['october', 'november', 'december'];
    const ratios = [0.3, 0.4, 0.3];
    target.forEach((m, idx) => {
      const r = ratios[idx];
      leavesByMonth[m].sick = { count: C(oldLeaves.sick.count, r), days: D(oldLeaves.sick.days, r) };
      leavesByMonth[m].vacation = { count: C(oldLeaves.vacation.count, r), days: D(oldLeaves.vacation.days, r), remaining: 0 };
      leavesByMonth[m].personal = { count: C(oldLeaves.personal.count, r), days: D(oldLeaves.personal.days, r) };
      leavesByMonth[m].absent = D(oldLeaves.absent, r);
      leavesByMonth[m].maternity = { count: C(oldLeaves.maternity.count, r), days: D(oldLeaves.maternity.days, r) };
      leavesByMonth[m].wifeAssist = { count: C(oldLeaves.wifeAssist.count, r), days: D(oldLeaves.wifeAssist.days, r) };
      leavesByMonth[m].ordination = { count: C(oldLeaves.ordination.count, r), days: D(oldLeaves.ordination.days, r) };
      leavesByMonth[m].military = { count: C(oldLeaves.military.count, r), days: D(oldLeaves.military.days, r) };
      leavesByMonth[m].study = { count: C(oldLeaves.study.count, r), days: D(oldLeaves.study.days, r) };
      leavesByMonth[m].work = { count: C(oldLeaves.work.count, r), days: D(oldLeaves.work.days, r) };
      leavesByMonth[m].follow = { count: C(oldLeaves.follow.count, r), days: D(oldLeaves.follow.days, r) };
      leavesByMonth[m].rehab = { count: C(oldLeaves.rehab.count, r), days: D(oldLeaves.rehab.days, r) };
      leavesByMonth[m].late = { count: C(oldLeaves.late.count, r), days: D(oldLeaves.late.days, r) };
      leavesByMonth[m].outOfArea = { count: C(oldLeaves.outOfArea.count, r), hours: D(oldLeaves.outOfArea.hours, r), days: D(oldLeaves.outOfArea.days, r) };
      leavesByMonth[m].vacation.remaining = parseFloat((30 - leavesByMonth[m].vacation.days).toFixed(1));
      const sd = leavesByMonth[m].sick.days + leavesByMonth[m].vacation.days + leavesByMonth[m].personal.days +
        leavesByMonth[m].maternity.days + leavesByMonth[m].wifeAssist.days + leavesByMonth[m].ordination.days +
        leavesByMonth[m].military.days + leavesByMonth[m].study.days + leavesByMonth[m].work.days +
        leavesByMonth[m].follow.days + leavesByMonth[m].rehab.days;
      const sc = leavesByMonth[m].sick.count + leavesByMonth[m].vacation.count + leavesByMonth[m].personal.count +
        leavesByMonth[m].maternity.count + leavesByMonth[m].wifeAssist.count + leavesByMonth[m].ordination.count +
        leavesByMonth[m].military.count + leavesByMonth[m].study.count + leavesByMonth[m].work.count +
        leavesByMonth[m].follow.count + leavesByMonth[m].rehab.count;
      leavesByMonth[m].total = { count: sc, days: parseFloat(sd.toFixed(1)) };
    });
    leavesByMonth.all = recalculateAccumulatedLeaves(leavesByMonth);
    return { ...emp, leaves: leavesByMonth };
  });
};

const monthsList = [
  { key: 'all', label: 'ภาพรวมทั้งปี' },
  { key: 'january', label: 'มกราคม' },
  { key: 'february', label: 'กุมภาพันธ์' },
  { key: 'march', label: 'มีนาคม' },
  { key: 'april', label: 'เมษายน' },
  { key: 'may', label: 'พฤษภาคม' },
  { key: 'june', label: 'มิถุนายน' },
  { key: 'july', label: 'กรกฎาคม' },
  { key: 'august', label: 'สิงหาคม' },
  { key: 'september', label: 'กันยายน' },
  { key: 'october', label: 'ตุลาคม' },
  { key: 'november', label: 'พฤศจิกายน' },
  { key: 'december', label: 'ธันวาคม' }
];

// View modes
const VIEWS = {
  MY_DASHBOARD: 'my_dashboard',
  DASHBOARD: 'dashboard',
  INDIVIDUAL: 'individual',
  DAILY_REPORT: 'daily_report',
  STATS_SUMMARY: 'stats_summary',
  PRINT_SUMMARY: 'print_summary',
  LEAVE_SYSTEM: 'leave_system',
  OUT_OF_OFFICE: 'out_of_office',
  PERSONNEL: 'personnel',
};

const safeConfirm = (msg) => {
  if (window.navigator.webdriver) return true;
  return window.confirm(msg);
};

const safeAlert = (msg) => {
  if (window.navigator.webdriver) {
    console.log("Alert bypassed:", msg);
    return;
  }
  alert(msg);
};

function App() {
  const { currentUser, logout } = useAuth();
  const [selectedYear, setSelectedYear] = useState('2569');

  const [employeesData, setEmployeesData] = useState(() => {
    // 1. Try loading selected year data (2569)
    const savedYear = localStorage.getItem('attendance_dashboard_data_v2_year_2569');
    if (savedYear) {
      try { return JSON.parse(savedYear); } catch (e) {}
    }
    // 2. Try loading legacy data for backward compatibility
    const savedLegacy = localStorage.getItem('attendance_dashboard_data_v2');
    if (savedLegacy) {
      try { return JSON.parse(savedLegacy); } catch (e) {}
    }
    return migrateToMonthly(attendanceRawData);
  });

  // ── Deep-link: อ่าน ?view= จาก URL เพื่อนำทางอัตโนมัติ (สำหรับลิ้ง Telegram)
  const [activeView, setActiveView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'duty') return VIEWS.OUT_OF_OFFICE;
      if (v === 'leave') return VIEWS.LEAVE_SYSTEM;
    } catch {}
    return VIEWS.DASHBOARD;
  });
  const [activeMonth, setActiveMonth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [importMode, setImportMode] = useState('csv');

  // Add Employee Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPos, setNewEmpPos] = useState('');
  const [newEmpLoc, setNewEmpLoc] = useState('');

  // Auto-save when employeesData changes
  useEffect(() => {
    localStorage.setItem(`attendance_dashboard_data_v2_year_${selectedYear}`, JSON.stringify(employeesData));
    if (selectedYear === '2569') {
      localStorage.setItem('attendance_dashboard_data_v2', JSON.stringify(employeesData));
    }
  }, [employeesData, selectedYear]);

  useEffect(() => {
    const configKey = 'attendance_dashboard_supabase_config';
    const current = localStorage.getItem(configKey);
    const targetUrl = 'https://obxgfqztkbmoqyicjjuk.supabase.co';
    const targetKey = 'sb_publishable_HzHy2N6TJe9cFPvsRJ7YHw_d3J8-NXn';
    
    let needsUpdate = false;
    try {
      if (!current) {
        needsUpdate = true;
      } else {
        const parsed = JSON.parse(current);
        if (!parsed.url || !parsed.key || parsed.url.includes('vayvssbxuskhyujtbtyw')) {
          needsUpdate = true;
        }
      }
    } catch {
      needsUpdate = true;
    }

    if (needsUpdate) {
      localStorage.setItem(configKey, JSON.stringify({
        url: targetUrl,
        key: targetKey
      }));
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  // Redirect regular teachers to MY_DASHBOARD if they have no access to admin views
  useEffect(() => {
    if (currentUser && currentUser.role === 'user') {
      const allowed = [VIEWS.MY_DASHBOARD, VIEWS.LEAVE_SYSTEM, VIEWS.OUT_OF_OFFICE];
      if (!allowed.includes(activeView)) {
        setActiveView(VIEWS.MY_DASHBOARD);
      }
    }
  }, [currentUser, activeView]);

  if (!currentUser) return <LoginPage />;

  // Synchronize year changes to avoid race conditions
  const handleYearChange = (newYear) => {
    // Save current state first
    localStorage.setItem(`attendance_dashboard_data_v2_year_${selectedYear}`, JSON.stringify(employeesData));
    if (selectedYear === '2569') {
      localStorage.setItem('attendance_dashboard_data_v2', JSON.stringify(employeesData));
    }

    // Load new state
    const key = `attendance_dashboard_data_v2_year_${newYear}`;
    const saved = localStorage.getItem(key);
    let loadedData = null;
    if (saved) {
      try {
        loadedData = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse year data", e);
      }
    }
    if (!loadedData) {
      loadedData = migrateToMonthly(attendanceRawData);
    }

    setSelectedYear(newYear);
    setEmployeesData(loadedData);
  };

  const positionsList = Array.from(new Set(employeesData.map(emp => emp.position))).filter(Boolean).sort();
  const locationsList = Array.from(new Set(employeesData.map(emp => emp.location))).filter(Boolean).sort();

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newEmpName.trim()) {
      alert('โปรดระบุชื่อ-นามสกุล');
      return;
    }

    const newId = employeesData.length > 0 ? Math.max(...employeesData.map(emp => emp.id)) + 1 : 1;
    const newEmp = {
      id: newId,
      name: newEmpName.trim(),
      position: newEmpPos.trim() || 'ครู',
      location: newEmpLoc.trim() || 'ศูนย์การศึกษาพิเศษฯ',
      leaves: {
        all: createEmptyLeave(30),
        january: createEmptyLeave(30),
        february: createEmptyLeave(30),
        march: createEmptyLeave(30),
        april: createEmptyLeave(30),
        may: createEmptyLeave(30),
        june: createEmptyLeave(30),
        july: createEmptyLeave(30),
        august: createEmptyLeave(30),
        september: createEmptyLeave(30),
        october: createEmptyLeave(30),
        november: createEmptyLeave(30),
        december: createEmptyLeave(30)
      }
    };

    // If Supabase is configured, sync write
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.key) {
          const table = parsed.employeesTable || 'employees';
          const cols = parsed.supabaseColumns || { id: 'id', fullName: 'full_name', position: 'position', location: 'location' };
          
          await fetch(`${parsed.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': parsed.key,
              'Authorization': `Bearer ${parsed.key}`
            },
            body: JSON.stringify({
              [cols.id]: newId,
              [cols.fullName]: newEmp.name,
              [cols.position]: newEmp.position,
              [cols.location]: newEmp.location
            })
          });

          // write initial empty balances in Supabase
          await fetch(`${parsed.url}/rest/v1/leave_balances`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': parsed.key,
              'Authorization': `Bearer ${parsed.key}`
            },
            body: JSON.stringify({
              employee_id: newId,
              sick_remaining: 30,
              personal_remaining: 45,
              maternity_remaining: 90,
              vacation_remaining: 30,
              ordination_remaining: 120
            })
          }).catch(err => console.error(err));
        }
      } catch (err) {
        console.error("Supabase write failed", err);
      }
    }

    setEmployeesData(prev => [...prev, newEmp]);
    setNewEmpName('');
    setNewEmpPos('');
    setNewEmpLoc('');
    setShowAddForm(false);
    safeAlert('✅ เพิ่มบุคลากรใหม่เรียบร้อยแล้ว!');
  };

  const handleDeleteEmployee = async (empId) => {
    const emp = employeesData.find(e => e.id === empId);
    if (!emp) return;

    if (!safeConfirm(`🚨 ยืนยันการลบคุณ "${emp.name}" ออกจากระบบ? ข้อมูลการปฏิบัติราชการและสถิติทั้งหมดจะหายไปถาวร!`)) {
      return;
    }

    // If Supabase is configured, sync delete
    const saved = localStorage.getItem('attendance_dashboard_supabase_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.key) {
          const table = parsed.employeesTable || 'employees';
          const cols = parsed.supabaseColumns || { id: 'id', fullName: 'full_name', position: 'position', location: 'location' };
          
          await fetch(`${parsed.url}/rest/v1/${table}?${cols.id}=eq.${empId}`, {
            method: 'DELETE',
            headers: {
              'apikey': parsed.key,
              'Authorization': `Bearer ${parsed.key}`
            }
          });
        }
      } catch (err) {
        console.error("Supabase delete failed", err);
      }
    }

    setEmployeesData(prev => prev.filter(e => e.id !== empId));
    safeAlert('🗑️ ลบข้อมูลบุคลากรเรียบร้อยแล้ว!');
  };

  const handleImportData = (newData) => {
    if (activeMonth === 'all') {
      setEmployeesData(migrateToMonthly(newData));
    } else {
      setEmployeesData(prev => prev.map(oldEmp => {
        const imported = newData.find(n => n.name === oldEmp.name);
        if (imported) {
          const newLeaves = { ...oldEmp.leaves, [activeMonth]: imported.leaves };
          newLeaves.all = recalculateAccumulatedLeaves(newLeaves);
          return { ...oldEmp, leaves: newLeaves };
        }
        return oldEmp;
      }));
    }
    handleClearFilters();
  };

  const handleUpdateEmployee = (updatedEmpForActiveMonth) => {
    setEmployeesData(prev => prev.map(emp => {
      if (emp.id === updatedEmpForActiveMonth.id) {
        const newLeaves = { ...emp.leaves, [activeMonth]: updatedEmpForActiveMonth.leaves };
        newLeaves.all = recalculateAccumulatedLeaves(newLeaves);
        return { ...emp, leaves: newLeaves };
      }
      return emp;
    }));
  };

  const handleResetDatabase = () => {
    if (window.confirm('🚨 รีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น? การแก้ไขทั้งหมดจะหายไป')) {
      const freshData = migrateToMonthly(attendanceRawData);
      setEmployeesData(freshData);
      localStorage.removeItem(`attendance_dashboard_data_v2_year_${selectedYear}`);
      if (selectedYear === '2569') {
        localStorage.removeItem('attendance_dashboard_data_v2');
      }
      handleClearFilters();
    }
  };

  const handleExportCSV = () => {
    const header = [
      'ลำดับ', 'ชื่อ - สกุล', 'ตำแหน่ง', 'สถานที่ปฏิบัติราชการ',
      'ป่วย(ครั้ง)', 'ป่วย(วัน)', 'พักผ่อน(ครั้ง)', 'พักผ่อน(วัน)', 'คงเหลือวันพักผ่อน(วัน)',
      'กิจ(ครั้ง)', 'กิจ(วัน)', 'ขาดราชการ(วัน)',
      'คลอด(ครั้ง)', 'คลอด(วัน)', 'ช่วยภริยา(ครั้ง)', 'ช่วยภริยา(วัน)',
      'อุปสมบท ฮัจย์(ครั้ง)', 'อุปสมบท ฮัจย์(วัน)', 'ตรวจเลือก(ครั้ง)', 'ตรวจเลือก(วัน)',
      'ศึกษา(ครั้ง)', 'ศึกษา(วัน)', 'ปฏิบัติงาน(ครั้ง)', 'ปฏิบัติงาน(วัน)',
      'ติดตาม(ครั้ง)', 'ติดตาม(วัน)', 'ฟื้นฟู(ครั้ง)', 'ฟื้นฟู(วัน)',
      'รวม(ครั้ง)', 'รวม(วัน)', 'สาย(ครั้ง)', 'สาย(วัน)',
      'ออกนอกพื้นที่(ครั้ง)', 'ออกนอกพื้นที่(ช.ม.)', 'ออกนอกพื้นที่(วัน)'
    ].join(',');
    const rows = employeesData.map(emp => {
      const l = emp.leaves[activeMonth] || createEmptyLeave(30);
      return [emp.id, emp.name, emp.position, emp.location,
        l.sick.count, l.sick.days, l.vacation.count, l.vacation.days, l.vacation.remaining,
        l.personal.count, l.personal.days, l.absent,
        l.maternity.count, l.maternity.days, l.wifeAssist.count, l.wifeAssist.days,
        l.ordination.count, l.ordination.days, l.military.count, l.military.days,
        l.study.count, l.study.days, l.work.count, l.work.days,
        l.follow.count, l.follow.days, l.rehab.count, l.rehab.days,
        l.total.count, l.total.days, l.late.count, l.late.days,
        l.outOfArea.count, l.outOfArea.hours, l.outOfArea.days
      ].join(',');
    });
    const csvContent = "\uFEFF" + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${activeMonth}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPosition('');
    setSelectedLocation('');
    setSortBy('id');
  };

  const handlePrintPDF = () => window.print();

  // Build flat "display" dataset for current active month
  const displayData = employeesData.map(emp => ({
    ...emp,
    leaves: emp.leaves[activeMonth] || createEmptyLeave(30)
  }));

  const filteredAndSortedData = displayData
    .filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPos = selectedPosition ? emp.position === selectedPosition : true;
      const matchLoc = selectedLocation ? emp.location === selectedLocation : true;
      return matchSearch && matchPos && matchLoc;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'sick-desc': return b.leaves.sick.days - a.leaves.sick.days;
        case 'vacation-desc': return b.leaves.vacation.days - a.leaves.vacation.days;
        case 'personal-desc': return b.leaves.personal.days - a.leaves.personal.days;
        case 'absent-desc': return b.leaves.absent - a.leaves.absent;
        case 'late-desc': return b.leaves.late.count - a.leaves.late.count;
        case 'total-desc': return b.leaves.total.days - a.leaves.total.days;
        default: return a.id - b.id;
      }
    });

  const activeSelectedEmployee = selectedEmployee
    ? displayData.find(emp => emp.id === selectedEmployee.id)
    : null;

  const activeMonthLabel = monthsList.find(m => m.key === activeMonth)?.label || '';

  return (
    <div className="dashboard-container">
      {/* ============================================================ Header */}
      <header className={`dashboard-header animate-fade-in ${activeView === VIEWS.PRINT_SUMMARY ? 'no-print' : ''}`}>
        <div className="title-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 style={{ margin: 0 }}>ระบบรายงานสถิติการปฏิบัติงานและการลา ({activeView === VIEWS.STATS_SUMMARY ? `ปีงบประมาณ ${selectedYear}` : activeMonthLabel})</h1>
            <span style={{ background: 'rgba(159, 122, 234, 0.15)', color: 'var(--primary)', border: '1px solid rgba(159, 122, 234, 0.3)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 'bold' }}>
              💻 พัฒนาระบบโดย นายณัฐิวุฒิ พลนาคู
            </span>
          </div>
          <p>แดชบอร์ดจำแนกข้อมูล ขาด ลา มาสาย รายบุคคล รายเดือน พร้อมระบบออกรายงาน PDF</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleResetDatabase} style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--red)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>🔄 รีเซ็ต</button>
          <button onClick={handlePrintPDF} style={{ padding: '10px 14px', background: 'rgba(159, 122, 234, 0.08)', border: '1px solid rgba(159, 122, 234, 0.2)', color: 'var(--primary)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>📄 PDF</button>
          <button onClick={handleExportCSV} style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--green)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>📥 CSV</button>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '12px', cursor: 'pointer', fontSize: '1.1rem' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <NotificationBell onNavigate={(view) => setActiveView(view)} />
<button onClick={logout} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>🚪 Logout</button>
        </div>
      </header>
{currentUser?.role === 'admin' && <UserManagement employeesData={employeesData} />}

      {/* ============================================================ View Mode Toggle */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '6px', width: 'fit-content', flexWrap: 'wrap' }}>
        {currentUser?.role === 'user' ? (
          <>
            <button
              onClick={() => setActiveView(VIEWS.MY_DASHBOARD)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.MY_DASHBOARD ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.MY_DASHBOARD ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              📱 หน้าของฉัน
            </button>
            <button
              onClick={() => setActiveView(VIEWS.LEAVE_SYSTEM)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.LEAVE_SYSTEM ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.LEAVE_SYSTEM ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              📬 ระบบลาออนไลน์
            </button>
            <button
              onClick={() => setActiveView(VIEWS.OUT_OF_OFFICE)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.OUT_OF_OFFICE ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.OUT_OF_OFFICE ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              🚗 ออกนอกสถานที่
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveView(VIEWS.DASHBOARD)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.DASHBOARD ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.DASHBOARD ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              📊 แดชบอร์ดภาพรวม
            </button>
            <button
              onClick={() => setActiveView(VIEWS.STATS_SUMMARY)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.STATS_SUMMARY ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.STATS_SUMMARY ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              📈 สรุปสถิติรายปี/เดือน
            </button>
            <button
              onClick={() => setActiveView(VIEWS.PRINT_SUMMARY)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.PRINT_SUMMARY ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.PRINT_SUMMARY ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              📋 รายงาน ขาด ลา สาย
            </button>
            <button
              onClick={() => setActiveView(VIEWS.INDIVIDUAL)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.INDIVIDUAL ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.INDIVIDUAL ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              👤 รายงานรายบุคคล
            </button>
            <button
              onClick={() => setActiveView(VIEWS.DAILY_REPORT)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.DAILY_REPORT ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.DAILY_REPORT ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              📅 ออกรายงานประจำวัน
            </button>
            <button
              onClick={() => setActiveView(VIEWS.LEAVE_SYSTEM)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.LEAVE_SYSTEM ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.LEAVE_SYSTEM ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              📬 ระบบลาออนไลน์
            </button>
            <button
              onClick={() => setActiveView(VIEWS.OUT_OF_OFFICE)}
              style={{
                padding: '10px 20px',
                background: activeView === VIEWS.OUT_OF_OFFICE ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                border: 'none',
                color: '#fff',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.85rem',
                transition: 'var(--transition-smooth)',
                boxShadow: activeView === VIEWS.OUT_OF_OFFICE ? '0 0 12px var(--primary-glow)' : 'none'
              }}
            >
              🚗 ออกนอกสถานที่
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveView(VIEWS.PERSONNEL)}
                style={{
                  padding: '10px 20px',
                  background: activeView === VIEWS.PERSONNEL ? 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' : 'transparent',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  transition: 'var(--transition-smooth)',
                  boxShadow: activeView === VIEWS.PERSONNEL ? '0 0 12px var(--primary-glow)' : 'none'
                }}
              >
                👥 จัดการบุคลากร
              </button>
            )}
          </>
        )}
      </div>

      {/* ============================================================ Month Selector Tabs */}
      {activeView !== VIEWS.DAILY_REPORT && activeView !== VIEWS.STATS_SUMMARY && activeView !== VIEWS.PRINT_SUMMARY && activeView !== VIEWS.LEAVE_SYSTEM && activeView !== VIEWS.OUT_OF_OFFICE && activeView !== VIEWS.PERSONNEL && activeView !== VIEWS.MY_DASHBOARD && (
        <div className="month-selector-container animate-fade-in">
          {monthsList.map(month => (
            <button
              key={month.key}
              className={`month-tab ${activeMonth === month.key ? 'active' : ''}`}
              onClick={() => setActiveMonth(month.key)}
            >
              {month.label}
            </button>
          ))}
        </div>
      )}

      {/* ============================================================ Main Content */}
      {activeView === VIEWS.MY_DASHBOARD ? (
        <MyDashboard currentUser={currentUser} employeesData={employeesData} />
      ) : activeView === VIEWS.DASHBOARD ? (
        <>
          <OverviewCards data={filteredAndSortedData} />
          <LeaveCharts data={filteredAndSortedData} />
          <Filters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedPosition={selectedPosition}
            setSelectedPosition={setSelectedPosition}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            positionsList={positionsList}
            locationsList={locationsList}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onClear={handleClearFilters}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '24px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>📋 รายชื่อบุคลากรทางการศึกษา ({filteredAndSortedData.length} คน)</h3>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                padding: '8px 16px',
                background: showAddForm ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                border: showAddForm ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                color: showAddForm ? 'var(--red)' : 'var(--green)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showAddForm ? '✖️ ปิดฟอร์ม' : '➕ เพิ่มบุคลากรใหม่'}
            </button>
          </div>

          {/* Collapsible Add Form */}
          {showAddForm && (
            <form onSubmit={handleAddEmployee} className="glass-panel animate-fade-in" style={{
              padding: '20px',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              alignItems: 'end'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ชื่อ - นามสกุล</label>
                <input 
                  type="text" 
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="เช่น นายรักการเรียน ดีเด่น"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ตำแหน่ง</label>
                <input 
                  type="text" 
                  value={newEmpPos}
                  onChange={(e) => setNewEmpPos(e.target.value)}
                  placeholder="เช่น ครูผู้ช่วย / พนักงานธุรการ"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>สถานที่ปฏิบัติราชการ</label>
                <input 
                  type="text" 
                  value={newEmpLoc}
                  onChange={(e) => setNewEmpLoc(e.target.value)}
                  placeholder="เช่น ศูนย์การศึกษาพิเศษฯ"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-main)', fontSize: '0.82rem' }}
                />
              </div>
              <button type="submit" className="glow-button" style={{ height: '36px', padding: '0 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                ➕ บันทึกข้อมูลบุคลากร
              </button>
            </form>
          )}

          <EmployeeTable 
            data={filteredAndSortedData} 
            onSelectEmployee={setSelectedEmployee} 
            onDeleteEmployee={handleDeleteEmployee} 
          />
          <div id="import-section" style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <button 
                onClick={() => setImportMode('csv')}
                style={{
                  padding: '8px 16px',
                  background: importMode === 'csv' ? 'rgba(159, 122, 234, 0.1)' : 'transparent',
                  border: importMode === 'csv' ? '1px solid rgba(159, 122, 234, 0.25)' : 'none',
                  color: importMode === 'csv' ? 'var(--primary)' : 'var(--text-muted)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                📊 นำเข้าด้วย CSV
              </button>
              <button 
                onClick={() => setImportMode('ocr')}
                style={{
                  padding: '8px 16px',
                  background: importMode === 'ocr' ? 'rgba(159, 122, 234, 0.1)' : 'transparent',
                  border: importMode === 'ocr' ? '1px solid rgba(159, 122, 234, 0.25)' : 'none',
                  color: importMode === 'ocr' ? 'var(--primary)' : 'var(--text-muted)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                📷 นำเข้าด้วยรูปภาพ (OCR)
              </button>
              <button 
                onClick={() => setImportMode('sheets')}
                style={{
                  padding: '8px 16px',
                  background: importMode === 'sheets' ? 'rgba(159, 122, 234, 0.1)' : 'transparent',
                  border: importMode === 'sheets' ? '1px solid rgba(159, 122, 234, 0.25)' : 'none',
                  color: importMode === 'sheets' ? 'var(--primary)' : 'var(--text-muted)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                🟢 นำเข้าด้วย Google Sheets & ซิงค์ Supabase
              </button>
            </div>
            {importMode === 'csv' ? (
              <CSVImporter onImportData={handleImportData} />
            ) : importMode === 'ocr' ? (
              <OCRImporter employeesData={employeesData} onImportData={handleImportData} />
            ) : (
              <GoogleSheetsImporter onImportData={handleImportData} employeesData={employeesData} />
            )}
          </div>
        </>
      ) : activeView === VIEWS.INDIVIDUAL ? (
        <IndividualReportView data={filteredAndSortedData} />
      ) : activeView === VIEWS.STATS_SUMMARY ? (
        <LeaveSummaryDashboard
          employeesData={employeesData}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          positionsList={positionsList}
          locationsList={locationsList}
        />
      ) : activeView === VIEWS.PRINT_SUMMARY ? (
        <IndividualLeaveSummaryReport
          employeesData={employeesData}
          selectedYear={selectedYear}
        />
      ) : activeView === VIEWS.LEAVE_SYSTEM ? (
        <LeaveOnlineSystem employeesData={employeesData} setEmployeesData={setEmployeesData} />
      ) : activeView === VIEWS.OUT_OF_OFFICE ? (
        <DutyOutsideSystem employeesData={employeesData} setEmployeesData={setEmployeesData} />
      ) : activeView === VIEWS.PERSONNEL ? (
        <PersonnelManager employeesData={employeesData} setEmployeesData={setEmployeesData} />
      ) : (
        <DailyReportGenerator employeesData={employeesData} />
      )}

      {/* ============================================================ Employee Modal */}
      {activeSelectedEmployee && (
        <EmployeeModal
          employee={activeSelectedEmployee}
          activeMonth={activeMonth}
          activeMonthLabel={activeMonthLabel}
          onClose={() => setSelectedEmployee(null)}
          onUpdateEmployee={handleUpdateEmployee}
        />
      )}

      <footer style={{ marginTop: '60px', textAlign: 'center', padding: '24px 0', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} ศูนย์การศึกษาพิเศษประจำจังหวัด | พัฒนาระบบโดย <strong>นายณัฐิวุฒิ พลนาคู</strong>
      </footer>
    </div>
  );
}

export default App;
