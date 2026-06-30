const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

const target = "ป่วย";
let index = 0;
while ((index = html.indexOf(target, index)) !== -1) {
  const startSearch = Math.max(0, index - 300);
  const context = html.substring(startSearch, index);
  
  // Allow optional backslashes before quotes
  const regex = /\\?"(\d{9,11})\\?"/g;
  let match;
  let lastGid = null;
  while ((match = regex.exec(context)) !== null) {
    lastGid = match[1];
  }
  
  console.log(`Found "${target}" at index ${index}. Last GID: ${lastGid}`);
  index += target.length;
}
