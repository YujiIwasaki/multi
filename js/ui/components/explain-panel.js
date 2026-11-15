// ヒント・解説・ほめ言葉のパネル（設計書 7章）
import { h } from '../dom.js';

/**
 * @param {null|{type:'hint', text:string}|{type:'explain', title:string, lines:string[], extra?:string, button?:{label:string, onclick:Function}}|{type:'praise', title:string, lines:string[], button:{label:string, onclick:Function}}} panel
 */
export function renderPanel(panel) {
  if (!panel) return h('div', { class: 'panel panel-empty', 'aria-live': 'polite' });

  if (panel.type === 'hint') {
    return h('div', { class: 'panel panel-hint', 'aria-live': 'polite' },
      h('div', { class: 'panel-title' }, 'ヒント'),
      h('p', {}, panel.text));
  }

  const cls = panel.type === 'praise' ? 'panel-praise' : 'panel-explain';
  return h('div', { class: `panel ${cls}`, 'aria-live': 'polite' },
    h('div', { class: 'panel-title' }, panel.title),
    panel.lines.map((line) => h('p', {}, line)),
    panel.extra ? h('p', { class: 'panel-extra' }, panel.extra) : null,
    panel.button ? h('button', { class: 'btn btn-primary panel-btn', type: 'button', onclick: panel.button.onclick }, panel.button.label) : null);
}
