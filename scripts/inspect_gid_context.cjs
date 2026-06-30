const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'sheet_edit.html'), 'utf8');

const targetGid = "569713442";
let index = 0;
while ((index = html.indexOf(targetGid, index)) !== -1) {
  console.log(`Found GID ${targetGid} at index ${index}!`);
  console.log("Context:");
  console.log(html.substring(index - 150, index + 150));
  index += targetGid.length;
}
