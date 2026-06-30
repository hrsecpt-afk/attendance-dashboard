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
        if (currentRow.length > 0) rows.push(currentRow);
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
    if (currentRow.length > 0) rows.push(currentRow);
  }
  
  return rows;
}

const rows = parseCSV(rawContent);
console.log(`Parsed ${rows.length} rows`);

// Let's filter out empty rows or headers
// The real data starts from row index 9 (which has "1", "นางสาวภัทรภร หมื่นมะเริง", etc.)
// Let's look for rows where the first column is a number or parsed ID.
// Wait, we need to locate the row for ID 1.
let startIdx = -1;
for (let i = 0; i < rows.length; i++) {
  if (rows[i][0] === '1' && rows[i][1].includes('ภัทรภร')) {
    startIdx = i;
    break;
  }
}

if (startIdx === -1) {
  console.error("Could not find the starting row with ID 1 and Name containing 'ภัทรภร'");
  process.exit(1);
}

console.log(`Starting data parsing from row index: ${startIdx}`);

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

// Process data rows starting from startIdx
for (let r = startIdx; r < rows.length; r++) {
  const row = rows[r];
  
  const idVal = parseInt(row[0]);
  if (isNaN(idVal)) {
    // If not a number, we might have reached the end of the employee list
    continue;
  }
  
  const name = (row[1] || '').trim();
  const position = (row[2] || '').trim();
  const location = (row[3] || '').trim();
  
  if (!name) continue; // Skip empty names
  
  // Build monthly leaves structure
  const leavesByMonth = {};
  ALL_MONTHS.forEach(m => { leavesByMonth[m] = createEmptyLeave(); });
  
  // In the CSV, starting col is:
  // Col 0: ID ("1")
  // Col 1: Name
  // Col 2: Position
  // Col 3: Location
  // Col 4: Total leave count (cumulative)
  // Col 5: Total leave days (cumulative)
  // Col 6: ลาเกินกำหนด
  // Col 7: First day of April (1 เม.ย. 69)
  
  let colOffset = 7; // Col index for 1 เม.ย. 69
  
  for (const mc of MONTH_CONFIGS) {
    // Let's count actual daily leaves marked in columns [colOffset, colOffset + mc.days - 1]
    // And also parse the sheet's summary values at the end of the month
    const summaryCountCol = colOffset + mc.days;
    const summaryDaysCol = colOffset + mc.days + 1;
    
    const sheetCount = parseFloat(row[summaryCountCol]) || 0;
    const sheetDays = parseFloat(row[summaryDaysCol]) || 0;
    
    // In this sheet, all marks appear to be "ลา" (marked as "1", "0.5", "1.0")
    // Let's distinguish if there are any specific marks, but usually they are just numbers representing sick/personal/vacation.
    // If no type is specified, let's treat them as personal leaves or put them in 'personal' so it registers as leave.
    // Let's check if the sheetCount or sheetDays > 0.
    if (sheetDays > 0 || sheetCount > 0) {
      // By default, since the sheet has no explicit labels for sick vs personal on daily marks, we treat it as personal or sick.
      // Let's map it to 'personal' so the app registers it under personal leave, or split it if the user wants.
      // Since it's general leaves, let's populate 'personal' leave.
      leavesByMonth[mc.key].personal = { count: Math.ceil(sheetCount), days: sheetDays };
      leavesByMonth[mc.key].total = { count: Math.ceil(sheetCount), days: sheetDays };
    }
    
    // Move colOffset to start of next month
    colOffset = summaryDaysCol + 1;
  }
  
  // Calculate cumulative "all" leaves
  const allLeave = createEmptyLeave();
  ALL_MONTHS.forEach(m => {
    allLeave.personal.count += leavesByMonth[m].personal.count;
    allLeave.personal.days += leavesByMonth[m].personal.days;
    allLeave.total.count += leavesByMonth[m].total.count;
    allLeave.total.days += leavesByMonth[m].total.days;
  });
  allLeave.personal.days = parseFloat(allLeave.personal.days.toFixed(2));
  allLeave.total.days = parseFloat(allLeave.total.days.toFixed(2));
  leavesByMonth.all = allLeave;
  
  employees.push({
    id: idVal,
    name,
    position,
    location,
    leaves: leavesByMonth
  });
}

console.log(`Processed ${employees.length} employees`);

// Write to attendance.json
const outputPath = path.join(__dirname, '..', 'src', 'data', 'attendance.json');
fs.writeFileSync(outputPath, JSON.stringify(employees, null, 2), 'utf8');
console.log(`Successfully imported to ${outputPath}`);
