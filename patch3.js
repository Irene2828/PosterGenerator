const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
  /(\.canvas-shell\{.*?padding:)10px 4px 26px(.*?)/,
  "$112px 4px 12px$2"
);

fs.writeFileSync('index.html', html);
console.log('patched3');
