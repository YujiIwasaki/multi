// ひっ算のマス目を描く（設計書 9.2・9.3）
// 各要素は data-t に「名前」を持ち（a:1 / b:0 / cell:r0-c1 / col:2 / slot:3 / ghost:1 など）、
// 強調表示や解説の演出はその名前を使って class を付ける。
import { h } from '../dom.js';

/**
 * @param {Object} layout buildLayout の結果
 * @param {Object} v 表示の状態
 * @param {Object|null} v.step いまのステップ
 * @param {Map<string,{value:number, fixed:boolean, revealed:boolean}>} v.entered 入力済みのマス
 * @param {Set<string>} v.visible 表示するマスの id
 * @param {Set<number>} v.startedRows 書きはじめた段
 * @param {Set<number>} v.guideRows 右の薄い「0」を出す段
 * @param {boolean} v.showZeroGuide
 * @param {{cellId?:string, slot?:number, digit?:number, value?:number}|null} v.wrong まちがえた直後の表示
 * @param {Map<string,string[]>} v.marks 名前 → 付ける class
 * @param {(col:number)=>void} v.onSlot
 * @param {(j:number)=>void} v.onPickDigit
 */
export function renderGrid(layout, v) {
  const { meta, cells } = layout;
  const cols = meta.answerLen + 1;
  const gc = (col) => ({ gridColumn: String(cols - col) });
  const step = v.step;
  const activeRow = step && step.row >= 0 && step.type === 'cell' ? step.row : (step ? step.row : null);

  const line = (cls, children, extra = {}) => h('div', { class: `line ${cls}`, ...extra }, children);

  const cellEl = (c) => {
    const e = v.entered.get(c.id);
    const isActive = step && step.type === 'cell' && step.cellId === c.id;
    const isWrong = v.wrong && v.wrong.cellId === c.id;
    const small = c.kind === 'carry' || c.kind === 'sumCarry';
    const cls = ['cell', small ? 'cell-small' : '', isActive ? 'is-active' : '',
      e ? (e.revealed ? 'is-revealed' : e.fixed ? 'is-fixed' : 'is-ok') : '',
      isWrong ? 'is-wrong' : ''].filter(Boolean).join(' ');
    const text = e ? String(e.value) : isWrong ? String(v.wrong.value) : '';
    const names = [`cell:${c.id}`];
    if (!small) names.push(`col:${c.col}`);
    return h('div', { class: cls, style: gc(c.col), 'data-t': names.join(' ') }, text);
  };

  const visibleOf = (pred) => cells.filter((c) => pred(c) && v.visible.has(c.id)).map(cellEl);
  const lines = [];

  // 1. くり上がりの行（くり上がりマスを作ったときだけ。いま書いている段のぶんだけ出す）
  if (cells.some((c) => c.kind === 'carry')) {
    lines.push(line('line-small', visibleOf((c) => c.kind === 'carry' && c.row === activeRow)));
  }

  // 2. 掛けられる数
  lines.push(line('line-num', meta.aCells.map((d) => h('div', {
    class: `num${d.zero !== undefined ? ' num-zero' : ''}`,
    style: gc(d.col),
    'data-t': d.zero !== undefined ? `az:${d.zero}` : `a:${d.i}`,
  }, String(d.digit)))));

  // 3. ×と掛ける数（「かける数字をえらぶ」ときはボタンになる）
  const picking = step && step.type === 'chooseDigit';
  lines.push(line('line-num', [
    h('div', { class: 'num sign', style: { gridColumn: '1' } }, '×'),
    ...meta.bCells.map((d) => {
      const isCore = d.j !== undefined;
      const names = isCore ? `b:${d.j}` : `bz:${d.zero}`;
      const isWrong = v.wrong && v.wrong.digit === d.j && isCore;
      if (picking && isCore) {
        return h('button', {
          class: `num pick${isWrong ? ' is-wrong' : ''}`, type: 'button', style: gc(d.col), 'data-t': names,
          'aria-label': `${d.digit} を えらぶ`,
          onpointerdown: (e) => { e.preventDefault(); v.onPickDigit(d.j); },
        }, String(d.digit));
      }
      return h('div', { class: `num${isCore ? '' : ' num-zero'}`, style: gc(d.col), 'data-t': names }, String(d.digit));
    }),
  ]));

  lines.push(h('div', { class: 'rule' }));

  // 4. 部分積の段（0の段は点線で「とばす」と表示）
  meta.bDigits.forEach((bj, j) => {
    if (bj === 0) {
      if (meta.rows.length >= 2 && v.showZeroGuide) {
        lines.push(line('line-ghost', h('div', { class: 'ghost-label', style: { gridColumn: `1 / span ${cols}` } }, '0の だんは とばす'), { 'data-t': `ghost:${j}` }));
      }
      return;
    }
    const r = meta.rows.find((x) => x.j === j);
    const children = [];
    if (step && step.type === 'chooseStartCol' && step.row === r.row) {
      for (let col = 0; col < meta.answerLen; col += 1) {
        const isWrong = v.wrong && v.wrong.slot === col;
        children.push(h('button', {
          class: `slot${isWrong ? ' is-wrong' : ''}`, type: 'button', style: gc(col), 'data-t': `slot:${col}`,
          'aria-label': `右から ${col + 1}ばんめの マス`,
          onpointerdown: (e) => { e.preventDefault(); v.onSlot(col); },
        }));
      }
    } else if (v.startedRows.has(r.row)) {
      if (v.guideRows.has(r.row) && v.showZeroGuide) {
        for (let col = meta.tz; col < r.startCol; col += 1) {
          children.push(h('div', { class: 'guide', style: gc(col), 'data-t': `slot:${col}` }, '0'));
        }
      }
      children.push(...visibleOf((c) => c.kind === 'partial' && c.row === r.row));
      if (!meta.hasSum) children.push(...visibleOf((c) => c.kind === 'zeroTail'));
    } else {
      // まだ書いていない段：「書きはじめの位」を示す場所だけ用意（解説の演出用）
      children.push(h('div', { class: 'slot-ghost', style: gc(r.startCol), 'data-t': `slot:${r.startCol}` }));
    }
    lines.push(line(`line-row${step && step.row === r.row ? ' is-current' : ''}`, children));
  });

  // 5. 最後の足し算
  if (meta.hasSum) {
    if (cells.some((c) => c.kind === 'sumCarry')) lines.push(line('line-small', visibleOf((c) => c.kind === 'sumCarry')));
    lines.push(h('div', { class: 'rule' }));
    lines.push(line('line-row line-sum', visibleOf((c) => c.kind === 'sum' || c.kind === 'zeroTail')));
  }

  const grid = h('div', { class: 'hissan' }, lines);
  grid.style.setProperty('--cols', String(cols)); // すべての行で同じ列幅にそろえる

  // 強調表示・演出
  for (const [target, classes] of v.marks) {
    grid.querySelectorAll(`[data-t~="${target}"]`).forEach((el) => el.classList.add(...classes));
  }
  return grid;
}
