// ホーム画面
import { h } from '../dom.js';

export function render(root, ctx) {
  const { settings, progress } = ctx;
  root.replaceChildren(h('div', { class: 'screen screen-home' },
    ctx.updateReady
      ? h('button', { class: 'update-banner', type: 'button', onclick: () => ctx.applyUpdate() }, 'あたらしい バージョンが あります（ここを タップ）')
      : null,
    h('div', { class: 'home-card' },
      h('h1', { class: 'app-title' }, 'かけ算 ひっ算 トレーナー'),
      h('p', { class: 'greeting' }, `${settings.nickname}、きょうも がんばろう！`),
      h('div', { class: 'home-stats' },
        h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, `★ ${progress.stars}`), h('div', { class: 'stat-label' }, 'あつめた スター')),
        h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, `${progress.streak}日`), h('div', { class: 'stat-label' }, 'れんぞく 学しゅう'))),
      h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: () => ctx.navigate('#/level') }, 'はじめる')),
    h('button', { class: 'btn btn-ghost settings-link', type: 'button', onclick: () => ctx.navigate('#/settings') }, '⚙ せってい（おとなの人）')));
}
