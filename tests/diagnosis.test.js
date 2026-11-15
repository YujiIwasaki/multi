import { test, eq } from './runner.js';
import { buildLayout } from '../js/core/layout.js';
import { diagnose } from '../js/core/diagnosis.js';

// 指定したマス（kind・段・位）のステップを探す
function cellStep(l, kind, row, col) {
  const cell = l.cells.find((c) => c.kind === kind && c.row === row && c.col === col);
  return l.steps.find((s) => s.cellId === cell.id);
}

// 設計書 11.1 の表
test('diagnosis: 47×36 段1 で 6 を選ぶ → E5', () => {
  const l = buildLayout(47, 36);
  const step = l.steps.find((s) => s.type === 'chooseDigit' && s.row === 1);
  eq(diagnose(step, 0, l).code, 'E5');
});

test('diagnosis: 47×36 段1 で一の位を選ぶ → E4', () => {
  const l = buildLayout(47, 36);
  const step = l.steps.find((s) => s.type === 'chooseStartCol');
  eq(diagnose(step, 0, l).code, 'E4');
});

test('diagnosis: 305×208 の2の段で十の位を選ぶ → Z3', () => {
  const l = buildLayout(305, 208);
  const step = l.steps.find((s) => s.type === 'chooseStartCol');
  eq(diagnose(step, 1, l).code, 'Z3');
});

test('diagnosis: 305×208 の2の段で千の位を選ぶ → E4（左にずれすぎ）', () => {
  const l = buildLayout(305, 208);
  const step = l.steps.find((s) => s.type === 'chooseStartCol');
  eq(diagnose(step, 3, l).code, 'E4');
});

test('diagnosis: 305×8 の十の位に 2（0×8 を 8 とした）→ Z1', () => {
  const l = buildLayout(305, 8);
  eq(diagnose(cellStep(l, 'partial', 0, 1), 2, l).code, 'Z1');
});

test('diagnosis: 305×8 の十の位に 0（くり上がりを足していない）→ Z2', () => {
  const l = buildLayout(305, 8);
  eq(diagnose(cellStep(l, 'partial', 0, 1), 0, l).code, 'Z2');
});

test('diagnosis: 47×36 段0 十の位に 4（くり上がり忘れ）→ E2', () => {
  const l = buildLayout(47, 36);
  eq(diagnose(cellStep(l, 'partial', 0, 1), 4, l).code, 'E2');
});

test('diagnosis: 47×36 段0 十の位に 0（4×(6+4)）→ E3', () => {
  const l = buildLayout(47, 36);
  eq(diagnose(cellStep(l, 'partial', 0, 1), 0, l).code, 'E3');
});

test('diagnosis: 450×30 の 答えの一の位（0を書くマス）に 5 → Z4', () => {
  const l = buildLayout(450, 30);
  eq(diagnose(cellStep(l, 'zeroTail', 0, 0), 5, l).code, 'Z4');
});

test('diagnosis: 47×30 で 3 の段を一の位から書こうとする → Z3（0の段を省いたのにずらしていない）', () => {
  const l = buildLayout(47, 30);
  const step = l.steps.find((s) => s.type === 'chooseStartCol');
  eq(diagnose(step, 0, l).code, 'Z3');
});

test('diagnosis: 450×30 の 0×3 のマスに 3 → Z1', () => {
  const l = buildLayout(450, 30);
  eq(diagnose(cellStep(l, 'partial', 0, 1), 3, l).code, 'Z1');
});

test('diagnosis: 47×36 段1 一の位に 2（7×6 の一の位）→ E5', () => {
  const l = buildLayout(47, 36);
  eq(diagnose(cellStep(l, 'partial', 1, 1), 2, l).code, 'E5');
});

test('diagnosis: 足し算のマス → E6', () => {
  const l = buildLayout(47, 36);
  eq(diagnose(cellStep(l, 'sum', -1, 1), 0, l).code, 'E6');
});

test('diagnosis: 7×6 を 43 → E1', () => {
  const l = buildLayout(47, 6);
  eq(diagnose(cellStep(l, 'partial', 0, 0), 3, l).code, 'E1');
});
