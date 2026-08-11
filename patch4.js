const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove duplicate save icon
html = html.replace(
  /<svg class="save-icon"[\s\S]*?<\/svg>/,
  ""
);

// 2. Fix the grid toggle
html = html.replace(
  /<details class="property-group fine-adjustments">[\s\S]*?<\/details>/,
  `<div class="settings-toggle-row" style="padding: 16px; border-bottom: 1px solid var(--border); margin: 0;">
      <div class="settings-toggle-text">
        <span>SHOW GRID</span>
      </div>
      <button class="switch-toggle" id="grid-toggle-btn" onclick="toggleGrid()" aria-label="Show Grid" aria-pressed="false"></button>
    </div>`
);

// 3. Update the toggle function in JS
html = html.replace(
  /btn\.setAttribute\('aria-label', showGrid \? 'Hide Guides' : 'Show Guides'\);/,
  "btn.setAttribute('aria-label', showGrid ? 'Hide Grid' : 'Show Grid');"
);

fs.writeFileSync('index.html', html);
console.log('patched4');
