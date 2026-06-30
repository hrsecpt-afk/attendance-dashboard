const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

// Pattern: [2,0,"GID",[{"1":[[0,0,"TAB_NAME"
const regex = /\[2\s*,\s*0\s*,\s*"(\d+)"\s*,\s*\[\s*\{\s*"1"\s*:\s*\[\s*\[\s*0\s*,\s*0\s*,\s*"([^"]+)"/g;

const matches = [];
let match;

while ((match = regex.exec(html)) !== null) {
  matches.push({ gid: match[1], name: match[2] });
}

console.log("Extracted Tab Pairings:");
console.log(JSON.stringify(matches, null, 2));
