// IDS(表意文字記述列)の構文解析と、部品への「切り分け方」の列挙。すべて純粋関数。

export const OPERATORS = {
  '⿰': { arity: 2, name: '左右' },
  '⿱': { arity: 2, name: '上下' },
  '⿲': { arity: 3, name: '左中右' },
  '⿳': { arity: 3, name: '上中下' },
  '⿴': { arity: 2, name: 'かこむ' },
  '⿵': { arity: 2, name: '上からかこむ' },
  '⿶': { arity: 2, name: '下からかこむ' },
  '⿷': { arity: 2, name: '左からかこむ' },
  '⿸': { arity: 2, name: '左上からかこむ' },
  '⿹': { arity: 2, name: '右上からかこむ' },
  '⿺': { arity: 2, name: '左下からかこむ' },
  '⿻': { arity: 2, name: 'かさねる' },
};

/** IDS 文字列を木にする。葉は { char }、節は { op, children }。不正なら例外。 */
export function parseIds(str) {
  const chars = Array.from(str);
  let i = 0;
  function node() {
    if (i >= chars.length) throw new Error(`IDS が途中で終わっています: ${str}`);
    const c = chars[i++];
    const op = OPERATORS[c];
    if (!op) return { char: c };
    const children = [];
    for (let k = 0; k < op.arity; k++) children.push(node());
    return { op: c, children };
  }
  const tree = node();
  if (i !== chars.length) throw new Error(`IDS の後ろに余りがあります: ${str}`);
  return tree;
}

/** 多重集合のキー(並び順によらない)。 */
export function bagKey(parts) {
  return [...parts].sort().join('');
}

/**
 * 木を部品の多重集合に切り分ける方法をすべて返す(ソート済み配列の配列、重複なし)。
 * 葉の字が辞書(trees)にあれば、そのまま使う切り方と、さらに分解する切り方の両方を数える。
 * 名前のない内側の節(例: 品の ⿰口口)は部品になれないので必ず分解する。
 */
export function expandTree(tree, trees, maxDepth = 6) {
  const out = new Map();
  for (const bag of expandNode(tree, trees, maxDepth)) out.set(bagKey(bag), [...bag].sort());
  return [...out.values()];
}

function expandNode(node, trees, depth) {
  if (node.char) {
    const results = [[node.char]];
    const sub = trees.get(node.char);
    if (sub && depth > 0) results.push(...expandNode(sub, trees, depth - 1));
    return results;
  }
  let acc = [[]];
  for (const child of node.children) {
    const opts = expandNode(child, trees, depth);
    const next = [];
    for (const a of acc) for (const o of opts) next.push([...a, ...o]);
    acc = next;
  }
  return acc;
}

/** 木を「木 ＋ 寺(土 ＋ 寸)」のような読める式にする。 */
export function describeTree(tree, trees, depth = 1) {
  if (tree.char) {
    const sub = trees.get(tree.char);
    if (sub && depth > 0) return `${tree.char}(${describeTree(sub, trees, depth - 1)})`;
    return tree.char;
  }
  const inner = tree.children.map((c) => describeTree(c, trees, depth)).join(' ＋ ');
  return inner;
}
