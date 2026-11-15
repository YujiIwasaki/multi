// レベルえらび画面
import { h } from '../dom.js';
import { LEVELS } from '../../core/generator.js';
import { startSession } from '../session.js';

export function render(root, ctx) {
  const { settings, progress } = ctx;

  const card = (lv) => {
    const recent = progress.recent[lv.id] ?? [];
    const okCount = recent.filter(Boolean).length;
    return h('button', {
      class: `level-card${lv.group === 'zero' ? ' is-zero' : ''}`,
      type: 'button',
      onclick: () => startSession(ctx, lv.id),
    },
    h('div', { class: 'level-name' }, lv.name),
    h('div', { class: 'level-desc' }, lv.desc),
    h('div', { class: 'level-example' }, `れい：${lv.example}`),
    recent.length ? h('div', { class: 'level-progress' }, `さいきん ${recent.length}もん中 ${okCount}もん かんぺき`) : null);
  };

  root.replaceChildren(h('div', { class: 'screen screen-level' },
    h('header', { class: 'topbar' },
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => ctx.navigate('#/home') }, '← もどる'),
      h('div', { class: 'topbar-title' }, 'レベルを えらぼう'),
      h('div', { class: 'topbar-stars' }, `★ ${progress.stars}`)),
    h('main', { class: 'level-main' },
      h('h2', { class: 'level-group-title' }, 'ふつうの もんだい'),
      h('p', { class: 'level-note' }, `1セット ${settings.setSize}もん。0が 入った もんだいも ${settings.zeroMix}もん まざるよ`),
      h('div', { class: 'level-grid' }, LEVELS.filter((l) => l.group === 'normal').map(card)),
      h('h2', { class: 'level-group-title' }, '0の とっくん コース'),
      h('p', { class: 'level-note' }, '0が 入った かけ算を じゅんばんに れんしゅう しよう'),
      h('div', { class: 'level-grid' }, LEVELS.filter((l) => l.group === 'zero').map(card)))));
}
