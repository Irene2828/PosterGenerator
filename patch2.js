const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
  /if \(btn\) btn.textContent = adminUndoStack.length \? 'Undo Last Edit' : 'Restore original text';/,
  "if (btn) btn.title = adminUndoStack.length ? 'Undo Last Edit' : 'Restore original text';"
);

fs.writeFileSync('index.html', html);
console.log('patched2');
