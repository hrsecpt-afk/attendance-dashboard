const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

const target = "ป่วย";
let idx = html.indexOf(target);
console.log(`Found "${target}" first index:`, idx);

const startSearch = Math.max(0, idx - 300);
const context = html.substring(startSearch, idx);
console.log("Context text:", context);

const regex = /"(\d{9,11})"/g;
let match;
while ((match = regex.exec(context)) !== null) {
  console.log("Match GID:", match[1]);
}
