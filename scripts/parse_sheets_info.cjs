const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

// Let's find patterns like:
// {"id":..., "title":...} or similar sheet metadata.
// Or search for sheet name strings in the HTML and inspect their surroundings.
console.log("Searching for sheet names in HTML...");

const sheetNames = ["ภาพรวม", "พักผ่อน", "ป่วย", "กิจ", "ขออนุญาตออก", "สาย", "ขาดราชการ"];

// Let's search for JSON data containing sheet metadata
// The JSON usually contains sheetId and title
// Format: {"sheetId":0,"title":"ภาพรวม"} or similar.
// Or we can search for the titles and extract adjacent numbers.

const regex = /"sheetId"\s*:\s*(\d+)\s*,\s*"title"\s*:\s*"([^"]+)"/g;
let match;
const sheets = [];

while ((match = regex.exec(html)) !== null) {
  sheets.push({ id: match[1], title: match[2] });
}

if (sheets.length === 0) {
  // Try another common format: {"id":569713442,"title":"\u0e1b\u0e48\u0e27\u0e22"}
  // Or look for titles list directly
  const altRegex = /"id"\s*:\s*(\d+)\s*,\s*"title"\s*:\s*"([^"]+)"/g;
  while ((match = altRegex.exec(html)) !== null) {
    // Only keep if the title matches Thai characters or is one of our sheetNames
    const title = match[2];
    if (sheetNames.some(sn => title.includes(sn)) || title.length < 30) {
      sheets.push({ id: match[1], title });
    }
  }
}

console.log("Found sheets:", JSON.stringify(sheets, null, 2));
