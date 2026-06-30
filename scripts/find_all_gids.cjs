const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

const sheetNames = ["ภาพรวม", "พักผ่อน", "ป่วย", "กิจ", "ขออนุญาตออก", "สาย", "ขาดราชการ", "คลอด", "อุปสมบท"];

const pairings = {};

sheetNames.forEach(name => {
  let index = 0;
  while ((index = html.indexOf(name, index)) !== -1) {
    const startSearch = Math.max(0, index - 300);
    const context = html.substring(startSearch, index);
    
    // Support escaped quotes in regex
    const regex = /\\?"(\d{9,11})\\?"/g;
    let match;
    let lastGid = null;
    while ((match = regex.exec(context)) !== null) {
      lastGid = match[1];
    }
    
    if (lastGid) {
      // Prioritize the GID that is closest to the tab name
      if (!pairings[name] || pairings[name].index < index) {
        pairings[name] = { gid: lastGid, index };
      }
    }
    index += name.length;
  }
});

console.log("Mapped Tab Pairings:");
for (const [name, info] of Object.entries(pairings)) {
  console.log(`- ${name}: ${info.gid}`);
}
