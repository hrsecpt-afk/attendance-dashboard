import attendanceRawData from '../data/attendance.json';

export const MONTHS_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

export const MONTHS_LIST = [
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

export const POSITION_ORDER = {
  "ผู้อำนวยการ": 1,
  "รองผู้อำนวยการ": 2,
  "ครู": 3,
  "ครูผู้ช่วย": 4,
  "พนักงานราชการ": 5,
  "ลูกจ้างชั่วคราว ตำแหน่ง ครูผู้ช่วย": 6,
  "ครูอัตราจ้าง": 7,
  "พนักงานธุรการ": 8,
  "พี่เลี้ยงเด็กพิการ": 9,
  "จ้างเหมาบริการ (ภารโรง)": 10,
  "จ้างเหมาบริการ (ยาม)": 11,
  "จ้างเหมาบริการ (คนงาน)": 12,
  "จ้างเหมาบริการ (คนครัว)": 13
};

export const VIEWS = {
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

export const createEmptyLeave = (vacationRemaining = 30) => ({
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

export const recalculateAccumulatedLeaves = (leavesByMonth) => {
  const accumulated = createEmptyLeave(30);
  MONTHS_KEYS.forEach(mKey => {
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

export const getPositionRank = (pos) => POSITION_ORDER[pos] || 99;

export const getLocationRank = (loc) => {
  if (!loc) return 999;
  const l = loc.trim();
  if (l.includes("ศูนย์การศึกษาพิเศษ")) return 1;
  if (l.includes("หน่วยฯเมืองปทุม")) return 2;
  if (l.includes("หน่วยฯธัญบุรี")) return 3;
  if (l.includes("หน่วยฯคลองหลวง")) return 4;
  if (l.includes("หน่วยฯลำลูกกา")) return 5;
  if (l.includes("หน่วยฯหนองเสือ")) return 6;
  if (l.startsWith("โรงเรียน")) return 10;
  if (l.startsWith("รพ.")) return 20;
  return 100;
};

export const cleanNameForMatch = (nameStr) => {
  if (!nameStr) return '';
  nameStr = nameStr.replace(/\s*\(.*?\)\s*/g, '');
  let clean = String(nameStr).replace(/\s+/g, '');
  const prefixes = ['นาย', 'นางสาว', 'นาง', 'เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'ครู', 'ผอ.', 'ผอ', 'รองผอ.', 'รองผอ'];
  for (const pref of prefixes) {
    if (clean.startsWith(pref)) {
      clean = clean.substring(pref.length);
      break;
    }
  }
  return clean;
};

export const syncEmployeeDetailsWithRaw = (employeesList) => {
  if (!employeesList || !Array.isArray(employeesList)) return employeesList;
  return employeesList.map(emp => {
    if (!emp.name || !emp.position || !emp.location) {
      const cleanDbName = cleanNameForMatch(emp.name);
      const localEmp = attendanceRawData.find(r => cleanNameForMatch(r.name) === cleanDbName);
      if (localEmp) {
        return {
          ...emp,
          name: emp.name || localEmp.name,
          position: emp.position || localEmp.position,
          location: emp.location || localEmp.location
        };
      }
    }
    return emp;
  });
};

export const sortEmployeesByUserListOrder = (employeesList) => {
  if (!employeesList || !Array.isArray(employeesList)) return employeesList;
  return [...employeesList].sort((a, b) => {
    const indexA = a.sortIndex !== undefined ? a.sortIndex : (typeof a.id === 'number' ? a.id : 999);
    const indexB = b.sortIndex !== undefined ? b.sortIndex : (typeof b.id === 'number' ? b.id : 999);
    if (indexA !== indexB) return indexA - indexB;
    return a.name.localeCompare(b.name, 'th');
  });
};

export const migrateToMonthly = (rawData) => {
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

export const safeConfirm = (msg) => {
  if (window.navigator.webdriver) return true;
  return window.confirm(msg);
};

export const safeAlert = (msg) => {
  if (window.navigator.webdriver) {
    console.log("Alert bypassed:", msg);
    return;
  }
  alert(msg);
};
