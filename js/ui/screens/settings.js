// せってい画面（おとなの人向け。かんたんなロックつき）
import { h } from '../dom.js';
import { saveSettings, DEFAULT_SETTINGS } from '../../data/settings.js';
import { exportAll, importAll } from '../../data/db.js';
import { randInt, localDate } from '../../core/places.js';

export function render(root, ctx) {
  const a = randInt(102, 498);
  const b = randInt(13, 47);
  let unlocked = false;

  const back = () => ctx.navigate('#/home');
  const header = () => h('header', { class: 'topbar' },
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: back }, '← もどる'),
    h('div', { class: 'topbar-title' }, 'せってい'),
    h('div', {}));

  function drawLock(message = '') {
    const input = h('input', { class: 'lock-input', type: 'number', inputmode: 'numeric', 'aria-label': 'こたえ' });
    const check = () => {
      if (Number(input.value) === a * b) {
        unlocked = true;
        drawForm();
      } else {
        drawLock('ちがいます');
      }
    };
    root.replaceChildren(h('div', { class: 'screen screen-settings' }, header(),
      h('main', { class: 'settings-main' },
        h('div', { class: 'lock-card' },
          h('p', {}, 'おとなの人が 入力してください'),
          h('p', { class: 'lock-question' }, `${a} × ${b} = ?`),
          input,
          h('button', { class: 'btn btn-primary', type: 'button', onclick: check }, 'ひらく'),
          message ? h('p', { class: 'lock-error' }, message) : null))));
    input.focus();
  }

  function drawForm(message = '') {
    if (!unlocked) return;
    const s = { ...ctx.settings };
    const field = (label, control, note) => h('label', { class: 'field' },
      h('span', { class: 'field-label' }, label), control, note ? h('span', { class: 'field-note' }, note) : null);
    const select = (key, options) => h('select', { onchange: (e) => { s[key] = parseValue(options, e.target.value); } },
      options.map(([v, text]) => h('option', { value: String(v), selected: String(s[key]) === String(v) }, text)));
    const check = (key) => h('input', { type: 'checkbox', checked: !!s[key], onchange: (e) => { s[key] = e.target.checked; } });
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden-file', onchange: onImport });

    async function onSave() {
      ctx.settings = { ...ctx.settings, ...s };
      await saveSettings(ctx.settings);
      drawForm('ほぞん しました');
    }
    async function onExport() {
      const data = await exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = h('a', { href: url, download: `hissan-backup-${localDate()}.json` });
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    async function onImport(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!window.confirm('いまの データを けして、バックアップの 内容に もどします。よろしいですか？')) return;
      try {
        await importAll(JSON.parse(await file.text()));
        await ctx.reload();
        drawForm('バックアップから もどしました');
      } catch (err) {
        drawForm(`もどせませんでした：${err.message}`);
      }
    }

    root.replaceChildren(h('div', { class: 'screen screen-settings' }, header(),
      h('main', { class: 'settings-main' },
        message ? h('p', { class: 'settings-message' }, message) : null,
        h('section', { class: 'settings-card' },
          h('h2', {}, 'もんだい'),
          field('なまえ（ニックネーム）', h('input', { type: 'text', value: s.nickname, maxlength: '12', oninput: (e) => { s.nickname = e.target.value.trim() || DEFAULT_SETTINGS.nickname; } })),
          field('1セットの もんだい数', select('setSize', [[3, '3もん'], [5, '5もん'], [10, '10もん']])),
          field('0を ふくむ もんだいを まぜる数', select('zeroMix', [[0, 'まぜない'], [1, '1もん'], [2, '2もん'], [3, '3もん']]), 'ふつうの レベルの セットに まぜる数')),
        h('section', { class: 'settings-card' },
          h('h2', {}, 'ひっ算の 入力'),
          field('「かける数字は どれ？」を 聞く', select('askDigit', [['auto', 'なれたら はぶく（10回 れんぞく 正かいで）'], ['always', 'いつも 聞く'], ['never', '聞かない']]), 'E5（かける数字の とりちがえ）たいさく'),
          field('「どこから 書きはじめる？」を 聞く', select('askStartCol', [['auto', 'なれたら はぶく（0の もんだいでは いつも 聞く）'], ['always', 'いつも 聞く'], ['never', '聞かない']]), 'E4（位どりの ずれ）・Z3 たいさく'),
          field('2だんめ いこうの 右に うすい「0」、0の だんに 点線を 出す', check('showZeroGuide')),
          field('ヒントボタンを 出す', check('hintsEnabled')),
          field('こうか音', check('sound'))),
        h('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: onSave }, 'ほぞん する'),
        h('section', { class: 'settings-card' },
          h('h2', {}, 'データの バックアップ'),
          h('p', { class: 'field-note' }, '学しゅうの きろくは この iPad の 中だけに ほぞん されます。ときどき バックアップ してください。'),
          h('div', { class: 'settings-buttons' },
            h('button', { class: 'btn btn-secondary', type: 'button', onclick: onExport }, 'バックアップを 書き出す'),
            h('button', { class: 'btn btn-secondary', type: 'button', onclick: () => fileInput.click() }, 'バックアップから もどす'),
            fileInput)))));
  }

  drawLock();
}

function parseValue(options, raw) {
  const hit = options.find(([v]) => String(v) === raw);
  return hit ? hit[0] : raw;
}
