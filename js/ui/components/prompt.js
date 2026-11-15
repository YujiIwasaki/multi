// いま何をするかの案内文（選択ステップの問いかけを含む）
import { h } from '../dom.js';

export function instructionText(step, layout) {
  if (!step) return 'できたね！';
  const rowName = step.row >= 0 ? `${step.row + 1}だんめ` : '';
  if (step.type === 'chooseDigit') return `${rowName}で かける 数字は どれ？ 下の 数の 数字を タップしよう`;
  if (step.type === 'chooseStartCol') return `${rowName}は どこから 書きはじめる？ いちばん 右の 数字を 書く マスを タップしよう`;
  const cell = layout.cellById.get(step.cellId);
  switch (cell.kind) {
    case 'partial': return `${rowName}：あおい わくに 数字を 入れよう`;
    case 'carry': return 'くり上がりを 小さい マスに 書こう';
    case 'sum': return 'たてに たして、答えを 書こう';
    case 'sumCarry': return 'たし算の くり上がりを 小さい マスに 書こう';
    case 'zeroTail': return 'さいごの マスを うめよう';
    default: return '';
  }
}

export function renderInstruction(step, layout) {
  const choosing = step && step.type !== 'cell';
  return h('div', { class: `instruction${choosing ? ' is-choose' : ''}` }, instructionText(step, layout));
}
