// 最小限のテスト実行器（ブラウザでも Node.js でも動く）
const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function eq(actual, expected, msg = '') {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} 期待: ${e} 実際: ${a}`);
}

export function ok(cond, msg = '条件を満たしていません') {
  if (!cond) throw new Error(msg);
}

/** 全テストを実行して結果の配列を返す */
export async function run() {
  const results = [];
  for (const t of tests) {
    try {
      await t.fn();
      results.push({ name: t.name, pass: true });
    } catch (e) {
      results.push({ name: t.name, pass: false, error: e.message });
    }
  }
  return results;
}
