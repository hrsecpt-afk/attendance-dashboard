const fs = require('fs');
const path = require('path');
const https = require('https');

const SPREADSHEET_ID = "1tJC4acxlWYsGe_cd9uWwUZkbnRWcJAadlboh_pwoURM";

const TABS = {
  sick: "569713442",       // ป่วย
  personal: "1992525205",   // กิจ
  vacation: "701268177",   // พักผ่อน
  outOfArea: "663266713",  // ขออนุญาตออก
  late: "2024293346",      // สาย
  absent: "1574674576",    // ขาดราชการ
  maternity: "1427818927", // คลอด
  ordination: "965551316"  // อุปสมบท
};

const MONTH_CONFIGS = [
  { key: 'april', days: 30 },
  { key: 'may', days: 31 },
  { key: 'june', days: 30 },
  { key: 'july', days: 31 },
  { key: 'august', days: 31 },
  { key: 'september', days: 30 }
];

const ALL_MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

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
        i++;
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
        if (char === '\r') i++;
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1) rows.push(currentRow);
  }
  return rows;
}

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

async function run() {
  const employeesMap = new Map(); // Name -> employee data object
  const tempDir = path.join(__dirname, '..', 'temp_csvs');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  
  // Download each tab's CSV
  for (const [tabKey, gid] of Object.entries(TABS)) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
    const dest = path.join(tempDir, `${tabKey}.csv`);
    console.log(`Downloading ${tabKey} tab (GID: ${gid})...`);
    await downloadFile(url, dest);
  }
  
  console.log("Parsing downloaded tabs...");
  
  for (const [tabKey, gid] of Object.entries(TABS)) {
    const filePath = path.join(tempDir, `${tabKey}.csv`);
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSV(csvContent);
    
    // Find the starting row with ID 1
    let startIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      // Find row where 1st element is "1" and 2nd element is a non-empty name
      if (rows[i][0] === '1' && rows[i][1] && rows[i][1].length > 0) {
        startIdx = i;
        break;
      }
    }
    
    if (startIdx === -1) {
      console.warn(`Warning: Could not find starting row with ID 1 in tab: ${tabKey}`);
      continue;
    }
    
    for (let r = startIdx; r < rows.length; r++) {
      const row = rows[r];
      const idVal = parseInt(row[0]);
      if (isNaN(idVal)) continue; // End of list or invalid row
      
      const name = (row[1] || '').trim();
      const position = (row[2] || '').trim();
      const location = (row[3] || '').trim();
      
      if (!name) continue;
      
      // Initialize employee in map if not present
      if (!employeesMap.has(name)) {
        const leavesByMonth = {};
        ALL_MONTHS.forEach(m => { leavesByMonth[m] = createEmptyLeave(); });
        
        employeesMap.set(name, {
          id: idVal,
          name,
          position,
          location,
          leaves: leavesByMonth
        });
      }
      
      const emp = employeesMap.get(name);
      
      // Parse leaves for this tab
      // Col index starts at 7 (1 เม.ย. 69)
      let colOffset = 7;
      
      for (const mc of MONTH_CONFIGS) {
        const summaryCountCol = colOffset + mc.days;
        const summaryDaysCol = colOffset + mc.days + 1;
        
        const count = parseFloat(row[summaryCountCol]) || 0;
        const days = parseFloat(row[summaryDaysCol]) || 0;
        
        const monthLeavesObj = emp.leaves[mc.key];
        
        if (tabKey === 'sick') {
          monthLeavesObj.sick = { count: Math.ceil(count), days };
        } else if (tabKey === 'personal') {
          monthLeavesObj.personal = { count: Math.ceil(count), days };
        } else if (tabKey === 'vacation') {
          // Vacation leaves
          monthLeavesObj.vacation = { count: Math.ceil(count), days, remaining: 0 };
        } else if (tabKey === 'absent') {
          // Absent is just days
          monthLeavesObj.absent = days;
        } else if (tabKey === 'late') {
          // Late is count
          monthLeavesObj.late = { count: Math.ceil(count), days };
        } else if (tabKey === 'outOfArea') {
          monthLeavesObj.outOfArea = { count: Math.ceil(count), hours: 0, days };
        } else if (tabKey === 'maternity') {
          monthLeavesObj.maternity = { count: Math.ceil(count), days };
        } else if (tabKey === 'ordination') {
          monthLeavesObj.ordination = { count: Math.ceil(count), days };
        }
        
        colOffset = summaryDaysCol + 1;
      }
    }
  }
  
  // Post-process: compute totals & vacation remaining
  const employees = Array.from(employeesMap.values());
  
  employees.forEach(emp => {
    // Determine default vacation allowance (e.g. 30 days)
    const baseVacation = 30;
    
    // Sum up total vacation days taken to calculate vacation remaining for each month
    let accumulatedVacationTaken = 0;
    
    // Sort months chronologically starting with October (start of fiscal year)
    // Fiscal month order: oct, nov, dec, jan, feb, mar, apr, may, jun, jul, aug, sep
    const FISCAL_MONTHS = ['october','november','december','january','february','march','april','may','june','july','august','september'];
    
    FISCAL_MONTHS.forEach(m => {
      const monthLeaves = emp.leaves[m];
      
      // Calculate month total
      const totalDays = monthLeaves.sick.days + 
                        monthLeaves.personal.days + 
                        monthLeaves.vacation.days + 
                        monthLeaves.maternity.days + 
                        monthLeaves.ordination.days;
      
      const totalCount = monthLeaves.sick.count + 
                         monthLeaves.personal.count + 
                         monthLeaves.vacation.count + 
                         monthLeaves.maternity.count + 
                         monthLeaves.ordination.count;
      
      monthLeaves.total = {
        count: totalCount,
        days: parseFloat(totalDays.toFixed(2))
      };
      
      // Calculate vacation remaining
      accumulatedVacationTaken += monthLeaves.vacation.days;
      monthLeaves.vacation.remaining = Math.max(0, parseFloat((baseVacation - accumulatedVacationTaken).toFixed(2)));
    });
    
    // Calculate final cumulative "all"
    const all = createEmptyLeave();
    FISCAL_MONTHS.forEach(m => {
      const ml = emp.leaves[m];
      all.sick.count += ml.sick.count;
      all.sick.days += ml.sick.days;
      all.personal.count += ml.personal.count;
      all.personal.days += ml.personal.days;
      all.vacation.count += ml.vacation.count;
      all.vacation.days += ml.vacation.days;
      all.absent += ml.absent;
      all.late.count += ml.late.count;
      all.late.days += ml.late.days;
      all.outOfArea.count += ml.outOfArea.count;
      all.outOfArea.days += ml.outOfArea.days;
      all.maternity.count += ml.maternity.count;
      all.maternity.days += ml.maternity.days;
      all.ordination.count += ml.ordination.count;
      all.ordination.days += ml.ordination.days;
      
      all.total.count += ml.total.count;
      all.total.days += ml.total.days;
    });
    
    // Format float decimals
    all.sick.days = parseFloat(all.sick.days.toFixed(2));
    all.personal.days = parseFloat(all.personal.days.toFixed(2));
    all.vacation.days = parseFloat(all.vacation.days.toFixed(2));
    all.vacation.remaining = parseFloat((baseVacation - all.vacation.days).toFixed(2));
    all.absent = parseFloat(all.absent.toFixed(2));
    all.late.days = parseFloat(all.late.days.toFixed(2));
    all.outOfArea.days = parseFloat(all.outOfArea.days.toFixed(2));
    all.maternity.days = parseFloat(all.maternity.days.toFixed(2));
    all.ordination.days = parseFloat(all.ordination.days.toFixed(2));
    all.total.days = parseFloat(all.total.days.toFixed(2));
    
    emp.leaves.all = all;
  });
  
  // Sort employees by ID
  employees.sort((a, b) => a.id - b.id);
  
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'attendance.json');
  fs.writeFileSync(outputPath, JSON.stringify(employees, null, 2), 'utf8');
  console.log(`\nSUCCESS: Merged and written ${employees.length} employees with all leave stats to ${outputPath}!`);
  
  // Clean up temp csv files
  fs.rmSync(tempDir, { recursive: true, force: true });
}

run().catch(console.error);
