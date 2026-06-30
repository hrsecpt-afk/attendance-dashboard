const fs = require('fs');
const path = require('path');

const buf = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'));

console.log("File length:", buf.length);
console.log("First 10 bytes:", buf.slice(0, 10));

// Check if UTF-16 (BOM is FF FE or FE FF)
if (buf[0] === 0xFF && buf[1] === 0xFE) {
  console.log("Detected UTF-16 LE encoding!");
  const txt = buf.toString('utf16le');
  console.log("Length of text:", txt.length);
  // Search for GID
  const index = txt.indexOf("569713442");
  console.log("Found 569713442 index:", index);
} else if (buf[0] === 0xFE && buf[1] === 0xFF) {
  console.log("Detected UTF-16 BE encoding!");
} else {
  console.log("Encoding is likely UTF-8 or ASCII.");
  const txt = buf.toString('utf8');
  const index = txt.indexOf("569713442");
  console.log("Found 569713442 index:", index);
}
