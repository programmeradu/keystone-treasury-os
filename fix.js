const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/auth/page.tsx');
let txt = fs.readFileSync(file, 'utf8');
txt = txt.replace(/\\\$/g, '$');
txt = txt.replace(/\\`/g, '`');
fs.writeFileSync(file, txt);
console.log('Fixed backslashes in page.tsx');
