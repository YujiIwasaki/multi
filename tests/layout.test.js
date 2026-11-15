import { test, eq, ok } from './runner.js';
import { buildLayout, assembleAnswer } from '../js/core/layout.js';

const CASES = [[47, 36], [258, 47], [386, 274], [305, 8], [305, 208], [386, 204], [47, 30], [450, 30], [320, 150], [23, 12], [999, 999], [100, 100], [10, 10], [5, 5]];

test('layout: マスから組み立てた答えが a×b と一致する', () => {
  for (const [a, b] of CASES) {
    for (const carryInput of [true, false]) {
      const l = buildLayout(a, b, { carryInput });
      eq(assembleAnswer(l), a * b, `${a}×${b}`);
    }
  }
});

test('layout: 2けた〜3けたの全組み合わせの一部（ランダム2000件）で検算が通る', () => {
  for (let t = 0; t < 2000; t += 1) {
    const a = 10 + Math.floor(Math.random() * 990);
    const b = 10 + Math.floor(Math.random() * 990);
    buildLayout(a, b); // 検算に失敗すると例外
  }
});

test('layout: 47×36 の段と手順', () => {
  const l = buildLayout(47, 36);
  eq(l.meta.rows.map((r) => [r.j, r.bj, r.startCol, r.value]), [[0, 6, 0, 282], [1, 3, 1, 141]]);
  eq(l.steps.slice(0, 6).map((s) => s.type === 'cell' ? l.cellById.get(s.cellId).expected : s.type),
    ['chooseDigit', 2, 4, 8, 2, 'chooseDigit']);
  eq(l.steps[6], { type: 'chooseStartCol', row: 1, answer: 1 });
  ok(l.meta.hasSum);
});

test('layout: 1段目では「書きはじめの位」を聞かない', () => {
  const l = buildLayout(47, 36);
  eq(l.steps.filter((s) => s.type === 'chooseStartCol').map((s) => s.row), [1]);
});

test('layout: 305×208 は 0の段を省略し、2の段は百の位から', () => {
  const l = buildLayout(305, 208);
  eq(l.meta.rows.map((r) => [r.j, r.startCol, r.value]), [[0, 0, 2440], [2, 2, 610]]);
  eq(l.meta.skippedJs, [1]);
});

test('layout: 386×204 の答えは 78744', () => {
  eq(assembleAnswer(buildLayout(386, 204)), 78744);
});

test('layout: 450×30 は tz=2、45×3 の段と 0 を2こ下ろすマス', () => {
  const l = buildLayout(450, 30);
  eq(l.meta.tz, 2);
  eq(l.meta.rows.map((r) => [r.startCol, r.value]), [[2, 135]]);
  eq(l.cells.filter((c) => c.kind === 'zeroTail').map((c) => c.col), [0, 1]);
  ok(!l.meta.hasSum, '段が1つなので足し算はない');
});

test('layout: 1けたの掛ける数では「かける数字」を聞かない', () => {
  const l = buildLayout(305, 8);
  eq(l.steps.filter((s) => s.type !== 'cell').length, 0);
});

test('layout: くり上がり入力オフでは carry マスを作らない', () => {
  const l = buildLayout(47, 36, { carryInput: false });
  eq(l.cells.filter((c) => c.kind === 'carry' || c.kind === 'sumCarry').length, 0);
});

test('layout: くり上がりが0のところには carry マスを作らない', () => {
  const l = buildLayout(23, 12);
  eq(l.cells.filter((c) => c.kind === 'carry').length, 0);
});
