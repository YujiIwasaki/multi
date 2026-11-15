import { test, eq, ok } from './runner.js';
import { RULES, makeProblem, buildSet, similarProblem, LEVELS } from '../js/core/generator.js';
import { buildLayout } from '../js/core/layout.js';

test('generator: 各レベルで1000問作り、すべてレベル条件を満たす', () => {
  for (const { id } of LEVELS) {
    for (let t = 0; t < 1000; t += 1) {
      const p = makeProblem(id, { index: t % 5 });
      ok(RULES[id].ok(p.a, p.b), `${id}: ${p.a}×${p.b}`);
      buildLayout(p.a, p.b);
    }
  }
});

test('generator: 5-1 の最初の2問は掛ける数が1けた', () => {
  const set = buildSet('5-1', { setSize: 5, zeroMix: 0 });
  ok(set[0].b < 10 && set[1].b < 10, JSON.stringify(set));
  ok(set[2].b >= 10);
});

test('generator: セットの中に同じ問題がない・直近の問題と重ならない', () => {
  for (const id of ['1', '2', '3', '4', '5-2']) {
    const recent = buildSet(id, { setSize: 10, zeroMix: 0 }).map((p) => `${p.a}x${p.b}`);
    const set = buildSet(id, { setSize: 10, zeroMix: 2 }, recent);
    const keys = set.map((p) => `${p.a}x${p.b}`);
    eq(new Set(keys).size, keys.length, id);
    ok(keys.every((k) => !recent.includes(k)), `${id} 直近と重なった`);
  }
});

test('generator: 通常セットに0の問題が zeroMix 問まざり、1問目は通常問題', () => {
  for (let t = 0; t < 50; t += 1) {
    const set = buildSet('3', { setSize: 5, zeroMix: 2 });
    eq(set.filter((p) => p.isZero).length, 2);
    ok(!set[0].isZero);
  }
});

test('generator: レベル1〜2 にまぜる0の問題は 2けた × 何十', () => {
  const set = buildSet('1', { setSize: 5, zeroMix: 2 });
  set.filter((p) => p.isZero).forEach((p) => ok(p.a < 100 && p.b % 10 === 0, `${p.a}×${p.b}`));
});

test('generator: 類題は誤りの型に合う', () => {
  const base = { a: 305, b: 208, level: '5-4', isZero: true };
  eq(similarProblem('Z3', base).level, '5-4');
  eq(similarProblem('Z1', base).level, '5-1');
  eq(similarProblem('Z4', { a: 450, b: 30, level: '5-3' }).level, '5-3');
  const e5 = similarProblem('E5', { a: 47, b: 36, level: '2' });
  ok(new Set(String(e5.b)).size === String(e5.b).length, 'E5の類題は掛ける数の数字がすべてちがう');
  ok(e5.isFollowUp);
});
