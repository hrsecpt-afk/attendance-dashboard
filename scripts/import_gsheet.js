/**
 * Import Google Sheet attendance data and generate attendance.json
 * 
 * Sheet structure:
 * Col 0: ID
 * Col 1: Name
 * Col 2: Position
 * Col 3: Location
 * Col 4: Total leave count (cumulative)
 * Col 5: Total leave days (cumulative)
 * Col 6: ลาเกินกำหนด (เชิญรับทราบ)
 * Then for each month (apr, may, jun, jul, aug, sep):
 *   - 30 or 31 daily columns (each cell = "1" or "0.5" if leave, "" if not)
 *   - 2 summary columns: monthly count, monthly days
 *   - Then next month starts
 */

const fs = require('fs');
const path = require('path');

// Read the raw CSV content
const rawContent = fs.readFileSync(path.join(__dirname, '..', 'gsheet_raw.csv'), 'utf8');

// Parse CSV properly (handle quoted fields)
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        if (currentRow.length > 1) rows.push(currentRow);
        currentRow = [];
        currentField = '';
        if (char === '\r') i++; // skip \n
      } else {
        currentField += char;
      }
    }
  }
  // Last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1) rows.push(currentRow);
  }
  
  return rows;
}

const rows = parseCSV(rawContent);
console.log(`Parsed ${rows.length} rows`);
console.log(`Header has ${rows[0].length} columns`);

// Month mapping: the sheet has apr-sep data
// In the app's fiscal year structure:
// october=ต.ค., november=พ.ย., december=ธ.ค., january=ม.ค., ...
// The sheet data covers: april, may, june, july, august, september

// Each month block structure:
// For April (30 days): 30 daily cols + 2 summary cols = 32 cols
// For May (31 days): 31 daily cols + 2 summary cols = 33 cols
// For June (30 days): 30 daily cols + 2 summary cols = 32 cols
// For July (31 days): 31 daily cols + 2 summary cols = 33 cols
// For August (31 days): 31 daily cols + 2 summary cols = 33 cols
// For September (30 days): 30 daily cols + 2 summary cols = 32 cols

const MONTH_CONFIGS = [
  { key: 'april', days: 30 },
  { key: 'may', days: 31 },
  { key: 'june', days: 30 },
  { key: 'july', days: 31 },
  { key: 'august', days: 31 },
  { key: 'september', days: 30 }
];

const ALL_MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function createEmptyLeave() {
  return {
    sick: { count: 0, days: 0 },
    vacation: { count: 0, days: 0, remaining: 30 },
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
  };
}

const employees = [];

// Process data rows (skip header at index 0)
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  
  const id = parseInt(row[0]) || (r);
  const name = (row[1] || '').trim();
  const position = (row[2] || '').trim();
  const location = (row[3] || '').trim();
  const totalCount = parseFloat(row[4]) || 0;
  const totalDays = parseFloat(row[5]) || 0;
  
  if (!name) continue; // Skip empty names
  
  // Build monthly leaves
  const leavesByMonth = {};
  ALL_MONTHS.forEach(m => { leavesByMonth[m] = createEmptyLeave(); });
  
  // Parse each month's summary from the sheet
  // Starting column after: ID(0), Name(1), Position(2), Location(3), TotalCount(4), TotalDays(5), ExcessNote(6)
  // = column 7 is the start of April daily data
  let colOffset = 7; // Start of first daily column (1 เม.ย. 69)
  
  for (const mc of MONTH_CONFIGS) {
    // Skip the daily columns, go to the summary columns
    // Summary columns are at: colOffset + mc.days (count) and colOffset + mc.days + 1 (days)
    const summaryCountCol = colOffset + mc.days;
    const summaryDaysCol = colOffset + mc.days + 1;
    
    const monthCount = parseFloat(row[summaryCountCol]) || 0;
    const monthDays = parseFloat(row[summaryDaysCol]) || 0;
    
    // Count daily marks to determine leave types
    // In this sheet, all marks appear to be "ลา" (generic leave) marked as "1" or "0.5"
    // We'll treat all as "personal leave" (ลากิจ) since the sheet doesn't distinguish types
    // But the summary columns give us count and days
    
    leavesByMonth[mc.key] = createEmptyLeave();
    // Treat all as "personal" leave (ลากิจ) since the sheet is a general attendance tracker
    leavesByMonth[mc.key].personal = { count: Math.ceil(monthCount), days: monthDays };
    leavesByMonth[mc.key].total = { count: Math.ceil(monthCount), days: monthDays };
    
    // Move to next month: daily cols + 2 summary cols
    colOffset = summaryDaysCol + 1;
  }
  
  // Calculate "all" (cumulative)
  const allLeave = createEmptyLeave();
  ALL_MONTHS.forEach(m => {
    allLeave.personal.count += leavesByMonth[m].personal.count;
    allLeave.personal.days += leavesByMonth[m].personal.days;
    allLeave.total.count += leavesByMonth[m].total.count;
    allLeave.total.days += leavesByMonth[m].total.days;
  });
  allLeave.personal.days = parseFloat(allLeave.personal.days.toFixed(1));
  allLeave.total.days = parseFloat(allLeave.total.days.toFixed(1));
  
  leavesByMonth.all = allLeave;
  
  employees.push({
    id,
    name,
    position,
    location,
    leaves: leavesByMonth
  });
}

console.log(`Processed ${employees.length} employees`);

// Verify a few employees
for (let i = 0; i < Math.min(5, employees.length); i++) {
  const emp = employees[i];
  console.log(`${emp.id}. ${emp.name} - Total: ${emp.leaves.all.personal.days} days`);
  for (const mc of MONTH_CONFIGS) {
    const ml = emp.leaves[mc.key];
    if (ml.personal.days > 0) {
      console.log(`   ${mc.key}: ${ml.personal.count} times, ${ml.personal.days} days`);
    }
  }
}

// Write to attendance.json
const outputPath = path.join(__dirname, '..', 'src', 'data', 'attendance.json');
fs.writeFileSync(outputPath, JSON.stringify(employees, null, 2), 'utf8');
console.log(`\nWritten to ${outputPath}`);
console.log('Done!');
