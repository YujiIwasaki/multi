// 正誤判定とスター計算

/**
 * ステップの答えが正しいか
 * @param {Object} step  layout.steps の1つ
 * @param {number} input chooseDigit: 選んだ桁 j ／ chooseStartCol: 選んだ位 ／ cell: 入力した数字
 * @param {Object} layout
 */
export function judgeStep(step, input, layout) {
  if (step.type === 'cell') return layout.cellById.get(step.cellId).expected === input;
  return step.answer === input;
}

/**
 * 1問のスター（仕様 4.5）
 * ミスもヒントもなし 3、ミスはあったがヒントなしでやり直して正解 2、ヒントを使った 1
 */
export function starsFor({ mistakeCount, hintsUsed }) {
  if (hintsUsed > 0) return 1;
  if (mistakeCount > 0) return 2;
  return 3;
}
