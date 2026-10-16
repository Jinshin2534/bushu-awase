import { describe, it, expect } from 'vitest';
import { buildDict } from './dict.js';
import { KANJI_SOURCE } from '../data/kanji.js';
import { generateBoard, mulberry32, hashSeed, dailySeed } from './puzzle.js';
import { makeable } from './judge.js';

const dict = buildDict(KANJI_SOURCE);

describe('乱数', () => {
  it('同じ種なら同じ列', () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('文字列の種は安定した数になる', () => {
    expect(hashSeed('2026-10-16')).toBe(hashSeed('2026-10-16'));
    expect(hashSeed('2026-10-16')).not.toBe(hashSeed('2026-10-17'));
  });
  it('日付の種は YYYY-MM-DD', () => {
    expect(dailySeed(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('generateBoard', () => {
  it('同じ種なら同じ盤', () => {
    expect(generateBoard(dict, 'abc').tiles).toEqual(generateBoard(dict, 'abc').tiles);
  });
  it('盤は8枚で、答えは盤から作れる字と一致する', () => {
    const g = generateBoard(dict, 'xyz');
    expect(g.tiles).toHaveLength(8);
    expect(g.answers.map((a) => a.char).sort()).toEqual(makeable(dict, g.tiles).map((a) => a.char).sort());
  });
  it('たくさんの種で、答えの数が 8〜24 に収まる', () => {
    for (let s = 0; s < 40; s++) {
      const n = generateBoard(dict, `seed-${s}`).answers.length;
      expect(n, `seed-${s}`).toBeGreaterThanOrEqual(8);
      expect(n, `seed-${s}`).toBeLessThanOrEqual(24);
    }
  });
});
