import { describe, it, expect } from 'vitest';
import { buildDict, partsOf } from './dict.js';
import { KANJI_SOURCE } from '../data/kanji.js';
import { OPERATORS } from './ids.js';

const dict = buildDict(KANJI_SOURCE);

describe('buildDict', () => {
  it('重複した字は例外', () => {
    expect(() => buildDict('相 ⿰木目 あい\n相 ⿰木目 あい')).toThrow(/重複/);
  });
  it('分解になっていない行は例外', () => {
    expect(() => buildDict('木 木 き')).toThrow();
  });
});

describe('同梱データ', () => {
  it('500字以上ある', () => {
    expect(dict.size).toBeGreaterThanOrEqual(500);
  });
  it('どの字にも読みがある', () => {
    for (const e of dict.entries.values()) expect(e.reading, e.char).toMatch(/^[ぁ-ん]+$/);
  });
  it('どの字にも2部品以上の切り方がある', () => {
    for (const e of dict.entries.values()) expect(e.cuts.length, e.char).toBeGreaterThan(0);
  });
  it('部品はすべて1文字で、IDS演算子が混ざらない', () => {
    for (const p of partsOf(dict)) {
      expect(Array.from(p)).toHaveLength(1);
      expect(OPERATORS[p]).toBeUndefined();
    }
  });
  it('囲み(囗)と口を取り違えていない', () => {
    expect(dict.entries.get('回').ids).toBe('⿴囗口');
    expect(dict.entries.get('呂').ids).toBe('⿱口口');
  });
  it('有名な組み合わせが成り立つ', () => {
    const has = (parts, ch) => expect(dict.byCut.get([...parts].sort().join('')) || [], parts.join('+')).toContain(ch);
    has(['木', '目'], '相');
    has(['木', '木', '木'], '森');
    has(['日', '土', '寸'], '時');
    has(['糸', '白', '水'], '線');
    has(['山', '上', '下'], '峠');
    has(['艹', '日', '月'], '萌');
  });
});
