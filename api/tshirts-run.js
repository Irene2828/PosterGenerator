// Terry Fox T-Shirt Artwork — run endpoint.
// POST JSON: { design: '2026-grey-back', actions: [...] }
// Actions: {type:'remove', field} | {type:'add', text, script, anchor} | {type:'replace', field, text, script}
// Placement is slot-based: every element owns a box on the page. New text is
// fitted INSIDE a free slot (a gap band, or the box of an element removed in
// the same run) — it can never overlap an element that is still there.
// Original fields are copied as untouched vector pages. New text is drawn as
// vector outlines (fontkit layout -> glyph paths), never as a live font.
// Returns { ok, removed, added, untouched, pdfBase64 }.

const { PDFDocument, PDFName, PDFNumber, pushGraphicsState, popGraphicsState, moveTo, lineTo, appendBezierCurve, appendQuadraticCurve, closePath, fill, setFillingRgbColor } = require('pdf-lib');
const fontkit = require('fontkit');

const PAGE_W = 875, PAGE_H = 1550, CX = PAGE_W / 2;
const MAX_TEXT_W = 820, MAX_SIZE = 165, MIN_SIZE = 18;

// Element boxes on the back (top-left origin, points).
const FIELDS = {
  headline: { label: 'Main headline', file: 'tshirt-back-2026-grey-headline.pdf', box: { x: 15.8, y: 9.6, w: 844.9, h: 562.0 } },
  cities:   { label: 'City / date list', file: 'tshirt-back-2026-grey-cities.pdf', box: { x: 16.2, y: 703.6, w: 843.2, h: 597.0 } },
  logos:    { label: 'Logo strip', file: 'tshirt-back-2026-grey-logos.pdf', box: { x: 15.0, y: 1397.1, w: 848.7, h: 140.3 } },
};
// Always-free gap bands.
const BANDS = {
  'under-headline': { x: 40, y: 571.6, w: 795, h: 132.0 },
  'above-logos':    { x: 40, y: 1300.6, w: 795, h: 96.5 },
};
const FONTS = {
  latin: { file: 'fonts/RigidSquare-SemiBold.otf', name: 'Rigid Square SemiBold' },
  devanagari: { file: 'fonts/Baloo2-ExtraBold.ttf', name: 'Baloo 2 ExtraBold' },
};
const DESIGNS = { '2026-grey-back': true };

const fontCache = {};
function getFont(key) {
  if (!fontCache[key]) fontCache[key] = fontkit.openSync('/tmp/__tf_font_' + key);
  return fontCache[key];
}

async function fetchBytes(origin, path) {
  const r = await fetch(origin + '/' + path);
  if (!r.ok) throw new Error('asset fetch failed: ' + path + ' (' + r.status + ')');
  return new Uint8Array(await r.arrayBuffer());
}
const fs = require('fs');
async function ensureFontFile(origin, key) {
  const p = '/tmp/__tf_font_' + key;
  if (!fs.existsSync(p)) fs.writeFileSync(p, await fetchBytes(origin, FONTS[key].file));
}

// Fit a line of text inside a box, using the real ink bounds of the glyphs:
// the size is capped so the ink fits the box height, and the ink (not the
// em box) is centred in the slot — so text can never spill into a neighbour.
function layoutTextInBox(text, font, box) {
  const run = font.layout(text);
  let inkMinY = Infinity, inkMaxY = -Infinity;
  for (const g of run.glyphs) {
    if (!g.bbox) continue;
    inkMinY = Math.min(inkMinY, g.bbox.minY);
    inkMaxY = Math.max(inkMaxY, g.bbox.maxY);
  }
  if (!isFinite(inkMinY)) { inkMinY = 0; inkMaxY = font.unitsPerEm * 0.72; }
  const inkHUnits = Math.max(1, inkMaxY - inkMinY);
  const adv = s => run.positions.reduce((a, p) => a + p.xAdvance, 0) * s / font.unitsPerEm;
  let size = MAX_SIZE;
  while (size > MIN_SIZE && adv(size) > Math.min(MAX_TEXT_W, box.w - 24)) size -= 2;
  const sizeByHeight = (box.h * 0.86) * font.unitsPerEm / inkHUnits;
  if (size > sizeByHeight) size = Math.max(MIN_SIZE, Math.floor(sizeByHeight));
  const width = adv(size);
  const scale = size / font.unitsPerEm;
  // Centre the ink vertically in the box (convert to a PDF baseline, y up).
  const inkCentreFromTop = box.y + box.h / 2;
  const baselineFromTop = inkCentreFromTop + ((inkMaxY + inkMinY) / 2) * scale;
  const baseline = PAGE_H - baselineFromTop;
  return { run, size, x: CX - width / 2, baseline };
}

function drawTextOps(text, font, box) {
  const { run, size, x, baseline } = layoutTextInBox(text, font, box);
  const scale = size / font.unitsPerEm;
  const ops = [pushGraphicsState(), setFillingRgbColor(PDFNumber.of(1), PDFNumber.of(1), PDFNumber.of(1))];
  let penX = x;
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const gx = penX + (pos.xOffset || 0) * scale;
    const gy = baseline + (pos.yOffset || 0) * scale;
    const cmds = (glyph.path && glyph.path.commands) || [];
    let started = false;
    for (const c of cmds) {
      const X = v => PDFNumber.of(gx + v * scale);
      const Y = v => PDFNumber.of(gy + v * scale);
      if (c.command === 'moveTo') { ops.push(moveTo(X(c.args[0]), Y(c.args[1]))); started = true; }
      else if (c.command === 'lineTo') ops.push(lineTo(X(c.args[0]), Y(c.args[1])));
      else if (c.command === 'quadraticCurveTo') ops.push(appendQuadraticCurve(X(c.args[0]), Y(c.args[1]), X(c.args[2]), Y(c.args[3])));
      else if (c.command === 'bezierCurveTo') ops.push(appendBezierCurve(X(c.args[0]), Y(c.args[1]), X(c.args[2]), Y(c.args[3]), X(c.args[4]), Y(c.args[5])));
      else if (c.command === 'closePath') ops.push(closePath());
    }
    if (started) ops.push(fill());
    penX += pos.xAdvance * scale;
  });
  ops.push(popGraphicsState());
  return { ops, size };
}

// Which slot does an add/replace text go to? Throws a readable error when the
// requested place is not free.
function resolveSlot(action, removedFields) {
  if (action.type === 'replace') return { key: 'slot:' + action.field, box: FIELDS[action.field].box };
  const a = action.anchor || 'centre';
  if (a.startsWith('slot:')) {
    const f = a.slice(5);
    if (!FIELDS[f]) throw new Error('Unknown element in placement.');
    if (!removedFields.has(f)) throw new Error('That place is taken by the ' + FIELDS[f].label.toLowerCase() + ' — it is not removed in this run. Remove it first, or choose another placement.');
    return { key: a, box: FIELDS[f].box };
  }
  if (a === 'centre') {
    if (!removedFields.has('cities')) throw new Error('The centre of the back is taken by the city / date list. Remove it in this run, or choose another placement.');
    return { key: 'centre', box: FIELDS.cities.box };
  }
  if (a === 'above-logos') {
    if (removedFields.has('logos')) return { key: 'slot:logos', box: FIELDS.logos.box };
    return { key: a, box: BANDS['above-logos'] };
  }
  if (a === 'under-headline') return { key: a, box: BANDS['under-headline'] };
  throw new Error('Unknown placement: ' + a);
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }
    const brief = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!DESIGNS[brief.design]) throw new Error('Unknown design: ' + brief.design);
    const actions = Array.isArray(brief.actions) ? brief.actions.slice(0, 6) : [];
    if (!actions.length) throw new Error('No actions in the brief.');

    const origin = 'https://' + req.headers.host;
    const removedFields = new Set();
    const texts = [];
    for (const a of actions) {
      if (a.type === 'remove' || a.type === 'replace') {
        if (!FIELDS[a.field]) throw new Error('Unknown element: ' + a.field);
        removedFields.add(a.field);
      }
      if (a.type === 'replace' || a.type === 'add') {
        const text = String(a.text || '').trim();
        if (!text) throw new Error('An action is missing its text.');
        if (!FONTS[a.script]) throw new Error('Unknown language/script: ' + a.script);
        texts.push({ action: a, text, script: a.script });
      }
      if (!['remove', 'add', 'replace'].includes(a.type)) throw new Error('Unknown action: ' + a.type);
    }

    // Resolve slots; several texts in one slot split it into equal rows.
    const bySlot = new Map();
    for (const t of texts) {
      const slot = resolveSlot(t.action, removedFields);
      t.slotKey = slot.key;
      if (!bySlot.has(slot.key)) bySlot.set(slot.key, { box: slot.box, items: [] });
      bySlot.get(slot.key).items.push(t);
    }
    for (const { box, items } of bySlot.values()) {
      const rowH = box.h / items.length;
      items.forEach((t, i) => { t.box = { x: box.x, y: box.y + rowH * i, w: box.w, h: rowH }; });
    }

    const out = await PDFDocument.create();
    const page = out.addPage([PAGE_W, PAGE_H]);

    for (const key of Object.keys(FIELDS)) {
      if (removedFields.has(key)) continue;
      const src = await PDFDocument.load(await fetchBytes(origin, FIELDS[key].file));
      const [embedded] = await out.embedPdf(src, [0]);
      page.drawPage(embedded, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    }

    const added = [];
    for (const t of texts) {
      await ensureFontFile(origin, t.script);
      const font = getFont(t.script);
      const { ops, size } = drawTextOps(t.text, font, t.box);
      page.pushOperators(...ops);
      added.push({ text: t.text, font: FONTS[t.script].name, size });
    }

    const removed = [...removedFields].map(f => FIELDS[f].label);
    const untouched = Object.keys(FIELDS).filter(f => !removedFields.has(f)).map(f => FIELDS[f].label);
    const pdfBytes = await out.save();
    res.status(200).json({
      ok: true, removed, added, untouched,
      pdfBase64: Buffer.from(pdfBytes).toString('base64'),
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: String(e && e.message || e) });
  }
};
