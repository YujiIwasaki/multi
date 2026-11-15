// 誤り診断（設計書 6.3）
// 上から順に調べ、最初に当てはまったものを採用する。重点課題（E4・E5・Z系）を先に調べる。

export const FOCUS_CODES = ['E4', 'E5', 'Z1', 'Z2', 'Z3', 'Z4'];

/**
 * @param {Object} step   まちがえたステップ
 * @param {number} input  子どもの入力
 * @param {Object} layout buildLayout の結果
 * @returns {{code: string, detail: Object}}
 */
export function diagnose(step, input, layout) {
  const { meta } = layout;

  if (step.type === 'chooseDigit') {
    const r = meta.rows[step.row];
    return { code: 'E5', detail: { row: step.row, j: r.j, bj: r.bj, k: input, bk: meta.bDigits[input] } };
  }

  if (step.type === 'chooseStartCol') {
    const r = meta.rows[step.row];
    const prevJ = step.row > 0 ? meta.rows[step.row - 1].j : -1;
    const skippedBetween = meta.skippedJs.filter((s) => s > prevJ && s < r.j);
    const detail = { row: step.row, j: r.j, bj: r.bj, startCol: r.startCol, chosen: input, skipped: skippedBetween };
    if (skippedBetween.length > 0 && input < r.startCol) return { code: 'Z3', detail };
    return { code: 'E4', detail };
  }

  const cell = layout.cellById.get(step.cellId);
  const x = input;

  if (cell.kind === 'sum' || cell.kind === 'sumCarry') {
    return { code: 'E6', detail: { cell, ...cell.src } };
  }
  if (cell.kind === 'zeroTail') {
    return { code: 'Z4', detail: { cell, lead: meta.lead } };
  }

  const { i, j, ai, bj, carryIn: c, value: v } = cell.src;
  const detail = { cell, row: cell.row, i, j, ai, bj, c, v };
  // 同じ段の他の桁（同じ数字は見分けられないので除く）
  const others = meta.bDigits.map((bk, k) => ({ bk, k })).filter(({ bk, k }) => k !== j && bk !== bj);

  if (cell.kind === 'carry') {
    const e5 = others.find(({ bk }) => Math.floor((ai * bk + c) / 10) === x);
    if (e5) return { code: 'E5', detail: { ...detail, ...e5 } };
    if (c > 0 && Math.floor((ai * bj) / 10) === x) return { code: 'E2', detail };
    return { code: 'E1', detail };
  }

  // partial マス
  const pick = cell.src.digitPos === 1 ? (n) => Math.floor(n / 10) % 10 : (n) => n % 10;

  // 1. E5：別の桁の数字をかけている（くり上がりは子どもが書いた値＝c をそのまま使う）
  const e5 = others.find(({ bk }) => pick(ai * bk + c) === x);
  if (e5) return { code: 'E5', detail: { ...detail, ...e5 } };
  // 2. Z1：0 × bj を bj としている
  if (ai === 0 && x === pick(bj + c)) return { code: 'Z1', detail };
  // 3. Z2：0の位でくり上がりを足していない
  if (ai === 0 && c > 0 && x === 0) return { code: 'Z2', detail };
  // 4. E2：くり上がりを足し忘れ
  if (ai !== 0 && c > 0 && x === pick(ai * bj)) return { code: 'E2', detail };
  // 5. E3：くり上がりを足してからかけている
  if (c > 0 && x === pick(ai * (bj + c))) return { code: 'E3', detail };
  // 6. E1：九九の言いまちがい・となりの段
  const deltas = [1, -1, 2, -2, ai, -ai, bj, -bj].filter((d) => d !== 0);
  if (deltas.some((d) => ai * bj + c + d >= 0 && pick(ai * bj + c + d) === x)) return { code: 'E1', detail };
  return { code: 'UNKNOWN', detail };
}
