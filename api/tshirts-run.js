// Terry Fox T-Shirt Artwork Agent — engine.
// Applies a brief (remove / add / replace actions on named fields) to the
// stored vector artwork and returns a print-ready PDF plus check facts.
// Existing artwork is copied field-by-field as untouched vector pages;
// it is never re-drawn or re-typed. Only NEW text is set in a font.
try { require('regenerator-runtime/runtime'); } catch (e) {}
const { PDFDocument, rgb, pushOperators, setFillingColor, moveTo, lineTo, appendBezierCurve, appendQuadraticCurve, closePath, fill } = require('pdf-lib');
const fontkit = require('fontkit');

// Page geometry of the 2026 grey back artwork (points, top-left origin
// converted where needed). Fields were segmented from the original
// Illustrator artwork; coordinates are the fields' bounding boxes.
const PAGE = { w: 875, h: 1550 };
const FIELDS = {
  headline: { label: 'Main headline', x0: 15.8, y0: 9.6, x1: 860.7, y1: 571.6 },
  cities:   { label: 'City / date list', x0: 16.2, y0: 703.6, x1: 859.4, y1: 1300.6 },
  logos:    { label: 'Logo strip', x0: 15.0, y0: 1397.1, x1: 863.7, y1: 1537.4 },
};
const DESIGNS = {
  '2026-grey-back': {
    label: '2026 Grey — Back',
    assetBase: 'tshirt-back-2026-grey',
    fields: ['headline', 'cities', 'logos'],
  },
};
// New text only. Brand fonts are Latin-only, so scripts they cannot render
// use the closest heavy rounded match.
const FONTS = {
  latin:      { file: 'fonts/RigidSquare-SemiBold.otf', name: 'Rigid Square SemiBold' },
  devanagari: { file: 'fonts/Baloo2-ExtraBold.ttf', name: 'Baloo 2 ExtraBold' },
};
const MAX_TEXT_W = 700;
const MAX_SIZE = 165;

async function loadBytes(base, path) {
  const res = await fetch(`${base}/${path}`);
  if (!res.ok) throw new Error(`Cannot load ${path} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

function anchorBaseline(anchor, removedField, size) {
  const cx = PAGE.w / 2;
  switch (anchor) {
    case 'under-headline':
      return { x: cx, baselineTop: FIELDS.headline.y1 + 42 + size };
    case 'above-logos':
      return { x: cx, baselineTop: FIELDS.logos.y0 - 54 };
    case 'where-removed': {
      const f = FIELDS[removedField] || FIELDS.cities;
      return { x: cx, baselineTop: (f.y0 + f.y1) / 2 + size * 0.35 };
    }
    case 'centre':
    default: {
      const f = FIELDS.cities;
      return { x: cx, baselineTop: (f.y0 + f.y1) / 2 + size * 0.35 };
    }
  }
}

async function runBrief(base, brief) {
  const design = DESIGNS[brief.design || '2026-grey-back'];
  if (!design) throw new Error('Unknown design');
  const actions = Array.isArray(brief.actions) ? brief.actions.slice(0, 6) : [];
  if (!actions.length) throw new Error('No actions in brief');

  const removed = new Set();
  const adds = [];
  for (const a of actions) {
    if (a.type === 'remove' && FIELDS[a.field]) removed.add(a.field);
    if (a.type === 'replace' && FIELDS[a.field]) {
      removed.add(a.field);
      adds.push({ text: a.text, script: a.script, anchor: 'where-removed', field: a.field });
    }
    if (a.type === 'add' && a.text) {
      adds.push({ text: String(a.text), script: a.script, anchor: a.anchor || 'centre', field: a.field });
    }
  }

  const out = await PDFDocument.create();
  const page = out.addPage([PAGE.w, PAGE.h]);

  // Copy surviving fields, untouched, in original stacking order.
  const untouched = [];
  for (const fname of design.fields) {
    if (removed.has(fname)) continue;
    const srcBytes = await loadBytes(base, `${design.assetBase}-${fname}.pdf`);
    const src = await PDFDocument.load(srcBytes);
    const [embedded] = await out.embedPdf(src, [0]);
    page.drawPage(embedded, { x: 0, y: 0, width: PAGE.w, height: PAGE.h });
    untouched.push(FIELDS[fname].label);
  }

  // Set new text as vector outlines (same form as the original artwork:
  // no live font in the print file, correct shaping for any script).
  const addedFacts = [];
  const fontCache = {};
  for (const add of adds) {
    const script = FONTS[add.script] ? add.script : 'latin';
    if (!fontCache[script]) {
      const bytes = await loadBytes(base, FONTS[script].file);
      fontCache[script] = fontkit.create(Buffer.from(bytes));
    }
    const font = fontCache[script];
    const run = font.layout(add.text);
    const upem = font.unitsPerEm;
    let size = MAX_SIZE;
    // Under the headline, the free band above the city list is shallow —
    // cap the size so the line never runs into the list below it.
    if (add.anchor === 'under-headline' && !removed.has('cities')) size = Math.min(size, 66);
    const totalW = (run.advanceWidth / upem) * size;
    if (totalW > MAX_TEXT_W) size = size * (MAX_TEXT_W / totalW);
    const scale = size / upem;
    const w = run.advanceWidth * scale;
    const pos = anchorBaseline(add.anchor, add.field, size);
    const baselineY = PAGE.h - pos.baselineTop; // pdf-lib origin is bottom-left
    let penX = pos.x - w / 2;
    const ops = [setFillingColor(rgb(1, 1, 1))];
    run.glyphs.forEach((glyph, i) => {
      const p = run.positions[i];
      const ox = penX + p.xOffset * scale;
      const oy = baselineY + p.yOffset * scale;
      let cxp = 0, cyp = 0;
      for (const cmd of glyph.path.commands) {
        const a = cmd.args;
        if (cmd.command === 'moveTo') {
          ops.push(moveTo(ox + a[0] * scale, oy + a[1] * scale)); cxp = a[0]; cyp = a[1];
        } else if (cmd.command === 'lineTo') {
          ops.push(lineTo(ox + a[0] * scale, oy + a[1] * scale)); cxp = a[0]; cyp = a[1];
        } else if (cmd.command === 'bezierCurveTo') {
          ops.push(appendBezierCurve(
            ox + a[0] * scale, oy + a[1] * scale,
            ox + a[2] * scale, oy + a[3] * scale,
            ox + a[4] * scale, oy + a[5] * scale));
          cxp = a[4]; cyp = a[5];
        } else if (cmd.command === 'quadraticCurveTo') {
          ops.push(appendQuadraticCurve(
            ox + a[0] * scale, oy + a[1] * scale,
            ox + a[2] * scale, oy + a[3] * scale));
          cxp = a[2]; cyp = a[3];
        } else if (cmd.command === 'closePath') {
          ops.push(closePath());
        }
      }
      penX += p.xAdvance * scale;
    });
    ops.push(fill());
    page.pushOperators(...ops);
    addedFacts.push({ text: add.text, font: FONTS[script].name, size: Math.round(size) });
  }

  const pdfBytes = await out.save();
  return {
    ok: true,
    design: design.label,
    removed: [...removed].map((f) => FIELDS[f].label),
    added: addedFacts,
    untouched,
    pdfBase64: Buffer.from(pdfBytes).toString('base64'),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const base = `${proto}://${req.headers.host}`;
    const result = await runBrief(base, req.body || {});
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: String(e && e.message || e) });
  }
};
module.exports.runBrief = runBrief;
