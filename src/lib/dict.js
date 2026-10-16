// 自作データ(src/data/kanji.js)から辞書を組み立てる。
import { parseIds, expandTree, bagKey } from './ids.js';

/** 「字 IDS よみ」の行を読んで辞書にする。cuts は2部品以上の切り分け方すべて。 */
export function buildDict(source) {
  const entries = new Map();
  const trees = new Map();
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const [char, ids, reading = ''] = line.split(/\s+/);
    if (entries.has(char)) throw new Error(`字が重複しています: ${char}`);
    const tree = parseIds(ids);
    if (tree.char) throw new Error(`分解になっていません: ${line}`);
    trees.set(char, tree);
    entries.set(char, { char, ids, reading, tree, cuts: [] });
  }
  const byCut = new Map();
  for (const e of entries.values()) {
    e.cuts = expandTree(e.tree, trees).filter((c) => c.length >= 2 && !c.includes(e.char));
    for (const cut of e.cuts) {
      const k = bagKey(cut);
      if (!byCut.has(k)) byCut.set(k, []);
      byCut.get(k).push(e.char);
    }
  }
  return { entries, trees, byCut, size: entries.size };
}

/** 盤に出てきうる部品(どれかの切り方に現れる字)の一覧。 */
export function partsOf(dict) {
  const s = new Set();
  for (const e of dict.entries.values()) for (const c of e.cuts) for (const p of c) s.add(p);
  return s;
}
