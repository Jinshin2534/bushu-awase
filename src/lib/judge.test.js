import { describe, it, expect } from 'vitest';
import { buildDict } from './dict.js';
import { judge, makeable, charsFor, isSubBag } from './judge.js';

const dict = buildDict(`
相 ⿰木目 あい
林 ⿰木木 はやし
森 ⿱木林 もり
杏 ⿱木口 あんず
呆 ⿱口木 あきれる
保 ⿰亻呆 たもつ
休 ⿰亻木 やすむ
`);

describe('isSubBag', () => {
  it('個数まで見る', () => {
    expect(isSubBag(['木', '木'], ['木', '目'])).toBe(false);
    expect(isSubBag(['木', '木'], ['木', '目', '木'])).toBe(true);
  });
});

describe('charsFor', () => {
  it('並び順によらず同じ字(木+目 = 目+木 = 相)', () => {
    expect(charsFor(dict, ['木', '目'])).toEqual(['相']);
    expect(charsFor(dict, ['目', '木'])).toEqual(['相']);
  });
  it('配置ちがいで2字できる組は両方返す(杏と呆)', () => {
    expect(charsFor(dict, ['口', '木']).sort()).toEqual(['呆', '杏'].sort());
  });
  it('部品を深く分けても作れる(木×3 = 森)', () => {
    expect(charsFor(dict, ['木', '木', '木'])).toEqual(['森']);
  });
});

describe('makeable', () => {
  it('盤で作れる字だけを数える', () => {
    const chars = makeable(dict, ['木', '目', '亻']).map((m) => m.char).sort();
    expect(chars).toEqual(['休', '相'].sort());
  });
  it('同じ部品が2枚ないと林は作れない', () => {
    expect(makeable(dict, ['木', '口']).map((m) => m.char)).not.toContain('林');
    expect(makeable(dict, ['木', '木']).map((m) => m.char)).toContain('林');
  });
});

describe('judge', () => {
  const board = ['木', '木', '目', '口', '亻'];
  it('新しく見つけた字', () => {
    const r = judge(dict, board, ['木', '目']);
    expect(r).toMatchObject({ kind: 'new', newChars: ['相'] });
  });
  it('もう見つけた字は again', () => {
    expect(judge(dict, board, ['木', '目'], new Set(['相'])).kind).toBe('again');
  });
  it('1つしか見つけていない組は残りだけ new', () => {
    const r = judge(dict, board, ['口', '木'], new Set(['杏']));
    expect(r.kind).toBe('new');
    expect(r.newChars).toEqual(['呆']);
  });
  it('データにない組は none で、足せば作れる字の数(near)を言う', () => {
    const r = judge(dict, board, ['亻', '口']);
    expect(r.kind).toBe('none');
    expect(r.near).toBe(1); // 亻+口+木 = 保
  });
  it('盤にない部品は invalid', () => {
    expect(judge(dict, board, ['木', '水']).kind).toBe('invalid');
  });
  it('盤より多く同じ部品を使うと invalid', () => {
    expect(judge(dict, board, ['目', '目']).kind).toBe('invalid');
  });
  it('1部品だけは invalid', () => {
    expect(judge(dict, board, ['木']).kind).toBe('invalid');
  });
});
