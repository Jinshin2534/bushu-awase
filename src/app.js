// 画面の配線と描画。判定・出題は src/lib の純粋関数に任せる。
import { KANJI_SOURCE } from './data/kanji.js';
import { buildDict } from './lib/dict.js';
import { describeTree, OPERATORS } from './lib/ids.js';
import { judge } from './lib/judge.js';
import { generateBoard, dailySeed } from './lib/puzzle.js';
import { PART_NAMES } from './lib/names.js';

const dict = buildDict(KANJI_SOURCE);

const state = {
  seed: '',
  daily: true,
  tiles: [],
  answers: [],
  picked: [], // 盤の札の番号(選んだ順)
  found: new Set(),
  revealed: false,
  message: null,
  hint: null,
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function storageKey() {
  return `bushu-awase:${state.seed}`;
}
function save() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify({ found: [...state.found], revealed: state.revealed }));
  } catch {}
}
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey()) || 'null');
    if (v) {
      state.found = new Set(v.found.filter((c) => state.answers.some((a) => a.char === c)));
      state.revealed = !!v.revealed;
    }
  } catch {}
}

function newBoard(seed, daily = false) {
  state.seed = String(seed);
  state.daily = daily;
  const g = generateBoard(dict, state.seed);
  state.tiles = g.tiles;
  state.answers = g.answers;
  state.picked = [];
  state.found = new Set();
  state.revealed = false;
  state.message = null;
  state.hint = null;
  load();
  const url = new URL(location.href);
  if (daily) url.searchParams.delete('seed');
  else url.searchParams.set('seed', state.seed);
  history.replaceState(null, '', url);
  render();
}

function randomSeed() {
  return Math.random().toString(36).slice(2, 8);
}

function formula(char) {
  const e = dict.entries.get(char);
  return describeTree(e.tree, dict.trees);
}

function submit(parts) {
  const r = judge(dict, state.tiles, parts, state.found);
  state.hint = null;
  if (r.kind === 'new') r.newChars.forEach((c) => state.found.add(c));
  state.message = { ...r, parts };
  state.picked = [];
  save();
  render();
  return r;
}

function hint() {
  const left = state.answers.filter((a) => !state.found.has(a.char));
  if (!left.length) return;
  // いちばん少ない部品で作れる未発見の字から、部品をひとつだけ教える
  left.sort((a, b) => Math.min(...a.cuts.map((c) => c.length)) - Math.min(...b.cuts.map((c) => c.length)));
  const target = left[(state.hintIndex = ((state.hintIndex ?? -1) + 1) % left.length)];
  const cut = [...target.cuts].sort((a, b) => a.length - b.length)[0];
  state.hint = { part: cut[0], size: cut.length };
  state.message = null;
  render();
}

function tileHtml(part, i, used) {
  const name = PART_NAMES[part];
  const hinted = state.hint && state.hint.part === part;
  return `<button class="tile${used ? ' used' : ''}${hinted ? ' hinted' : ''}" data-i="${i}" ${used ? 'disabled' : ''} aria-label="${esc(part)}${name ? `(${name})` : ''}">
    <span class="tile-char">${esc(part)}</span>${name ? `<span class="tile-name">${name}</span>` : ''}
  </button>`;
}

function messageHtml() {
  const m = state.message;
  if (state.hint) {
    return `<p class="msg msg-hint">ヒント: 「${esc(state.hint.part)}」をふくむ ${state.hint.size} 部品の字がまだあります。</p>`;
  }
  if (!m) return `<p class="msg msg-idle">部品を2つ以上えらんで「あわせる」。</p>`;
  const sel = m.parts.map(esc).join(' ＋ ');
  if (m.kind === 'invalid') return `<p class="msg msg-warn">${esc(m.reason)}</p>`;
  if (m.kind === 'none') {
    const near = m.near
      ? `<br><span class="sub">盤の部品をさらに足すと作れる字が ${m.near} 字あります。</span>`
      : '';
    return `<p class="msg msg-none">${sel} → このアプリのデータ(${dict.size}字)には、この組み合わせの字がありません。<span class="sub">実在しないとは限りません。</span>${near}</p>`;
  }
  const items = m.chars
    .map((c) => {
      const e = dict.entries.get(c);
      const op = OPERATORS[e.tree.op];
      const fresh = m.kind === 'new' && m.newChars.includes(c);
      return `<span class="made${fresh ? ' fresh' : ''}"><b>${esc(c)}</b><small>${esc(e.reading)}・${op.name}</small></span>`;
    })
    .join('');
  const lead = m.kind === 'again' ? 'もう見つけています' : m.chars.length > 1 ? `${m.chars.length}字できた!` : 'できた!';
  return `<div class="msg msg-ok"><span>${sel} →</span>${items}<span class="sub">${lead}</span></div>`;
}

function foundHtml() {
  // 見つけた字を前に詰める(? の位置から答えの並びが漏れないように)
  const all = state.answers.map((a) => a.char);
  const list = [...all.filter((c) => state.found.has(c)), ...all.filter((c) => !state.found.has(c))];
  const cells = list
    .map((c) => {
      const e = dict.entries.get(c);
      if (state.found.has(c)) {
        return `<li class="cell got"><b>${esc(c)}</b><small>${esc(e.reading)}</small><em>${esc(formula(c))}</em></li>`;
      }
      if (state.revealed) {
        return `<li class="cell shown"><b>${esc(c)}</b><small>${esc(e.reading)}</small><em>${esc(formula(c))}</em></li>`;
      }
      return `<li class="cell empty" aria-label="未発見"><b>?</b></li>`;
    })
    .join('');
  return `<ul class="cells">${cells}</ul>`;
}

let root;

function render() {
  const total = state.answers.length;
  const got = state.found.size;
  const usedSet = new Set(state.picked);
  const tray = state.picked.map((i) => `<span class="tray-part">${esc(state.tiles[i])}</span>`).join('<span class="plus">＋</span>');
  const done = got === total;
  root.innerHTML = `
  <header class="head">
    <h1><span class="stamp">部</span>部首あわせ</h1>
    <p class="lede">部品をあわせて漢字をつくる。木＋目＝相。</p>
  </header>
  <main>
    <section class="bar">
      <div class="seed">${state.daily ? `今日の盤 <b>${esc(state.seed)}</b>` : `盤 <b>${esc(state.seed)}</b>`}</div>
      <div class="bar-btns">
        ${state.daily ? '' : '<button class="ghost" data-act="daily">今日の盤</button>'}
        <button class="ghost" data-act="new">べつの盤</button>
      </div>
    </section>

    <section class="score" aria-live="polite">
      <div class="meter"><span style="width:${total ? (got / total) * 100 : 0}%"></span></div>
      <p><b>${got}</b> / ${total} 字 ${done ? '<span class="clear">ぜんぶ見つけた</span>' : ''}</p>
      <p class="note">この盤で作れる字の数は、このアプリの自作データ(${dict.size}字)で数えたものです。データにない字は作れても判定できません。</p>
    </section>

    <section class="work">
      <div class="tray${state.picked.length ? '' : ' empty'}">${tray || '<span class="tray-ph">ここに部品がならびます</span>'}</div>
      <div class="work-btns">
        <button class="primary" data-act="go" ${state.picked.length < 2 ? 'disabled' : ''}>あわせる</button>
        <button class="ghost" data-act="back" ${state.picked.length ? '' : 'disabled'}>ひとつ戻す</button>
      </div>
      <div class="result" aria-live="polite">${messageHtml()}</div>
    </section>

    <section class="board" aria-label="部品の盤">
      ${state.tiles.map((p, i) => tileHtml(p, i, usedSet.has(i))).join('')}
    </section>

    <section class="found">
      <div class="found-head">
        <h2>見つけた字</h2>
        <div>
          <button class="ghost" data-act="hint" ${done || state.revealed ? 'disabled' : ''}>ヒント</button>
          <button class="ghost" data-act="reveal" ${done || state.revealed ? 'disabled' : ''}>答えを見る</button>
        </div>
      </div>
      ${foundHtml()}
    </section>
  </main>
  <footer class="foot">
    <p>同じ部品は盤にある枚数までしか使えません。配置(左右・上下)は問わず、組でひとまとまりに判定します。</p>
    <p>漢字の構造データは自作です(MIT)。CHISE / cjkvi-ids(GPLv2)は同梱していません。分け方はこのアプリの流儀で、字源とは限りません。</p>
  </footer>`;
}

function onClick(ev) {
  const t = ev.target.closest('button');
  if (!t || t.disabled) return;
  if (t.dataset.i !== undefined) {
    state.picked.push(Number(t.dataset.i));
    state.hint = null;
    render();
    return;
  }
  const act = t.dataset.act;
  if (act === 'go') submit(state.picked.map((i) => state.tiles[i]));
  else if (act === 'back') {
    state.picked.pop();
    render();
  } else if (act === 'new') newBoard(randomSeed());
  else if (act === 'daily') newBoard(dailySeed(), true);
  else if (act === 'hint') hint();
  else if (act === 'reveal') {
    state.revealed = true;
    state.message = null;
    state.hint = null;
    save();
    render();
  }
}

function onKey(ev) {
  if (ev.key === 'Enter' && state.picked.length >= 2) submit(state.picked.map((i) => state.tiles[i]));
  else if (ev.key === 'Backspace' && state.picked.length) {
    state.picked.pop();
    render();
  }
}

export function mountApp(el) {
  root = el;
  root.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  const seed = new URL(location.href).searchParams.get('seed');
  if (seed) newBoard(seed);
  else newBoard(dailySeed(), true);

  // ヘッドレス検証用
  window.__app = {
    dict,
    get state() {
      return { ...state, found: [...state.found] };
    },
    newBoard,
    submit,
    answers: () => state.answers.map((a) => a.char),
    solveAll: () => {
      for (const a of state.answers) if (!state.found.has(a.char)) submit(a.cuts[0]);
      return state.found.size;
    },
  };
}
