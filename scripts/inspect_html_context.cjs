const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

const targetWord = "พักผ่อน";
let index = html.indexOf(targetWord);

if (index === -1) {
  console.log("Could not find word:", targetWord);
  // Try finding raw unicode representation: \u0e1e\u0e31\u0e01\u0e1c\u0e48\u0e2d\u0e19
  const unicodeWord = "\\u0e1e\\u0e31\\u0e01\\u0e1c\\u0e48\\u0e2d\\u0e19";
  index = html.indexOf(unicodeWord);
  if (index === -1) {
    console.log("Could not find unicode word either.");
  } else {
    console.log(`Found unicode word at index ${index}!`);
    console.log("Context:");
    console.log(html.substring(index - 200, index + 200));
  }
} else {
  console.log(`Found word at index ${index}!`);
  console.log("Context:");
  console.log(html.substring(index - 200, index + 200));
}
