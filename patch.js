const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove .preview-actions block
html = html.replace(
  /<div class="preview-actions">[\s\S]*?<\/div>/,
  ''
);

// 2. Insert buttons into .poster-stage
html = html.replace(
  /<div class="poster-stage" id="posterStage">/,
  `<div class="poster-stage" id="posterStage">
	        <button type="button" class="preview-icon side-btn left-side" id="userUndoBtn" title="Undo last edit">↺</button>
	        <button type="button" class="preview-icon side-btn right-side" id="largePreviewBtn" aria-label="Open large preview" title="Open large preview">⤢</button>`
);

// 3. Add CSS
const cssToAdd = `
  .side-btn { position: absolute; top: 0; z-index: 50; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid var(--border); }
  .left-side { left: -44px; }
  .right-side { right: -44px; }
  @media (max-width: 1100px) {
    .left-side { left: 8px; top: 8px; }
    .right-side { right: 8px; top: 8px; }
  }
`;

html = html.replace(
  /\.preview-actions\{.*?\}/,
  (match) => match + cssToAdd
);

fs.writeFileSync('index.html', html);
console.log('patched');
