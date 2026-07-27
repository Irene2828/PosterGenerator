

/* =========================================================================
   DATA MODEL
   One shared "copy" object drives every template. Add a new template by
   describing where its layers sit -- the form and data never change.
   ========================================================================= */
function getCopy(){
  const bulletsRaw = document.getElementById('f-bullets').value.trim();
  const bullets = bulletsRaw ? bulletsRaw.split('\n').map(s=>s.trim()).filter(Boolean) : [];
  const t1 = f('f-t1');
  const t2 = f('f-t2');
  const t3 = f('f-t3');
  const schedule = [t1, t2, t3].filter(Boolean).join('   \u2215   ');
  return {
    city: f('f-city'),
    date: f('f-date'),
    guest: f('f-guest'),
    location: f('f-location'),
    schedule: schedule,
    bullets: bullets,
    url: f('f-url'),
    email: f('f-email'),
    footIntro: f('f-footintro'),
    qrUrl: f('f-qr-url')
  };
  function f(id){ return document.getElementById(id).value.trim(); }
}

const COPY_FIELD_IDS = ['f-city','f-date','f-guest','f-location','f-t1','f-t2','f-t3','f-bullets','f-url','f-email','f-footintro','f-qr-url'];

function draftStorageKey(tplKey){
  return 'posterCopyDraft:' + tplKey;
}

function getTemplateDefaults(tplKey){
  const defaults = TEMPLATE_COPY[tplKey] || TEMPLATE_COPY.communityRunRed;
  return {
    'f-city': defaults.city || '',
    'f-date': defaults.date || '',
    'f-guest': defaults.guest || '',
    'f-location': defaults.location || '',
    'f-t1': defaults.t1 || '',
    'f-t2': defaults.t2 || '',
    'f-t3': defaults.t3 || '',
    'f-bullets': (defaults.bullets || []).join('\n'),
    'f-url': defaults.url || '',
    'f-email': defaults.email || '',
    'f-footintro': defaults.footIntro || ''
  };
}

function saveCopyDraft(tplKey = currentTpl){
  const draft = {};
  COPY_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) draft[id] = el.value;
  });
  const sameLinkEl = document.getElementById('qr-same-link');
  if (sameLinkEl) draft['qr-same-link'] = sameLinkEl.checked;
  const showQrRadio = document.querySelector('input[name="show-qr-radio"]:checked');
  if (showQrRadio) draft['show-qr-radio'] = showQrRadio.value;
  localStorage.setItem(draftStorageKey(tplKey), JSON.stringify(draft));
}

function loadCopyDraft(tplKey){
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(draftStorageKey(tplKey)) || 'null'); }
  catch (e) { saved = null; }
  const values = saved || getTemplateDefaults(tplKey);
  COPY_FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = values[id] || '';
  });
  
  const sameLinkEl = document.getElementById('qr-same-link');
  if (sameLinkEl) {
    const isSame = values['qr-same-link'] !== undefined ? values['qr-same-link'] : true;
    sameLinkEl.checked = isSame;
    document.getElementById('qr-custom-link-container').style.display = isSame ? 'none' : 'block';
  }
  
  const savedShowQr = values['show-qr-radio'] || 'yes';
  const radioYes = document.querySelector('input[name="show-qr-radio"][value="yes"]');
  const radioNo = document.querySelector('input[name="show-qr-radio"][value="no"]');
  if (radioYes && radioNo) {
    radioYes.checked = savedShowQr === 'yes';
    radioNo.checked = savedShowQr === 'no';
    document.getElementById('qr-link-section').style.display = (savedShowQr === 'yes') ? 'block' : 'none';
  }
}

function saveCurrentTemplate(){
  saveCopyDraft();
  saveLayerOverrides();
  
  const t = TEMPLATES[currentTpl];
  if (!t) return;
  const localOverrides = {};
  (t.layers || []).forEach(layer => {
    localOverrides[layer.id + ':' + layer.type] = {
      x: layer.x,
      y: layer.y,
      align: layer.align,
      hidden: !!layer.hidden,
      letterSpacing: layer.letterSpacing || 0,
      text: layer.text,
      font: layer.font,
      size: layer.size,
      lineWidth: layer.lineWidth,
      x1: layer.x1,
      x2: layer.x2,
      shadow: layer.shadow,
      maxW: layer.maxW
    };
  });

  const status = document.getElementById('adminSaveStatus');
  if (status) {
    status.textContent = 'Saving globally...';
    status.style.color = '#FFA500';
  }

  fetch('/api/save-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tplKey: currentTpl,
      overrides: localOverrides
    })
  })
  .then(res => {
    if (res.ok) {
      if (status) {
        status.textContent = 'Saved globally!';
        status.style.color = '#00FF88';
      }
    } else {
      if (status) {
        status.textContent = 'Saved to browser.';
        status.style.color = '#FF4444';
      }
    }
  })
  .catch(err => {
    if (status) {
      status.textContent = 'Saved locally.';
      status.style.color = '#FF4444';
    }
  });

  exportCurrentTemplateJSON();
}

/* =========================================================================
   TEMPLATES
   Each template = a fixed background (image or drawn) + a list of text
   layers positioned in the SAME 1122x1588 design space as the approved
   artwork. Percent-based coordinates keep it resolution independent.
   Swap in the other 4 approved poster backgrounds by adding entries here --
   everything else (form, QR, export) stays the same.
   ========================================================================= */
const W = 3300, H = 5100;

const TEMPLATE_COPY = {
  communityRunRed: {
    city: 'Twin Cities',
    date: 'Sunday September 20 2026',
    guest: '',
    location: 'Father Hennepin Park, Minneapolis',
    t1: 'Registration opens: 10:00',
    t2: '',
    t3: '',
    bullets: ['Fun run or walk', '5 km, 10 km options'],
    url: 'mskcc.convio.net/goto/Terry-Fox-Minneapolis-2026',
    email: 'TwinCitiesTerryFoxRun@outlook.com',
    footIntro: 'To register please visit:'
  },
  communityRunLetter: {
    city: 'Twin Cities',
    date: 'Sunday September 20 2026',
    guest: '',
    location: 'Father Hennepin Park, Minneapolis',
    t1: 'Registration opens: 10:00',
    t2: '',
    t3: '',
    bullets: ['Fun run or walk', '5 km, 10 km options'],
    url: 'mskcc.convio.net/goto/Terry-Fox-Minneapolis-2026',
    email: 'TwinCitiesTerryFoxRun@outlook.com',
    footIntro: 'To register please visit:'
  },
  socialTerryRun: {
    city: 'Chandler',
    date: 'Sunday January 31 2027',
    guest: 'With special guest, Fred Fox, brother of Terry Fox.',
    location: 'Desert Breeze Park (Main Pavilions)',
    t1: 'Registration opens: 09:00',
    t2: 'Start: 10:00',
    t3: '',
    bullets: ['Run/ walk / scooter/ wheelchair / stroller / dogs on leash', '1, 2, or 3 laps of the course'],
    url: 'mskcc.convio.net/goto/Terry-Fox-Chandler-2026',
    email: 'TwinCitiesTerryFoxRun@outlook.com',
    footIntro: 'visit:'
  }
};

const greyTextShadow = { x:0, y:4, blur:4, color:'rgba(255,255,255,0.2)' };

const TEMPLATES = {
  communityRunRed: {
    name: 'poster 11 x 17',
    kind: 'image',
    focal: { x: 0.5, y: 0.42 },
    w: 3300,
    h: 5100,
    src: "./11x18_clean.png",
    ink: '#FFFFFF',
    accent: '#202945',
    qrBg: '#FFFFFF',
    edgeColor: '#E63E30',
    layers: [
      { id:'city',     type:'text',   x:0.5000,y:0.0547, align:'center', font:'700 175px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'accent', maxW:0.2890 },
      { id:'date',     type:'text',   x:0.5000,y:0.7574, align:'center', font:'600 175px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', maxW:0.7109 },
      { id:'location', type:'text',   x:0.5000,y:0.7958, align:'center', font:'600 117px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', maxW:0.5808 },
      { id:'schedule', type:'schedule_list', x:0.5000,y:0.8268, align:'group-center-left', font:'500 67px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', lineHeight:75, bullet:true, includeBullets:true, maxItems:3 },
      { id:'t1',       type:'edit_row', x:0.5000,y:0.8268, align:'center', field:'f-t1', maxW:0.32, lineHeight:75 },
      { id:'bullet1',  type:'edit_row', x:0.5000,y:0.8415, align:'center', field:'f-bullets', row:0, maxW:0.32, lineHeight:75 },
      { id:'bullet2',  type:'edit_row', x:0.5000,y:0.8562, align:'center', field:'f-bullets', row:1, maxW:0.32, lineHeight:75 },
      { id:'qr',       type:'qr',     x:0.0152,y:0.9191, size:0.1005 },
      { id:'divider',  type:'rule',   x1:0.1313,x2:0.6604, y:0.9330, color:'ink', alpha:0.95, lineWidth:4 },
      { id:'footer',   type:'qr_caption', x:0.1313,y:0.9540, align:'left', referenceStyle:true, font:'400 58px "RigidSquareWeb", "Chakra Petch", sans-serif', boldFont:'700 58px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', alpha:0.95, maxW:0.5417, lineHeight:75 },
      { id:'footIntro', type:'edit_row', x:0.1313,y:0.9540, align:'left', field:'f-footintro', maxW:0.5417, lineHeight:75 },
      { id:'url',       type:'edit_row', x:0.1313,y:0.9687, align:'left', field:'f-url', maxW:0.5417, lineHeight:75 },
      { id:'email',     type:'edit_row', x:0.1313,y:0.9834, align:'left', field:'f-email', prefix:'e-mail: ', maxW:0.5417, lineHeight:75 }
    ],
    socialLayers: [
      { id:'city', type:'text', x:0.5, y:0.08, align:'center', font:'700 40px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'accent' },
      { id:'date', type:'text', x:0.5, y:0.90, align:'center', font:'700 46px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink' }
    ]
  },

  communityRunLetter: {
    name: 'poster 8.5 X 11',
    kind: 'image',
    focal: { x: 0.5, y: 0.5 },
    w: 2448,
    h: 3168,
    src: "./template_8x11_clean.png",
    ink: '#FFFFFF',
    accent: '#202945',
    qrBg: '#FFFFFF',
    edgeColor: '#E63E30',
    layers: [
      { id:'city',     type:'text',   x:0.5000,y:0.0550, align:'center', font:'700 112px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'accent', maxW:0.2500 },
      { id:'date',     type:'text',   x:0.5000,y:0.7750, align:'center', font:'600 128px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', maxW:0.6880 },
      { id:'location', type:'text',   x:0.5000,y:0.8170, align:'center', font:'600 72px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', maxW:0.4800 },
      { id:'schedule', type:'schedule_list', x:0.5000,y:0.8560, align:'center', font:'500 48px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', lineHeight:56, bullet:false, maxItems:1 },
      { id:'bullets',  type:'list',   x:0.5000,y:0.8810, align:'group-center-left', font:'500 48px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', maxW:0.2300, lineHeight:54, maxItems:2 },
      { id:'t1',       type:'edit_row', x:0.5000,y:0.8560, align:'center', field:'f-t1', maxW:0.32, lineHeight:56 },
      { id:'bullet1',  type:'edit_row', x:0.5000,y:0.8810, align:'center', field:'f-bullets', row:0, maxW:0.32, lineHeight:54 },
      { id:'bullet2',  type:'edit_row', x:0.5000,y:0.8980, align:'center', field:'f-bullets', row:1, maxW:0.32, lineHeight:54 },
      { id:'qr',       type:'qr',     x:0.0147,y:0.9154, size:0.0868 },
      { id:'divider',  type:'rule',   x1:0.1144,x2:0.6895, y:0.9331, color:'ink', alpha:0.95, lineWidth:4 },
      { id:'footer',   type:'qr_caption', x:0.1144,y:0.9533, align:'left', referenceStyle:true, font:'300 42px "RigidSquareWeb", "Chakra Petch", sans-serif', boldFont:'600 42px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', alpha:0.92, maxW:0.6060, lineHeight:42 },
      { id:'footIntro', type:'edit_row', x:0.1144,y:0.9533, align:'left', field:'f-footintro', maxW:0.6060, lineHeight:42 },
      { id:'url',       type:'edit_row', x:0.1144,y:0.9666, align:'left', field:'f-url', maxW:0.6060, lineHeight:42 },
      { id:'email',     type:'edit_row', x:0.1152,y:0.9799, align:'left', field:'f-email', prefix:'e-mail: ', maxW:0.6060, lineHeight:42 }
    ],
    socialLayers: [
      { id:'city', type:'text', x:0.5, y:0.08, align:'center', font:'700 40px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'accent' }
    ]
  },

  socialTerryRun: {
    name: 'Facebook Poster',
    kind: 'image',
    w: 1080,
    h: 1350,
    focal: { x: 0.5, y: 0.42 },
    src: "./template_clean2.png",
    ink: '#FFFFFF',
    accent: '#FFFFFF',
    qrBg: '#FFFFFF',
    edgeColor: '#1A2332',
    layers: [
      { id:'city',      type:'text',   x:0.5000,y:0.0422, align:'center', font:'700 44px "Chakra Petch", sans-serif', color:'ink', maxW:0.1870 },
      { id:'staticSub', type:'static', x:0.6300,y:0.2380, align:'left',   font:'700 44px "Chakra Petch", sans-serif', color:'ink', text:'For Cancer Research', maxW:0.3550, shadow:greyTextShadow },
      { id:'date',      type:'wrap',   x:0.6300,y:0.3320, align:'left',   font:'600 56px "Chakra Petch", sans-serif', color:'ink', maxW:0.3200, lineHeight:56, shadow:greyTextShadow },
      { id:'location',  type:'wrap',   x:0.6300,y:0.4580, align:'left',   font:'600 28px "Chakra Petch", sans-serif', color:'ink', maxW:0.3200, lineHeight:32, shadow:greyTextShadow },
      { id:'schedule',  type:'schedule_list', x:0.6300,y:0.5850, align:'left', font:'500 24px "Chakra Petch", sans-serif', color:'ink', lineHeight:32, bullet:true, maxItems:2, shadow:greyTextShadow },
      { id:'t1',        type:'edit_row', x:0.6300,y:0.5850, align:'left', field:'f-t1', maxW:0.3200, lineHeight:32 },
      { id:'t2',        type:'edit_row', x:0.6300,y:0.6087, align:'left', field:'f-t2', maxW:0.3200, lineHeight:32 },
      { id:'bullets',   type:'list',   x:0.6300,y:0.6850, align:'left',   font:'500 24px "Chakra Petch", sans-serif', color:'ink', maxW:0.3200, lineHeight:32, maxItems:2, shadow:greyTextShadow },
      { id:'bullet1',   type:'edit_row', x:0.6300,y:0.6850, align:'left', field:'f-bullets', row:0, maxW:0.3200, lineHeight:32 },
      { id:'bullet2',   type:'edit_row', x:0.6300,y:0.7560, align:'left', field:'f-bullets', row:1, maxW:0.3200, lineHeight:32 },
      { id:'guest',     type:'text',   x:0.5000,y:0.9350, align:'center', font:'italic 400 32px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', maxW:0.6741 },
      { id:'footer',    type:'social_footer', x:0.2537,y:0.9820, align:'left', font:'400 20px "Chakra Petch", sans-serif', boldFont:'700 20px "Chakra Petch", sans-serif', color:'ink', maxW:0.4685, lineHeight:18 },
      { id:'url',       type:'edit_row', x:0.2537,y:0.9820, align:'left', field:'f-url', prefix:'visit: ', maxW:0.4685, lineHeight:18 }
    ],
    socialLayers: [
      { id:'city',      type:'text',   x:0.5000,y:0.0422, align:'center', font:'700 44px "Chakra Petch", sans-serif', color:'ink', maxW:0.1870 },
      { id:'staticSub', type:'static', x:0.6300,y:0.2380, align:'left',   font:'700 44px "Chakra Petch", sans-serif', color:'ink', text:'For Cancer Research', maxW:0.3550, shadow:greyTextShadow },
      { id:'date',      type:'wrap',   x:0.6300,y:0.3320, align:'left',   font:'600 56px "Chakra Petch", sans-serif', color:'ink', maxW:0.3200, lineHeight:56, shadow:greyTextShadow },
      { id:'location',  type:'wrap',   x:0.6300,y:0.4580, align:'left',   font:'600 28px "Chakra Petch", sans-serif', color:'ink', maxW:0.3200, lineHeight:32, shadow:greyTextShadow },
      { id:'schedule',  type:'schedule_list', x:0.6300,y:0.5850, align:'left', font:'500 24px "Chakra Petch", sans-serif', color:'ink', lineHeight:32, bullet:true, maxItems:2, shadow:greyTextShadow },
      { id:'bullets',   type:'list',   x:0.6300,y:0.6850, align:'left',   font:'500 24px "Chakra Petch", sans-serif', color:'ink', maxW:0.3200, lineHeight:32, maxItems:2, shadow:greyTextShadow },
      { id:'guest',     type:'text',   x:0.5000,y:0.9350, align:'center', font:'italic 400 32px "RigidSquareWeb", "Chakra Petch", sans-serif', color:'ink', maxW:0.6741 },
      { id:'footer',    type:'social_footer', x:0.2537,y:0.9820, align:'left', font:'400 20px "Chakra Petch", sans-serif', boldFont:'700 20px "Chakra Petch", sans-serif', color:'ink', maxW:0.4685, lineHeight:18 }
    ]
  },
};

const bgImages = {};
let currentTpl = 'communityRunRed';

/* =========================================================================
   RENDERING
   ========================================================================= */
function resolveColor(t, name){ return name === 'accent' ? t.accent : t.ink; }

function wrapLines(ctx, text, maxWidth, font){
  ctx.font = font;
  const rawLines = text.split('\n');
  const lines = [];
  rawLines.forEach(raw => {
    const words = raw.split(' ');
    let line = '';
    words.forEach(w => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line){ lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
  });
  return lines;
}

function drawCover(ctx, img, dx, dy, dW, dH, focal = {x:0.5, y:0.5}) {
  const srcW = img.width, srcH = img.height;
  const srcRatio = srcW / srcH;
  const dstRatio = dW / dH;

  let sx, sy, sw, sh;
  if (srcRatio > dstRatio) {
    sh = srcH;
    sw = srcH * dstRatio;
    sx = (srcW - sw) * focal.x;
    sy = 0;
  } else {
    sw = srcW;
    sh = srcW / dstRatio;
    sx = 0;
    sy = (srcH - sh) * focal.y;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dW, dH);
}

function hasEditRowsFor(t, fields){
  return (t.layers || []).some(layer => layer.type === 'edit_row' && fields.includes(layer.field));
}

function styleSourceForEditRow(t, layer){
  const byId = id => (t.layers || []).find(item => item.id === id);
  if (['f-footintro','f-url','f-email'].includes(layer.field)) return byId('footer') || layer;
  if (layer.field === 'f-t1' || layer.field === 'f-t2' || layer.field === 'f-t3') return byId('schedule') || layer;
  if (layer.field === 'f-bullets') return byId('bullets') || byId('schedule') || layer;
  return byId((layer.field || '').replace(/^f-/, '')) || layer;
}

function drawRichTextLine(ctx, text, x, y, regularFont, boldFont, color, boldPattern){
  let cursor = x;
  text.split(/(\s+)/).filter(Boolean).forEach(part => {
    ctx.font = boldPattern.test(part) ? boldFont : regularFont;
    ctx.fillStyle = color;
    ctx.fillText(part, cursor, y);
    cursor += ctx.measureText(part).width;
  });
}

function drawEditRow(ctx, t, layer, copy, w, h, scale){
  const source = styleSourceForEditRow(t, layer);
  const rawText = getLayerEditValue(layer).trim();
  if (!rawText) return;
  const sourceFont = layer.font || source.font || '500 24px sans-serif';
  const px = Math.round(parseInt(sourceFont.match(/(\d+)px/)[1],10) * scale);
  const regularFont = sourceFont.replace(/\d+px/, px+'px');
  const boldFont = (source.boldFont || sourceFont).replace(/\d+px/, px+'px');
  const lineHeight = (layer.lineHeight || source.lineHeight || px * 1.2) * scale;
  const maxWidth = (layer.maxW || source.maxW || 0.5) * w;
  const color = resolveColor(t, source.color || layer.color);
  const x = layer.x * w;
  let y = layer.y * h;
  ctx.textAlign = layer.align === 'group-center-left' ? 'left' : (layer.align || source.align || 'left');
  ctx.fillStyle = color;

  if (layer.field === 'f-footintro'){
    drawRichTextLine(ctx, rawText, x, y, regularFont, boldFont, color, /visit:|e-mail:|QR code|property's|People|Culture/i);
    return;
  }
  if (layer.field === 'f-email'){
    drawRichTextLine(ctx, rawText, x, y, regularFont, boldFont, color, /^e-mail:/i);
    return;
  }
  if (layer.field === 'f-url'){
    if (source.type === 'social_footer'){
      drawRichTextLine(ctx, rawText, x, y, regularFont, boldFont, color, /^visit:$/i);
      const urlText = rawText.replace(/^visit:\s*/i, '');
      const prefixWidth = /^visit:\s*/i.test(rawText) ? (() => {
        ctx.font = boldFont;
        return ctx.measureText(rawText.match(/^visit:\s*/i)[0]).width;
      })() : 0;
      ctx.font = regularFont;
      const width = ctx.measureText(urlText).width;
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, 1 * scale);
      ctx.strokeStyle = color;
      ctx.moveTo(x + prefixWidth, y + 3 * scale);
      ctx.lineTo(x + prefixWidth + width, y + 3 * scale);
      ctx.stroke();
      return;
    }
    const text = rawText.replace(/^visit:\s*/i, '');
    ctx.font = regularFont;
    drawTextLine(ctx, text, x, y, layer);
    return;
  }

  const hasBullet = layer.bullet !== undefined 
    ? layer.bullet 
    : (layer.field === 'f-bullets' || (source.type === 'schedule_list' && source.bullet !== false));
  const prefix = hasBullet ? '\u2022  ' : '';
  ctx.font = regularFont;
  wrapLines(ctx, prefix + rawText, maxWidth, regularFont).forEach(line => {
    drawTextLine(ctx, line, x, y, layer);
    y += lineHeight;
  });
}

function chooseStrategy(t, targetW, targetH) {
  const nativeRatio = (t.w || W) / (t.h || H);
  const targetRatio = targetW / targetH;
  const drift = Math.abs(targetRatio - nativeRatio) / nativeRatio;
  return drift < 0.15 ? 'letterbox' : 'cover-social';
}

function drawBackground(ctx, t, w, h){
  if (t.kind === 'image'){
    const img = bgImages[t._key];
    if (img && img.complete && img.naturalWidth > 0) {
      drawCover(ctx, img, 0, 0, w, h, t.focal || {x:0.5, y:0.5});
    } else { ctx.fillStyle = t.edgeColor || '#16223F'; ctx.fillRect(0,0,w,h); }
  } else {
    const grad = ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0, t.bg1); grad.addColorStop(1, t.bg2);
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
  }
}

function drawLayer(ctx, t, layer, copy, w, h, qrCanvas){
  const showQrRadio = document.querySelector('input[name="show-qr-radio"]:checked');
  const showQr = showQrRadio ? showQrRadio.value === 'yes' : true;
  if (!showQr && layer.type === 'qr') return;
  
  if (layer.hidden) return;
  if (layer === activeEditingLayer) return;
  const designW = t.w || 1122;
  const s = w / designW; // uniform scale factor from design space to actual canvas size
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = layer.alpha ?? 1;
  applyTextShadow(ctx, layer, s);

  if (layer.type === 'edit_row'){
    drawEditRow(ctx, t, layer, copy, w, h, s);
    ctx.globalAlpha = 1;
    clearTextShadow(ctx);
    return;
  }

  if (layer.type === 'qr_caption' && hasEditRowsFor(t, ['f-footintro','f-url','f-email'])){
    ctx.globalAlpha = 1;
    clearTextShadow(ctx);
    return;
  }

  if (layer.type === 'social_footer' && hasEditRowsFor(t, ['f-url','f-email','f-footintro'])){
    ctx.globalAlpha = 1;
    clearTextShadow(ctx);
    return;
  }

  if (layer.type === 'schedule_list' && hasEditRowsFor(t, ['f-t1','f-t2','f-t3','f-bullets'])){
    ctx.globalAlpha = 1;
    clearTextShadow(ctx);
    return;
  }

  if (layer.type === 'list' && hasEditRowsFor(t, ['f-bullets'])){
    ctx.globalAlpha = 1;
    clearTextShadow(ctx);
    return;
  }

  if (layer.type === 'static'){
    const value = layer.text || '';
    if (!value) { ctx.globalAlpha = 1; return; }
    const px = Math.round(parseInt(layer.font.match(/(\d+)px/)[1],10) * s);
    const font = layer.font.replace(/\d+px/, px+'px');
    ctx.font = font;
    ctx.fillStyle = resolveColor(t, layer.color);
    ctx.textAlign = layer.align;
    const x = layer.x * w;
    const y = layer.y * h;
    if (layer.maxW){
      const maxWidth = layer.maxW * w;
      let size = px;
      while (ctx.measureText(value).width > maxWidth && size > 12*s){
        size -= 1; ctx.font = font.replace(/[\d.]+px/, size+'px');
      }
    }
    drawTextLine(ctx, value, x, y, layer);
  }

  if (layer.type === 'schedule_list'){
    let items = (copy.schedule || '').split('   \u2215   ').map(s=>s.trim()).filter(Boolean);
    if (layer.skipItems){ items = items.filter((_, index) => !layer.skipItems.includes(index)); }
    if (layer.includeBullets){ items = items.concat(copy.bullets || []); }
    items = items.slice(0, layer.maxItems || Infinity);
    const px = Math.round(parseInt(layer.font.match(/(\d+)px/)[1],10) * s);
    const font = layer.font.replace(/\d+px/, px+'px');
    ctx.font = font;
    ctx.fillStyle = resolveColor(t, layer.color);
    const prefix = layer.bullet === false ? '' : '\u2022  ';
    const textItems = items.map(item => prefix + item);
    const align = layer.align === 'group-center-left' ? 'left' : layer.align;
    ctx.textAlign = align;
    const widest = layer.align === 'group-center-left'
      ? Math.max(...textItems.map(item => ctx.measureText(item).width), 0)
      : 0;
    const x = layer.align === 'group-center-left'
      ? (layer.x * w) - (widest / 2)
      : layer.x * w;
    let y = layer.y * h;
    textItems.forEach(item => { drawTextLine(ctx, item, x, y, layer); y += layer.lineHeight * s; });
  }

  if (layer.type === 'text'){
    const value = (copy[layer.id] || '').toString();
    if (!value) { ctx.globalAlpha = 1; return; }
    const px = Math.round(parseInt(layer.font.match(/(\d+)px/)[1],10) * s);
    const font = layer.font.replace(/\d+px/, px+'px');
    ctx.font = font;
    ctx.fillStyle = resolveColor(t, layer.color);
    ctx.textAlign = layer.align;
    const x = layer.x * w;
    const y = layer.y * h;
    if (layer.maxW){
      const maxWidth = layer.maxW * w;
      let size = px;
      while (ctx.measureText(value).width > maxWidth && size > 12*s){
        size -= 1; ctx.font = font.replace(/[\d.]+px/, size+'px');
      }
    }
    drawTextLine(ctx, value, x, y, layer);
  }

  if (layer.type === 'wrap'){
    const value = layer.id === 'footer' ? (copy.footIntro + '  ' + copy.url) : (copy[layer.id]||'');
    if (!value) { ctx.globalAlpha = 1; return; }
    const px = Math.round(parseInt(layer.font.match(/(\d+)px/)[1],10) * s);
    const font = layer.font.replace(/\d+px/, px+'px');
    ctx.font = font;
    ctx.fillStyle = resolveColor(t, layer.color);
    ctx.textAlign = layer.align;
    const x = layer.x * w;
    let y = layer.y * h;
    const lines = wrapLines(ctx, value, layer.maxW * w, font);
    lines.slice(0,3).forEach(l=>{ drawTextLine(ctx, l, x, y, layer); y += layer.lineHeight * s; });
  }

  if (layer.type === 'qr_caption'){
    if (!copy.url) { ctx.globalAlpha = 1; return; }
    const px = Math.round(parseInt(layer.font.match(/(\d+)px/)[1],10) * s);
    const regularFont = layer.font.replace(/\d+px/, px+'px');
    const boldFont = (layer.boldFont || layer.font).replace(/\d+px/, px+'px');
    const captionLines = layer.referenceStyle
      ? [copy.footIntro || 'To register please visit:', copy.url, copy.email ? `e-mail: ${copy.email}` : '']
      : [copy.footIntro + '  ' + copy.url];
    const value = captionLines.filter(Boolean).join('\n');
    if (!value.trim()) { ctx.globalAlpha = 1; return; }
    const maxWidth = layer.maxW * w;
    const lines = [];
    const measure = parts => parts.reduce((sum, part) => { ctx.font = part.bold ? boldFont : regularFont; return sum + ctx.measureText(part.text).width; }, 0);
    value.split('\n').forEach(rawLine => {
      const tokens = rawLine.split(/(property's People & Culture office|QR code|visit:|e-mail:)/gi).filter(Boolean);
      const pieces = tokens.flatMap(token => token.split(/(\s+)/).filter(Boolean)).map(text => ({
        text,
        bold: /property's People & Culture office|QR code|visit:|e-mail:/i.test(text)
      }));
      let current = [];
      pieces.forEach(piece => {
        const next = current.concat(piece);
        if (current.length && measure(next) > maxWidth && !/^\s+$/.test(piece.text)){ lines.push(current); current = [piece]; }
        else current = next;
      });
      if (current.length) lines.push(current);
    });
    ctx.fillStyle = resolveColor(t, layer.color);
    ctx.textAlign = 'left';
    let y = layer.y * h;
    lines.slice(0,3).forEach(line => {
      let x = layer.x * w;
      line.forEach(part => { ctx.font = part.bold ? boldFont : regularFont; ctx.fillText(part.text, x, y); x += ctx.measureText(part.text).width; });
      y += layer.lineHeight * s;
    });
  }

  if (layer.type === 'social_footer'){
    if (!copy.url) { ctx.globalAlpha = 1; return; }
    const px = Math.round(parseInt(layer.font.match(/(\d+)px/)[1],10) * s);
    const regularFont = layer.font.replace(/\d+px/, px+'px');
    const boldFont = (layer.boldFont || layer.font).replace(/\d+px/, px+'px');
    const parts = [
      { text:'visit: ', bold:true },
      { text:copy.url, bold:false, underline:true }
    ];
    ctx.fillStyle = resolveColor(t, layer.color);
    ctx.textAlign = 'left';
    let x = layer.x * w;
    const y = layer.y * h;
    parts.forEach(part => {
      ctx.font = part.bold ? boldFont : regularFont;
      ctx.fillText(part.text, x, y);
      const width = ctx.measureText(part.text).width;
      if (part.underline){
        ctx.beginPath();
        ctx.lineWidth = Math.max(1, 1 * s);
        ctx.strokeStyle = resolveColor(t, layer.color);
        ctx.moveTo(x, y + 3 * s);
        ctx.lineTo(x + width, y + 3 * s);
        ctx.stroke();
      }
      x += width;
    });
  }

  if (layer.type === 'list'){
    const items = copy.bullets || [];
    const px = Math.round(parseInt(layer.font.match(/(\d+)px/)[1],10) * s);
    const font = layer.font.replace(/\d+px/, px+'px');
    ctx.font = font;
    ctx.fillStyle = resolveColor(t, layer.color);
    const renderedItems = items.slice(0, layer.maxItems || 4).map(item => layer.bullet === false ? item : '•  ' + item);
    const isGroupCenterLeft = layer.align === 'group-center-left';
    ctx.textAlign = isGroupCenterLeft ? 'left' : layer.align;
    const widest = isGroupCenterLeft ? Math.max(...renderedItems.map(item => ctx.measureText(item).width), 0) : 0;
    const x = isGroupCenterLeft ? (layer.x * w) - (widest / 2) : layer.x * w;
    let y = layer.y * h;
    renderedItems.forEach(bulletText=>{
      if (layer.maxW){
        const subLines = wrapLines(ctx, bulletText, layer.maxW * w, font);
        subLines.forEach(l=>{ drawTextLine(ctx, l, x, y, layer); y += layer.lineHeight * s; });
      } else {
        drawTextLine(ctx, bulletText, x, y, layer);
        y += layer.lineHeight * s;
      }
    });
  }

  if (layer.type === 'rule'){
    ctx.strokeStyle = resolveColor(t, layer.color);
    ctx.lineWidth = layer.lineWidth ? layer.lineWidth * s : Math.max(1, 1.5*s);
    ctx.beginPath();
    ctx.moveTo(layer.x1*w, layer.y*h);
    ctx.lineTo(layer.x2*w, layer.y*h);
    ctx.stroke();
  }

  if (layer.type === 'qr' && qrCanvas){
    const size = layer.size * w;
    const x = layer.x * w, y = layer.y * h;
    const pad = (layer.pad ?? 18) * s;
    ctx.fillStyle = t.qrBg;
    ctx.fillRect(x-pad, y-pad, size+pad*2, size+pad*2);
    ctx.drawImage(qrCanvas, x, y, size, size);
  }

  ctx.globalAlpha = 1;
  clearTextShadow(ctx);
}

function drawTextLine(ctx, text, x, y, layer){
  const spacing = layer.letterSpacing || 0;
  if (!spacing){
    ctx.fillText(text, x, y);
    return;
  }
  const chars = Array.from(text);
  const totalWidth = chars.reduce((sum, char, index) => sum + ctx.measureText(char).width + (index ? spacing : 0), 0);
  let cursor = x;
  if (ctx.textAlign === 'center') cursor -= totalWidth / 2;
  if (ctx.textAlign === 'right') cursor -= totalWidth;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((char, index) => {
    if (index) cursor += spacing;
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width;
  });
  ctx.textAlign = previousAlign;
}

function applyTextShadow(ctx, layer, scale){
  if (!layer.shadow){ clearTextShadow(ctx); return; }
  ctx.shadowColor = layer.shadow.color || 'rgba(255,255,255,0.2)';
  ctx.shadowOffsetX = (layer.shadow.x || 0) * scale;
  ctx.shadowOffsetY = (layer.shadow.y || 0) * scale;
  ctx.shadowBlur = (layer.shadow.blur || 0) * scale;
}

function clearTextShadow(ctx){
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
}

/* real QR code, generated once per render via the qrcode library */
let qrCache = { text: null, canvas: null };
function getQrCanvas(text, cb){
  if (qrCache.text === text && qrCache.canvas){ cb(qrCache.canvas); return; }
  const cvs = document.createElement('canvas');
  QRCode.toCanvas(cvs, text, { width: 256, margin: 0, errorCorrectionLevel: 'M' }, (err) => {
    if (err) console.error('QR code generation failed:', err);
    qrCache = { text, canvas: cvs };
    cb(cvs);
  });
}

function renderNativeToCanvas(canvasEl, t, wPx, hPx, layersToDraw, cb) {
  const ctx = canvasEl.getContext('2d');
  canvasEl.width = wPx; canvasEl.height = hPx;
  
  if (t.draw) {
    const copy = getCopy();
    t.draw(ctx, wPx, hPx, copy);
    if (cb) cb();
    return;
  }

  drawBackground(ctx, t, wPx, hPx);
  const copy = getCopy();
  const qrLayer = (layersToDraw || []).find(l => l.type === 'qr');
  const drawTextLayers = (qrCanvas) => {
    (layersToDraw || []).forEach(layer => { if (layer.type !== 'qr') drawLayer(ctx, t, layer, copy, wPx, hPx, null); });
    if (qrLayer && qrCanvas) drawLayer(ctx, t, qrLayer, copy, wPx, hPx, qrCanvas);
    if (cb) cb();
  };
  const qrUrl = qrUrlForTemplate();
  if (qrLayer && qrUrl){
    getQrCanvas(qrUrl, (qrCanvas) => drawTextLayers(qrCanvas));
  } else {
    drawTextLayers(null);
  }
}

function renderToCanvas(canvasEl, tplKey, wPx, hPx, cb){
  const t = TEMPLATES[tplKey];
  const strategy = chooseStrategy(t, wPx, hPx);
  
  if (strategy === 'cover-social') {
    const layersToDraw = t.socialLayers || t.layers || [];
    renderNativeToCanvas(canvasEl, t, wPx, hPx, layersToDraw, cb);
  } else {
    const ctx = canvasEl.getContext('2d');
    canvasEl.width = wPx; canvasEl.height = hPx;
    ctx.fillStyle = t.edgeColor || '#FFFFFF';
    ctx.fillRect(0, 0, wPx, hPx);
    
    const designW = t.w || 1122;
    const designH = t.h || 1588;
    const master = document.createElement('canvas');
    renderNativeToCanvas(master, t, designW, designH, t.layers || [], () => {
      const scale = Math.min(wPx / designW, hPx / designH);
      const dw = designW * scale;
      const dh = designH * scale;
      const dx = (wPx - dw) / 2;
      const dy = (hPx - dh) / 2;
      ctx.drawImage(master, dx, dy, dw, dh);
      if (cb) cb();
    });
  }
}

let renderPending = false;
let renderCallbacks = [];

function render(afterOverlay){
  if (afterOverlay) renderCallbacks.push(afterOverlay);
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    if (typeof syncCustomLayers === 'function') syncCustomLayers();
    const size = getExportSize(TEMPLATES[currentTpl]);
    updateQrStatus();
    renderToCanvas(canvas, currentTpl, size.w, size.h, () => {
      updateEditOverlay();
      const cbs = renderCallbacks;
      renderCallbacks = [];
      renderPending = false;
      cbs.forEach(cb => cb());
    });
  });
}

function normalizedQrUrl(value){
  const raw = (value || '').trim();
  if (!raw) return '';
  const withScheme = /^https?:\/\//i.test(raw)
    ? raw
    : /^mskcc\.convio\.net\//i.test(raw) ? 'http://' + raw : 'https://' + raw;
  return withScheme.replace(/^https:\/\/mskcc\.convio\.net/i, 'http://mskcc.convio.net');
}

function isValidQrInput(value){
  const raw = (value || '').trim();
  if (!raw || /\s/.test(raw)) return false;
  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
    const url = new URL(candidate);
    return !!url.hostname && url.hostname.includes('.') && !url.hostname.startsWith('.') && !url.hostname.endsWith('.');
  } catch (e) {
    return false;
  }
}

function qrUrlForTemplate(){
  const showQrRadio = document.querySelector('input[name="show-qr-radio"]:checked');
  const showQr = showQrRadio ? showQrRadio.value === 'yes' : true;
  if (!showQr) return '';
  const value = document.getElementById('f-qr-url').value;
  return isValidQrInput(value) ? normalizedQrUrl(value) : '';
}

function onPrintedUrlChange() {
  const sameLinkEl = document.getElementById('qr-same-link');
  const sameLink = sameLinkEl ? sameLinkEl.checked : true;
  if (sameLink) {
    const printedVal = document.getElementById('f-url').value;
    const qrUrlInput = document.getElementById('f-qr-url');
    if (qrUrlInput) qrUrlInput.value = printedVal;
  }
  saveCopyDraft();
  render();
}

function onQrToggle(show) {
  const section = document.getElementById('qr-link-section');
  if (section) section.style.display = show ? 'block' : 'none';
  saveCopyDraft();
  render();
}

function onSameLinkToggle(same) {
  const container = document.getElementById('qr-custom-link-container');
  if (container) container.style.display = same ? 'none' : 'block';
  if (same) {
    const printedVal = document.getElementById('f-url').value;
    const qrUrlInput = document.getElementById('f-qr-url');
    if (qrUrlInput) qrUrlInput.value = printedVal;
  }
  saveCopyDraft();
  render();
}

function extractUrlFromText(value){
  const match = (value || '').match(/(?:https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?/i);
  return match ? match[0].replace(/[),.;]+$/,'') : '';
}

function updateQrStatus(){
  const t = TEMPLATES[currentTpl];
  const urlInput = document.getElementById('f-qr-url');
  const qrInputWrap = document.getElementById('qrInputWrap');
  if (!urlInput) return;
  const hasQrLayer = (t.layers || []).some(layer => layer.type === 'qr');
  const copy = getCopy();
  const defaultUrl = (TEMPLATE_COPY[currentTpl] || {}).url || '';
  urlInput.placeholder = defaultUrl || copy.qrUrl || '';
  if (!hasQrLayer){
    urlInput.classList.remove('qr-processed');
    if (qrInputWrap) qrInputWrap.classList.remove('ready');
    return;
  }
  const encoded = qrUrlForTemplate();
  urlInput.classList.toggle('qr-processed', !!encoded);
  if (qrInputWrap) qrInputWrap.classList.toggle('ready', !!encoded);
  if (lastQrStatusText !== encoded){
    if (qrInputWrap) {
      qrInputWrap.animate([
        { transform:'scale(1)' },
        { transform:'scale(1.01)' },
        { transform:'scale(1)' }
      ], { duration: 420, easing:'ease-out' });
    }
    lastQrStatusText = encoded;
  }
}

const editOverlay = document.getElementById('editOverlay');
const stage = document.getElementById('posterStage');
let selectedAdminLayer = null;
let lastQrStatusText = '';
let adminUndoStack = [];
let isRestoringUndo = false;
let activeEditingLayer = null;

function getLayerOverrideSnapshot(tplKey = currentTpl){
  try { return JSON.parse(localStorage.getItem(overrideStorageKey(tplKey)) || '{}'); }
  catch (e) { return {}; }
}

function pushUndoSnapshot(){
  if (isRestoringUndo) return;
  const copy = {};
  COPY_FIELD_IDS.forEach(id => { copy[id] = document.getElementById(id).value; });
  pushUndoSnapshotFrom(copy, getLayerOverrideSnapshot(currentTpl));
}

function pushUndoSnapshotFrom(copy, overrides){
  if (isRestoringUndo) return;
  adminUndoStack.push({
    tpl: currentTpl,
    copy,
    overrides: overrides || getLayerOverrideSnapshot(currentTpl)
  });
  if (adminUndoStack.length > 60) adminUndoStack.shift();
  updateUserUndoButton();
}

function updateUserUndoButton(){
  const btn = document.getElementById('userUndoBtn');
  if (btn) btn.textContent = adminUndoStack.length ? 'Undo last edit' : 'Restore template text';
}

function overrideStorageKey(tplKey){
  return 'posterLayerOverrides:' + tplKey;
}

function saveLayerOverrides(){
  const t = TEMPLATES[currentTpl];
  if (!t) return;
  const overrides = {};
  (t.layers || []).forEach(layer => {
    overrides[layer.id + ':' + layer.type] = {
      x: layer.x,
      y: layer.y,
      align: layer.align,
      hidden: !!layer.hidden,
      letterSpacing: layer.letterSpacing || 0,
      text: layer.text,
      font: layer.font,
      size: layer.size,
      lineWidth: layer.lineWidth,
      x1: layer.x1,
      x2: layer.x2,
      shadow: layer.shadow,
      maxW: layer.maxW,
      bullet: layer.bullet
    };
  });
  localStorage.setItem(overrideStorageKey(currentTpl), JSON.stringify(overrides));
}

let globalOverrides = {};

function applyLayerOverrides(tplKey){
  const t = TEMPLATES[tplKey];
  if (!t) return;
  let localOverrides = {};
  try { localOverrides = JSON.parse(localStorage.getItem(overrideStorageKey(tplKey)) || '{}'); }
  catch (e) { localOverrides = {}; }
  
  const merged = Object.assign({}, globalOverrides[tplKey] || {}, localOverrides);
  
  (t.layers || []).forEach(layer => {
    const saved = merged[layer.id + ':' + layer.type];
    if (!saved) return;
    ['x','y','align','hidden','letterSpacing','text','font','size','lineWidth','x1','x2','shadow','maxW','bullet'].forEach(key => {
      if (saved[key] !== undefined) layer[key] = saved[key];
    });
  });
}

function editableLayersForTemplate(t){
  const hasRowEditors = (t.layers || []).some(layer => layer.type === 'edit_row');
  return (t.layers || []).filter(layer => {
    if (isAdminMode && ['qr','rule'].includes(layer.type)) return !layer.hidden;
    if (hasRowEditors && ['schedule_list','qr_caption','list','social_footer'].includes(layer.type)) return false;
    return ['text','wrap','list','schedule_list','qr_caption','social_footer','static','edit_row'].includes(layer.type)
      && (!layer.hidden || isAdminMode);
  });
}

function getLayerEditValue(layer){
  const copy = getCopy();
  if (layer.type === 'edit_row'){
    const field = document.getElementById(layer.field);
    if (!field) return '';
    const value = field.value.trim();
    if (layer.row !== undefined){
      return value.split('\n')[layer.row] || '';
    }
    return layer.prefix && value ? layer.prefix + value : value;
  }
  if (layer.id === 'schedule') {
    const scheduleLines = (copy.schedule || '').split('   \u2215   ').map(v => v.trim()).filter(Boolean);
    return (layer.includeBullets ? scheduleLines.concat(copy.bullets || []) : scheduleLines).slice(0, layer.maxItems || 4).join('\n');
  }
  if (layer.id === 'bullets') return (document.getElementById('f-bullets').value || copy.bullets.join('\n')).trim();
  if (layer.id === 'footer') {
    const email = document.getElementById('f-email').value.trim();
    return [
      copy.footIntro,
      document.getElementById('f-url').value.trim(),
      email ? 'e-mail: ' + email : ''
    ].filter(Boolean).join('\n');
  }
  if (layer.type === 'static') return layer.text || '';
  const field = document.getElementById('f-' + layer.id);
  return field ? field.value || copy[layer.id] || '' : '';
}

function commitLayerEdit(layer, value, trackUndo = true){
  if (trackUndo) pushUndoSnapshot();
  const lines = value.split('\n').map(v => v.trim());
  const nonEmptyLines = lines.filter(Boolean);
  if (layer.type === 'edit_row'){
    const field = document.getElementById(layer.field);
    if (field){
      if (layer.row !== undefined){
        const rows = (field.value || '').split('\n');
        while (rows.length <= layer.row) rows.push('');
        rows[layer.row] = value.trim();
        field.value = rows.join('\n').replace(/\n+$/,'');
      } else {
        field.value = value.replace(layer.prefix || '', '').trim();
      }
    }
  } else if (layer.id === 'schedule'){
    if (layer.includeBullets){
      document.getElementById('f-t1').value = nonEmptyLines[0] || '';
      document.getElementById('f-t2').value = '';
      document.getElementById('f-t3').value = '';
      document.getElementById('f-bullets').value = nonEmptyLines.slice(1).join('\n');
    } else {
      document.getElementById('f-t1').value = nonEmptyLines[0] || '';
      document.getElementById('f-t2').value = nonEmptyLines[1] || '';
      document.getElementById('f-t3').value = nonEmptyLines[2] || '';
    }
  } else if (layer.id === 'bullets'){
    document.getElementById('f-bullets').value = value.trim();
  } else if (layer.id === 'footer'){
    if (layer.type === 'social_footer'){
      document.getElementById('f-url').value = extractUrlFromText(value) || value.replace(/^visit:\s*/i,'').trim();
    } else {
      const nextUrl = extractUrlFromText(value);
      document.getElementById('f-url').value = nextUrl || '';
      const emailMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      document.getElementById('f-email').value = emailMatch ? emailMatch[0] : '';
      const introLine = nonEmptyLines.find(line => !extractUrlFromText(line) && !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line));
      if (introLine) document.getElementById('f-footintro').value = introLine.replace(/\s+$/,'');
    }
  } else if (layer.type === 'static'){
    layer.text = value.replace(/\n+/g, ' ').trim();
    saveLayerOverrides();
  } else {
    const field = document.getElementById('f-' + layer.id);
    if (field) field.value = value.replace(/\n+/g, ' ').trim();
  }
  saveCopyDraft();
  render();
}

function undoLastUserEdit(){
  const snapshot = adminUndoStack.pop();
  isRestoringUndo = true;
  if (snapshot){
    currentTpl = snapshot.tpl;
    COPY_FIELD_IDS.forEach(id => {
      const field = document.getElementById(id);
      if (field && snapshot.copy[id] !== undefined) field.value = snapshot.copy[id];
    });
    localStorage.setItem(overrideStorageKey(currentTpl), JSON.stringify(snapshot.overrides || {}));
    applyLayerOverrides(currentTpl);
  } else {
    const defaults = getTemplateDefaults(currentTpl);
    COPY_FIELD_IDS.forEach(id => {
      const field = document.getElementById(id);
      if (field) field.value = defaults[id] || '';
    });
  }
  selectedAdminLayer = null;
  saveCopyDraft(currentTpl);
  refreshActive();
  updateAdminGuides();
  render();
  isRestoringUndo = false;
  updateUserUndoButton();
}

function openVisualEditor(layer, rect){
  selectAdminLayer(layer);
  const existing = editOverlay.querySelector('.visual-editor');
  if (existing) existing.remove();
  activeEditingLayer = layer;
  render(() => mountVisualEditor(layer, rect));
}

function mountVisualEditor(layer, rect){
  const currentValue = getLayerEditValue(layer);
  const useTextarea = layer.type !== 'text' && layer.id !== 'date' || currentValue.length > 34;
  const editor = document.createElement(useTextarea ? 'textarea' : 'input');
  const t = TEMPLATES[currentTpl];
  const source = layer.type === 'edit_row' ? styleSourceForEditRow(t, layer) : layer;
  const designW = t.w || W;
  const displayScale = canvas.clientWidth / designW;
  const layerFont = source.font || layer.font || '500 28px "RigidSquareWeb", "Chakra Petch", sans-serif';
  const posterFont = layerFont.replace(/(\d+)px/, (_, px) => Math.max(8, Math.round(Number(px) * displayScale)) + 'px');
  editor.className = 'visual-editor';
  editor.value = currentValue;
  editor.style.left = rect.left + 'px';
  editor.style.top = rect.top + 'px';
  editor.style.width = Math.max(160, rect.width) + 'px';
  editor.style.minHeight = Math.max(18, rect.height) + 'px';
  editor.style.font = posterFont;
  editor.style.color = resolveColor(t, source.color || layer.color);
  editor.style.textAlign = layer.align === 'group-center-left' ? 'left' : (layer.align || source.align || 'left');
  editor.style.letterSpacing = ((layer.letterSpacing || 0) * displayScale) + 'px';
  if (layer.lineHeight || source.lineHeight) editor.style.lineHeight = Math.max(1, Math.round((layer.lineHeight || source.lineHeight) * displayScale)) + 'px';
  if (useTextarea) editor.style.height = Math.max(24, rect.height + 2) + 'px';
  editOverlay.appendChild(editor);
  editor.focus();
  editor.select();
  let cancelled = false;
  const finish = () => {
    if (cancelled) return;
    activeEditingLayer = null;
    commitLayerEdit(layer, editor.value);
  };
  editor.addEventListener('blur', finish, { once:true });
  editor.addEventListener('keydown', e => {
    if (e.key === 'Escape'){
      cancelled = true;
      activeEditingLayer = null;
      editor.remove();
      render();
      return;
    }
    if (e.key === 'Enter' && (editor.tagName === 'INPUT' || e.metaKey || e.ctrlKey)){
      e.preventDefault();
      editor.blur();
    }
  });
}

let showGrid = false;

function toggleGrid() {
  showGrid = !showGrid;
  render();
}

function selectAdminLayer(layer){
  if (!isAdminMode) return;
  selectedAdminLayer = layer;
  const tools = document.getElementById('adminLayerTools');
  const noSelection = document.getElementById('noLayerSelected');
  const name = document.getElementById('adminLayerName');
  
  if (!layer) {
    if (tools) tools.style.display = 'none';
    if (noSelection) noSelection.style.display = 'block';
    return;
  }
  
  if (tools) tools.style.display = 'block';
  if (noSelection) noSelection.style.display = 'none';
  if (name) name.textContent = `Layer: ${layer.id.replace('f-', '').toUpperCase()}`;
  
  // 1. Position  // 2. Layout
  document.getElementById('prop-x').value = ((layer.x || 0) * 100).toFixed(1);
  document.getElementById('prop-y').value = ((layer.y || 0) * 100).toFixed(1);
  
  const maxWInput = document.getElementById('prop-maxW');
  if (maxWInput) {
    const t = TEMPLATES[currentTpl];
    const source = layer.type === 'edit_row' ? styleSourceForEditRow(t, layer) : layer;
    const currentMaxW = layer.maxW || source.maxW || 0;
    maxWInput.value = currentMaxW ? (currentMaxW * 100).toFixed(1) : '';
  }

  const gapContainer = document.getElementById('prop-gap-container');
  const gapInput = document.getElementById('prop-gap');
  const group = layersMovedWith(layer);
  if (group.length > 1) {
    gapContainer.style.display = 'flex';
    const sorted = [...group].sort((a, b) => a.y - b.y);
    const t = TEMPLATES[currentTpl];
    const designH = t.h || H;
    const currentGap = Math.round((sorted[1].y - sorted[0].y) * designH);
    gapInput.value = currentGap;
  } else {
    gapContainer.style.display = 'none';
  }
  
  // 2. Sizing / Sizing group
  const sizeContainer = document.getElementById('prop-size-container');
  const sizeLabel = document.getElementById('size-label');
  const sizeInput = document.getElementById('prop-size');
  
  if (layer.type === 'qr') {
    sizeContainer.style.display = 'flex';
    sizeLabel.textContent = 'Size (Scale)';
    sizeInput.value = layer.size || 0.08;
    sizeInput.step = '0.01';
  } else if (layer.type === 'rule') {
    sizeContainer.style.display = 'flex';
    sizeLabel.textContent = 'Line Width';
    sizeInput.value = layer.lineWidth || 2;
    sizeInput.step = '1';
  } else {
    sizeContainer.style.display = 'none';
  }
  
  // 3. Typography
  const typoGroup = document.getElementById('group-typography');
  if (layer.font || layer.type === 'edit_row' || layer.type === 'text') {
    typoGroup.style.display = 'block';
    
    const t = TEMPLATES[currentTpl];
    const source = layer.type === 'edit_row' ? styleSourceForEditRow(t, layer) : layer;
    const fontStr = layer.font || source.font || '';
    
    // Set font weight
    const weightSelect = document.getElementById('prop-font-weight');
    if (weightSelect) {
      if (fontStr.toLowerCase().includes('italic')) weightSelect.value = 'italic';
      else if (fontStr.toLowerCase().includes('bold') || fontStr.includes('700') || fontStr.includes('600')) weightSelect.value = '700';
      else weightSelect.value = '400';
    }
    
    // Set font size
    const sizeMatch = fontStr.match(/(\d+)px/);
    document.getElementById('prop-font-size').value = sizeMatch ? parseInt(sizeMatch[1]) : 28;
    
    // 3b. Bullet Toggle
    const bulletContainer = document.getElementById('prop-bullet-container');
    const bulletCheckbox = document.getElementById('prop-bullet');
    if (layer.type === 'edit_row' || layer.type === 'schedule_list' || layer.type === 'list') {
      bulletContainer.style.display = 'flex';
      const defaultBullet = layer.field === 'f-bullets' || (source.type === 'schedule_list' && source.bullet !== false);
      bulletCheckbox.checked = layer.bullet !== undefined ? layer.bullet : defaultBullet;
    } else {
      bulletContainer.style.display = 'none';
    }  
    
    // Set letter spacing
    document.getElementById('prop-letter-spacing').value = layer.letterSpacing || 0;
    
    // Set alignment button states
    const align = layer.align || 'left';
    document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('align-' + (align === 'group-center-left' ? 'center' : align));
    if (activeBtn) activeBtn.classList.add('active');
  } else {
    typoGroup.style.display = 'none';
  }
  
  // 4. Effects (Shadow)
  const shadowCheck = document.getElementById('prop-shadow-enable');
  const shadowProps = document.getElementById('shadow-properties');
  if (layer.shadow) {
    shadowCheck.checked = true;
    shadowProps.style.display = 'block';
    document.getElementById('prop-shadow-x').value = layer.shadow.x || 0;
    document.getElementById('prop-shadow-y').value = layer.shadow.y || 0;
    document.getElementById('prop-shadow-blur').value = layer.shadow.blur || 0;
    document.getElementById('prop-shadow-color').value = layer.shadow.color || '#ffffff';
  } else {
    shadowCheck.checked = false;
    shadowProps.style.display = 'none';
  }
  
  updateAdminGuides();
}

function updateSelectedLayerProp(key, value) {
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  
  const group = layersMovedWith(selectedAdminLayer);
  if (group.length > 1) {
    if (key === 'x') {
      group.forEach(l => l.x = value);
    } else if (key === 'y') {
      const deltaY = value - selectedAdminLayer.y;
      group.forEach(l => l.y += deltaY);
    } else if (key === 'align') {
      group.forEach(l => l.align = value);
    } else {
      selectedAdminLayer[key] = value;
    }
  } else {
    selectedAdminLayer[key] = value;
  }
  
  const editor = document.querySelector('.visual-editor');
  if (editor) {
    const t = TEMPLATES[currentTpl];
    const displayScale = canvas.clientWidth / (t.w || 3300);
    if (key === 'letterSpacing') editor.style.letterSpacing = ((value || 0) * displayScale) + 'px';
    if (key === 'align') editor.style.textAlign = value === 'group-center-left' ? 'left' : value;
  }
  
  saveLayerOverrides();
  render();
}

function updateSelectedLayerTypography() {
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  
  const weightSelect = document.getElementById('prop-font-weight');
  const weightVal = weightSelect ? weightSelect.value : '400';
  const size = document.getElementById('prop-font-size').value;
  
  const oldFontStr = selectedAdminLayer.font || '500 28px "RigidSquareWeb", sans-serif';
  const sizeMatch = oldFontStr.match(/(\d+)px\s*(.*)$/);
  const familyPart = sizeMatch ? sizeMatch[2] : '"RigidSquareWeb", sans-serif';
  
  let fontStyle = '';
  let fontWeight = '';
  if (weightVal === 'italic') {
    fontStyle = 'italic ';
    fontWeight = '400 ';
  } else {
    fontWeight = weightVal + ' ';
  }
  
  selectedAdminLayer.font = `${fontStyle}${fontWeight}${size}px ${familyPart}`;
  
  if (selectedAdminLayer.boldFont) {
    selectedAdminLayer.boldFont = `bold ${size}px ${familyPart}`;
  }
  
  const editor = document.querySelector('.visual-editor');
  if (editor) {
    const t = TEMPLATES[currentTpl];
    const displayScale = canvas.clientWidth / (t.w || 3300);
    editor.style.font = selectedAdminLayer.font.replace(/(\d+)px/, (_, px) => Math.max(8, Math.round(Number(px) * displayScale)) + 'px');
  }
  
  saveLayerOverrides();
  render();
}

function updateSelectedLayerShadow() {
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  
  const enabled = document.getElementById('prop-shadow-enable').checked;
  if (enabled) {
    selectedAdminLayer.shadow = {
      x: parseInt(document.getElementById('prop-shadow-x').value) || 0,
      y: parseInt(document.getElementById('prop-shadow-y').value) || 0,
      blur: parseInt(document.getElementById('prop-shadow-blur').value) || 0,
      color: document.getElementById('prop-shadow-color').value || '#ffffff'
    };
    document.getElementById('shadow-properties').style.display = 'block';
  } else {
    selectedAdminLayer.shadow = null;
    document.getElementById('shadow-properties').style.display = 'none';
  }
  
  saveLayerOverrides();
  render();
}

function refreshAdminPanel(){
  const sidebar = document.getElementById('figmaSidebar');
  if (sidebar) {
    sidebar.style.display = isAdminMode ? 'flex' : 'none';
    if (isAdminMode) {
      document.body.classList.add('admin-active');
    } else {
      document.body.classList.remove('admin-active');
    }
  }
  if (!selectedAdminLayer) {
    selectAdminLayer(null);
  }
}

function layersMovedWith(layer){
  const t = TEMPLATES[currentTpl];
  if (!t) return [layer];
  
  // Group 1: Schedule items
  const scheduleFields = ['f-t1', 'f-t2', 'f-t3', 'f-bullets'];
  if (layer.type === 'edit_row' && scheduleFields.includes(layer.field)) {
    return t.layers.filter(l => l.type === 'edit_row' && scheduleFields.includes(l.field));
  }
  
  // Group 2: Footer items
  const footerFields = ['f-footintro', 'f-url', 'f-email'];
  if (layer.type === 'edit_row' && footerFields.includes(layer.field)) {
    return t.layers.filter(l => l.type === 'edit_row' && footerFields.includes(l.field));
  }
  
  return [layer];
}

function updateGroupGap(gapPx) {
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  const group = layersMovedWith(selectedAdminLayer);
  if (group.length > 1) {
    const t = TEMPLATES[currentTpl];
    const designH = t.h || H;
    const spacingRatio = gapPx / designH;
    const sorted = [...group].sort((a, b) => a.y - b.y);
    const baseY = sorted[0].y;
    sorted.forEach((l, index) => {
      l.y = baseY + index * spacingRatio;
      if (l.lineHeight !== undefined) l.lineHeight = gapPx;
    });
  }
  saveLayerOverrides();
  render();
}

function moveLayerGroup(layer, dx, dy){
  layersMovedWith(layer).forEach(item => {
    if (item.type === 'rule'){
      item.x1 += dx;
      item.x2 += dx;
      item.y += dy;
    } else {
      item.x += dx;
      item.y += dy;
    }
  });
}

function nudgeSelectedLayer(dx, dy){
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  const t = TEMPLATES[currentTpl];
  moveLayerGroup(selectedAdminLayer, dx / (t.w || W), dy / (t.h || H));
  
  // Update sidebar inputs
  document.getElementById('prop-x').value = Math.round((selectedAdminLayer.x || 0) * 1000) / 10;
  document.getElementById('prop-y').value = Math.round((selectedAdminLayer.y || 0) * 1000) / 10;
  
  saveLayerOverrides();
  render();
}

function alignSelectedLayer(align){
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  selectedAdminLayer.align = align;
  if (align === 'left') selectedAdminLayer.x -= 0.005;
  if (align === 'right') selectedAdminLayer.x += 0.005;
  
  // Update segment control buttons active state
  document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('align-' + align);
  if (activeBtn) activeBtn.classList.add('active');
  
  saveLayerOverrides();
  render();
}

function spaceSelectedLayer(delta){
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  selectedAdminLayer.letterSpacing = Math.max(-20, Math.min(80, (selectedAdminLayer.letterSpacing || 0) + delta));
  
  // Update spacing input
  document.getElementById('prop-letter-spacing').value = selectedAdminLayer.letterSpacing;
  
  saveLayerOverrides();
  render();
}

function resizeFontString(font, delta){
  if (!font) return font;
  return font.replace(/(\d+)px/, (_, px) => Math.max(6, Number(px) + delta) + 'px');
}

function resizeSelectedLayer(direction){
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  if (selectedAdminLayer.type === 'qr'){
    selectedAdminLayer.size = Math.max(0.025, Math.min(0.22, (selectedAdminLayer.size || 0.08) + direction * 0.005));
  } else if (selectedAdminLayer.type === 'rule'){
    selectedAdminLayer.lineWidth = Math.max(1, (selectedAdminLayer.lineWidth || 2) + direction);
    selectedAdminLayer.x2 = Math.max(selectedAdminLayer.x1 + 0.04, selectedAdminLayer.x2 + direction * 0.01);
  } else if (selectedAdminLayer.font){
    selectedAdminLayer.font = resizeFontString(selectedAdminLayer.font, direction * 2);
    if (selectedAdminLayer.boldFont) selectedAdminLayer.boldFont = resizeFontString(selectedAdminLayer.boldFont, direction * 2);
  } else {
    spaceSelectedLayer(direction);
    return;
  }
  saveLayerOverrides();
  render();
}

function toggleSelectedLayer(){
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  selectedAdminLayer.hidden = !selectedAdminLayer.hidden;
  saveLayerOverrides();
  render();
}

function deleteSelectedLayer(){
  if (!selectedAdminLayer) return;
  pushUndoSnapshot();
  if (selectedAdminLayer.type === 'edit_row'){
    commitLayerEdit(selectedAdminLayer, '', false);
  } else {
    selectedAdminLayer.hidden = true;
    saveLayerOverrides();
    render();
  }
}

function undoAdminChange(){
  undoLastUserEdit();
}

function updateAdminGuides(){
  if (!stage) return;
  stage.classList.toggle('admin-guides', isAdminMode);
  const guideV = document.getElementById('selectedGuideV');
  const guideH = document.getElementById('selectedGuideH');
  if (!guideV || !guideH) return;
  if (!isAdminMode || !selectedAdminLayer){
    guideV.style.display = 'none';
    guideH.style.display = 'none';
    return;
  }
  guideV.style.display = 'block';
  guideH.style.display = 'block';
  const guideX = selectedAdminLayer.type === 'rule'
    ? ((selectedAdminLayer.x1 + selectedAdminLayer.x2) / 2)
    : selectedAdminLayer.x;
  guideV.style.left = ((guideX || 0) * 100) + '%';
  guideH.style.top = ((selectedAdminLayer.y || 0) * 100) + '%';
}

function overlayGeometryForLayer(layer, t, designW, designH, fit, scaleX, scaleY, dx, dy, fontPx){
  if (layer.type === 'rule'){
    const left = (dx + layer.x1 * designW * fit) * scaleX;
    const top = (dy + layer.y * designH * fit) * scaleY;
    const width = Math.max(36, (layer.x2 - layer.x1) * designW * fit * scaleX);
    const height = Math.max(12, (layer.lineWidth || 2) * fit * scaleY + 10);
    return { left, top, width, height, align: 'left' };
  }
  if (layer.type === 'qr'){
    const left = (dx + layer.x * designW * fit) * scaleX;
    const top = (dy + layer.y * designH * fit) * scaleY;
    const width = Math.max(24, layer.size * designW * fit * scaleX);
    return { left, top, width, height: width, align: 'left' };
  }
  const left = (dx + layer.x * designW * fit) * scaleX;
  const top = (dy + layer.y * designH * fit) * scaleY;
  const width = Math.max(80, (layer.maxW ? layer.maxW * designW * fit * scaleX : fontPx * 8));
  return { left, top, width, align: layer.align || 'center' };
}

function estimatedOverlayLineCount(layer, width, fontPx){
  const value = getLayerEditValue(layer);
  const explicitLines = Math.max(1, (value || '').split('\n').length);
  if (!value || !width || !fontPx) return explicitLines;
  const avgCharWidth = fontPx * 0.58;
  const wrappedLines = (value || '').split('\n').reduce((sum, line) => {
    return sum + Math.max(1, Math.ceil((line.length * avgCharWidth) / width));
  }, 0);
  return Math.max(explicitLines, wrappedLines);
}

function updateEditOverlay(){
  if (!editOverlay) return;
  editOverlay.innerHTML = '';
  const t = TEMPLATES[currentTpl];
  if (!t || chooseStrategy(t, canvas.width, canvas.height) !== 'letterbox') return;
  const displayW = canvas.clientWidth;
  const displayH = canvas.clientHeight;
  const scaleX = displayW / canvas.width;
  const scaleY = displayH / canvas.height;
  const designW = t.w || W;
  const designH = t.h || H;
  const fit = Math.min(canvas.width / designW, canvas.height / designH);
  const dx = (canvas.width - designW * fit) / 2;
  const dy = (canvas.height - designH * fit) / 2;
  editableLayersForTemplate(t).forEach(layer => {
    const source = layer.type === 'edit_row' ? styleSourceForEditRow(t, layer) : layer;
    const sourceFont = source.font || layer.font || '500 28px "RigidSquareWeb", "Chakra Petch", sans-serif';
    const fontPx = parseInt(sourceFont.match(/(\d+)px/)[1], 10) * fit * scaleX;
    const geometry = overlayGeometryForLayer(layer, t, designW, designH, fit, scaleX, scaleY, dx, dy, fontPx);
    const left = geometry.left;
    const top = geometry.top;
    const width = geometry.width;
    const lineCount = layer.type === 'edit_row'
      ? 1
      : layer.type === 'schedule_list' ? (layer.maxItems || 2)
      : layer.type === 'qr_caption' ? 3
      : layer.type === 'list' ? (layer.maxItems || 2)
      : layer.type === 'wrap' ? estimatedOverlayLineCount(layer, width, fontPx)
      : 1;
    const height = layer.type === 'edit_row'
      ? Math.max(14, fontPx * 1.25)
      : geometry.height || Math.max(24, ((layer.lineHeight || source.lineHeight) ? (layer.lineHeight || source.lineHeight) * fit * scaleY * lineCount : fontPx * 1.4));
    const hot = document.createElement('button');
    hot.type = 'button';
    const overlayAlign = geometry.align || layer.align || 'center';
    hot.className = 'edit-hotspot align-' + overlayAlign + (isAdminMode ? ' admin-draggable' : '');
    hot.classList.toggle('selected', selectedAdminLayer === layer);
    hot.title = 'Edit ' + layer.id;
    if (layer.type === 'edit_row') hot.style.zIndex = '4';
    hot.style.left = left + 'px';
    hot.style.top = top + 'px';
    hot.style.width = width + 'px';
    hot.style.height = height + 'px';
    hot.addEventListener('pointerdown', e => {
      if (!isAdminMode) return;
      startLayerDrag(e, layer);
    });
    hot.addEventListener('click', e => {
      if (hot.dataset.dragged === 'true'){
        hot.dataset.dragged = 'false';
        return;
      }
      if (['qr','rule'].includes(layer.type) && !isAdminMode){
        return;
      }
      if (['qr','rule'].includes(layer.type)){
        selectAdminLayer(layer);
        return;
      }
      openVisualEditor(layer, {
        left: overlayAlign === 'center' ? left - width / 2 : overlayAlign === 'right' ? left - width : left,
        top: top - height * 0.76,
        width,
        height
      });
    });

    if (selectedAdminLayer === layer && isAdminMode) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'hotspot-close-btn';
      closeBtn.innerHTML = '&times;';
      closeBtn.style.position = 'absolute';
      closeBtn.style.top = '-8px';
      closeBtn.style.right = '-8px';
      closeBtn.style.width = '18px';
      closeBtn.style.height = '18px';
      closeBtn.style.borderRadius = '50%';
      closeBtn.style.background = '#FF3B30';
      closeBtn.style.color = '#FFFFFF';
      closeBtn.style.border = 'none';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.display = 'flex';
      closeBtn.style.alignItems = 'center';
      closeBtn.style.justifyContent = 'center';
      closeBtn.style.fontSize = '12px';
      closeBtn.style.fontWeight = 'bold';
      closeBtn.style.lineHeight = '1';
      closeBtn.style.zIndex = '1000';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSelectedLayer();
      });
      hot.appendChild(closeBtn);
    }

    editOverlay.appendChild(hot);
  });

  if (showGrid && isAdminMode) {
    const gridSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    gridSvg.style.position = 'absolute';
    gridSvg.style.left = dx + 'px';
    gridSvg.style.top = dy + 'px';
    gridSvg.style.width = (designW * fit) + 'px';
    gridSvg.style.height = (designH * fit) + 'px';
    gridSvg.style.pointerEvents = 'none';
    gridSvg.style.zIndex = '999';

    // 8px screen-space grid for alignment
    const spacing = 8;
    gridSvg.innerHTML = `
      <defs>
        <pattern id="grid8" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
          <path d="M ${spacing} 0 L 0 0 0 ${spacing}" fill="none" stroke="rgba(0, 255, 255, 0.4)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid8)" />
    `;
    editOverlay.appendChild(gridSvg);
  }
}

function startLayerDrag(e, layer){
  e.preventDefault();
  selectAdminLayer(layer);
  pushUndoSnapshot();
  const t = TEMPLATES[currentTpl];
  const startX = e.clientX;
  const startY = e.clientY;
  const linkedLayers = layersMovedWith(layer);
  const layerStarts = linkedLayers.map(item => ({
    item,
    x: item.x,
    y: item.y,
    x1: item.x1,
    x2: item.x2
  }));
  const displayW = canvas.clientWidth;
  const displayH = canvas.clientHeight;
  const designW = t.w || W;
  const designH = t.h || H;
  const pixelsPerDesignX = displayW / designW;
  const pixelsPerDesignY = displayH / designH;
  let moved = false;
  let animationFrameId = null;
  const onMove = moveEvent => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    animationFrameId = requestAnimationFrame(() => {
      layerStarts.forEach(start => {
        const normalizedDx = (dx / pixelsPerDesignX) / designW;
        const normalizedDy = (dy / pixelsPerDesignY) / designH;
        if (start.item.type === 'rule'){
          start.item.x1 = start.x1 + normalizedDx;
          start.item.x2 = start.x2 + normalizedDx;
          start.item.y = start.y + normalizedDy;
        } else {
          start.item.x = start.x + normalizedDx;
          start.item.y = start.y + normalizedDy;
        }
      });
      
      // Update sidebar inputs on drag
      if (selectedAdminLayer) {
        document.getElementById('prop-x').value = Math.round((selectedAdminLayer.x || 0) * 1000) / 10;
        document.getElementById('prop-y').value = Math.round((selectedAdminLayer.y || 0) * 1000) / 10;
      }
      
      updateAdminGuides();
      render();
    });
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (moved) {
      e.currentTarget.dataset.dragged = 'true';
      saveLayerOverrides();
    }
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once:true });
}

function initBgImages(){
  Object.entries(TEMPLATES).forEach(([key,t])=>{
    t._key = key;
    if (t.kind === 'image'){
      const img = new Image();
      img.onload = () => {
        if (key === currentTpl) render();
        drawThumb(key);
      };
      img.src = t.src;
      bgImages[key] = img;
    }
  });
}

const canvas = document.getElementById('posterCanvas');

/* =========================================================================
   TEMPLATE PICKER
   ========================================================================= */
const picker = document.getElementById('templatePicker');
Object.entries(TEMPLATES).forEach(([key,t])=>{
  const card = document.createElement('div');
  card.className = 'tpl-card' + (key===currentTpl ? ' active' : '');
  card.dataset.key = key;
  const thumb = document.createElement('canvas');
  thumb.width = 220; thumb.height = 312; thumb.className='tpl-thumb';
  card.appendChild(thumb);
  const label = document.createElement('div');
  label.className = 'tpl-name'; label.textContent = t.name;
  card.appendChild(label);
  card.addEventListener('click', ()=>{
    saveCopyDraft(currentTpl);
    currentTpl = key;
    selectedAdminLayer = null;
    loadCopyDraft(currentTpl);
    refreshActive();
    updateAdminGuides();
    render();
  });
  picker.appendChild(card);
});
function refreshActive(){ [...picker.children].forEach(c=>c.classList.toggle('active', c.dataset.key===currentTpl)); }
function drawThumb(key){
  if (key === 'custom' && typeof syncCustomLayers === 'function') syncCustomLayers();
  const card = picker.querySelector(`[data-key="${key}"]`);
  if (!card) return;
  const c = card.querySelector('canvas');
  if (c) {
    const activeDraft = {};
    COPY_FIELD_IDS.forEach(id => { activeDraft[id] = document.getElementById(id).value; });
    const t = TEMPLATES[key];
    const tw = t.w || 1122;
    const th = t.h || 1588;
    c.width = 220;
    c.height = Math.round(220 * th / tw);
    loadCopyDraft(key);
    renderToCanvas(c, key, c.width, c.height, () => {
      COPY_FIELD_IDS.forEach(id => { document.getElementById(id).value = activeDraft[id] || ''; });
    });
  }
}
loadCopyDraft(currentTpl);
Object.keys(TEMPLATES).forEach(k => drawThumb(k));

/* =========================================================================
   SECRET ADMIN BUILDER
   ========================================================================= */
let isAdminMode = false;
let customBgImage = null;

const CUSTOM_CONFIG = {
  city:      { x: 0.15, y: 0.18, size: 0.040, align: 'left', color: 'ink', visible: true },
  date:      { x: 0.15, y: 0.24, size: 0.030, align: 'left', color: 'ink', visible: true },
  guest:     { x: 0.15, y: 0.30, size: 0.020, align: 'left', color: 'ink', visible: true },
  location:  { x: 0.15, y: 0.40, size: 0.020, align: 'left', color: 'ink', visible: true },
  schedule:  { x: 0.15, y: 0.50, size: 0.020, align: 'left', color: 'ink', visible: true },
  bullets:   { x: 0.15, y: 0.60, size: 0.020, align: 'left', color: 'ink', visible: true },
  url:       { x: 0.15, y: 0.85, size: 0.025, align: 'left', color: 'ink', visible: true },
  footIntro: { x: 0.15, y: 0.96, size: 0.010, align: 'left', color: 'ink', visible: true },
};

function toggleAdminMode(val) {
  isAdminMode = (val !== undefined) ? val : !isAdminMode;
  refreshAdminPanel();
  updateAdminGuides();
  document.querySelectorAll('.adv-ctrls').forEach(el => {
    el.style.display = isAdminMode ? 'flex' : 'none';
  });
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
    e.preventDefault();
    toggleAdminMode();
  }
});

function handleCustomUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const img = new Image();
    img.onload = () => {
      customBgImage = img;
      if (!TEMPLATES.custom) {
        TEMPLATES.custom = {
          name: 'Custom Builder',
          kind: 'image',
          src: '', 
          edgeColor: '#FFFFFF',
          qrBg: '#FFFFFF',
          layers: []
        };
        const card = document.createElement('div');
        card.className = 'tpl-card';
        card.dataset.key = 'custom';
        const thumb = document.createElement('canvas');
        thumb.width = 220; thumb.height = 312; thumb.className='tpl-thumb';
        card.appendChild(thumb);
        const label = document.createElement('div');
        label.className = 'tpl-name'; label.textContent = 'Custom Layout';
        card.appendChild(label);
        card.addEventListener('click', ()=>{ currentTpl = 'custom'; refreshActive(); render(); });
        document.getElementById('templatePicker').appendChild(card);
      }
      bgImages.custom = img;
      currentTpl = 'custom';
      refreshActive();
      render();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function syncCustomLayers() {
  if (!TEMPLATES.custom) return;
  const layers = [];
  Object.keys(CUSTOM_CONFIG).forEach(key => {
    const cfg = CUSTOM_CONFIG[key];
    if (!cfg.visible) return;
    
    let type = 'text';
    if (key === 'bullets') type = 'list';
    if (key === 'footIntro') type = 'wrap';

    const px = Math.round(1588 * cfg.size);
    let fw = 800; // default bold
    if (key === 'date') fw = 600;
    if (key === 'guest' || key === 'location' || key === 'bullets' || key === 'footIntro') fw = 500;
    
    layers.push({
      id: key === 'footIntro' ? 'footer' : key,
      type: type,
      x: cfg.x,
      y: cfg.y,
      align: cfg.align,
      font: `${fw} ${px}px "RigidSquareWeb", "Chakra Petch", sans-serif`,
      color: cfg.color,
      maxW: (type === 'wrap' || type === 'list') ? 0.75 : undefined,
      lineHeight: (type === 'wrap' || type === 'list') ? 40 : undefined,
      x1: key === 'footIntro' ? 0.15 : undefined,
      x2: key === 'footIntro' ? 0.85 : undefined,
    });
  });
  TEMPLATES.custom.layers = layers;
}

function modField(key, prop, delta) {
  if (!CUSTOM_CONFIG[key]) return;
  if (prop === 'visible') {
    CUSTOM_CONFIG[key].visible = !CUSTOM_CONFIG[key].visible;
  } else if (prop === 'align') {
    const aligns = ['left', 'center', 'right'];
    let idx = aligns.indexOf(CUSTOM_CONFIG[key].align);
    CUSTOM_CONFIG[key].align = aligns[(idx + 1) % 3];
  } else if (prop === 'color') {
    const colors = ['ink', 'blue', 'bg'];
    let idx = colors.indexOf(CUSTOM_CONFIG[key].color);
    CUSTOM_CONFIG[key].color = colors[(idx + 1) % 3];
  } else {
    CUSTOM_CONFIG[key][prop] += delta;
  }
  render();
  if (currentTpl === 'custom') {
    drawThumb('custom');
  }
}

function initAdvancedControls() {
  document.querySelectorAll('.adv-ctrls').forEach(container => {
    const key = container.dataset.key;
    container.innerHTML = `
      <button onclick="modField('${key}', 'visible', null)">Toggle</button>
      <button onclick="modField('${key}', 'y', -0.01)">Up</button>
      <button onclick="modField('${key}', 'y', 0.01)">Down</button>
      <button onclick="modField('${key}', 'x', -0.01)">Left</button>
      <button onclick="modField('${key}', 'x', 0.01)">Right</button>
      <button onclick="modField('${key}', 'size', 0.005)">A+</button>
      <button onclick="modField('${key}', 'size', -0.005)">A-</button>
      <button onclick="modField('${key}', 'align', null)">Align</button>
      <button onclick="modField('${key}', 'color', null)">Color</button>
    `;
  });
}
initAdvancedControls();

function layerForExport(layer) {
  const copy = {};
  Object.entries(layer).forEach(([key, value]) => {
    if (key.startsWith('_')) return;
    if (typeof value === 'function') return;
    copy[key] = value;
  });
  return copy;
}

function currentTemplateExportCode() {
  const t = TEMPLATES[currentTpl];
  if (!t) return '';
  const exportTemplate = {};
  Object.entries(t).forEach(([key, value]) => {
    if (key.startsWith('_')) return;
    if (key === 'layers') exportTemplate.layers = value.map(layerForExport);
    else if (key === 'socialLayers') exportTemplate.socialLayers = value.map(layerForExport);
    else if (typeof value !== 'function') exportTemplate[key] = value;
  });
  return `${currentTpl}: ${JSON.stringify(exportTemplate, null, 2)}`;
}

window.getCurrentTemplateSnapshot = function getCurrentTemplateSnapshot() {
  saveCopyDraft();
  saveLayerOverrides();
  return {
    templateKey: currentTpl,
    copyDraft: JSON.parse(localStorage.getItem(draftStorageKey(currentTpl)) || '{}'),
    layerOverrides: getLayerOverrideSnapshot(currentTpl),
    templateCode: currentTemplateExportCode()
  };
};

function exportCurrentTemplateJSON() {
  const output = document.getElementById('adminExportOutput');
  output.style.display = 'block';
  output.value = currentTemplateExportCode();
  output.select();
}

function exportTemplateJSON() {
  syncCustomLayers();
  if (currentTpl !== 'custom') {
    exportCurrentTemplateJSON();
    return;
  }
  if (!TEMPLATES.custom) {
    alert("Please upload a custom background first.");
    return;
  }
  
  const code = `
  myNewTemplate: {
    name: 'New Template Name',
    kind: 'image',
    src: "ADD_BASE64_OR_URL_HERE",
    edgeColor: '#FFFFFF',
    qrBg: '#FFFFFF',
    layers: ${JSON.stringify(TEMPLATES.custom.layers, null, 2)}
  }
  `;
  
  const output = document.getElementById('adminExportOutput');
  output.style.display = 'block';
  output.value = code;
  output.select();
}

function initScratchpad() {
  const pad = document.getElementById('scratchpad');
  const toggle = document.getElementById('scratchpadToggle');
  const text = document.getElementById('scratchpadText');
  if (!pad || !toggle || !text) return;
  text.value = localStorage.getItem('posterScratchpadText') || '';
  if (localStorage.getItem('posterScratchpadCollapsed') === '1') {
    pad.classList.add('collapsed');
  }
  text.addEventListener('input', () => {
    localStorage.setItem('posterScratchpadText', text.value);
  });
  toggle.addEventListener('click', () => {
    pad.classList.toggle('collapsed');
    localStorage.setItem('posterScratchpadCollapsed', pad.classList.contains('collapsed') ? '1' : '0');
    toggle.setAttribute('aria-label', pad.classList.contains('collapsed') ? 'Expand sticky note' : 'Collapse sticky note');
  });
}
initScratchpad();

/* =========================================================================
   FORM WIRING
   ========================================================================= */
COPY_FIELD_IDS
  .forEach(id => {
    const field = document.getElementById(id);
    field.addEventListener('focus', () => {
      const copy = {};
      COPY_FIELD_IDS.forEach(fieldId => { copy[fieldId] = document.getElementById(fieldId).value; });
      field.dataset.undoSnapshot = JSON.stringify(copy);
      field.dataset.undoPushed = 'false';
    });
    field.addEventListener('input', () => {
      if (!isRestoringUndo && field.dataset.undoPushed !== 'true'){
        try { pushUndoSnapshotFrom(JSON.parse(field.dataset.undoSnapshot || '{}')); }
        catch (e) { pushUndoSnapshot(); }
        field.dataset.undoPushed = 'true';
      }
      saveCopyDraft();
      render();
    });
  });
document.getElementById('f-format').addEventListener('change', render);
document.getElementById('userUndoBtn').addEventListener('click', undoLastUserEdit);
updateUserUndoButton();



/* =========================================================================
   EXPORT
   Downloads always render at the selected template's native pixel dimensions
   for the sharpest available output. Format only changes the file container.
   ========================================================================= */
function getExportSize(t) {
  return { w: t.w || W, h: t.h || H };
}

function downloadDataUrl(dataUrl, filename){
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function dataUrlToBytes(dataUrl){
  const binary = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function crc32(bytes){
  let c = ~0;
  for (let i = 0; i < bytes.length; i++){
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function writeUint32(bytes, offset, value){
  bytes[offset] = (value >>> 24) & 255;
  bytes[offset + 1] = (value >>> 16) & 255;
  bytes[offset + 2] = (value >>> 8) & 255;
  bytes[offset + 3] = value & 255;
}

function canvasToPng300Blob(canvasEl){
  const bytes = dataUrlToBytes(canvasEl.toDataURL('image/png'));
  const ppm = Math.round(300 / 0.0254);
  const chunk = new Uint8Array(21);
  writeUint32(chunk, 0, 9);
  chunk.set([112, 72, 89, 115], 4); // pHYs
  writeUint32(chunk, 8, ppm);
  writeUint32(chunk, 12, ppm);
  chunk[16] = 1;
  writeUint32(chunk, 17, crc32(chunk.slice(4, 17)));
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.slice(0, 33), 0);
  out.set(chunk, 33);
  out.set(bytes.slice(33), 33 + chunk.length);
  return new Blob([out], { type:'image/png' });
}

function canvasToJpeg300Blob(canvasEl){
  const bytes = dataUrlToBytes(canvasEl.toDataURL('image/jpeg', 0.98));
  const dpi = 300;
  if (bytes[0] === 0xFF && bytes[1] === 0xD8){
    let offset = 2;
    while (offset + 17 < bytes.length && bytes[offset] === 0xFF){
      const marker = bytes[offset + 1];
      const len = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (marker === 0xE0 && bytes[offset + 4] === 0x4A && bytes[offset + 5] === 0x46 && bytes[offset + 6] === 0x49 && bytes[offset + 7] === 0x46){
        bytes[offset + 11] = 1;
        bytes[offset + 12] = (dpi >>> 8) & 255;
        bytes[offset + 13] = dpi & 255;
        bytes[offset + 14] = (dpi >>> 8) & 255;
        bytes[offset + 15] = dpi & 255;
        return new Blob([bytes], { type:'image/jpeg' });
      }
      if (len < 2) break;
      offset += 2 + len;
    }
  }
  return new Blob([bytes], { type:'image/jpeg' });
}

function canvasToPdfDataUrl(canvasEl){
  const w = canvasEl.width;
  const h = canvasEl.height;
  const pageW = w / 300 * 72;
  const pageH = h / 300 * 72;
  const imgData = atob(canvasEl.toDataURL('image/jpeg', 0.98).split(',')[1]);
  const objects = [];
  const add = value => { objects.push(value); return objects.length; };
  const catalog = add('<< /Type /Catalog /Pages 2 0 R >>');
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  add(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgData.length} >>\nstream\n${imgData}\nendstream`);
  const stream = `q\n${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm\n/Im0 Do\nQ`;
  add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += String(offset).padStart(10, '0') + ' 00000 n \n'; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255;
  const blob = new Blob([bytes], { type:'application/pdf' });
  return URL.createObjectURL(blob);
}

document.getElementById('downloadBtn').addEventListener('click', ()=>{
  const t = TEMPLATES[currentTpl];
  const size = getExportSize(t);
  const format = document.getElementById('f-format').value;
  const out = document.createElement('canvas');
  renderToCanvas(out, currentTpl, size.w, size.h, () => {
    const base = 'terry-fox-poster';
    if (format === 'jpeg') {
      downloadBlob(canvasToJpeg300Blob(out), base + '.jpg');
    } else if (format === 'pdf') {
      downloadDataUrl(canvasToPdfDataUrl(out), base + '.pdf');
    } else {
      downloadBlob(canvasToPng300Blob(out), base + '.png');
    }
  });
});


async function loadGlobalOverrides() {
  try {
    const res = await fetch('overrides.json');
    if (res.ok) {
      globalOverrides = await res.json();
      Object.keys(TEMPLATES).forEach(applyLayerOverrides);
    }
  } catch (e) {
    console.log("No global overrides loaded");
  }
}

async function initApp() {
  initBgImages();
  await loadGlobalOverrides();
  render();
}

initApp();

/* Canvas doesn't auto-redraw when a @font-face finishes loading, so once
   your real Rigid Square files are in place, re-render as soon as they're
   ready (falls back silently to Inter if the files aren't present). */
if (document.fonts && document.fonts.ready){
  document.fonts.ready.then(render);
  document.fonts.addEventListener('loadingdone', render);
}

