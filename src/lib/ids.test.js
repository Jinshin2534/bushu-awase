import { describe, it, expect } from 'vitest';
import { parseIds, expandTree, describeTree, bagKey } from './ids.js';

const trees = new Map([
  ['寺', parseIds('⿱土寸')],
  ['林', parseIds('⿰木木')],
]);

describe('parseIds', () => {
  it('2項の演算子を木にする', () => {
    expect(parseIds('⿰木目')).toEqual({ op: '⿰', children: [{ char: '木' }, { char: '目' }] });
  });
  it('入れ子を読める', () => {
    const t = parseIds('⿱口⿰口口');
    expect(t.children[1].op).toBe('⿰');
  });
  it('3項の演算子も読める', () => {
    expect(parseIds('⿲彳亍丁').children).toHaveLength(3);
  });
  it('途中で終わるIDSは例外', () => {
    expect(() => parseIds('⿰木')).toThrow();
  });
  it('余りのあるIDSは例外', () => {
    expect(() => parseIds('⿰木目口')).toThrow();
  });
});

describe('expandTree', () => {
  it('辞書にある部品はさらに分解した切り方も出す(時 = 日寺 / 日土寸)', () => {
    const keys = expandTree(parseIds('⿰日寺'), trees).map((c) => c.join(''));
    expect(keys.sort()).toEqual(['土寸日', '寺日'].sort());
  });
  it('名前のない内側の節は必ず分解する(品)', () => {
    expect(expandTree(parseIds('⿱口⿰口口'), trees)).toEqual([['口', '口', '口']]);
  });
  it('同じ多重集合は1つにまとめる', () => {
    const cuts = expandTree(parseIds('⿰林林'), trees);
    const keys = cuts.map((c) => bagKey(c));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('深さの上限で止まる(自己参照があっても無限にならない)', () => {
    const loop = new Map([['甲', parseIds('⿰甲乙')]]);
    expect(expandTree(parseIds('⿰甲乙'), loop, 3).length).toBeLessThanOrEqual(5);
  });
});

describe('describeTree', () => {
  it('部品を ＋ でつなぎ、辞書にある部品は括弧で中身を見せる', () => {
    expect(describeTree(parseIds('⿰日寺'), trees)).toBe('日 ＋ 寺(土 ＋ 寸)');
  });
});
