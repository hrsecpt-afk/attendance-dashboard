const fs = require('fs');
const path = require('path');

const txt = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

// Look for both formats of "ป่วย"
const searchStrings = ["ป่วย", "\\u0e1b\\u0e48\\u0e2d\\u0e22", "\\u0e1b\\u0e48\\u0e27\\u0e22"]; // Wait, "ป่วย" in unicode is \u0e1b\u0e48\u0e27\u0e22 (p-ua-y)
searchStrings.forEach(s => {
  let index = 0;
  while ((index = txt.indexOf(s, index)) !== -1) {
    console.log(`Found "${s}" at index ${index}!`);
    console.log("Context:");
    console.log(txt.substring(index - 100, index + 100));
    index += s.length;
  }
});
