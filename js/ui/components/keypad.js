// 数字キーパッド（設計書 9.2）
import { h } from '../dom.js';

/**
 * @param {Object} o
 * @param {(n:number)=>void} o.onDigit
 * @param {boolean} [o.disabled]
 */
export function renderKeypad({ onDigit, disabled = false }) {
  const key = (n) => h('button', {
    class: `key${n === 0 ? ' key-zero' : ''}`,
    type: 'button',
    disabled,
    'aria-label': String(n),
    onpointerdown: (e) => {
      e.preventDefault(); // 押した瞬間に反応させ、ダブルタップ拡大を防ぐ
      if (!disabled) onDigit(n);
    },
  }, String(n));
  return h('div', { class: `keypad${disabled ? ' is-disabled' : ''}` },
    [7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map(key));
}
