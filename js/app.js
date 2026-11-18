// File: js/app.js
// MindFlow エディタ本体（キャンバス・パネル・サイドバー・書き出し）
(function () {
  'use strict';

  const MF = window.MF;
  const { LIMITS, ICONS, BG_KEYS, TEXT_KEYS, TEMPLATES } = MF;

  // ------------------------------------------------------------------
  // 定数
  // ------------------------------------------------------------------
  const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic UI","Meiryo",system-ui,-apple-system,"Segoe UI",sans-serif';
  const CHIP_FONT = '500 11px ' + FONT;
  const CTRL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
  const ICON_NAMES = { '': 'なし', '💡': 'アイデア', '⭐': '重要', '✅': '完了', '❓': '疑問', '⚠️': '注意', '🔥': '優先', '🎯': '目標', '📌': 'ピン留め', '📅': '日付', '👤': '人', '📝': 'メモ', '🚫': '禁止', '🔗': 'リンク', '💰': 'お金', '🧪': '実験' };
  const BG_NAMES = { none: 'なし', gray: 'グレー', red: '赤', orange: 'オレンジ', yellow: '黄', green: '緑', teal: '青緑', blue: '青', purple: '紫', pink: 'ピンク' };
  const TEXT_NAMES = { default: '標準', gray: 'グレー', red: '赤', orange: 'オレンジ', green: '緑', blue: '青', purple: '紫' };
  const LABEL_SUGGEST = ['重要', '要確認', '要対応', 'アイデア', '保留', '決定', '質問'];
  const STYLES = [
    { size: 18, lh: 26, weight: 700, maxW: 300, padX: 18, padY: 10 },
    { size: 15, lh: 22, weight: 600, maxW: 260, padX: 14, padY: 8 },
    { size: 14, lh: 20, weight: 400, maxW: 240, padX: 12, padY: 6 }
  ];
  const HGAP_ROOT = 64, HGAP = 40, VGAP1 = 18, VGAP = 10;
  const PAL = {
    light: {
      bg: { gray: '#e9ecef', red: '#ffe3e3', orange: '#ffe8cc', yellow: '#fff3bf', green: '#d3f9d8', teal: '#c3fae8', blue: '#d0ebff', purple: '#e5dbff', pink: '#ffdeeb' },
      border: { gray: '#adb5bd', red: '#ff8787', orange: '#ffa94d', yellow: '#fcc419', green: '#69db7c', teal: '#38d9a9', blue: '#4dabf7', purple: '#9775fa', pink: '#f783ac' },
      text: { default: '#1d2330', gray: '#495057', red: '#c92a2a', orange: '#b34700', green: '#2b8a3e', blue: '#1864ab', purple: '#6741d9' },
      branch: ['#4263eb', '#e8590c', '#2f9e44', '#ae3ec9', '#0c8599', '#d6336c', '#e67700', '#5c940d'],
      node: '#ffffff', nodeBorder: '#cdd3db', accent: '#3b5bdb', accentText: '#ffffff', chipBg: '#f1f3f5', chipBorder: '#ced4da', chipText: '#343a40', ok: '#2b8a3e', muted: '#5a6372', focus: '#2f6feb', frame: '#1d2330', surface: '#ffffff', canvas: '#ffffff'
    },
    dark: {
      bg: { gray: '#343a40', red: '#4c2328', orange: '#4a3119', yellow: '#433817', green: '#1e3b25', teal: '#153b36', blue: '#1a3450', purple: '#2e2650', pink: '#4a2237' },
      border: { gray: '#868e96', red: '#e03131', orange: '#e8590c', yellow: '#f08c00', green: '#2f9e44', teal: '#0ca678', blue: '#1c7ed6', purple: '#7048e8', pink: '#d6336c' },
      text: { default: '#e7eaf0', gray: '#adb5bd', red: '#ff8787', orange: '#ffa94d', green: '#8ce99a', blue: '#74c0fc', purple: '#b197fc' },
      branch: ['#748ffc', '#ff922b', '#51cf66', '#da77f2', '#3bc9db', '#f06595', '#fcc419', '#94d82d'],
      node: '#242932', nodeBorder: '#3d4450', accent: '#7c9cff', accentText: '#0d1220', chipBg: '#2d333c', chipBorder: '#4a525e', chipText: '#dfe3ea', ok: '#69db7c', muted: '#a6aebb', focus: '#8fb0ff', frame: '#e7eaf0', surface: '#1f2329', canvas: '#181b21'
    }
  };

  // ------------------------------------------------------------------
  // DOM参照・ユーティリティ
  // ------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const app = $('app'), viewport = $('viewport'), world = $('world'), edgesSvg = $('edges'), nodesLayer = $('nodes');
  const editor = $('editor'), panel = $('panel'), titleInput = $('title'), statusEl = $('status');
  const searchInput = $('search'), searchCount = $('search-count'), layoutSel = $('layout');
  const minimap = $('minimap'), zoomLabel = $('zoom-label'), toastEl = $('toast'), bannerEl = $('banner');
  const bannerMsg = $('banner-msg'), bannerActs = $('banner-acts'), loadingEl = $('loading'), live = $('live');
  const focusBar = $('focus-bar'), emptyHint = $('empty-hint'), onboard = $('onboard');
  const helpModal = $('help'), exportModal = $('export'), exportMsg = $('export-msg');
  const actionBar = $('action-bar'), btnUndo = $('btn-undo'), btnRedo = $('btn-redo'), btnTheme = $('btn-theme');
  const btnPanel = $('btn-panel'), btnExport = $('btn-export'), btnMinimap = $('btn-minimap'), btnSidebar = $('btn-sidebar');
  const sidebarBack = $('sidebar-back'), emptyState = $('empty-state'), fileInput = $('file-input');
  const mapList = $('map-list'), mapFilter = $('map-filter'), trashList = $('trash-list'), trashSummary = $('trash-summary');
  const measureCtx = document.createElement('canvas').getContext('2d');
  const store = new MF.Store();

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function trunc(s, n) { s = String(s).replace(/\n/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function hhmm(d) { return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  // ------------------------------------------------------------------
  // 状態
  // ------------------------------------------------------------------
  const S = {
    doc: null,
    nodes: new Map(), parent: new Map(), depth: new Map(), els: new Map(),
    sel: null, editing: null, pendingNew: null, focusId: null,
    view: { x: 0, y: 0, k: 1 }, layout: null, needFit: false,
    undo: [], redo: [], coalesceKey: null, coalesceAt: 0,
    dirty: false, rev: 0, saveTimer: null, saveError: '', savedAt: null, external: '', fatal: '', memNoticeClosed: false,
    search: { q: '', hits: [], idx: -1, set: new Set() },
    theme: 'light', narrow: null, compact: false,
    sidebarOpen: store.getSetting('sidebar', true), drawerOpen: false,
    panelOpen: store.getSetting('panel', true), sheetOpen: false, panelDirty: true, panelFor: undefined,
    minimap: store.getSetting('minimap', true), mm: null, mmDrag: false,
    drag: null, lastTap: { id: null, t: 0 }, clip: null,
    modal: null, modalReturn: null, exporting: false, shareCache: null
  };
  const SIZE_CACHE = new Map();

  // ------------------------------------------------------------------
  // 通知
  // ------------------------------------------------------------------
  let toastTimer = null;
  function announce(msg) {
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = msg; });
  }
  function toast(msg, action) {
    toastEl.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    toastEl.appendChild(span);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn sm';
      b.textContent = action.label;
      b.addEventListener('click', () => { toastEl.hidden = true; action.fn(); });
      toastEl.appendChild(b);
    }
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, action ? 6000 : 3200);
    announce(msg);
  }
  function updateBanner() {
    let msg = '', acts = [];
    if (S.fatal) {
      msg = S.fatal;
      acts = [{ label: '再読み込み', fn: () => location.reload() }];
    } else if (S.saveError && S.doc) {
      msg = S.saveError + ' 編集内容はこの画面に残っています。';
      acts = [
        { label: '再試行', fn: () => { S.dirty = true; saveNow(); } },
        { label: 'JSONで退避', fn: exportJSON }
      ];
    } else if (S.external && S.doc) {
      msg = S.external + ' 自動保存を一時停止しています。';
      acts = [
        { label: '最新を読み込む', fn: () => { const id = S.doc.id; S.external = ''; if (store.exists(id)) openMap(id, { noSave: true }); else closeMap(); } },
        { label: 'この画面の内容で上書き', fn: () => { S.external = ''; S.dirty = true; saveNow(); } }
      ];
    } else if (!store.persistent && !S.memNoticeClosed) {
      msg = 'このブラウザでは保存機能（localStorage）が使えないため、ページを閉じるとデータが消えます。JSONで書き出して保存してください。';
      acts = [{ label: '閉じる', fn: () => { S.memNoticeClosed = true; updateBanner(); } }];
    }
    if (!msg) { bannerEl.hidden = true; return; }
    bannerMsg.textContent = msg;
    bannerActs.innerHTML = '';
    for (const a of acts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn sm';
      b.textContent = a.label;
      b.addEventListener('click', a.fn);
      bannerActs.appendChild(b);
    }
    bannerEl.hidden = false;
  }

  // ------------------------------------------------------------------
  // ツリー操作の基本
  // ------------------------------------------------------------------
  function reindex() {
    S.nodes.clear(); S.parent.clear(); S.depth.clear();
    const st = [[S.doc.root, null, 0]];
    while (st.length) {
      const [n, p, d] = st.pop();
      S.nodes.set(n.id, n); S.parent.set(n.id, p); S.depth.set(n.id, d);
      for (let i = n.children.length - 1; i >= 0; i--) st.push([n.children[i], n.id, d + 1]);
    }
  }
  function getNode(id) { return id ? S.nodes.get(id) || null : null; }
  function parentOf(id) { return getNode(S.parent.get(id)); }
  function rootId() { return S.doc.root.id; }
  function displayRootId() { return S.focusId && S.nodes.has(S.focusId) ? S.focusId : rootId(); }
  function inSubtree(id, anc) { while (id) { if (id === anc) return true; id = S.parent.get(id); } return false; }
  function ancestorsOf(id) {
    const out = [];
    let p = S.parent.get(id);
    while (p) { out.unshift(S.nodes.get(p)); p = S.parent.get(p); }
    return out;
  }
  function subtreeSize(n) {
    let c = 0;
    const st = [n];
    while (st.length) { const x = st.pop(); c++; for (const ch of x.children) st.push(ch); }
    return c;
  }
  function subtreeHeight(n) {
    let m = 0;
    const st = [[n, 0]];
    while (st.length) { const [x, d] = st.pop(); if (d > m) m = d; for (const ch of x.children) st.push([ch, d + 1]); }
    return m;
  }
  function newId() {
    let id;
    do { id = MF.newId(); } while (S.nodes.has(id));
    return id;
  }
  function makeNode(text) {
    return { id: newId(), text: text || '', icon: '', labels: [], bg: 'none', color: 'default', note: '', done: false, collapsed: false, side: '', offset: { x: 0, y: 0 }, children: [] };
  }
  function cloneFresh(n) {
    const c = JSON.parse(JSON.stringify(n));
    const st = [c];
    while (st.length) { const x = st.pop(); x.id = newId(); for (const ch of x.children) st.push(ch); }
    return c;
  }
  function fixNode(n) {
    n.id = typeof n.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(n.id) ? n.id : newId();
    n.text = typeof n.text === 'string' ? n.text.slice(0, LIMITS.text) : '';
    n.icon = ICONS.includes(n.icon) ? n.icon : '';
    n.labels = Array.isArray(n.labels) ? n.labels.filter((l) => typeof l === 'string').slice(0, LIMITS.labels) : [];
    n.bg = BG_KEYS.includes(n.bg) ? n.bg : 'none';
    n.color = TEXT_KEYS.includes(n.color) ? n.color : 'default';
    n.note = typeof n.note === 'string' ? n.note.slice(0, LIMITS.note) : '';
    n.done = n.done === true;
    n.collapsed = n.collapsed === true;
    n.side = n.side === 'left' || n.side === 'right' ? n.side : '';
    n.offset = { x: 0, y: 0 };
    n.children = Array.isArray(n.children) ? n.children.filter((c) => c && typeof c === 'object') : [];
  }
  function sideWeight(side) {
    let w = 0;
    for (const c of S.doc.root.children) if (c.side === side) w += subtreeSize(c);
    return w;
  }
  function pickSide() { return sideWeight('right') <= sideWeight('left') ? 'right' : 'left'; }
  function assignSides() {
    if (S.doc.layout !== 'balanced') return;
    for (const c of S.doc.root.children) if (c.side !== 'left' && c.side !== 'right') c.side = pickSide();
  }

  // ------------------------------------------------------------------
  // 履歴（Undo / Redo）
  // ------------------------------------------------------------------
  function snapshot() { return JSON.stringify({ title: S.doc.title, layout: S.doc.layout, root: S.doc.root, sel: S.sel }); }
  function restore(str) {
    const s = JSON.parse(str);
    S.doc.title = s.title; S.doc.layout = s.layout; S.doc.root = s.root;
    reindex();
    S.sel = S.nodes.has(s.sel) ? s.sel : null;
    if (S.focusId && !S.nodes.has(S.focusId)) S.focusId = null;
  }
  function pushHistory(snap) {
    S.undo.push(snap);
    if (S.undo.length > 200) S.undo.shift();
    S.redo.length = 0;
  }
  function commit(fn, opts) {
    opts = opts || {};
    const now = Date.now();
    const key = opts.coalesce || null;
    if (!(key && key === S.coalesceKey && now - S.coalesceAt < 1500)) pushHistory(snapshot());
    S.coalesceKey = key; S.coalesceAt = now;
    const r = fn();
    reindex();
    markDirty();
    render(opts);
    return r;
  }
  function undo() {
    if (S.editing) finishEdit(true, { refocus: false });
    if (!S.undo.length) { toast('これ以上元に戻せません'); return; }
    S.redo.push(snapshot()); restore(S.undo.pop()); S.coalesceKey = null;
    markDirty(); render({ panel: true }); announce('元に戻しました');
  }
  function redo() {
    if (S.editing) finishEdit(true, { refocus: false });
    if (!S.redo.length) { toast('やり直せる操作はありません'); return; }
    S.undo.push(snapshot()); restore(S.redo.pop()); S.coalesceKey = null;
    markDirty(); render({ panel: true }); announce('やり直しました');
  }
  function discardLast() {
    if (!S.undo.length) return;
    restore(S.undo.pop()); S.coalesceKey = null;
    markDirty(); render({ panel: true });
  }

  // ------------------------------------------------------------------
  // 保存（デバウンスして localStorage へ）
  // ------------------------------------------------------------------
  function docForSave() {
    const d = S.doc;
    return { schema: MF.SCHEMA, id: d.id, title: d.title, layout: d.layout, created_at: d.created_at, updated_at: d.updated_at, root: d.root };
  }
  function markDirty() {
    S.dirty = true;
    S.rev++;
    S.shareCache = null;
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(saveNow, 600);
    updateStatus();
  }
  function saveNow() {
    clearTimeout(S.saveTimer);
    S.saveTimer = null;
    if (!S.doc) return true;
    if (S.external) { updateStatus(); return false; }
    if (!S.dirty) return true;
    try {
      const saved = store.save(docForSave());
      S.doc.updated_at = saved.updated_at;
      S.dirty = false;
      S.saveError = '';
      S.savedAt = new Date();
    } catch (e) {
      S.saveError = e.message || String(e);
    }
    updateStatus();
    updateBanner();
    renderMapList();
    renderUsage();
    return !S.saveError;
  }
  function updateStatus() {
    if (!S.doc) { statusEl.textContent = ''; return; }
    let text, cls;
    if (S.saveError) { text = '⚠ 保存できません'; cls = 'error'; }
    else if (S.external) { text = '⚠ 他のタブで更新'; cls = 'error'; }
    else if (S.dirty) { text = '● 編集中…'; cls = 'dirty'; }
    else { text = '✓ 保存済み' + (S.savedAt ? ' ' + hhmm(S.savedAt) : ''); cls = 'saved'; }
    if (!store.persistent && !S.saveError) text += '（一時）';
    if (statusEl.textContent !== text) statusEl.textContent = text;
    statusEl.className = 'save-status ' + cls;
    statusEl.title = S.saveError || (store.persistent ? '変更はこのブラウザに自動保存されます' : 'このセッションの間だけ保持されます');
  }

  // ------------------------------------------------------------------
  // レイアウト計算
  // ------------------------------------------------------------------
  function wrapText(text, font, maxW) {
    measureCtx.font = font;
    const out = [];
    for (const para of String(text).split('\n')) {
      if (para === '') { out.push(''); continue; }
      let line = '', lastSpace = -1;
      for (const ch of Array.from(para)) {
        const test = line + ch;
        if (line !== '' && measureCtx.measureText(test).width > maxW) {
          if (lastSpace > 0 && ch !== ' ') {
            out.push(line.slice(0, lastSpace));
            line = line.slice(lastSpace + 1) + ch;
          } else {
            out.push(line);
            line = ch === ' ' ? '' : ch;
          }
          lastSpace = line.lastIndexOf(' ');
        } else {
          line = test;
          if (ch === ' ') lastSpace = line.length - 1;
        }
      }
      out.push(line);
    }
    return out.length ? out : [''];
  }
  function nodeBox(n, dd) {
    const lvl = dd === 0 ? 0 : (dd === 1 ? 1 : 2);
    const st = STYLES[lvl];
    const display = n.text ? n.text : '（空）';
    const key = [lvl, display, n.icon, n.done ? 1 : 0, n.labels.join('\u0002'), n.note ? 1 : 0].join('\u0001');
    const cached = SIZE_CACHE.get(key);
    if (cached) return cached;
    const font = st.weight + ' ' + st.size + 'px ' + FONT;
    const lines = wrapText(display, font, st.maxW);
    measureCtx.font = font;
    let tw = 0;
    for (const l of lines) tw = Math.max(tw, measureCtx.measureText(l).width);
    const chkW = n.done ? Math.ceil(measureCtx.measureText('✓').width) + 4 : 0;
    const icoW = n.icon ? Math.ceil(measureCtx.measureText(n.icon).width) + 6 : 0;
    const pre = chkW + icoW;
    const chips = n.labels.map((t) => ({ text: t, note: false }));
    if (n.note) chips.push({ text: '🗒 メモ', note: true });
    measureCtx.font = CHIP_FONT;
    const avail = st.maxW + pre;
    const rows = [];
    let row = [], rw = 0, maxRow = 0;
    for (const c of chips) {
      c.w = Math.ceil(measureCtx.measureText(c.text).width) + 14;
      const need = row.length ? rw + 4 + c.w : c.w;
      if (row.length && need > avail) { rows.push(row); maxRow = Math.max(maxRow, rw); row = [c]; rw = c.w; }
      else { row.push(c); rw = need; }
    }
    if (row.length) { rows.push(row); maxRow = Math.max(maxRow, rw); }
    const innerW = Math.ceil(Math.max(pre + tw, maxRow, 16)) + 3;
    const textH = Math.max(1, lines.length) * st.lh;
    const chipsH = rows.length ? 6 + rows.length * 18 + (rows.length - 1) * 4 : 0;
    const b = {
      key: key, st: st, font: font, lines: lines, chkW: chkW, icoW: icoW, rows: rows, textH: textH, empty: !n.text,
      w: innerW + st.padX * 2 + 4, h: textH + chipsH + st.padY * 2 + 4
    };
    if (SIZE_CACHE.size > 8000) SIZE_CACHE.clear();
    SIZE_CACHE.set(key, b);
    return b;
  }
  function computeLayout() {
    const dispId = displayRootId();
    const disp = S.nodes.get(dispId);
    const G = new Map();
    const measure = (n, dd) => {
      const box = nodeBox(n, dd);
      let ch = 0;
      if (!n.collapsed) n.children.forEach((c, i) => { ch += measure(c, dd + 1) + (i ? VGAP : 0); });
      const g = { box: box, childrenH: ch, subH: Math.max(box.h, ch) };
      G.set(n.id, g);
      return g.subH;
    };
    const rootBox = nodeBox(disp, 0);
    const kids = disp.collapsed ? [] : disp.children;
    kids.forEach((c) => measure(c, 1));
    let right = [], left = [];
    if (S.doc.layout === 'balanced') {
      if (dispId === rootId()) {
        kids.forEach((c) => (c.side === 'left' ? left : right).push(c));
      } else {
        let rh = 0, lh = 0;
        kids.forEach((c) => {
          const h = G.get(c.id).subH;
          if (rh <= lh) { right.push(c); rh += h; } else { left.push(c); lh += h; }
        });
      }
    } else {
      right = kids.slice();
    }
    const pos = new Map(), order = [], edges = [];
    pos.set(dispId, { id: dispId, x: -rootBox.w / 2, y: -rootBox.h / 2, w: rootBox.w, h: rootBox.h, side: 'root', dd: 0, branch: -1, box: rootBox, parent: null });
    order.push(dispId);
    const place = (n, side, edge, yTop, dd, branch, offX, offY, parentId) => {
      const g = G.get(n.id), b = g.box;
      const ox = offX + n.offset.x, oy = offY + n.offset.y;
      const x = side === 'right' ? edge : edge - b.w;
      const y = yTop + g.subH / 2 - b.h / 2;
      pos.set(n.id, { id: n.id, x: x + ox, y: y + oy, w: b.w, h: b.h, side: side, dd: dd, branch: branch, box: b, parent: parentId });
      order.push(n.id);
      if (n.collapsed) return;
      let cy = yTop + (g.subH - g.childrenH) / 2;
      const next = side === 'right' ? edge + b.w + HGAP : edge - b.w - HGAP;
      n.children.forEach((c, i) => {
        if (i) cy += VGAP;
        place(c, side, next, cy, dd + 1, branch, ox, oy, n.id);
        cy += G.get(c.id).subH;
      });
    };
    const placeSide = (list, side) => {
      let total = 0;
      list.forEach((c, i) => { total += G.get(c.id).subH + (i ? VGAP1 : 0); });
      let y = -total / 2;
      const edge = side === 'right' ? rootBox.w / 2 + HGAP_ROOT : -rootBox.w / 2 - HGAP_ROOT;
      list.forEach((c, i) => {
        if (i) y += VGAP1;
        place(c, side, edge, y, 1, kids.indexOf(c), 0, 0, dispId);
        y += G.get(c.id).subH;
      });
    };
    placeSide(right, 'right');
    placeSide(left, 'left');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const id of order) {
      const p = pos.get(id);
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.w); maxY = Math.max(maxY, p.y + p.h);
      if (!p.parent) continue;
      const q = pos.get(p.parent);
      const sy = q.y + q.h / 2, ey = p.y + p.h / 2;
      const sx = p.side === 'right' ? q.x + q.w : q.x;
      const ex = p.side === 'right' ? p.x : p.x + p.w;
      const dx = (ex - sx) * 0.5;
      edges.push({
        d: 'M' + r1(sx) + ' ' + r1(sy) + ' C' + r1(sx + dx) + ' ' + r1(sy) + ' ' + r1(ex - dx) + ' ' + r1(ey) + ' ' + r1(ex) + ' ' + r1(ey),
        branch: p.branch,
        w: p.dd === 1 ? 3 : 2
      });
    }
    return { pos: pos, order: order, edges: edges, bounds: { minX: minX, minY: minY, maxX: maxX, maxY: maxY }, dispId: dispId };
  }

  // ------------------------------------------------------------------
  // 描画
  // ------------------------------------------------------------------
  function branchColor(i, pal) {
    pal = pal || PAL[S.theme];
    return i >= 0 ? pal.branch[i % pal.branch.length] : pal.muted;
  }
  function nodeHTML(n, b, hidden) {
    const st = b.st;
    let h = '<div class="row" style="font:' + st.weight + ' ' + st.size + 'px/' + st.lh + 'px var(--font)">';
    if (n.done) h += '<span class="chk" style="width:' + b.chkW + 'px" aria-hidden="true">✓</span>';
    if (n.icon) h += '<span class="ico" style="width:' + b.icoW + 'px" aria-hidden="true">' + esc(n.icon) + '</span>';
    h += '<span class="txt' + (b.empty ? ' empty' : '') + '">' + esc(b.lines.join('\n')) + '</span></div>';
    if (b.rows.length) {
      h += '<div class="labels" aria-hidden="true">';
      for (const row of b.rows) {
        h += '<div class="chip-row">';
        for (const c of row) h += '<span class="chip' + (c.note ? ' note' : '') + '">' + esc(c.text) + '</span>';
        h += '</div>';
      }
      h += '</div>';
    }
    if (n.children.length) {
      h += '<button type="button" class="tg" tabindex="-1" aria-hidden="true" title="' + (n.collapsed ? '展開' : '折りたたむ') + '">' + (n.collapsed ? '+' + hidden : '−') + '</button>';
    }
    return h;
  }
  function nodeAria(n) {
    let s = (n.text || '空のノード').replace(/\n/g, ' ');
    if (n.icon) s = ICON_NAMES[n.icon] + '、' + s;
    if (n.done) s += '、完了';
    if (n.labels.length) s += '、ラベル: ' + n.labels.join('、');
    if (n.note) s += '、メモあり';
    if (n.children.length) s += '、子 ' + n.children.length + ' 件' + (n.collapsed ? '（折りたたみ中）' : '');
    return s;
  }
  function renderNodes(L) {
    const pal = PAL[S.theme];
    const seen = new Set();
    const hits = S.search.set, cur = S.search.idx >= 0 ? S.search.hits[S.search.idx] : null;
    for (const id of L.order) {
      seen.add(id);
      const n = S.nodes.get(id), p = L.pos.get(id), b = p.box;
      let el = S.els.get(id);
      if (!el) {
        el = document.createElement('div');
        el.dataset.id = id;
        el.id = 'n-' + id;
        el.setAttribute('role', 'treeitem');
        nodesLayer.appendChild(el);
        S.els.set(id, el);
      }
      const hidden = n.collapsed ? subtreeSize(n) - 1 : 0;
      const sig = b.key + '|' + n.children.length + '|' + (n.collapsed ? 'c' + hidden : 'o');
      if (el._sig !== sig) {
        el.innerHTML = nodeHTML(n, b, hidden);
        el._sig = sig;
        el.setAttribute('aria-label', nodeAria(n));
      }
      el.style.left = p.x + 'px';
      el.style.top = p.y + 'px';
      el.style.width = b.w + 'px';
      el.style.height = b.h + 'px';
      el.style.padding = b.st.padY + 'px ' + b.st.padX + 'px';
      const isRoot = p.dd === 0;
      let cls = 'node' + (isRoot ? ' root' : ' side-' + p.side);
      if (isRoot && n.bg !== 'none') cls += ' custom';
      if (id === S.sel) cls += ' selected';
      if (n.done) cls += ' done';
      if (n.collapsed && n.children.length) cls += ' collapsed';
      if (hits.has(id)) cls += id === cur ? ' hit-current' : ' hit';
      if (S.drag) {
        if (S.drag.subtree.has(id)) cls += ' dragging';
        if (S.drag.drop && S.drag.drop.id === id) cls += ' drop-' + S.drag.drop.mode;
      }
      if (el.className !== cls) el.className = cls;
      if (n.bg === 'none') { el.style.background = ''; el.style.borderColor = ''; }
      else { el.style.background = pal.bg[n.bg]; el.style.borderColor = pal.border[n.bg]; }
      if (isRoot && n.bg === 'none') el.style.color = '';
      else el.style.color = n.color === 'default' ? (isRoot ? pal.text.default : '') : pal.text[n.color];
      if (isRoot) el.style.setProperty('--stripe', '0 0 0 0 transparent');
      else el.style.setProperty('--stripe', (p.side === 'left' ? 'inset -4px 0 0 ' : 'inset 4px 0 0 ') + branchColor(p.branch, pal));
      el.setAttribute('aria-level', String(p.dd + 1));
      el.setAttribute('aria-selected', id === S.sel ? 'true' : 'false');
      if (n.children.length) el.setAttribute('aria-expanded', n.collapsed ? 'false' : 'true');
      else el.removeAttribute('aria-expanded');
    }
    for (const [id, el] of S.els) {
      if (!seen.has(id)) { el.remove(); S.els.delete(id); }
    }
    if (S.sel && seen.has(S.sel)) viewport.setAttribute('aria-activedescendant', 'n-' + S.sel);
    else viewport.removeAttribute('aria-activedescendant');
  }
  function renderEdges(L) {
    const pal = PAL[S.theme];
    let s = '';
    for (const e of L.edges) {
      s += '<path d="' + e.d + '" fill="none" stroke="' + branchColor(e.branch, pal) + '" stroke-width="' + e.w + '" stroke-linecap="round"/>';
    }
    edgesSvg.innerHTML = s;
  }
  function recomputeHits() {
    const q = S.search.q;
    const hits = [];
    if (q && S.doc) {
      const st = [S.doc.root];
      while (st.length) {
        const n = st.pop();
        if (n.text.toLowerCase().includes(q) || n.note.toLowerCase().includes(q) || n.labels.some((l) => l.toLowerCase().includes(q))) hits.push(n.id);
        for (let i = n.children.length - 1; i >= 0; i--) st.push(n.children[i]);
      }
    }
    const prev = S.search.idx >= 0 ? S.search.hits[S.search.idx] : null;
    S.search.hits = hits;
    S.search.set = new Set(hits);
    S.search.idx = prev ? hits.indexOf(prev) : -1;
    updateSearchCount();
  }
  function render(opts) {
    if (!S.doc) return;
    opts = opts || {};
    if (S.search.q) recomputeHits();
    const L = computeLayout();
    S.layout = L;
    renderNodes(L);
    renderEdges(L);
    applyView();
    if (opts.panel !== false) renderPanel();
    updateToolbar();
    renderFocusBar();
    updateEmptyHint();
    if (S.editing) positionEditor();
  }
  function updateToolbar() {
    const has = !!S.doc;
    btnUndo.disabled = !has || !S.undo.length;
    btnRedo.disabled = !has || !S.redo.length;
    btnExport.disabled = !has;
    titleInput.disabled = !has;
    searchInput.disabled = !has;
    layoutSel.disabled = !has;
    $('cur-sec').hidden = !has;
    if (!has) { titleInput.value = ''; return; }
    const n = getNode(S.sel);
    const isDisp = n && n.id === displayRootId();
    actionBar.querySelectorAll('[data-need]').forEach((b) => {
      const need = b.dataset.need;
      let ok = !!n;
      if (need === 'nonroot') ok = !!n && !isDisp;
      if (need === 'kids') ok = !!n && n.children.length > 0;
      b.disabled = !ok;
    });
    if (document.activeElement !== titleInput && titleInput.value !== S.doc.title) titleInput.value = S.doc.title;
    if (layoutSel.value !== S.doc.layout) layoutSel.value = S.doc.layout;
    document.title = S.doc.title + ' – MindFlow';
  }
  function renderFocusBar() {
    if (!S.focusId || !S.nodes.has(S.focusId)) { focusBar.hidden = true; return; }
    const anc = ancestorsOf(S.focusId);
    let h = '<span>◉ フォーカス表示:</span>';
    anc.forEach((a, i) => {
      h += '<button type="button" class="crumb" data-focus="' + (i === 0 ? '' : esc(a.id)) + '">' + esc(trunc(a.text || '（空）', 14)) + '</button><span aria-hidden="true">›</span>';
    });
    h += '<strong>' + esc(trunc(S.nodes.get(S.focusId).text || '（空）', 20)) + '</strong>';
    h += '<button type="button" class="btn sm" data-focus="" style="margin-left:6px">解除 <kbd>Esc</kbd></button>';
    focusBar.innerHTML = h;
    focusBar.hidden = false;
  }
  focusBar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-focus]');
    if (b) { setFocus(b.dataset.focus || null); focusViewport(); }
  });
  function updateEmptyHint() {
    const d = S.nodes.get(displayRootId());
    emptyHint.hidden = !(d && d.children.length === 0 && !S.editing);
  }

  // ------------------------------------------------------------------
  // 表示位置（ズーム・パン）
  // ------------------------------------------------------------------
  let viewSaveTimer = null;
  function viewportSize() { return { w: viewport.clientWidth, h: viewport.clientHeight }; }
  function applyView() {
    const v = S.view;
    world.style.transform = 'translate(' + v.x + 'px,' + v.y + 'px) scale(' + v.k + ')';
    zoomLabel.textContent = Math.round(v.k * 100) + '%';
    scheduleMinimap();
    clearTimeout(viewSaveTimer);
    if (S.doc) {
      const id = S.doc.id;
      viewSaveTimer = setTimeout(() => {
        const views = store.getSetting('views', {});
        views[id] = { x: Math.round(v.x), y: Math.round(v.y), k: v.k };
        store.setSetting('views', views);
      }, 800);
    }
  }
  function zoomAt(f, sx, sy) {
    const v = S.view;
    const k = clamp(v.k * f, 0.15, 3);
    v.x = sx - (sx - v.x) * (k / v.k);
    v.y = sy - (sy - v.y) * (k / v.k);
    v.k = k;
    applyView();
  }
  function zoomBy(f) { const s = viewportSize(); zoomAt(f, s.w / 2, s.h / 2); }
  function zoomReset() { const s = viewportSize(); zoomAt(1 / S.view.k, s.w / 2, s.h / 2); }
  function fit() {
    if (!S.layout) return;
    const s = viewportSize();
    if (!s.w || !s.h) { S.needFit = true; return; }
    const b = S.layout.bounds;
    const bw = Math.max(b.maxX - b.minX, 1), bh = Math.max(b.maxY - b.minY, 1);
    const padX = 40, padTop = S.focusId ? 64 : 40, padBottom = S.narrow ? 140 : 80;
    const availH = Math.max(s.h - padTop - padBottom, 80);
    const k = clamp(Math.min((s.w - padX * 2) / bw, availH / bh, 1.1), 0.15, 3);
    S.view.k = k;
    S.view.x = s.w / 2 - (b.minX + bw / 2) * k;
    S.view.y = padTop + availH / 2 - (b.minY + bh / 2) * k;
    applyView();
  }
  function centerOn(id) {
    const p = S.layout && S.layout.pos.get(id);
    if (!p) return;
    const s = viewportSize();
    S.view.x = s.w / 2 - (p.x + p.w / 2) * S.view.k;
    S.view.y = s.h * 0.45 - (p.y + p.h / 2) * S.view.k;
    applyView();
  }
  function scrollIntoViewIfNeeded(id) {
    const p = S.layout && S.layout.pos.get(id);
    if (!p) return;
    const s = viewportSize(), k = S.view.k, m = 40, mb = S.narrow ? 130 : 70;
    const sx = p.x * k + S.view.x, sy = p.y * k + S.view.y, ex = sx + p.w * k, ey = sy + p.h * k;
    let dx = 0, dy = 0;
    if (sx < m) dx = m - sx; else if (ex > s.w - m) dx = (s.w - m) - ex;
    if (sy < m) dy = m - sy; else if (ey > s.h - mb) dy = (s.h - mb) - ey;
    if (dx || dy) { S.view.x += dx; S.view.y += dy; applyView(); }
  }

  // ------------------------------------------------------------------
  // ミニマップ
  // ------------------------------------------------------------------
  let mmPending = false;
  function scheduleMinimap() {
    if (mmPending) return;
    mmPending = true;
    requestAnimationFrame(() => { mmPending = false; drawMinimap(); });
  }
  function drawMinimap() {
    if (!S.layout || !S.minimap || !S.doc) return;
    const W = minimap.clientWidth, H = minimap.clientHeight;
    if (!W || !H) return;
    const dpr = window.devicePixelRatio || 1;
    if (minimap.width !== Math.round(W * dpr) || minimap.height !== Math.round(H * dpr)) {
      minimap.width = Math.round(W * dpr);
      minimap.height = Math.round(H * dpr);
    }
    const ctx = minimap.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pal = PAL[S.theme], s0 = viewportSize(), k = S.view.k;
    const vx = -S.view.x / k, vy = -S.view.y / k, vW = s0.w / k, vH = s0.h / k;
    if (!S.mmDrag || !S.mm) {
      const b = S.layout.bounds;
      const minX = Math.min(b.minX, vx), minY = Math.min(b.minY, vy);
      const maxX = Math.max(b.maxX, vx + vW), maxY = Math.max(b.maxY, vy + vH);
      const sc = Math.min((W - 12) / Math.max(maxX - minX, 1), (H - 12) / Math.max(maxY - minY, 1));
      S.mm = { s: sc, ox: (W - (maxX - minX) * sc) / 2 - minX * sc, oy: (H - (maxY - minY) * sc) / 2 - minY * sc };
    }
    const m = S.mm;
    for (const id of S.layout.order) {
      const p = S.layout.pos.get(id);
      ctx.globalAlpha = p.dd === 0 ? 1 : 0.75;
      ctx.fillStyle = p.dd === 0 ? pal.accent : branchColor(p.branch, pal);
      ctx.fillRect(m.ox + p.x * m.s, m.oy + p.y * m.s, Math.max(2, p.w * m.s), Math.max(1.5, p.h * m.s));
    }
    ctx.globalAlpha = 1;
    const sp = S.sel && S.layout.pos.get(S.sel);
    if (sp) {
      ctx.strokeStyle = pal.focus;
      ctx.lineWidth = 2;
      ctx.strokeRect(m.ox + sp.x * m.s - 2, m.oy + sp.y * m.s - 2, sp.w * m.s + 4, sp.h * m.s + 4);
    }
    ctx.strokeStyle = pal.frame;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(m.ox + vx * m.s, m.oy + vy * m.s, vW * m.s, vH * m.s);
  }
  function mmMove(e) {
    if (!S.mm) return;
    const r = minimap.getBoundingClientRect();
    const wx = (e.clientX - r.left - S.mm.ox) / S.mm.s, wy = (e.clientY - r.top - S.mm.oy) / S.mm.s;
    const s = viewportSize();
    S.view.x = s.w / 2 - wx * S.view.k;
    S.view.y = s.h / 2 - wy * S.view.k;
    applyView();
  }
  minimap.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { minimap.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
    S.mmDrag = true;
    mmMove(e);
  });
  minimap.addEventListener('pointermove', (e) => { if (S.mmDrag) mmMove(e); });
  minimap.addEventListener('pointerup', () => { S.mmDrag = false; scheduleMinimap(); });
  minimap.addEventListener('pointercancel', () => { S.mmDrag = false; scheduleMinimap(); });
  function setMinimap(v) {
    S.minimap = v;
    store.setSetting('minimap', v);
    app.classList.toggle('no-minimap', !v);
    btnMinimap.setAttribute('aria-pressed', String(v));
    scheduleMinimap();
  }

  // ------------------------------------------------------------------
  // 選択・インライン編集
  // ------------------------------------------------------------------
  function focusViewport() { viewport.focus({ preventScroll: true }); }
  function select(id, opts) {
    opts = opts || {};
    if (id && !S.nodes.has(id)) id = null;
    if (S.sel === id && !opts.force) return;
    S.sel = id;
    render({ panel: true });
    if (id && opts.scroll !== false) scrollIntoViewIfNeeded(id);
  }
  function startEdit(id, opts) {
    opts = opts || {};
    if (!S.nodes.has(id)) return;
    if (S.editing && S.editing !== id) finishEdit(true, { refocus: false });
    if (!S.layout || !S.layout.pos.has(id)) { reveal(id); render({ panel: false }); }
    if (!S.layout.pos.has(id)) return;
    S.sel = id;
    S.editing = id;
    editor.value = S.nodes.get(id).text;
    editor.hidden = false;
    render({ panel: true });
    scrollIntoViewIfNeeded(id);
    editor.focus({ preventScroll: true });
    if (opts.select !== false) editor.select();
    else editor.setSelectionRange(editor.value.length, editor.value.length);
  }
  function positionEditor() {
    const p = S.layout && S.layout.pos.get(S.editing);
    if (!p) return;
    const st = p.box.st;
    const font = st.weight + ' ' + st.size + 'px ' + FONT;
    const lines = wrapText(editor.value || ' ', font, st.maxW);
    measureCtx.font = font;
    let tw = 0;
    for (const l of lines) tw = Math.max(tw, measureCtx.measureText(l).width);
    const w = Math.max(p.w, Math.ceil(tw) + st.padX * 2 + 16, 150);
    const h = Math.max(p.h, lines.length * st.lh + st.padY * 2 + 4);
    let left = p.x;
    if (p.side === 'left') left = p.x + p.w - w;
    else if (p.side === 'root') left = p.x + p.w / 2 - w / 2;
    editor.style.left = left + 'px';
    editor.style.top = p.y + 'px';
    editor.style.width = w + 'px';
    editor.style.height = h + 'px';
    editor.style.font = st.weight + ' ' + st.size + 'px/' + st.lh + 'px ' + FONT;
    editor.style.padding = st.padY + 'px ' + st.padX + 'px';
  }
  function finishEdit(save, opt) {
    opt = opt || {};
    const id = S.editing;
    if (!id) return;
    S.editing = null;
    const value = editor.value;
    editor.hidden = true;
    const isNew = S.pendingNew === id;
    S.pendingNew = null;
    const n = S.nodes.get(id);
    if (n) {
      const v = value.replace(/\r\n?/g, '\n').replace(CTRL_RE, '').slice(0, LIMITS.text).trim();
      if (!save) {
        if (isNew && !n.text) discardLast(); else render({ panel: true });
      } else if (isNew && !v) {
        discardLast();
      } else if (!v && id === rootId()) {
        toast('中心テーマは空にできません');
        render({ panel: true });
      } else if (v !== n.text) {
        if (isNew) { n.text = v; markDirty(); render({ panel: true }); }
        else commit(() => { n.text = v; });
      } else {
        render({ panel: true });
      }
    }
    if (opt.refocus !== false) focusViewport();
  }
  editor.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEdit(true);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!editor.value.trim()) return;
      const id = S.editing;
      finishEdit(true);
      if (!e.shiftKey && S.nodes.has(id)) addChild(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishEdit(false);
    }
  });
  editor.addEventListener('input', () => positionEditor());
  editor.addEventListener('blur', () => { if (S.editing) finishEdit(true, { refocus: false }); });
  ['copy', 'cut', 'paste'].forEach((t) => editor.addEventListener(t, (e) => e.stopPropagation()));

  // ------------------------------------------------------------------
  // ノード操作
  // ------------------------------------------------------------------
  function canAdd(parentId, count) {
    if (S.nodes.size + (count || 1) > LIMITS.nodes) { toast('ノード数の上限（' + LIMITS.nodes + '）に達しています'); return false; }
    if ((S.depth.get(parentId) || 0) + 1 > LIMITS.depth) { toast('階層の上限（' + LIMITS.depth + '階層）に達しています'); return false; }
    return true;
  }
  function addChild(pid) {
    if (S.editing) finishEdit(true, { refocus: false });
    pid = pid && S.nodes.has(pid) ? pid : displayRootId();
    const p = S.nodes.get(pid);
    if (!canAdd(pid)) return;
    const nn = makeNode('');
    commit(() => {
      p.collapsed = false;
      if (p.id === rootId() && S.doc.layout === 'balanced') nn.side = pickSide();
      p.children.push(nn);
      S.sel = nn.id;
    });
    S.pendingNew = nn.id;
    announce('子ノードを追加しました。テキストを入力してください');
    startEdit(nn.id);
  }
  function addSibling(id) {
    if (S.editing) finishEdit(true, { refocus: false });
    if (!id || !S.nodes.has(id) || id === displayRootId()) { addChild(id); return; }
    const par = parentOf(id), n = S.nodes.get(id);
    if (!canAdd(par.id)) return;
    const nn = makeNode('');
    commit(() => {
      if (par.id === rootId()) nn.side = n.side || (S.doc.layout === 'balanced' ? 'right' : '');
      par.children.splice(par.children.indexOf(n) + 1, 0, nn);
      S.sel = nn.id;
    });
    S.pendingNew = nn.id;
    announce('同じ階層にノードを追加しました。テキストを入力してください');
    startEdit(nn.id);
  }
  function deleteNode(id) {
    if (!id || !S.nodes.has(id)) return;
    if (id === rootId()) { toast('中心テーマは削除できません'); return; }
    if (S.editing) finishEdit(true, { refocus: false });
    const par = parentOf(id), n = S.nodes.get(id);
    const cnt = subtreeSize(n);
    const label = trunc(n.text || '（空）', 16);
    if (S.focusId && inSubtree(S.focusId, id)) S.focusId = null;
    commit(() => {
      const i = par.children.indexOf(n);
      par.children.splice(i, 1);
      const next = par.children[i] || par.children[i - 1] || par;
      S.sel = next.id;
    });
    toast('「' + label + '」を削除しました' + (cnt > 1 ? '（' + cnt + 'ノード）' : ''), { label: '元に戻す', fn: undo });
  }
  function duplicateNode(id) {
    if (!id || !S.nodes.has(id)) return;
    if (id === rootId()) { toast('中心テーマは複製できません（左メニューの「このマップ → 複製」を使えます）'); return; }
    const n = S.nodes.get(id), par = parentOf(id);
    if (!canAdd(par.id, subtreeSize(n))) return;
    commit(() => {
      const c = cloneFresh(n);
      c.offset = { x: 0, y: 0 };
      par.children.splice(par.children.indexOf(n) + 1, 0, c);
      S.sel = c.id;
    });
    scrollIntoViewIfNeeded(S.sel);
    announce('複製しました');
  }
  function toggleCollapse(id) {
    const n = getNode(id);
    if (!n || !n.children.length) return;
    commit(() => {
      n.collapsed = !n.collapsed;
      if (n.collapsed && S.sel && S.sel !== id && inSubtree(S.sel, id)) S.sel = id;
    });
    announce(n.collapsed ? '折りたたみました' : '展開しました');
  }
  function toggleDone(id) {
    const n = getNode(id);
    if (!n) return;
    commit(() => { n.done = !n.done; });
    announce(n.done ? '完了にしました' : '未完了に戻しました');
  }
  function moveSibling(dir) {
    const id = S.sel;
    if (!id || id === displayRootId()) return;
    const par = parentOf(id), n = S.nodes.get(id), p = S.layout.pos.get(id);
    const same = par.children.filter((c) => { const q = S.layout.pos.get(c.id); return !q || !p || q.side === p.side; });
    const i = same.indexOf(n), j = i + dir;
    if (j < 0 || j >= same.length) return;
    const other = same[j];
    commit(() => {
      const a = par.children.indexOf(n), b = par.children.indexOf(other);
      par.children[a] = other;
      par.children[b] = n;
    });
    scrollIntoViewIfNeeded(id);
    announce('並べ替えました');
  }
  function outdent() {
    const id = S.sel, dispId = displayRootId();
    if (!id || id === dispId) return;
    const par = parentOf(id);
    if (!par || par.id === dispId) { toast('これ以上、上の階層には移動できません'); return; }
    const g = parentOf(par.id), n = S.nodes.get(id);
    commit(() => {
      par.children.splice(par.children.indexOf(n), 1);
      g.children.splice(g.children.indexOf(par) + 1, 0, n);
      n.offset = { x: 0, y: 0 };
      n.side = g.id === rootId() ? (par.side || (S.doc.layout === 'balanced' ? 'right' : '')) : '';
    });
    scrollIntoViewIfNeeded(id);
    announce('1つ上の階層へ移動しました');
  }
  function moveTo(id, targetId, mode, worldX) {
    const n = S.nodes.get(id), oldPar = parentOf(id);
    oldPar.children.splice(oldPar.children.indexOf(n), 1);
    n.offset = { x: 0, y: 0 };
    let newPar, idx;
    if (mode === 'child') {
      newPar = S.nodes.get(targetId);
      newPar.collapsed = false;
      idx = newPar.children.length;
    } else {
      newPar = parentOf(targetId);
      idx = newPar.children.indexOf(S.nodes.get(targetId)) + (mode === 'after' ? 1 : 0);
    }
    newPar.children.splice(idx, 0, n);
    if (newPar.id === rootId() && S.doc.layout === 'balanced') {
      n.side = mode === 'child' ? (worldX < 0 ? 'left' : 'right') : (S.nodes.get(targetId).side || 'right');
    } else if (newPar.id !== rootId()) {
      n.side = '';
    }
  }
  function reveal(id) {
    let changed = false;
    let a = S.parent.get(id);
    while (a) {
      const an = S.nodes.get(a);
      if (an.collapsed) { an.collapsed = false; changed = true; }
      a = S.parent.get(a);
    }
    if (S.focusId && !inSubtree(id, S.focusId)) S.focusId = null;
    if (changed) markDirty();
  }
  function setFocus(id) {
    if (S.editing) finishEdit(true, { refocus: false });
    if (!id || id === rootId() || !S.nodes.has(id)) id = null;
    S.focusId = id;
    if (id) {
      const n = S.nodes.get(id);
      if (n.collapsed) { n.collapsed = false; markDirty(); }
      if (!S.sel || !inSubtree(S.sel, id)) S.sel = id;
    }
    render({ panel: true });
    requestAnimationFrame(fit);
    announce(id ? 'フォーカス表示: ' + trunc(S.nodes.get(id).text || '（空）', 30) : 'フォーカス表示を解除しました');
  }
  function toggleFocus() {
    if (!S.sel) { if (S.focusId) setFocus(null); return; }
    if (S.focusId === S.sel) setFocus(null); else setFocus(S.sel);
  }
  function setLayout(v) {
    if ((v !== 'balanced' && v !== 'right') || v === S.doc.layout) return;
    commit(() => { S.doc.layout = v; assignSides(); });
    requestAnimationFrame(fit);
  }
  function addLabel(raw) {
    const n = getNode(S.sel);
    if (!n) return;
    const v = String(raw || '').replace(CTRL_RE, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.labelLen);
    if (!v) { toast('ラベル名を入力してください'); return; }
    if (n.labels.includes(v)) { toast('同じラベルがすでに付いています'); return; }
    if (n.labels.length >= LIMITS.labels) { toast('ラベルは1つのノードに' + LIMITS.labels + '個までです'); return; }
    commit(() => { n.labels.push(v); });
    announce('ラベル「' + v + '」を追加しました');
  }

  // ------------------------------------------------------------------
  // キーボードでのノード間移動
  // ------------------------------------------------------------------
  function closestByY(ids, y) {
    let best = null, bd = Infinity;
    for (const id of ids) {
      const q = S.layout.pos.get(id);
      if (!q) continue;
      const d = Math.abs(q.y + q.h / 2 - y);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }
  function navigate(dir) {
    const dispId = displayRootId();
    if (!S.sel || !S.layout.pos.has(S.sel)) { select(dispId); return; }
    const id = S.sel, n = S.nodes.get(id), p = S.layout.pos.get(id);
    const cy = p.y + p.h / 2;
    if (dir === 'left' || dir === 'right') {
      if (id === dispId) {
        const c = S.layout.order.filter((cid) => { const q = S.layout.pos.get(cid); return q.parent === id && q.side === dir; });
        const t = closestByY(c, cy);
        if (t) select(t);
        return;
      }
      if (p.side === dir) {
        if (n.children.length) {
          if (n.collapsed) { toggleCollapse(id); return; }
          const t = closestByY(n.children.map((c) => c.id), cy);
          if (t) select(t);
        }
      } else if (p.parent) {
        select(p.parent);
      }
      return;
    }
    if (p.parent) {
      const par = S.nodes.get(p.parent);
      const sibs = par.children.filter((c) => { const q = S.layout.pos.get(c.id); return q && q.side === p.side; });
      const i = sibs.indexOf(n), j = dir === 'up' ? i - 1 : i + 1;
      if (j >= 0 && j < sibs.length) { select(sibs[j].id); return; }
    }
    const cx = p.x + p.w / 2;
    let best = null, bs = Infinity;
    for (const oid of S.layout.order) {
      if (oid === id) continue;
      const q = S.layout.pos.get(oid);
      const dy = dir === 'up' ? cy - (q.y + q.h / 2) : (q.y + q.h / 2) - cy;
      if (dy <= 1) continue;
      const sc = dy + Math.abs(q.x + q.w / 2 - cx) * 0.6;
      if (sc < bs) { bs = sc; best = oid; }
    }
    if (best) select(best);
  }

  // ------------------------------------------------------------------
  // 検索
  // ------------------------------------------------------------------
  function updateSearchCount() {
    const s = S.search;
    if (!s.q) searchCount.textContent = '';
    else if (!s.hits.length) searchCount.textContent = '0件';
    else searchCount.textContent = (s.idx >= 0 ? s.idx + 1 : '-') + '/' + s.hits.length;
  }
  function runSearch() {
    S.search.q = searchInput.value.trim().toLowerCase();
    S.search.idx = -1;
    S.search.hits = [];
    recomputeHits();
    if (S.doc) render({ panel: false });
  }
  function gotoHit(dir) {
    const s = S.search;
    if (!S.doc) return;
    if (!s.q) { searchInput.focus(); return; }
    if (!s.hits.length) { toast('「' + searchInput.value.trim() + '」に一致するノードはありません'); return; }
    s.idx = (s.idx + dir + s.hits.length) % s.hits.length;
    const id = s.hits[s.idx];
    reveal(id);
    S.sel = id;
    render({ panel: true });
    centerOn(id);
    updateSearchCount();
    announce((s.idx + 1) + '件目: ' + trunc(S.nodes.get(id).text || '（空）', 30));
  }
  let searchTimer = null;
  searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 120); });
  searchInput.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(searchTimer);
      if (S.search.q !== searchInput.value.trim().toLowerCase()) runSearch();
      gotoHit(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      searchInput.value = '';
      runSearch();
      focusViewport();
    }
  });
  $('search-next').addEventListener('click', () => gotoHit(1));
  $('search-prev').addEventListener('click', () => gotoHit(-1));

  // ------------------------------------------------------------------
  // ポインター操作（選択・ドラッグ移動・パン・ピンチ）
  // ------------------------------------------------------------------
  let G = null, pinch = null;
  const pointers = new Map();
  viewport.addEventListener('pointerdown', (e) => {
    if (!S.doc) return;
    if (e.target === editor || (e.target.closest && e.target.closest('.tg'))) return;
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* 無視 */ }
    if (pointers.size === 2) {
      if (S.drag) cancelDrag();
      G = null;
      const pts = Array.from(pointers.values()), r = viewport.getBoundingClientRect();
      pinch = {
        d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
        mx: (pts[0].x + pts[1].x) / 2 - r.left,
        my: (pts[0].y + pts[1].y) / 2 - r.top,
        view: Object.assign({}, S.view)
      };
      return;
    }
    if (pointers.size > 2) return;
    if (document.activeElement !== viewport) focusViewport();
    const nodeEl = e.target.closest ? e.target.closest('.node') : null;
    const id = nodeEl ? nodeEl.dataset.id : null;
    G = {
      id: id, sx: e.clientX, sy: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false,
      view: Object.assign({}, S.view), mode: (id && id !== displayRootId() && e.button === 0) ? 'node' : 'pan', raf: 0
    };
    if (e.button === 1) e.preventDefault();
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const pts = Array.from(pointers.values()), r = viewport.getBoundingClientRect();
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const mx = (pts[0].x + pts[1].x) / 2 - r.left, my = (pts[0].y + pts[1].y) / 2 - r.top;
      const k = clamp(pinch.view.k * d / pinch.d, 0.15, 3);
      const wx = (pinch.mx - pinch.view.x) / pinch.view.k, wy = (pinch.my - pinch.view.y) / pinch.view.k;
      S.view = { k: k, x: mx - wx * k, y: my - wy * k };
      applyView();
      return;
    }
    const g = G;
    if (!g) return;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      g.moved = true;
      if (g.mode === 'node') beginDrag(g); else viewport.classList.add('panning');
    }
    if (g.mode === 'node') {
      g.lastX = e.clientX;
      g.lastY = e.clientY;
      if (!g.raf) g.raf = requestAnimationFrame(() => { g.raf = 0; if (S.drag && S.drag.g === g) updateDrag(); });
    } else {
      S.view.x = g.view.x + dx;
      S.view.y = g.view.y + dy;
      applyView();
    }
  });
  function endPointer(e, cancelled) {
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; G = null; return; }
    const g = G;
    G = null;
    viewport.classList.remove('panning');
    if (!g) return;
    if (g.raf) { cancelAnimationFrame(g.raf); g.raf = 0; }
    if (cancelled) { if (S.drag) cancelDrag(); return; }
    if (S.drag) { g.lastX = e.clientX; g.lastY = e.clientY; updateDrag(); endDrag(); return; }
    if (g.moved) return;
    if (g.id) {
      const now = Date.now();
      if (S.lastTap.id === g.id && now - S.lastTap.t < 400) {
        S.lastTap = { id: null, t: 0 };
        startEdit(g.id);
      } else {
        S.lastTap = { id: g.id, t: now };
        select(g.id, { scroll: false });
      }
    } else {
      S.lastTap = { id: null, t: 0 };
      if (S.sel) select(null);
    }
  }
  viewport.addEventListener('pointerup', (e) => endPointer(e, false));
  viewport.addEventListener('pointercancel', (e) => endPointer(e, true));
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const m = e.deltaMode === 1 ? 20 : (e.deltaMode === 2 ? 400 : 1);
    const r = viewport.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      zoomAt(Math.exp(-e.deltaY * m * 0.0015), e.clientX - r.left, e.clientY - r.top);
    } else {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      S.view.x -= dx * m;
      S.view.y -= dy * m;
      applyView();
    }
  }, { passive: false });
  nodesLayer.addEventListener('click', (e) => {
    const tg = e.target.closest('.tg');
    if (!tg) return;
    e.stopPropagation();
    toggleCollapse(tg.closest('.node').dataset.id);
  });

  function beginDrag(g) {
    if (S.editing) finishEdit(true, { refocus: false });
    const n = S.nodes.get(g.id);
    if (!n) { g.mode = 'pan'; return; }
    const sub = new Set();
    const st = [n];
    while (st.length) { const x = st.pop(); sub.add(x.id); for (const c of x.children) st.push(c); }
    S.drag = { id: g.id, g: g, snap: snapshot(), orig: { x: n.offset.x, y: n.offset.y }, subtree: sub, drop: null };
    S.sel = g.id;
    render({ panel: true });
  }
  function findDropTarget(cx, cy) {
    const list = document.elementsFromPoint(cx, cy);
    for (const el of list) {
      const ne = el.closest ? el.closest('.node') : null;
      if (!ne || !nodesLayer.contains(ne)) continue;
      const tid = ne.dataset.id;
      if (S.drag.subtree.has(tid)) continue;
      const r = ne.getBoundingClientRect();
      const rel = (cy - r.top) / Math.max(r.height, 1);
      let mode = 'child';
      if (tid !== displayRootId()) {
        if (rel < 0.25) mode = 'before';
        else if (rel > 0.75) mode = 'after';
      }
      return { id: tid, mode: mode };
    }
    return null;
  }
  function updateDrag() {
    const d = S.drag;
    if (!d) return;
    const g = d.g, n = S.nodes.get(d.id);
    if (!n) return;
    n.offset = { x: d.orig.x + (g.lastX - g.sx) / S.view.k, y: d.orig.y + (g.lastY - g.sy) / S.view.k };
    d.drop = findDropTarget(g.lastX, g.lastY);
    render({ panel: false });
  }
  function endDrag() {
    const d = S.drag;
    S.drag = null;
    if (!d) return;
    const n = S.nodes.get(d.id);
    if (d.drop) {
      const r = viewport.getBoundingClientRect();
      const wx = (d.g.lastX - r.left - S.view.x) / S.view.k;
      restore(d.snap);
      S.sel = d.id;
      const target = d.drop;
      const nn = S.nodes.get(d.id);
      const newParentId = target.mode === 'child' ? target.id : S.parent.get(target.id);
      if ((S.depth.get(newParentId) || 0) + 1 + subtreeHeight(nn) > LIMITS.depth) {
        render({ panel: true });
        toast('階層の上限（' + LIMITS.depth + '階層）を超えるため移動できません');
        return;
      }
      pushHistory(d.snap);
      moveTo(d.id, target.id, target.mode, wx);
      S.coalesceKey = null;
      reindex();
      markDirty();
      render({ panel: true });
      scrollIntoViewIfNeeded(d.id);
      const tn = S.nodes.get(target.id);
      announce(target.mode === 'child' ? '「' + trunc(tn.text, 20) + '」の子に移動しました' : '並び順を変更しました');
      return;
    }
    if (!n || Math.hypot(n.offset.x - d.orig.x, n.offset.y - d.orig.y) < 1) {
      restore(d.snap);
      S.sel = d.id;
      render({ panel: true });
      return;
    }
    pushHistory(d.snap);
    const parId = S.parent.get(d.id);
    if (parId === rootId() && S.doc.layout === 'balanced' && displayRootId() === rootId()) {
      const p = S.layout.pos.get(d.id), rp = S.layout.pos.get(parId);
      const ns = p.x + p.w / 2 < rp.x + rp.w / 2 ? 'left' : 'right';
      if (ns !== p.side) {
        const cy = p.y + p.h / 2, par = S.nodes.get(parId);
        n.side = ns;
        n.offset = { x: 0, y: 0 };
        par.children.splice(par.children.indexOf(n), 1);
        let idx = par.children.length;
        for (let i = 0; i < par.children.length; i++) {
          const q = S.layout.pos.get(par.children[i].id);
          if (q && q.side === ns && q.y + q.h / 2 > cy) { idx = i; break; }
        }
        par.children.splice(idx, 0, n);
        announce(ns === 'left' ? '左側へ移動しました' : '右側へ移動しました');
      }
    }
    S.coalesceKey = null;
    reindex();
    markDirty();
    render({ panel: true });
  }
  function cancelDrag() {
    const d = S.drag;
    S.drag = null;
    if (!d) return;
    restore(d.snap);
    S.sel = d.id;
    render({ panel: true });
    announce('移動を取り消しました');
  }

  // ------------------------------------------------------------------
  // クリップボード（枝のコピー・貼り付け、箇条書きテキストの取り込み）
  // ------------------------------------------------------------------
  function outlineText(n) {
    const out = [];
    const st = [[n, 0]];
    while (st.length) {
      const [x, d] = st.pop();
      out.push('  '.repeat(d) + '- ' + (x.done ? '[x] ' : '') + (x.text || '').replace(/\n/g, ' '));
      for (let i = x.children.length - 1; i >= 0; i--) st.push([x.children[i], d + 1]);
    }
    return out.join('\n');
  }
  function parseOutline(text) {
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
    const roots = [], stack = [];
    for (const raw of lines.slice(0, 500)) {
      const indent = raw.match(/^[\t ]*/)[0].replace(/\t/g, '    ').length;
      let s = raw.trim().replace(/^#{1,6}\s+/, '');
      let done = false;
      const cb = s.match(/^[-*+]\s+\[([ xX])\]\s*/);
      if (cb) { done = cb[1] !== ' '; s = s.slice(cb[0].length); }
      else s = s.replace(/^(?:[-*+]\s+|[・•]\s*|\d+[.)]\s+)/, '');
      const node = makeNode(s.replace(CTRL_RE, '').slice(0, LIMITS.text));
      node.done = done;
      while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
      if (stack.length) stack[stack.length - 1].node.children.push(node); else roots.push(node);
      stack.push({ indent: indent, node: node });
    }
    return roots;
  }
  function pasteNodes(list) {
    const target = getNode(S.sel) || S.nodes.get(displayRootId());
    let count = 0, h = 0;
    for (const r of list) { count += subtreeSize(r); h = Math.max(h, subtreeHeight(r)); }
    if (S.nodes.size + count > LIMITS.nodes) { toast('ノード数の上限（' + LIMITS.nodes + '）を超えるため貼り付けできません'); return; }
    if ((S.depth.get(target.id) || 0) + 1 + h > LIMITS.depth) { toast('階層の上限を超えるため貼り付けできません'); return; }
    commit(() => {
      target.collapsed = false;
      for (const r of list) {
        r.offset = { x: 0, y: 0 };
        r.side = target.id === rootId() && S.doc.layout === 'balanced' ? pickSide() : '';
        target.children.push(r);
      }
      S.sel = list[0].id;
    });
    scrollIntoViewIfNeeded(S.sel);
    toast(count + 'ノードを貼り付けました');
  }
  function canvasActive() {
    const a = document.activeElement;
    return !S.modal && (!a || a === document.body || a === viewport);
  }
  document.addEventListener('copy', (e) => {
    if (!S.doc || !canvasActive() || !S.sel || !e.clipboardData) return;
    const n = S.nodes.get(S.sel);
    const text = outlineText(n);
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
    S.clip = { text: text, json: JSON.stringify(n) };
    toast('コピーしました。Ctrl+V で選択中のノードの下に貼り付けます');
  });
  document.addEventListener('cut', (e) => {
    if (!S.doc || !canvasActive() || !S.sel || !e.clipboardData) return;
    if (S.sel === rootId()) { toast('中心テーマは切り取りできません'); return; }
    const n = S.nodes.get(S.sel);
    const text = outlineText(n);
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
    S.clip = { text: text, json: JSON.stringify(n) };
    deleteNode(S.sel);
  });
  document.addEventListener('paste', (e) => {
    if (!S.doc || !canvasActive()) return;
    const text = ((e.clipboardData && e.clipboardData.getData('text/plain')) || '').replace(/\r\n?/g, '\n');
    e.preventDefault();
    let list;
    if (S.clip && text === S.clip.text) {
      try {
        const c = cloneFresh(JSON.parse(S.clip.json));
        const st = [c];
        while (st.length) { const x = st.pop(); fixNode(x); for (const ch of x.children) st.push(ch); }
        list = [c];
      } catch (err) {
        list = parseOutline(text);
      }
    } else {
      list = parseOutline(text);
    }
    if (!list.length) { toast('貼り付けられるテキストがありません'); return; }
    pasteNodes(list);
  });

  // ------------------------------------------------------------------
  // モーダル（操作ガイド・書き出し）
  // ------------------------------------------------------------------
  function openModal(el) {
    if (S.editing) finishEdit(true, { refocus: false });
    S.modalReturn = document.activeElement;
    S.modal = el;
    el.hidden = false;
    const f = el.querySelector('button');
    if (f) f.focus();
  }
  function closeModal() {
    if (!S.modal) return;
    S.modal.hidden = true;
    S.modal = null;
    const r = S.modalReturn;
    S.modalReturn = null;
    if (r && document.contains(r) && typeof r.focus === 'function') r.focus();
    else focusViewport();
  }
  function trapTab(e) {
    const f = Array.from(S.modal.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!S.modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }
  [helpModal, exportModal].forEach((m) => m.addEventListener('pointerdown', (e) => { if (e.target === m) closeModal(); }));

  // ------------------------------------------------------------------
  // キーボードショートカット
  // ------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    const t = e.target, k = e.key, mod = e.ctrlKey || e.metaKey;
    if (S.modal) {
      if (k === 'Escape') { e.preventDefault(); closeModal(); }
      else if (k === 'Tab') trapTab(e);
      return;
    }
    if (k === 'Escape' && S.narrow && S.drawerOpen) { e.preventDefault(); toggleSidebar(false); btnSidebar.focus(); return; }
    if (!S.doc) return;
    if (S.drag && k === 'Escape') { e.preventDefault(); G = null; cancelDrag(); return; }
    if (mod && (k === 'f' || k === 'F')) { e.preventDefault(); searchInput.focus(); searchInput.select(); return; }
    if (mod && (k === 's' || k === 'S')) {
      e.preventDefault();
      if (S.editing) finishEdit(true, { refocus: false });
      const wasDirty = S.dirty;
      const ok = saveNow();
      toast(ok ? (wasDirty ? '保存しました' : 'すでに保存済みです（変更は自動で保存されます）') : '保存できませんでした');
      return;
    }
    const inField = t && t.closest && t.closest('input,textarea,select');
    if (inField) return;
    if (mod && !e.altKey && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
    if (k === '?' && !mod) { e.preventDefault(); openModal(helpModal); return; }
    const inCanvas = t === viewport || t === document.body || t === document.documentElement;
    if (!inCanvas) return;
    const sel = S.sel;
    let handled = true;
    if (k === 'Tab') {
      if (!sel) return;
      if (e.shiftKey) outdent(); else addChild(sel);
    } else if (k === 'Enter') {
      if (mod) { if (sel) toggleDone(sel); }
      else if (sel) addSibling(sel);
      else select(displayRootId());
    } else if (k === 'F2' || k === ' ') {
      if (sel) startEdit(sel); else select(displayRootId());
    } else if (k === 'Delete' || k === 'Backspace') {
      if (sel) deleteNode(sel);
    } else if (k.indexOf('Arrow') === 0) {
      const dir = k.slice(5).toLowerCase();
      if (e.altKey && (dir === 'up' || dir === 'down')) moveSibling(dir === 'up' ? -1 : 1);
      else if (e.shiftKey) {
        const step = 80;
        if (dir === 'left') S.view.x += step;
        else if (dir === 'right') S.view.x -= step;
        else if (dir === 'up') S.view.y += step;
        else S.view.y -= step;
        applyView();
      } else navigate(dir);
    } else if (mod && (k === '/' || k === '.')) {
      if (sel) toggleCollapse(sel);
    } else if (mod && (k === 'd' || k === 'D')) {
      if (sel) duplicateNode(sel);
    } else if (!mod && !e.altKey && (k === 'f' || k === 'F')) {
      toggleFocus();
    } else if (!mod && k === '0') {
      fit();
    } else if (!mod && (k === '+' || k === '=')) {
      zoomBy(1.2);
    } else if (!mod && k === '-') {
      zoomBy(1 / 1.2);
    } else if (k === 'Escape') {
      if (S.focusId) setFocus(null);
      else if (sel) select(null);
      else handled = false;
    } else if (k === 'Home') {
      select(displayRootId());
    } else if (k === 'Insert') {
      addChild(sel || displayRootId());
    } else {
      handled = false;
    }
    if (handled) e.preventDefault();
  });

  // ------------------------------------------------------------------
  // 右パネル
  // ------------------------------------------------------------------
  function panelVisible() { return S.narrow ? S.sheetOpen : S.panelOpen; }
  function updatePanelVisibility() {
    const v = panelVisible() && !!S.doc;
    app.classList.toggle('panel-hidden', !v);
    btnPanel.setAttribute('aria-pressed', String(v));
    if (v && S.panelDirty) renderPanel();
    scheduleMinimap();
  }
  function setPanel(v) {
    if (S.narrow) S.sheetOpen = v;
    else { S.panelOpen = v; store.setSetting('panel', v); }
    updatePanelVisibility();
  }
  function renderPanel() {
    if (!S.doc) return;
    if (!panelVisible()) { S.panelDirty = true; return; }
    S.panelDirty = false;
    const a = document.activeElement;
    const fk = a && panel.contains(a) && a.dataset ? a.dataset.fk : null;
    const scroll = panel.scrollTop;
    const n = getNode(S.sel);
    panel.innerHTML = n ? panelNodeHTML(n) : panelMapHTML();
    panel.scrollTop = S.panelFor === S.sel ? scroll : 0;
    S.panelFor = S.sel;
    if (fk) {
      const el = panel.querySelector('[data-fk="' + CSS.escape(fk) + '"]');
      if (el) el.focus({ preventScroll: true });
    }
  }
  function panelNodeHTML(n) {
    const isRoot = n.id === rootId();
    const isDisp = n.id === displayRootId();
    const pal = PAL[S.theme];
    let h = '<div class="panel-head"><h2>' + (isRoot ? '中心テーマの編集' : 'ノードの編集') + '</h2>' +
      '<button type="button" class="btn icon sm" data-act="close-panel" data-fk="close" aria-label="パネルを閉じる" title="パネルを閉じる">✕</button></div>';
    const anc = ancestorsOf(n.id);
    if (anc.length) h += '<p class="path"><span class="sr-only">位置: </span>' + anc.map((x) => esc(trunc(x.text || '（空）', 12))).join(' › ') + '</p>';
    h += '<label class="fld"><span>テキスト</span><textarea data-field="text" data-fk="text" rows="3" maxlength="' + LIMITS.text + '">' + esc(n.text) + '</textarea></label>';
    h += '<label class="chk-row"><input type="checkbox" data-field="done" data-fk="done"' + (n.done ? ' checked' : '') + '> 完了にする（✓と取り消し線を表示）</label>';
    h += '<fieldset class="fld"><legend>アイコン</legend><div class="icon-grid">';
    for (const ic of ICONS) {
      h += '<button type="button" class="icon-opt" data-act="icon" data-v="' + esc(ic) + '" data-fk="icon-' + esc(ic) + '" aria-pressed="' + (n.icon === ic) + '" aria-label="アイコン: ' + ICON_NAMES[ic] + '" title="' + ICON_NAMES[ic] + '">' + (ic ? esc(ic) : '∅') + '</button>';
    }
    h += '</div></fieldset>';
    h += '<fieldset class="fld"><legend>背景色</legend><div class="swatches">';
    for (const key of BG_KEYS) {
      const pressed = n.bg === key;
      const style = key === 'none' ? '' : ' style="background:' + pal.bg[key] + ';border-color:' + pal.border[key] + '"';
      h += '<button type="button" class="swatch" data-act="bg" data-v="' + key + '" data-fk="bg-' + key + '" aria-pressed="' + pressed + '" aria-label="背景色: ' + BG_NAMES[key] + '" title="' + BG_NAMES[key] + '"' + style + '>' + (key === 'none' ? '∅' : '') + (pressed ? '<span class="mark" aria-hidden="true">✓</span>' : '') + '</button>';
    }
    h += '</div></fieldset>';
    h += '<fieldset class="fld"><legend>文字色</legend><div class="swatches">';
    for (const key of TEXT_KEYS) {
      const pressed = n.color === key;
      h += '<button type="button" class="swatch" data-act="color" data-v="' + key + '" data-fk="color-' + key + '" aria-pressed="' + pressed + '" aria-label="文字色: ' + TEXT_NAMES[key] + '" title="' + TEXT_NAMES[key] + '" style="color:' + pal.text[key] + '">A' + (pressed ? '<span class="mark" aria-hidden="true">✓</span>' : '') + '</button>';
    }
    h += '</div>' + (isRoot && n.bg === 'none' ? '<p class="hint">中心テーマの文字色は、背景色を設定したときに反映されます。</p>' : '') + '</fieldset>';
    const freq = new Map();
    for (const x of S.nodes.values()) for (const l of x.labels) freq.set(l, (freq.get(l) || 0) + 1);
    const existing = Array.from(freq.keys()).sort((a, b) => freq.get(b) - freq.get(a));
    const sugg = [];
    for (const l of existing.concat(LABEL_SUGGEST)) {
      if (!n.labels.includes(l) && !sugg.includes(l)) sugg.push(l);
      if (sugg.length >= 8) break;
    }
    h += '<div class="fld" role="group" aria-labelledby="lbl-title"><span class="fld-title" id="lbl-title">ラベル（' + n.labels.length + '/' + LIMITS.labels + '）</span><div class="chips-edit">';
    if (n.labels.length) {
      for (const l of n.labels) h += '<span class="chip">' + esc(l) + '<button type="button" class="chip-x" data-act="rm-label" data-v="' + esc(l) + '" data-fk="rm-' + esc(l) + '" aria-label="ラベル「' + esc(l) + '」を削除">×</button></span>';
    } else {
      h += '<span class="hint">ラベルはまだありません</span>';
    }
    h += '</div><div class="label-add"><input type="text" data-field="label-new" data-fk="label-new" maxlength="' + LIMITS.labelLen + '" list="label-list" placeholder="新しいラベル（Enterで追加）" aria-label="新しいラベル"><button type="button" class="btn sm" data-act="add-label" data-fk="add-label">追加</button></div>';
    if (sugg.length && n.labels.length < LIMITS.labels) {
      h += '<div class="suggest" aria-label="候補">' + sugg.map((l) => '<button type="button" class="btn" data-act="add-label-v" data-v="' + esc(l) + '" data-fk="sg-' + esc(l) + '">＋' + esc(l) + '</button>').join('') + '</div>';
    }
    h += '<datalist id="label-list">' + existing.map((l) => '<option value="' + esc(l) + '"></option>').join('') + '</datalist></div>';
    h += '<label class="fld"><span>メモ（検索の対象になります）</span><textarea data-field="note" data-fk="note" rows="4" maxlength="' + LIMITS.note + '" placeholder="詳細、URL、補足など">' + esc(n.note) + '</textarea></label>';
    if (!isRoot && S.parent.get(n.id) === rootId() && S.doc.layout === 'balanced') {
      const p = S.layout && S.layout.pos.get(n.id);
      const side = p ? p.side : (n.side || 'right');
      h += '<fieldset class="fld"><legend>配置</legend><div class="seg">' +
        '<button type="button" class="btn sm" data-act="side" data-v="left" data-fk="side-left" aria-pressed="' + (side === 'left') + '">← 左側</button>' +
        '<button type="button" class="btn sm" data-act="side" data-v="right" data-fk="side-right" aria-pressed="' + (side === 'right') + '">右側 →</button></div></fieldset>';
    }
    const moved = n.offset.x || n.offset.y;
    h += '<div class="fld"><span class="fld-title">操作</span><div class="act-grid">';
    h += '<button type="button" class="btn sm" data-act="add-child" data-fk="a-child">＋ 子を追加 <kbd>Tab</kbd></button>';
    if (!isDisp) h += '<button type="button" class="btn sm" data-act="add-sibling" data-fk="a-sib">＋ 同階層 <kbd>Enter</kbd></button>';
    h += '<button type="button" class="btn sm" data-act="edit" data-fk="a-edit">✎ その場で編集 <kbd>F2</kbd></button>';
    if (!isRoot) h += '<button type="button" class="btn sm" data-act="duplicate" data-fk="a-dup">⧉ 複製 <kbd>Ctrl+D</kbd></button>';
    if (n.children.length) h += '<button type="button" class="btn sm" data-act="collapse" data-fk="a-col">' + (n.collapsed ? '⊞ 展開' : '⊟ 折りたたむ') + ' <kbd>Ctrl+/</kbd></button>';
    if (!isRoot) h += '<button type="button" class="btn sm" data-act="focus" data-fk="a-focus">◉ ' + (S.focusId === n.id ? 'フォーカス解除' : 'この枝だけ表示') + ' <kbd>F</kbd></button>';
    if (moved) h += '<button type="button" class="btn sm" data-act="reset-pos" data-fk="a-reset">↺ 位置を自動に戻す</button>';
    if (!isRoot) h += '<button type="button" class="btn sm danger" data-act="delete" data-fk="a-del">🗑 削除 <kbd>Del</kbd></button>';
    h += '</div></div>';
    h += '<p class="meta">直下の子 ' + n.children.length + ' ・ 配下の合計 ' + (subtreeSize(n) - 1) + ' ノード</p>';
    return h;
  }
  function panelMapHTML() {
    const total = S.nodes.size;
    let done = 0, maxD = 0, moved = 0;
    const freq = new Map();
    for (const [id, x] of S.nodes) {
      if (id !== rootId() && x.done) done++;
      maxD = Math.max(maxD, S.depth.get(id));
      if (x.offset.x || x.offset.y) moved++;
      for (const l of x.labels) freq.set(l, (freq.get(l) || 0) + 1);
    }
    const tasks = Math.max(total - 1, 0);
    const pct = tasks ? Math.round(done / tasks * 100) : 0;
    let h = '<div class="panel-head"><h2>マップの概要</h2><button type="button" class="btn icon sm" data-act="close-panel" data-fk="close" aria-label="パネルを閉じる" title="パネルを閉じる">✕</button></div>';
    h += '<div class="stats"><div class="stat"><b>' + total + '</b><span>ノード</span></div><div class="stat"><b>' + done + '</b><span>完了</span></div><div class="stat"><b>' + maxD + '</b><span>最大階層</span></div></div>';
    h += '<div class="progress" role="progressbar" aria-label="完了率" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div style="width:' + pct + '%"></div></div><p class="meta" style="margin-top:4px">完了率 ' + pct + '%（中心テーマを除く）</p>';
    h += '<h3>レイアウト</h3><div class="seg">' +
      '<button type="button" class="btn sm" data-act="layout" data-v="balanced" data-fk="ly-b" aria-pressed="' + (S.doc.layout === 'balanced') + '">⇆ 左右に展開</button>' +
      '<button type="button" class="btn sm" data-act="layout" data-v="right" data-fk="ly-r" aria-pressed="' + (S.doc.layout === 'right') + '">→ 右方向</button></div>';
    h += '<h3>表示の整理</h3><div class="act-grid">' +
      '<button type="button" class="btn sm" data-act="select-root" data-fk="m-root">◎ 中心テーマを選択</button>' +
      '<button type="button" class="btn sm" data-act="expand-all" data-fk="m-exp">⊞ すべて展開</button>' +
      '<button type="button" class="btn sm" data-act="collapse-first" data-fk="m-col">⊟ 第1階層まで表示</button>' +
      '<button type="button" class="btn sm" data-act="reset-all-pos" data-fk="m-reset"' + (moved ? '' : ' disabled') + '>↺ 手動配置をリセット</button></div>';
    h += '<h3>ラベル一覧（クリックで検索）</h3>';
    if (freq.size) {
      h += '<div class="suggest">' + Array.from(freq.keys()).sort((a, b) => freq.get(b) - freq.get(a)).map((l) => '<button type="button" class="btn" data-act="search-label" data-v="' + esc(l) + '" data-fk="sl-' + esc(l) + '">' + esc(l) + '（' + freq.get(l) + '）</button>').join('') + '</div>';
    } else {
      h += '<p class="hint">ラベルはまだありません。ノードを選ぶと追加できます。</p>';
    }
    h += '<p class="panel-empty">ノードをクリックすると、ここでテキスト・完了・アイコン・色・ラベル・メモを編集できます。<br>キーボードでは矢印キーで選び、F2 で編集します。</p>';
    return h;
  }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || !S.doc) return;
    const act = b.dataset.act, v = b.dataset.v;
    const n = getNode(S.sel);
    switch (act) {
      case 'close-panel': setPanel(false); focusViewport(); break;
      case 'icon': if (n && ICONS.includes(v)) commit(() => { n.icon = v; }); break;
      case 'bg': if (n && BG_KEYS.includes(v)) commit(() => { n.bg = v; }); break;
      case 'color': if (n && TEXT_KEYS.includes(v)) commit(() => { n.color = v; }); break;
      case 'rm-label': if (n) commit(() => { n.labels = n.labels.filter((l) => l !== v); }); break;
      case 'add-label': { const inp = panel.querySelector('[data-field="label-new"]'); addLabel(inp ? inp.value : ''); break; }
      case 'add-label-v': addLabel(v); break;
      case 'side': if (n && (v === 'left' || v === 'right')) commit(() => { n.side = v; n.offset = { x: 0, y: 0 }; }); break;
      case 'add-child': if (n) addChild(n.id); break;
      case 'add-sibling': if (n) addSibling(n.id); break;
      case 'edit': if (n) startEdit(n.id); break;
      case 'duplicate': if (n) duplicateNode(n.id); break;
      case 'collapse': if (n) toggleCollapse(n.id); break;
      case 'focus': if (n) setFocus(S.focusId === n.id ? null : n.id); break;
      case 'reset-pos': if (n) commit(() => { n.offset = { x: 0, y: 0 }; }); break;
      case 'delete': if (n) deleteNode(n.id); break;
      case 'layout': setLayout(v); break;
      case 'select-root': select(displayRootId()); focusViewport(); break;
      case 'expand-all':
        commit(() => { for (const x of S.nodes.values()) x.collapsed = false; });
        requestAnimationFrame(fit);
        break;
      case 'collapse-first':
        commit(() => {
          for (const [id, x] of S.nodes) x.collapsed = S.depth.get(id) >= 1 && x.children.length > 0;
          S.focusId = null;
        });
        requestAnimationFrame(fit);
        break;
      case 'reset-all-pos': commit(() => { for (const x of S.nodes.values()) x.offset = { x: 0, y: 0 }; }); break;
      case 'search-label': searchInput.value = v; runSearch(); gotoHit(1); break;
      default: break;
    }
  });
  panel.addEventListener('input', (e) => {
    const f = e.target.dataset && e.target.dataset.field;
    const n = getNode(S.sel);
    if (!n || !f) return;
    if (f === 'text') {
      const v = e.target.value.replace(/\r\n?/g, '\n').replace(CTRL_RE, '').slice(0, LIMITS.text);
      commit(() => { n.text = v; }, { coalesce: 'text:' + n.id, panel: false });
    } else if (f === 'note') {
      const v = e.target.value.replace(/\r\n?/g, '\n').replace(CTRL_RE, '').slice(0, LIMITS.note);
      commit(() => { n.note = v; }, { coalesce: 'note:' + n.id, panel: false });
    }
  });
  panel.addEventListener('change', (e) => {
    const f = e.target.dataset && e.target.dataset.field;
    const n = getNode(S.sel);
    if (!n || !f) return;
    if (f === 'done') commit(() => { n.done = e.target.checked; });
    else if (f === 'text') {
      const v = n.text.trim();
      if (!v && n.id === rootId()) { commit(() => { n.text = '中心テーマ'; }); toast('中心テーマは空にできないため、元の名前に戻しました'); }
      else if (v !== n.text) commit(() => { n.text = v; }, { panel: false });
    }
  });
  panel.addEventListener('keydown', (e) => {
    const f = e.target.dataset && e.target.dataset.field;
    if (f === 'label-new' && e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      addLabel(e.target.value);
    } else if (e.key === 'Escape' && !e.isComposing) {
      e.preventDefault();
      focusViewport();
    }
  });

  // ------------------------------------------------------------------
  // 書き出し・共有
  // ------------------------------------------------------------------
  function exportJSON() {
    if (!S.doc) return;
    MF.download(new Blob([MF.exportJSONText(docForSave())], { type: 'application/json' }), MF.safeFilename(S.doc.title) + '.json');
  }
  function exportPalette() {
    const theme = $('exp-light').checked ? 'light' : S.theme;
    return PAL[theme];
  }
  function buildSVG() {
    const L = S.layout, pal = exportPalette(), pad = 40;
    const b = L.bounds;
    const W = Math.ceil(b.maxX - b.minX + pad * 2), H = Math.ceil(b.maxY - b.minY + pad * 2);
    const ox = pad - b.minX, oy = pad - b.minY;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    s += '<style>text{font-family:' + FONT.replace(/"/g, "'") + ';white-space:pre}</style>';
    s += '<rect width="' + W + '" height="' + H + '" fill="' + pal.canvas + '"/>';
    s += '<g transform="translate(' + r1(ox) + ' ' + r1(oy) + ')">';
    for (const e of L.edges) s += '<path d="' + e.d + '" fill="none" stroke="' + branchColor(e.branch, pal) + '" stroke-width="' + e.w + '" stroke-linecap="round"/>';
    for (const id of L.order) {
      const n = S.nodes.get(id), p = L.pos.get(id), bx = p.box, st = bx.st;
      const isRoot = p.dd === 0;
      const fill = n.bg !== 'none' ? pal.bg[n.bg] : (isRoot ? pal.accent : pal.node);
      const stroke = n.bg !== 'none' ? pal.border[n.bg] : (isRoot ? pal.accent : pal.nodeBorder);
      let color;
      if (isRoot && n.bg === 'none') color = pal.accentText;
      else color = n.color === 'default' ? pal.text.default : pal.text[n.color];
      s += '<rect x="' + r1(p.x + 1) + '" y="' + r1(p.y + 1) + '" width="' + r1(p.w - 2) + '" height="' + r1(p.h - 2) + '" rx="' + (isRoot ? 13 : 9) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>';
      if (!isRoot) {
        const sx = p.side === 'left' ? p.x + p.w - 6 : p.x + 2;
        s += '<rect x="' + r1(sx) + '" y="' + r1(p.y + 4) + '" width="4" height="' + r1(Math.max(p.h - 8, 2)) + '" rx="2" fill="' + branchColor(p.branch, pal) + '"/>';
      }
      const x0 = p.x + 2 + st.padX, top = p.y + 2 + st.padY;
      const fontAttr = ' font-size="' + st.size + '" font-weight="' + st.weight + '" dominant-baseline="central"';
      const midY = r1(top + st.lh / 2);
      if (n.done) s += '<text x="' + r1(x0) + '" y="' + midY + '"' + fontAttr + ' fill="' + (isRoot && n.bg === 'none' ? color : pal.ok) + '">✓</text>';
      if (n.icon) s += '<text x="' + r1(x0 + bx.chkW) + '" y="' + midY + '"' + fontAttr + '>' + esc(n.icon) + '</text>';
      const tx = x0 + bx.chkW + bx.icoW;
      const deco = n.done ? ' text-decoration="line-through" opacity="0.72"' : (bx.empty ? ' opacity="0.6" font-style="italic"' : '');
      bx.lines.forEach((line, i) => {
        s += '<text x="' + r1(tx) + '" y="' + r1(top + i * st.lh + st.lh / 2) + '"' + fontAttr + ' fill="' + color + '"' + deco + ' xml:space="preserve">' + esc(line) + '</text>';
      });
      let cy = top + bx.textH + 6;
      for (const row of bx.rows) {
        let cx = x0;
        for (const c of row) {
          s += '<rect x="' + r1(cx) + '" y="' + r1(cy) + '" width="' + c.w + '" height="18" rx="9" fill="' + pal.chipBg + '" stroke="' + pal.chipBorder + '"' + (c.note ? ' stroke-dasharray="3 2"' : '') + '/>';
          s += '<text x="' + r1(cx + 7) + '" y="' + r1(cy + 9) + '" font-size="11" font-weight="500" dominant-baseline="central" fill="' + pal.chipText + '">' + esc(c.text) + '</text>';
          cx += c.w + 4;
        }
        cy += 22;
      }
      if (n.collapsed && n.children.length) {
        const label = '+' + (subtreeSize(n) - 1);
        const bw = 10 + label.length * 7;
        const bxp = p.side === 'left' ? p.x - 4 - bw : p.x + p.w + 4;
        s += '<rect x="' + r1(bxp) + '" y="' + r1(p.y + p.h / 2 - 10) + '" width="' + bw + '" height="20" rx="10" fill="' + pal.surface + '" stroke="' + pal.nodeBorder + '" stroke-width="1.5"/>';
        s += '<text x="' + r1(bxp + bw / 2) + '" y="' + r1(p.y + p.h / 2) + '" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="' + pal.text.default + '">' + label + '</text>';
      }
    }
    s += '</g></svg>';
    return { svg: s, w: W, h: H };
  }
  function exportScale(w, h) {
    return Math.max(0.1, Math.min(2, 16000 / w, 16000 / h, Math.sqrt(16e6 / (w * h))));
  }
  function svgToCanvas(svg, w, h, scale) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(w * scale));
          c.height = Math.max(1, Math.round(h * scale));
          const ctx = c.getContext('2d');
          if (!ctx) throw new Error('キャンバスを作成できませんでした（画像が大きすぎる可能性があります）');
          ctx.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          resolve(c);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('マップを画像に変換できませんでした')); };
      img.src = url;
    });
  }
  function canvasBlob(c, type, q) {
    return new Promise((resolve, reject) => {
      try {
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('画像を生成できませんでした'))), type, q);
      } catch (e) {
        reject(e);
      }
    });
  }
  async function renderCanvas() {
    const r = buildSVG();
    const c = await svgToCanvas(r.svg, r.w, r.h, exportScale(r.w, r.h));
    return { canvas: c, w: r.w, h: r.h };
  }
  function setExportMsg(msg, isError) {
    exportMsg.textContent = msg;
    exportMsg.className = 'export-msg' + (isError ? ' error' : '');
  }
  function canShareFiles() {
    try {
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
    } catch (e) {
      return false;
    }
  }
  function openExport() {
    if (!S.doc) return;
    if (S.editing) finishEdit(true, { refocus: false });
    saveNow();
    let collapsed = 0;
    for (const x of S.nodes.values()) if (x.collapsed && x.children.length) collapsed++;
    const scope = [];
    scope.push(S.focusId ? '画像・PDF・SVG：フォーカス中の枝だけを、現在の表示どおりに書き出します。' : '画像・PDF・SVG：マップ全体を、現在の表示どおりに書き出します。');
    if (collapsed) scope.push('折りたたまれた枝（' + collapsed + 'か所）は省略されます。');
    scope.push('JSON・Markdown：常にマップ全体を書き出します。');
    $('export-scope').textContent = scope.join(' ');
    $('share-sec').hidden = !canShareFiles();
    setExportMsg('');
    openModal(exportModal);
  }
  async function runExport(kind) {
    if (!S.doc || S.exporting) return;
    const base = MF.safeFilename(S.doc.title);
    const buttons = exportModal.querySelectorAll('[data-exp]');
    S.exporting = true;
    buttons.forEach((b) => { b.disabled = true; });
    setExportMsg('作成しています…');
    try {
      if (kind === 'png') {
        const r = await renderCanvas();
        MF.download(await canvasBlob(r.canvas, 'image/png'), base + '.png');
        setExportMsg('PNG画像を保存しました（' + r.canvas.width + '×' + r.canvas.height + 'px）。');
      } else if (kind === 'pdf') {
        const r = await renderCanvas();
        const jpg = new Uint8Array(await (await canvasBlob(r.canvas, 'image/jpeg', 0.92)).arrayBuffer());
        const ptW = r.w * 0.75, ptH = r.h * 0.75;
        const f = Math.min(1, 14400 / ptW, 14400 / ptH);
        MF.download(MF.jpegToPdf(jpg, r.canvas.width, r.canvas.height, ptW * f, ptH * f), base + '.pdf');
        setExportMsg('PDFを保存しました。');
      } else if (kind === 'svg') {
        MF.download(new Blob([buildSVG().svg], { type: 'image/svg+xml' }), base + '.svg');
        setExportMsg('SVGを保存しました。');
      } else if (kind === 'json') {
        exportJSON();
        setExportMsg('JSONを保存しました。左メニューの「JSONを読み込む」で完全に復元できます。');
      } else if (kind === 'md') {
        MF.download(new Blob([MF.outlineMarkdown(docForSave())], { type: 'text/markdown' }), base + '.md');
        setExportMsg('Markdownを保存しました。');
      } else if (kind === 'copy') {
        await MF.copyText(MF.outlineMarkdown(docForSave()));
        setExportMsg('アウトラインをクリップボードにコピーしました。');
      } else if (kind === 'share') {
        let file = S.shareCache && S.shareCache.rev === S.rev ? S.shareCache.file : null;
        if (!file) {
          const r = await renderCanvas();
          file = new File([await canvasBlob(r.canvas, 'image/png')], base + '.png', { type: 'image/png' });
          S.shareCache = { rev: S.rev, file: file };
        }
        try {
          await navigator.share({ files: [file], title: S.doc.title });
          setExportMsg('共有メニューを開きました。');
        } catch (e) {
          if (e.name === 'NotAllowedError') setExportMsg('画像の準備ができました。もう一度「画像を共有」を押してください。');
          else throw e;
        }
      }
    } catch (e) {
      if (e && e.name === 'AbortError') setExportMsg('');
      else setExportMsg('失敗しました: ' + (e && e.message ? e.message : e) + '。別の形式（SVG・JSON・Markdown）もお試しください。', true);
    } finally {
      S.exporting = false;
      buttons.forEach((b) => { b.disabled = false; });
    }
  }
  exportModal.addEventListener('click', (e) => {
    const b = e.target.closest('[data-exp]');
    if (b && !b.disabled) runExport(b.dataset.exp);
  });

  // ------------------------------------------------------------------
  // マップの管理（開く・作成・複製・削除・読み込み）
  // ------------------------------------------------------------------
  function showEditor(on) {
    emptyState.hidden = on;
    [viewport, $('zoom-ctrl'), actionBar, minimap].forEach((el) => { el.hidden = !on; });
    if (!on) { focusBar.hidden = true; emptyHint.hidden = true; onboard.hidden = true; }
    updatePanelVisibility();
  }
  function openMap(id, opts) {
    opts = opts || {};
    if (S.editing) finishEdit(true, { refocus: false });
    if (S.doc && !opts.noSave) saveNow();
    let doc;
    try {
      doc = store.load(id);
    } catch (e) {
      toast('マップを開けませんでした: ' + e.message);
      renderSidebar();
      return false;
    }
    S.doc = doc;
    reindex();
    S.sel = null; S.focusId = null; S.undo = []; S.redo = []; S.coalesceKey = null;
    S.dirty = false; S.saveError = ''; S.external = ''; S.savedAt = null; S.shareCache = null; S.panelFor = undefined;
    S.search.idx = -1;
    nodesLayer.innerHTML = '';
    S.els.clear();
    store.setSetting('lastMap', id);
    showEditor(true);
    render({ panel: true });
    const v = store.getSetting('views', {})[id];
    if (v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.k)) {
      S.view = { x: v.x, y: v.y, k: clamp(v.k, 0.15, 3) };
      applyView();
    } else {
      S.needFit = true;
      requestAnimationFrame(() => { if (S.needFit) { S.needFit = false; fit(); } });
    }
    if (S.narrow) toggleSidebar(false);
    updateStatus();
    updateBanner();
    renderSidebar();
    if (!store.getSetting('onboarded', false)) onboard.hidden = false;
    return true;
  }
  function closeMap() {
    if (S.editing) finishEdit(true, { refocus: false });
    S.doc = null;
    S.layout = null;
    S.sel = null;
    S.focusId = null;
    nodesLayer.innerHTML = '';
    edgesSvg.innerHTML = '';
    S.els.clear();
    showEditor(false);
    updateToolbar();
    updateStatus();
    updateBanner();
    renderSidebar();
    document.title = 'MindFlow – マインドマップ';
  }
  function createMap(key) {
    if (S.doc) saveNow();
    let doc;
    try {
      doc = store.save(MF.buildTemplateDoc(key));
    } catch (e) {
      toast('マップを作成できませんでした: ' + e.message);
      return;
    }
    if (openMap(doc.id, { noSave: true })) {
      toast('「' + doc.title + '」を作成しました');
      select(rootId());
      if (key === 'blank') startEdit(rootId());
      else focusViewport();
    }
  }
  function duplicateMap() {
    if (!S.doc) return;
    saveNow();
    try {
      const copy = MF.normalizeDoc(Object.assign({}, docForSave(), { title: (S.doc.title + ' のコピー').slice(0, LIMITS.title) }), { forceNewId: true });
      const saved = store.save(copy);
      openMap(saved.id, { noSave: true });
      toast('マップを複製しました');
    } catch (e) {
      toast('複製できませんでした: ' + e.message);
    }
  }
  function deleteMap() {
    if (!S.doc) return;
    const title = S.doc.title;
    if (!window.confirm('「' + title + '」をゴミ箱へ移動しますか？（後で復元できます）')) return;
    saveNow();
    try {
      const id = S.doc.id;
      store.remove(id);
      const views = store.getSetting('views', {});
      delete views[id];
      store.setSetting('views', views);
      const rest = store.list().filter((m) => !m.broken);
      if (rest.length) openMap(rest[0].id, { noSave: true });
      else closeMap();
      toast('「' + title + '」をゴミ箱へ移動しました', { label: '元に戻す', fn: () => { try { openMap(store.restore(id)); } catch (e) { toast(e.message); } } });
    } catch (e) {
      toast('削除できませんでした: ' + e.message);
    }
  }
  function backupAll() {
    if (S.doc) saveNow();
    const b = store.bundle();
    if (!b.maps.length) { toast('バックアップできるマップがありません'); return; }
    const d = new Date();
    const stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
    MF.download(new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' }), 'mindflow-backup-' + stamp + '.json');
    toast(b.maps.length + '件のマップをバックアップしました');
  }
  async function importFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    if (S.doc) saveNow();
    let ok = 0, lastId = null;
    const errors = [];
    for (const f of list) {
      if (f.size > LIMITS.importBytes) { errors.push(f.name + ': 5MBを超えています'); continue; }
      let data;
      try {
        data = JSON.parse((await f.text()).replace(/^\uFEFF/, ''));
      } catch (e) {
        errors.push(f.name + ': ' + (e instanceof SyntaxError ? 'JSONの形式が正しくありません' : e.message));
        continue;
      }
      const raws = MF.extractDocs(data);
      raws.forEach((raw, i) => {
        try {
          const saved = store.save(MF.normalizeDoc(raw, { forceNewId: true }));
          ok++;
          lastId = saved.id;
        } catch (e) {
          errors.push(f.name + (raws.length > 1 ? '（' + (i + 1) + '件目）' : '') + ': ' + e.message);
        }
      });
    }
    if (lastId) openMap(lastId, { noSave: true });
    else renderSidebar();
    if (errors.length) toast((ok ? ok + '件を取り込みました。' : '') + '読み込めなかったもの: ' + errors.slice(0, 3).join(' ／ ') + (errors.length > 3 ? ' ほか' + (errors.length - 3) + '件' : ''));
    else toast(ok + '件のマップを取り込みました');
  }
  fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    importFiles(files).finally(() => { fileInput.value = ''; });
  });
  window.addEventListener('dragover', (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => /\.json$/i.test(f.name) || f.type === 'application/json');
    if (!files.length) { toast('読み込めるのは JSON ファイルだけです'); return; }
    importFiles(files);
  });

  // ------------------------------------------------------------------
  // 左サイドバー
  // ------------------------------------------------------------------
  function sidebarVisible() { return S.narrow ? S.drawerOpen : S.sidebarOpen; }
  function updateSidebarVisibility() {
    const v = sidebarVisible();
    app.classList.toggle('sidebar-hidden', !v);
    sidebarBack.hidden = !(S.narrow && v);
    btnSidebar.setAttribute('aria-expanded', String(v));
    scheduleMinimap();
  }
  function toggleSidebar(force) {
    const v = force === undefined ? !sidebarVisible() : force;
    if (S.narrow) S.drawerOpen = v;
    else { S.sidebarOpen = v; store.setSetting('sidebar', v); }
    updateSidebarVisibility();
    if (v && S.narrow) {
      const f = $('sidebar').querySelector('button');
      if (f) f.focus();
    }
  }
  sidebarBack.addEventListener('click', () => toggleSidebar(false));
  function renderTemplates() {
    let h = '';
    for (const key of Object.keys(TEMPLATES)) {
      const t = TEMPLATES[key];
      h += '<button type="button" class="btn tpl" data-tpl="' + key + '"><span class="ti" aria-hidden="true">' + t.icon + '</span><span><b>' + esc(t.label) + '</b><small>' + esc(t.description) + '</small></span></button>';
    }
    $('tpl-list').innerHTML = h;
  }
  function renderMapList() {
    const q = mapFilter.value.trim().toLowerCase();
    const maps = store.list();
    const good = maps.filter((m) => !m.broken);
    const broken = maps.filter((m) => m.broken);
    mapFilter.hidden = good.length <= 6;
    const shown = q ? good.filter((m) => m.title.toLowerCase().includes(q)) : good;
    let h = '';
    if (!good.length) h += '<li class="hint">まだマップがありません。上のテンプレートから作成できます。</li>';
    else if (!shown.length) h += '<li class="hint">該当するマップはありません。</li>';
    for (const m of shown) {
      const cur = S.doc && m.id === S.doc.id;
      h += '<li><button type="button" class="btn map-item" data-open="' + esc(m.id) + '"' + (cur ? ' aria-current="page"' : '') + '>' + esc(trunc(m.title, 30)) + '<small>' + esc(MF.relTime(m.updated_at)) + ' ・ ' + m.nodes + ' ノード</small></button></li>';
    }
    for (const m of broken) {
      h += '<li class="map-broken"><span>⚠ ' + esc(m.title) + '</span><button type="button" class="btn sm" data-trash-broken="' + esc(m.id) + '">ゴミ箱へ</button></li>';
    }
    mapList.innerHTML = h;
  }
  function renderTrash() {
    const items = store.list(true);
    trashSummary.textContent = '🗑 ゴミ箱（' + items.length + '件）';
    if (!items.length) { trashList.innerHTML = '<p class="hint">ゴミ箱は空です。</p>'; return; }
    let h = '';
    for (const m of items) {
      h += '<div class="trash-item"><span title="' + esc(m.title) + '">' + esc(m.title) + '</span><span><button type="button" class="btn sm" data-restore="' + esc(m.id) + '">復元</button> <button type="button" class="btn sm danger" data-purge="' + esc(m.id) + '" aria-label="「' + esc(m.title) + '」を完全に削除">完全削除</button></span></div>';
    }
    h += '<p><button type="button" class="btn sm danger" data-cmd="purge-all">ゴミ箱を空にする</button></p>';
    trashList.innerHTML = h;
  }
  function renderUsage() {
    const el = $('usage');
    if (!store.persistent) { el.textContent = '保存先: このタブのメモリ（ページを閉じると消えます）'; return; }
    el.textContent = '保存先: このブラウザ（localStorage）・使用量 約' + Math.max(1, Math.round(store.usageBytes() / 1024)) + 'KB';
  }
  function renderSidebar() {
    renderMapList();
    renderTrash();
    renderUsage();
    $('cur-sec').hidden = !S.doc;
  }
  mapFilter.addEventListener('input', renderMapList);
  $('sidebar').addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) {
      if (!S.doc || open.dataset.open !== S.doc.id) openMap(open.dataset.open);
      else if (S.narrow) toggleSidebar(false);
      return;
    }
    const tb = e.target.closest('[data-trash-broken]');
    if (tb) {
      try { store.remove(tb.dataset.trashBroken); toast('読み込めないデータをゴミ箱へ移動しました'); } catch (err) { toast(err.message); }
      renderSidebar();
      return;
    }
    const rs = e.target.closest('[data-restore]');
    if (rs) {
      try { const id = store.restore(rs.dataset.restore); openMap(id); toast('マップを復元しました'); } catch (err) { toast('復元できませんでした: ' + err.message); renderSidebar(); }
      return;
    }
    const pg = e.target.closest('[data-purge]');
    if (pg) {
      if (window.confirm('このマップを完全に削除しますか？この操作は元に戻せません。')) {
        store.purge(pg.dataset.purge);
        renderSidebar();
        toast('完全に削除しました');
      }
    }
  });

  // ------------------------------------------------------------------
  // コマンド（ボタン）
  // ------------------------------------------------------------------
  function runCmd(cmd) {
    const sel = S.sel;
    switch (cmd) {
      case 'sidebar': toggleSidebar(); return;
      case 'theme': setTheme(S.theme === 'dark' ? 'light' : 'dark'); return;
      case 'help': openModal(helpModal); return;
      case 'modal-close': closeModal(); return;
      case 'import': fileInput.click(); return;
      case 'backup': backupAll(); return;
      case 'purge-all':
        if (window.confirm('ゴミ箱のマップをすべて完全に削除しますか？この操作は元に戻せません。')) {
          const n = store.purgeAll();
          renderSidebar();
          toast(n + '件を完全に削除しました');
        }
        return;
      default: break;
    }
    if (!S.doc) return;
    switch (cmd) {
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'panel': setPanel(!panelVisible()); break;
      case 'export': openExport(); break;
      case 'dup-map': duplicateMap(); break;
      case 'json-map': saveNow(); exportJSON(); break;
      case 'del-map': deleteMap(); break;
      case 'zoom-in': zoomBy(1.2); break;
      case 'zoom-out': zoomBy(1 / 1.2); break;
      case 'zoom-reset': zoomReset(); break;
      case 'fit': fit(); break;
      case 'center': if (sel) centerOn(sel); else fit(); break;
      case 'minimap': setMinimap(!S.minimap); break;
      case 'add-first': addChild(displayRootId()); break;
      case 'add-child': addChild(sel || displayRootId()); break;
      case 'add-sibling': if (sel) addSibling(sel); break;
      case 'edit': if (sel) startEdit(sel); break;
      case 'duplicate': if (sel) { duplicateNode(sel); focusViewport(); } break;
      case 'collapse': if (sel) { toggleCollapse(sel); focusViewport(); } break;
      case 'focus': toggleFocus(); focusViewport(); break;
      case 'delete': if (sel) { deleteNode(sel); focusViewport(); } break;
      case 'details':
        setPanel(true);
        requestAnimationFrame(() => { const f = panel.querySelector('textarea,button'); if (f) f.focus(); });
        break;
      case 'onboard-close': onboard.hidden = true; store.setSetting('onboarded', true); focusViewport(); break;
      default: break;
    }
  }
  document.addEventListener('click', (e) => {
    const tpl = e.target.closest('[data-tpl]');
    if (tpl) { createMap(tpl.dataset.tpl); return; }
    const b = e.target.closest('[data-cmd]');
    if (b && !b.disabled) runCmd(b.dataset.cmd);
  });
  layoutSel.addEventListener('change', () => { if (S.doc) setLayout(layoutSel.value); });

  // タイトル（ファイル名）
  titleInput.addEventListener('input', () => {
    if (!S.doc) return;
    const v = titleInput.value.replace(CTRL_RE, '').replace(/\n/g, ' ').slice(0, LIMITS.title);
    if (v.trim()) commit(() => { S.doc.title = v; }, { coalesce: 'title', panel: false });
  });
  titleInput.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); focusViewport(); }
  });
  titleInput.addEventListener('blur', () => {
    if (!S.doc) return;
    const v = titleInput.value.trim();
    if (!v) { titleInput.value = S.doc.title; toast('マップ名は空にできません'); }
    else if (v !== S.doc.title) commit(() => { S.doc.title = v.slice(0, LIMITS.title); }, { panel: false });
  });

  // ------------------------------------------------------------------
  // テーマ・レスポンシブ
  // ------------------------------------------------------------------
  function setTheme(t, persist) {
    S.theme = t === 'dark' ? 'dark' : 'light';
    app.dataset.theme = S.theme;
    document.documentElement.style.colorScheme = S.theme;
    const next = S.theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え';
    btnTheme.textContent = S.theme === 'dark' ? '☀' : '🌙';
    btnTheme.setAttribute('aria-label', next);
    btnTheme.title = next;
    if (persist !== false) store.setSetting('theme', S.theme);
    if (S.doc) { S.panelDirty = true; render({ panel: true }); }
  }
  function updateResponsive() {
    const w = window.innerWidth;
    const narrow = w < 860;
    if (narrow !== S.narrow) { S.narrow = narrow; S.drawerOpen = false; S.sheetOpen = false; }
    S.compact = w < 560;
    app.classList.toggle('narrow', narrow);
    app.classList.toggle('compact', S.compact);
    updateSidebarVisibility();
    updatePanelVisibility();
  }
  window.addEventListener('resize', updateResponsive);
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      scheduleMinimap();
      if (S.needFit && viewport.clientWidth) { S.needFit = false; fit(); }
    }).observe(viewport);
  }

  // ------------------------------------------------------------------
  // 保存の保護・他タブとの同期
  // ------------------------------------------------------------------
  window.addEventListener('pagehide', () => {
    if (S.editing) finishEdit(true, { refocus: false });
    saveNow();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (S.editing) finishEdit(true, { refocus: false });
      saveNow();
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (S.doc && S.dirty && (S.saveError || S.external || !store.persistent)) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(MF.KEY_PREFIX)) return;
    if (e.key.startsWith(MF.KEY_PREFIX + 'map.') || e.key.startsWith(MF.KEY_PREFIX + 'trash.')) renderSidebar();
    if (S.doc && e.key === MF.KEY_PREFIX + 'map.' + S.doc.id) {
      S.external = e.newValue === null ? 'このマップは別のタブで削除されました。' : 'このマップは別のタブで更新されました。';
      clearTimeout(S.saveTimer);
      updateStatus();
      updateBanner();
    }
  });
  window.addEventListener('error', (e) => {
    if (e && e.message) toast('予期しないエラーが発生しました: ' + e.message + '（編集内容は自動保存されています）');
  });

  // ------------------------------------------------------------------
  // 起動
  // ------------------------------------------------------------------
  function init() {
    try {
      const savedTheme = store.getSetting('theme', null);
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(savedTheme || (prefersDark ? 'dark' : 'light'), false);
      app.classList.toggle('no-minimap', !S.minimap);
      btnMinimap.setAttribute('aria-pressed', String(S.minimap));
      renderTemplates();
      updateResponsive();
      let firstId = null;
      if (!store.getSetting('initialized', false)) {
        if (!store.list().length) {
          const d = store.save(MF.buildTemplateDoc('sample'));
          firstId = d.id;
        }
        store.setSetting('initialized', true);
      }
      const maps = store.list().filter((m) => !m.broken);
      const last = store.getSetting('lastMap', null);
      const target = firstId || (maps.some((m) => m.id === last) ? last : (maps[0] && maps[0].id));
      if (!target || !openMap(target, { noSave: true })) closeMap();
      if (firstId) toast('ようこそ！使い方サンプルを開きました。ノードをクリックして Tab や Enter を押してみてください。');
      updateBanner();
    } catch (e) {
      S.fatal = '起動に失敗しました: ' + (e && e.message ? e.message : e);
      updateBanner();
    }
    loadingEl.hidden = true;
  }
  init();
})();