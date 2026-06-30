const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

const sheetNames = [
  { name: "ภาพรวม", raw: "ภาพรวม" },
  { name: "พักผ่อน", raw: "พักผ่อน" },
  { name: "ป่วย", raw: "ป่วย" },
  { name: "กิจ", raw: "กิจ" },
  { name: "ขออนุญาตออก", raw: "ขออนุญาตออก" },
  { name: "สาย", raw: "สาย" },
  { name: "ขาดราชการ", raw: "ขาดราชการ" },
  { name: "คลอด", raw: "คลอด" },
  { name: "อุปสมบท", raw: "อุปสมบท" }
];

// Helper to escape to unicode format: \uXXXX
function toUnicodeEscape(str) {
  return str.split('').map(char => {
    const code = char.charCodeAt(0);
    if (code > 127) {
      return '\\u' + ('0000' + code.toString(16)).slice(-4);
    }
    return char;
  }).join('');
}

const pairings = [];

sheetNames.forEach(item => {
  const unicodeEscaped = toUnicodeEscape(item.raw);
  
  // Find indexes of both raw and unicode representations
  const targets = [item.raw, unicodeEscaped];
  
  targets.forEach(target => {
    let index = 0;
    while ((index = html.indexOf(target, index)) !== -1) {
      // Look 300 characters backward for a GID (9 to 11 digits)
      const startSearch = Math.max(0, index - 300);
      const context = html.substring(startSearch, index);
      
      const regex = /"(\d{9,11})"/g;
      let match;
      let lastGid = null;
      while ((match = regex.exec(context)) !== null) {
        lastGid = match[1];
      }
      
      if (lastGid) {
        if (!pairings.some(p => p.name === item.name && p.gid === lastGid)) {
          pairings.push({ name: item.name, gid: lastGid });
        }
      }
      index += target.length;
    }
  });
});

console.log("Heuristic pairing results:");
console.log(JSON.stringify(pairings, null, 2));
