const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'attendance.json');

if (!fs.existsSync(jsonPath)) {
  console.error(`Error: File not found at ${jsonPath}`);
  process.exit(1);
}

let data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Filter out garbage #ERROR! records
data = data.filter(emp => emp.name && emp.name !== '#ERROR!');

const positionOrder = {
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

function getPositionRank(pos) {
  return positionOrder[pos] || 99;
}

function getLocationRank(loc) {
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
}

// Perform sorting
data.sort((a, b) => {
  // 1. Position rank
  const posA = getPositionRank(a.position);
  const posB = getPositionRank(b.position);
  if (posA !== posB) return posA - posB;

  // 2. Location rank
  const locA = getLocationRank(a.location);
  const locB = getLocationRank(b.location);
  if (locA !== locB) return locA - locB;

  // 3. Location alphabetical if they are both in the same rank of schools/hospitals
  if (locA >= 10 && a.location !== b.location) {
    return a.location.localeCompare(b.location, 'th');
  }

  // 4. Name alphabetical
  return a.name.localeCompare(b.name, 'th');
});

// Re-assign sequential IDs
data.forEach((emp, idx) => {
  emp.id = idx + 1;
});

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Successfully re-sorted attendance.json. Total active employees: ${data.length}`);
