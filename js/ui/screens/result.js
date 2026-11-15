// けっか画面
import { h } from '../dom.js';
import { startSession } from '../session.js';

/** 誤りの種類ごとの、次につながる一言 */
const TIPS = {
  E1: '九九を もう一度 たしかめよう',
  E2: 'くり上がりを おぼえておいて、わすれずに たそう',
  E3: 'かけてから、くり上がりを たそう',
  E4: '2だんめは 1つ 左に ずらして 書きはじめよう',
  E5: 'いま かけるのは どの 数字か、たしかめてから 書こう',
  E6: 'さいごの たし算も くり上がりに 気を つけよう',
  Z1: '0に なにを かけても 0 だよ',
  Z2: '0の ところでも くり上がりを たそう',
  Z3: '0の だんを とばしたら、つぎの だんは 2つ 左から',
  Z4: 'さいごに 0の かずを たしかめよう',
};

export function render(root, ctx) {
  const r = ctx.lastResult;
  if (!r) {
    ctx.navigate('#/home');
    return;
  }
  const results = r.results;
  const perfect = results.filter((x) => x.correct).length;
  const stars = results.reduce((s, x) => s + x.stars, 0);
  const counts = {};
  results.forEach((x) => x.codes.forEach((c) => { counts[c] = (counts[c] ?? 0) + 1; }));
  const tips = Object.entries(counts).filter(([c]) => TIPS[c]).sort((a, b) => b[1] - a[1]).slice(0, 3);

  root.replaceChildren(h('div', { class: 'screen screen-result' },
    h('div', { class: 'result-card' },
      h('h1', {}, perfect === results.length ? 'ぜんぶ かんぺき！' : 'おつかれさま！'),
      h('div', { class: 'result-stats' },
        h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, `${perfect} / ${results.length}`), h('div', { class: 'stat-label' }, 'かんぺきに とけた')),
        h('div', { class: 'stat' }, h('div', { class: 'stat-value' }, `★ ${stars}`), h('div', { class: 'stat-label' }, 'ゲットした スター'))),
      tips.length
        ? h('div', { class: 'result-tips' }, h('h2', {}, 'つぎに 気を つけること'), h('ul', {}, tips.map(([c]) => h('li', {}, TIPS[c]))))
        : null,
      h('div', { class: 'result-buttons' },
        h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: () => startSession(ctx, r.level) }, 'もう1セット'),
        h('button', { class: 'btn btn-secondary btn-big', type: 'button', onclick: () => ctx.navigate('#/home') }, 'おわる')))));
}
