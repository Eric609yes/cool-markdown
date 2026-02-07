// Fix JavaScript syntax error
const fs = require('fs');

const content = fs.readFileSync('script.js', 'utf8');
const fixed = content.replace(
    "searchText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')",
    "searchText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')"
);
fs.writeFileSync('script.js', fixed, 'utf8');
console.log('Fixed JavaScript syntax error');