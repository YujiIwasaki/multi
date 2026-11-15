// ひっ算のマス目（Cell）と入力手順（Step）を作る（設計書 4章）
// 数は書いたとおりに右（一の位）をそろえて並べ、末尾の0も特別あつかいせずにそのまま計算する。
// 掛ける数の0の段は省略する（仕様の決定事項）。掛ける数の一の位が0のときは、
// 答えの右の位に 0 を書く（「0を下ろす」マス）。
import { digitsOf } from './places.js';

/**
 * @param {number} a 掛けられる数
 * @param {number} b 掛ける数
 * @param {Object} [opt]
 * @param {boolean} [opt.carryInput=true]  くり上がりマスを作るか（アプリでは false：くり上がりは暗算）
 * @param {boolean} [opt.askDigit=true]    各段で「かける数字」を選ばせるか（E5対策）
 * @param {boolean} [opt.askStartCol=true] 書きはじめが一の位でない段で「書きはじめの位」を選ばせるか（E4対策）
 */
export function buildLayout(a, b, opt = {}) {
  const { carryInput = true, askDigit = true, askStartCol = true } = opt;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) {
    throw new Error(`正の整数ではありません: ${a} × ${b}`);
  }

  const aD = digitsOf(a);
  const bD = digitsOf(b);
  const answer = a * b;
  const answerLen = String(answer).length;

  const cells = [];
  const rows = [];
  const skippedJs = [];
  const rowCells = []; // 段ごとの入力順のマス

  // --- 部分積の段 -------------------------------------------------------
  bD.forEach((bj, j) => {
    if (bj === 0) {
      skippedJs.push(j); // 0の段は省略
      return;
    }
    const row = rows.length;
    const order = [];
    let carry = 0;
    aD.forEach((ai, i) => {
      const v = ai * bj + carry;
      const src = { i, j, ai, bj, carryIn: carry, value: v };
      const col = i + j;
      order.push(addCell({ id: `r${row}-c${col}`, kind: 'partial', row, col, expected: v % 10, src: { ...src, digitPos: 0 } }));
      const isLast = i === aD.length - 1;
      if (!isLast) {
        const next = Math.floor(v / 10);
        if (carryInput && next > 0) {
          order.push(addCell({ id: `k${row}-c${col + 1}`, kind: 'carry', row, col: col + 1, expected: next, src }));
        }
        carry = next;
      } else if (v >= 10) {
        order.push(addCell({ id: `r${row}-c${col + 1}`, kind: 'partial', row, col: col + 1, expected: Math.floor(v / 10), src: { ...src, digitPos: 1 } }));
      }
    });
    rows.push({ row, j, bj, startCol: j, value: a * bj });
    rowCells.push(order);
  });

  // 掛ける数の右に続く0の個数（＝最初の段の書きはじめの位）。答えのその位には 0 を書く
  const lead = rows[0].startCol;

  // --- 最後の足し算（段が2つ以上のとき） ---------------------------------
  const sumOrder = [];
  const hasSum = rows.length >= 2;
  if (hasSum) {
    const byCol = new Map();
    cells.filter((c) => c.kind === 'partial').forEach((c) => {
      if (!byCol.has(c.col)) byCol.set(c.col, []);
      byCol.get(c.col).push(c.expected);
    });
    const maxCol = Math.max(...byCol.keys());
    let carry = 0;
    for (let col = lead; col <= maxCol || carry > 0; col += 1) {
      const addends = byCol.get(col) ?? [];
      const value = addends.reduce((s, x) => s + x, 0) + carry;
      sumOrder.push(addCell({ id: `s-c${col}`, kind: 'sum', row: -1, col, expected: value % 10, src: { col, addends, carryIn: carry, value } }));
      const next = Math.floor(value / 10);
      if (carryInput && next > 0) {
        sumOrder.push(addCell({ id: `sk-c${col + 1}`, kind: 'sumCarry', row: -1, col: col + 1, expected: next, src: { col, addends, carryIn: carry, value } }));
      }
      carry = next;
    }
  }

  // --- 掛ける数の一の位が0のとき、答えの右の位に 0 を書くマス -------------------
  const zeroOrder = [];
  for (let col = 0; col < lead; col += 1) {
    zeroOrder.push(addCell({ id: `z-c${col}`, kind: 'zeroTail', row: hasSum ? -1 : 0, col, expected: 0, src: { col, lead } }));
  }

  // --- 入力手順 ----------------------------------------------------------
  const steps = [];
  rows.forEach((r, idx) => {
    if (askDigit && bD.length >= 2) steps.push({ type: 'chooseDigit', row: r.row, answer: r.j });
    if (askStartCol && r.j > 0) steps.push({ type: 'chooseStartCol', row: r.row, answer: r.startCol });
    rowCells[idx].forEach((c) => steps.push({ type: 'cell', row: r.row, cellId: c.id }));
  });
  sumOrder.forEach((c) => steps.push({ type: 'cell', row: -1, cellId: c.id }));
  zeroOrder.forEach((c) => steps.push({ type: 'cell', row: c.row, cellId: c.id }));

  // --- 表示用の数字の位置（右の一の位をそろえる） -----------------------------
  const aCells = aD.map((d, i) => ({ col: i, digit: d, i }));
  const bCells = bD.map((d, j) => ({ col: j, digit: d, j }));

  const layout = {
    cells,
    cellById: new Map(cells.map((c) => [c.id, c])),
    steps,
    meta: { a, b, aDigits: aD, bDigits: bD, aCells, bCells, rows, skippedJs, lead, hasSum, answer, answerLen },
  };

  // --- 検算：マスから組み立てた答えが a×b と一致するか ---------------------
  const built = assembleAnswer(layout);
  if (built !== answer) {
    throw new Error(`レイアウトの検算に失敗: ${a} × ${b} = ${answer} だが ${built} になった`);
  }
  return layout;

  function addCell(c) {
    cells.push(c);
    return c;
  }
}

/** 答えの行（足し算の行、段が1つならその段）と、右に書く0から答えを組み立てる */
export function assembleAnswer(layout) {
  const { meta, cells } = layout;
  const isAnswer = (c) => (meta.hasSum ? c.kind === 'sum' : c.kind === 'partial') || c.kind === 'zeroTail';
  return cells.filter(isAnswer).reduce((s, c) => s + c.expected * 10 ** c.col, 0);
}
