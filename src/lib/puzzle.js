// 辞書から盤(部品の組)を自動生成する。乱数は種から決まるので、同じ種なら同じ盤になる。
import { countBag, isSubBag, makeable } from './judge.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

export function dailySeed(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 盤に足りない部品(board に cut を載せるのに追加で要るもの)。 */
function missing(cut, boardCount) {
  const need = new Map(boardCount);
  const add = [];
  for (const p of cut) {
    if ((need.get(p) || 0) > 0) need.set(p, need.get(p) - 1);
    else add.push(p);
  }
  return add;
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 盤を作る。2〜3部品の切り方を種にして、盤にある部品と重なる字を優先して積み、
 * 作れる字の数が [minAnswers, maxAnswers] に入る盤を探す。
 */
export function generateBoard(dict, seed, { size = 8, minAnswers = 8, maxAnswers = 24, tries = 400 } = {}) {
  const rng = mulberry32(typeof seed === 'number' ? seed : hashSeed(seed));
  const cands = [];
  for (const e of dict.entries.values()) for (const c of e.cuts) if (c.length <= 3) cands.push(c);
  let best = null;
  for (let t = 0; t < tries; t++) {
    const board = [];
    const first = cands[Math.floor(rng() * cands.length)];
    board.push(...first);
    for (let step = 0; step < 12 && board.length < size; step++) {
      const bc = countBag(board);
      const room = size - board.length;
      const fit = [];
      const share = [];
      for (const c of cands) {
        if (isSubBag(c, bc)) continue;
        const add = missing(c, bc);
        if (add.length > room) continue;
        fit.push(add);
        if (add.length < c.length) share.push(add);
      }
      const pool = share.length && rng() < 0.85 ? share : fit;
      if (!pool.length) break;
      board.push(...pool[Math.floor(rng() * pool.length)]);
    }
    if (board.length !== size) continue;
    const answers = makeable(dict, board);
    const n = answers.length;
    const ok = n >= minAnswers && n <= maxAnswers;
    const score = ok ? 0 : Math.min(Math.abs(n - minAnswers), Math.abs(n - maxAnswers));
    if (!best || score < best.score) best = { tiles: shuffle(board, rng), answers, score };
    if (ok) break;
  }
  return { seed, tiles: best.tiles, answers: best.answers };
}
