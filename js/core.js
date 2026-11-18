// File: js/core.js
// MindFlow のデータモデル・検証・テンプレート・ローカル保存・書き出し補助（ブラウザ専用、依存なし）
(function (global) {
  'use strict';

  const SCHEMA = 'mindmap/v1';
  const BACKUP_SCHEMA = 'mindmap/backup-v1';
  const APP_NAME = 'MindFlow';
  const KEY_PREFIX = 'mindflow.';
  const LIMITS = Object.freeze({
    nodes: 3000,
    depth: 60,
    text: 500,
    note: 4000,
    labels: 8,
    labelLen: 20,
    title: 80,
    importBytes: 5 * 1024 * 1024,
    offset: 50000
  });
  const ICONS = ['', '💡', '⭐', '✅', '❓', '⚠️', '🔥', '🎯', '📌', '📅', '👤', '📝', '🚫', '🔗', '💰', '🧪'];
  const BG_KEYS = ['none', 'gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];
  const TEXT_KEYS = ['default', 'gray', 'red', 'orange', 'green', 'blue', 'purple'];
  const LAYOUTS = ['balanced', 'right'];
  const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
  const CTRL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

  class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  }

  // ------------------------------------------------------------------
  // 基本ユーティリティ
  // ------------------------------------------------------------------
  function newId() {
    const a = new Uint8Array(5);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function nowIso() {
    return new Date().toISOString().slice(0, 19) + 'Z';
  }

  function cut(s, n) {
    if (s.length <= n) return s;
    let out = s.slice(0, n);
    const last = out.charCodeAt(out.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
    return out;
  }

  function cleanText(v, limit) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number' && Number.isFinite(v)) v = String(v);
    if (typeof v !== 'string') return '';
    return cut(v.replace(/\r\n?/g, '\n').replace(CTRL_RE, ''), limit);
  }

  function cleanIso(v) {
    if (typeof v !== 'string' || v.length > 40) return '';
    return Number.isNaN(Date.parse(v)) ? '' : v;
  }

  function cleanLabels(v) {
    if (!Array.isArray(v)) return [];
    const out = [];
    for (const item of v) {
      const t = cut(cleanText(item, 200).replace(/\s+/g, ' ').trim(), LIMITS.labelLen);
      if (t && !out.includes(t)) out.push(t);
      if (out.length >= LIMITS.labels) break;
    }
    return out;
  }

  function num(v) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
    return Math.round(Math.max(-LIMITS.offset, Math.min(LIMITS.offset, v)) * 10) / 10;
  }

  function nodeText(raw) {
    for (const k of ['text', 'topic', 'title', 'name']) {
      if (raw[k] !== undefined && raw[k] !== null) return cleanText(raw[k], LIMITS.text).trim();
    }
    return '';
  }

  function validId(v) {
    if (typeof v === 'number' && Number.isInteger(v)) v = String(v);
    return typeof v === 'string' && ID_RE.test(v) ? v : '';
  }

  // ------------------------------------------------------------------
  // 正規化・検証
  // ------------------------------------------------------------------
  function normalizeTree(rootRaw) {
    if (!rootRaw || typeof rootRaw !== 'object' || Array.isArray(rootRaw)) {
      throw new ValidationError('ルートノードの形式が正しくありません（オブジェクトが必要です）。');
    }
    const seen = new Set();
    let count = 0;
    let rootOut = null;
    const stack = [[rootRaw, null, 0]];
    while (stack.length) {
      const [raw, parentChildren, depth] = stack.pop();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      count++;
      if (count > LIMITS.nodes) throw new ValidationError('ノード数が上限（' + LIMITS.nodes + '）を超えています。');
      if (depth > LIMITS.depth) throw new ValidationError('階層が深すぎます（上限 ' + LIMITS.depth + ' 階層）。');
      let id = validId(raw.id);
      if (!id || seen.has(id)) {
        do { id = newId(); } while (seen.has(id));
      }
      seen.add(id);
      const isRoot = parentChildren === null;
      const off = raw.offset && typeof raw.offset === 'object' ? raw.offset : {};
      const node = {
        id: id,
        text: nodeText(raw),
        icon: ICONS.includes(raw.icon) ? raw.icon : '',
        labels: cleanLabels(raw.labels),
        bg: BG_KEYS.includes(raw.bg) ? raw.bg : 'none',
        color: TEXT_KEYS.includes(raw.color) ? raw.color : 'default',
        note: cleanText(raw.note, LIMITS.note),
        done: raw.done === true,
        collapsed: raw.collapsed === true,
        side: isRoot ? '' : (raw.side === 'left' || raw.side === 'right' ? raw.side : ''),
        offset: isRoot ? { x: 0, y: 0 } : { x: num(off.x), y: num(off.y) },
        children: []
      };
      if (isRoot) rootOut = node;
      else parentChildren.push(node);
      if (Array.isArray(raw.children)) {
        for (let i = raw.children.length - 1; i >= 0; i--) stack.push([raw.children[i], node.children, depth + 1]);
      }
    }
    if (!rootOut) throw new ValidationError('ルートノードを読み取れませんでした。');
    return rootOut;
  }

  function flatToNested(items) {
    if (items.length > LIMITS.nodes) throw new ValidationError('ノード数が上限（' + LIMITS.nodes + '）を超えています。');
    const byId = new Map();
    const order = [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      let id = item.id;
      if (typeof id === 'number') id = String(id);
      if (typeof id !== 'string' || !id || byId.has(id)) continue;
      const node = Object.assign({}, item, { children: [] });
      byId.set(id, node);
      order.push(id);
    }
    const roots = [];
    for (const id of order) {
      const node = byId.get(id);
      let p = node.parent !== undefined ? node.parent : node.parent_id;
      if (typeof p === 'number') p = String(p);
      if (typeof p !== 'string' || !byId.has(p) || p === id) roots.push(node);
      else byId.get(p).children.push(node);
    }
    if (!roots.length) throw new ValidationError('親を持たないルートノードが見つかりません。');
    return roots.length === 1 ? roots[0] : { text: 'インポートしたマップ', children: roots };
  }

  function normalizeDoc(raw, opts) {
    opts = opts || {};
    if (Array.isArray(raw)) raw = { nodes: raw };
    if (!raw || typeof raw !== 'object') throw new ValidationError('JSONの最上位はオブジェクトまたは配列である必要があります。');
    let rootRaw;
    if (raw.root && typeof raw.root === 'object' && !Array.isArray(raw.root)) rootRaw = raw.root;
    else if (Array.isArray(raw.nodes)) rootRaw = flatToNested(raw.nodes);
    else if ('text' in raw || 'topic' in raw || 'children' in raw) rootRaw = raw;
    else throw new ValidationError('マインドマップのデータが見つかりません（root / nodes / text のいずれかが必要です）。');
    const root = normalizeTree(rootRaw);
    if (!root.text) root.text = '中心テーマ';
    const titleSrc = rootRaw !== raw ? raw.title : null;
    let title = cut(cleanText(titleSrc, LIMITS.title * 2).replace(/\n/g, ' ').trim(), LIMITS.title);
    if (!title) title = cut(root.text.replace(/\n/g, ' ').trim(), LIMITS.title) || '無題のマップ';
    let id;
    if (opts.forceNewId) id = newId();
    else id = validId(opts.keepId) || validId(raw.id) || newId();
    const created = cleanIso(raw.created_at) || nowIso();
    return {
      schema: SCHEMA,
      id: id,
      title: title,
      layout: LAYOUTS.includes(raw.layout) ? raw.layout : 'balanced',
      created_at: created,
      updated_at: cleanIso(raw.updated_at) || created,
      root: root
    };
  }

  function countNodes(root) {
    let n = 0;
    const st = [root];
    while (st.length && n <= LIMITS.nodes * 2) {
      const x = st.pop();
      if (!x || typeof x !== 'object') continue;
      n++;
      if (Array.isArray(x.children)) for (const c of x.children) st.push(c);
    }
    return n;
  }

  function extractDocs(data) {
    if (data && typeof data === 'object' && data.schema === BACKUP_SCHEMA && Array.isArray(data.maps)) return data.maps;
    return [data];
  }

  // ------------------------------------------------------------------
  // テンプレート
  // ------------------------------------------------------------------
  function N(text, children, o) {
    o = o || {};
    return {
      text: text,
      icon: o.icon || '',
      labels: o.labels || [],
      bg: o.bg || 'none',
      color: o.color || 'default',
      note: o.note || '',
      done: !!o.done,
      collapsed: !!o.collapsed,
      children: children || []
    };
  }
  const L = (text, o) => N(text, [], o);

  function tplSample() {
    return N('マインドマップの使い方', [
      N('書き出す', [
        L('Tab：子ノードを追加'),
        L('Enter：同じ階層に追加'),
        L('F2・Space・ダブルクリック：編集'),
        L('編集中の Shift+Enter：改行')
      ], { icon: '💡', labels: ['基本'] }),
      N('整理する', [
        L('ドラッグ：自由に移動'),
        L('別のノードに重ねる：付け替え（上端・下端なら前後に挿入）'),
        L('Alt+↑↓：並べ替え ／ Shift+Tab：1つ上の階層へ'),
        L('Ctrl+/：折りたたみ・展開')
      ], { icon: '📌' }),
      N('見つける', [
        L('Ctrl+F：検索（Enterで次の結果へ）'),
        L('F：選んだ枝だけをフォーカス表示（Escで解除）'),
        L('0：全体表示 ／ ホイール：移動 ／ Ctrl+ホイール：拡大縮小')
      ], { icon: '🎯' }),
      N('分類する', [
        L('右パネルで色・アイコン・ラベルを設定', { labels: ['色だけに頼らない'] }),
        L('完了チェックで取り消し線と✓を表示', { done: true }),
        L('メモ欄に詳細やURLを記録', { note: 'ここにメモを書けます。メモも検索の対象です。' })
      ], { icon: '⭐', bg: 'yellow' }),
      N('保存・共有', [
        L('変更はこのブラウザに自動保存（上部に保存状態を表示）'),
        L('『書き出し・共有』：PNG / PDF / SVG / JSON / Markdown'),
        L('左のメニュー：マップ一覧・テンプレート・JSON読み込み'),
        L('Ctrl+Z / Ctrl+Shift+Z：元に戻す / やり直し')
      ], { icon: '📝' })
    ]);
  }

  function tplBlank() {
    return N('中心テーマ');
  }

  function tplBrainstorm() {
    return N('テーマを書く', [
      N('目的・背景', [L('なぜ考えるのか'), L('成功の基準')], { icon: '❓' }),
      N('アイデア', [L('アイデア1'), L('アイデア2'), L('逆転の発想'), L('組み合わせ')], { icon: '💡' }),
      N('制約・前提', [L('予算'), L('期限'), L('人員')], { icon: '⚠️' }),
      N('参考・事例', [L('他社・他分野の事例')], { icon: '🔗' }),
      N('次のアクション', [L('試すアイデアを3つ選ぶ', { labels: ['要決定'] })], { icon: '🎯' })
    ]);
  }

  function tplMeeting() {
    const d = new Date();
    const today = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
    return N('会議名（' + today + '）', [
      N('基本情報', [L('日時'), L('場所・URL'), L('参加者', { icon: '👤' })], { icon: '📅' }),
      N('アジェンダ', [L('議題1'), L('議題2'), L('議題3')], { icon: '📝' }),
      N('決定事項', [L('決定1')], { icon: '✅' }),
      N('課題・懸念', [L('懸念1')], { icon: '⚠️' }),
      N('ToDo', [L('タスク（担当： ／ 期限： ）', { labels: ['要対応'] })], { icon: '🎯' }),
      N('次回', [L('日程'), L('持ち越し事項')], { icon: '📅' })
    ]);
  }

  function tplStudy() {
    return N('学習テーマ', [
      N('目標', [L('何ができるようになりたいか')], { icon: '🎯' }),
      N('基本概念', [L('用語・定義'), L('仕組み'), L('関連する概念')], { icon: '📝' }),
      N('具体例', [L('例1'), L('例2')], { icon: '💡' }),
      N('疑問点', [L('まだ分からないこと', { labels: ['要調査'] })], { icon: '❓' }),
      N('練習・検証', [L('練習問題'), L('試してみたこと')], { icon: '🧪' }),
      N('まとめ・復習', [L('要点を3行で'), L('1日後に復習'), L('1週間後に復習')], { icon: '⭐' })
    ]);
  }

  function tplPlan() {
    return N('企画名', [
      N('背景・課題', [L('現状'), L('解決したい問題')], { icon: '⚠️' }),
      N('目的・ゴール', [L('達成したい状態'), L('KPI・評価指標')], { icon: '🎯' }),
      N('ターゲット', [L('想定ユーザー'), L('ニーズ')], { icon: '👤' }),
      N('提供価値・内容', [L('主な施策'), L('差別化ポイント')], { icon: '💡' }),
      N('スケジュール', [L('準備'), L('実施'), L('振り返り')], { icon: '📅' }),
      N('体制', [L('責任者'), L('協力者')], { icon: '👤' }),
      N('予算', [L('費用の内訳')], { icon: '💰' }),
      N('リスクと対策', [L('リスク1 → 対策')], { icon: '🚫' })
    ]);
  }

  function tplTasks() {
    return N('プロジェクト名', [
      N('フェーズ1：準備', [
        L('目的とゴールを決める', { done: true }),
        L('関係者を洗い出す', { labels: ['優先度:高'] }),
        L('スケジュールを作る')
      ], { icon: '📌' }),
      N('フェーズ2：実行', [
        L('タスクA', { labels: ['担当未定'] }),
        L('タスクB'),
        L('中間レビュー', { icon: '📅' })
      ], { icon: '🔥' }),
      N('フェーズ3：仕上げ', [L('最終確認'), L('振り返り')], { icon: '✅' }),
      N('保留・検討中', [L('後で判断すること')], { icon: '❓' })
    ]);
  }

  const TEMPLATES = {
    sample: { icon: '📘', label: '使い方サンプル', title: 'はじめてのマインドマップ（使い方）', description: '操作方法をまとめたサンプル。触って試せます。', layout: 'balanced', build: tplSample },
    blank: { icon: '⬜', label: '空白のマップ', title: '無題のマップ', description: '中心テーマだけの白紙から始めます。', layout: 'balanced', build: tplBlank },
    brainstorm: { icon: '💡', label: 'ブレインストーミング', title: 'ブレインストーミング', description: '目的・アイデア・制約・次の行動を整理します。', layout: 'balanced', build: tplBrainstorm },
    meeting: { icon: '🗒️', label: '議事録', title: '議事録', description: 'アジェンダ・決定事項・ToDoを会議中に記録します。', layout: 'balanced', build: tplMeeting },
    study: { icon: '📚', label: '学習ノート', title: '学習ノート', description: '概念・具体例・疑問点・復習計画をまとめます。', layout: 'balanced', build: tplStudy },
    plan: { icon: '📊', label: '企画書', title: '企画書', description: '背景から予算・リスクまで企画の骨子を作ります。', layout: 'balanced', build: tplPlan },
    tasks: { icon: '✅', label: 'タスク分解', title: 'タスク分解', description: 'フェーズごとにタスクを分解し、完了チェックで進捗管理。', layout: 'right', build: tplTasks }
  };

  function buildTemplateDoc(key) {
    const t = TEMPLATES[key];
    if (!t) throw new ValidationError('テンプレートが見つかりません。');
    return normalizeDoc({ title: t.title, layout: t.layout, root: t.build() }, { forceNewId: true });
  }

  // ------------------------------------------------------------------
  // ローカル保存（localStorage。使えない環境ではメモリに保持）
  // ------------------------------------------------------------------
  function isQuota(e) {
    return e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  }

  class Store {
    constructor() {
      this.mem = new Map();
      this.persistent = true;
      try {
        const k = KEY_PREFIX + '__probe';
        localStorage.setItem(k, '1');
        localStorage.removeItem(k);
      } catch (e) {
        this.persistent = false;
      }
      this.settings = this._readJSON('settings') || {};
    }

    _get(k) {
      if (!this.persistent) return this.mem.has(k) ? this.mem.get(k) : null;
      return localStorage.getItem(KEY_PREFIX + k);
    }

    _set(k, v) {
      if (!this.persistent) {
        this.mem.set(k, v);
        return;
      }
      try {
        localStorage.setItem(KEY_PREFIX + k, v);
      } catch (e) {
        if (isQuota(e)) throw new ValidationError('ブラウザの保存容量が不足しています。不要なマップやゴミ箱を削除するか、JSONで書き出してください。');
        throw new ValidationError('ブラウザに保存できませんでした（' + e.message + '）。');
      }
    }

    _del(k) {
      if (!this.persistent) this.mem.delete(k);
      else localStorage.removeItem(KEY_PREFIX + k);
    }

    _keys(prefix) {
      const out = [];
      if (!this.persistent) {
        for (const k of this.mem.keys()) if (k.startsWith(prefix)) out.push(k.slice(prefix.length));
        return out;
      }
      const full = KEY_PREFIX + prefix;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(full)) out.push(k.slice(full.length));
      }
      return out;
    }

    _readJSON(k) {
      try {
        const v = this._get(k);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    }

    getSetting(k, d) {
      return Object.prototype.hasOwnProperty.call(this.settings, k) ? this.settings[k] : d;
    }

    setSetting(k, v) {
      if (v === undefined) delete this.settings[k];
      else this.settings[k] = v;
      try {
        this._set('settings', JSON.stringify(this.settings));
      } catch (e) {
        // 設定が保存できなくても編集は続けられる
      }
    }

    _meta(id, raw, trash) {
      try {
        const d = JSON.parse(raw);
        if (!d || typeof d !== 'object' || !d.root || typeof d.root !== 'object') throw new Error('形式が不正');
        const title = cut(cleanText(d.title, 200).replace(/\n/g, ' ').trim(), LIMITS.title) || '無題のマップ';
        const updated = cleanIso(d.updated_at);
        const deleted = cleanIso(d.deleted_at);
        return { id: id, title: title, updated_at: updated, deleted_at: deleted, nodes: countNodes(d.root), broken: false, sortKey: (trash ? deleted : updated) || '' };
      } catch (e) {
        return { id: id, title: '（読み込めないデータ: ' + id + '）', updated_at: '', deleted_at: '', nodes: 0, broken: true, sortKey: '' };
      }
    }

    list(trash) {
      const prefix = trash ? 'trash.' : 'map.';
      const out = [];
      for (const id of this._keys(prefix)) {
        if (!ID_RE.test(id)) continue;
        const raw = this._get(prefix + id);
        if (raw !== null) out.push(this._meta(id, raw, trash));
      }
      out.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
      return out;
    }

    exists(id) {
      return ID_RE.test(id) && this._get('map.' + id) !== null;
    }

    load(id) {
      if (!ID_RE.test(id)) throw new ValidationError('マップIDが不正です。');
      const raw = this._get('map.' + id);
      if (raw === null) throw new ValidationError('マップが見つかりません。');
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw new ValidationError('保存データが壊れています。');
      }
      return normalizeDoc(data, { keepId: id });
    }

    save(raw) {
      const doc = normalizeDoc(raw, { keepId: raw && raw.id });
      doc.updated_at = nowIso();
      this._set('map.' + doc.id, JSON.stringify(doc));
      return doc;
    }

    remove(id) {
      const raw = this._get('map.' + id);
      if (raw === null) throw new ValidationError('削除するマップが見つかりません。');
      let out = raw;
      try {
        const d = JSON.parse(raw);
        if (d && typeof d === 'object') {
          d.deleted_at = nowIso();
          out = JSON.stringify(d);
        }
      } catch (e) {
        // 壊れたデータはそのままゴミ箱へ移す
      }
      this._set('trash.' + id, out);
      this._del('map.' + id);
    }

    restore(id) {
      const raw = this._get('trash.' + id);
      if (raw === null) throw new ValidationError('ゴミ箱にデータが見つかりません。');
      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw new ValidationError('このデータは壊れているため復元できません。');
      }
      const target = this.exists(id) ? newId() : id;
      const doc = normalizeDoc(data, { keepId: target });
      this._set('map.' + doc.id, JSON.stringify(doc));
      this._del('trash.' + id);
      return doc.id;
    }

    purge(id) {
      this._del('trash.' + id);
    }

    purgeAll() {
      const ids = this._keys('trash.');
      for (const id of ids) this._del('trash.' + id);
      return ids.length;
    }

    bundle() {
      const maps = [];
      for (const m of this.list(false)) {
        if (m.broken) continue;
        try {
          maps.push(this.load(m.id));
        } catch (e) {
          // 読めないマップはバックアップから除外
        }
      }
      return { schema: BACKUP_SCHEMA, app: APP_NAME, exported_at: nowIso(), maps: maps };
    }

    usageBytes() {
      if (!this.persistent) return 0;
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEY_PREFIX)) total += (k.length + (localStorage.getItem(k) || '').length) * 2;
      }
      return total;
    }
  }

  // ------------------------------------------------------------------
  // 書き出し補助
  // ------------------------------------------------------------------
  function safeFilename(title) {
    const name = String(title || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^[\s.]+|[\s.]+$/g, '');
    return cut(name, 60) || 'mindmap';
  }

  function outlineMarkdown(doc) {
    const root = doc.root;
    const lines = ['# ' + root.text.replace(/\n/g, ' '), ''];
    if (root.note) lines.push(root.note.replace(/\n/g, ' '), '');
    const st = [];
    for (let i = root.children.length - 1; i >= 0; i--) st.push([root.children[i], 0]);
    while (st.length) {
      const [n, d] = st.pop();
      const indent = '  '.repeat(d);
      const parts = [];
      if (n.icon) parts.push(n.icon);
      parts.push(n.text.replace(/\n/g, ' / ') || '（空）');
      if (n.labels.length) parts.push('〔' + n.labels.join('・') + '〕');
      lines.push(indent + (n.done ? '- [x] ' : '- ') + parts.join(' '));
      if (n.note) lines.push(indent + '  メモ: ' + n.note.replace(/\n/g, ' '));
      for (let i = n.children.length - 1; i >= 0; i--) st.push([n.children[i], d + 1]);
    }
    return lines.join('\n') + '\n';
  }

  function exportJSONText(doc) {
    const out = Object.assign({}, doc, { exported_at: nowIso(), app: APP_NAME });
    return JSON.stringify(out, null, 2);
  }

  // JPEG 1枚を埋め込んだ1ページのPDFを生成する（外部ライブラリ不要）
  function jpegToPdf(jpeg, pxW, pxH, ptW, ptH) {
    const enc = new TextEncoder();
    const parts = [];
    const offsets = [];
    let len = 0;
    const push = (d) => {
      const b = typeof d === 'string' ? enc.encode(d) : d;
      parts.push(b);
      len += b.length;
    };
    const obj = (n, body) => {
      offsets[n] = len;
      push(n + ' 0 obj\n');
      body();
      push('\nendobj\n');
    };
    const w = ptW.toFixed(2);
    const h = ptH.toFixed(2);
    const content = 'q ' + w + ' 0 0 ' + h + ' 0 0 cm /Im0 Do Q';
    push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
    obj(3, () => push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + w + ' ' + h + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>'));
    obj(4, () => {
      push('<< /Type /XObject /Subtype /Image /Width ' + pxW + ' /Height ' + pxH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n');
      push(jpeg);
      push('\nendstream');
    });
    obj(5, () => push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'));
    const xref = len;
    let x = 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    return new Blob(parts, { type: 'application/pdf' });
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) throw new Error('クリップボードにコピーできませんでした');
  }

  function relTime(iso) {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return '';
    const sec = (Date.now() - t) / 1000;
    if (sec < 60) return 'たった今';
    if (sec < 3600) return Math.floor(sec / 60) + '分前';
    if (sec < 86400) return Math.floor(sec / 3600) + '時間前';
    const d = new Date(t);
    return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
  }

  global.MF = {
    SCHEMA, BACKUP_SCHEMA, APP_NAME, KEY_PREFIX, LIMITS, ICONS, BG_KEYS, TEXT_KEYS, TEMPLATES,
    ValidationError, Store, newId, nowIso, normalizeDoc, extractDocs, buildTemplateDoc, countNodes,
    safeFilename, outlineMarkdown, exportJSONText, jpegToPdf, download, copyText, relTime
  };
})(window);