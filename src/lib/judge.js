// 「その部品の組で字が作れるか」の判定。すべて純粋関数。
import { bagKey } from './ids.js';

export function countBag(parts) {
  const m = new Map();
  for (const p of parts) m.set(p, (m.get(p) || 0) + 1);
  return m;
}

/** small が big に(個数こみで)含まれるか。 */
export function isSubBag(small, big) {
  const b = big instanceof Map ? big : countBag(big);
  for (const [p, n] of countBag(small)) if ((b.get(p) || 0) < n) return false;
  return true;
}

/** 選んだ部品の組とちょうど一致する切り方をもつ字(配置は問わない)。 */
export function charsFor(dict, selection) {
  return dict.byCut.get(bagKey(selection)) || [];
}

/** 盤の部品で作れる字すべて。字ごとに、盤で作れる切り方を添える。 */
export function makeable(dict, board) {
  const b = countBag(board);
  const out = [];
  for (const e of dict.entries.values()) {
    const cuts = e.cuts.filter((c) => isSubBag(c, b));
    if (cuts.length) out.push({ char: e.char, cuts });
  }
  return out;
}

/**
 * 1回の「あわせる」を判定する。
 * kind: 'invalid'(盤にない部品/1個以下) | 'none'(データにない) | 'again'(もう見つけた) | 'new'
 * none のときは、盤の残りを足せば作れる字の数(near)を返す。答えそのものは言わない。
 */
export function judge(dict, board, selection, found = new Set()) {
  if (selection.length < 2) return { kind: 'invalid', reason: '部品を2つ以上えらんでください', chars: [] };
  const b = countBag(board);
  if (!isSubBag(selection, b)) return { kind: 'invalid', reason: '盤にない部品がまざっています', chars: [] };
  const chars = charsFor(dict, selection);
  if (chars.length === 0) {
    let near = 0;
    for (const e of dict.entries.values()) {
      if (e.cuts.some((c) => c.length > selection.length && isSubBag(selection, c) && isSubBag(c, b))) near++;
    }
    return { kind: 'none', chars: [], near };
  }
  const newChars = chars.filter((c) => !found.has(c));
  return { kind: newChars.length ? 'new' : 'again', chars, newChars };
}
