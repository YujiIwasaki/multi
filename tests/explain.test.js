import { test, ok } from './runner.js';
import { buildLayout } from '../js/core/layout.js';
import { diagnose } from '../js/core/diagnosis.js';
import { explain, hintFor } from '../js/core/explain.js';

const bad = (s) => /undefined|NaN|null|\{|\}/.test(s);
const PROBLEMS = [[47, 36], [305, 8], [305, 208], [386, 204], [450, 30], [47, 30], [320, 150], [386, 240], [258, 47], [999, 999]];

test('explain: すべてのステップ・すべての誤った入力で、解説とヒントの文が壊れていない', () => {
  for (const [a, b] of PROBLEMS) {
    const l = buildLayout(a, b);
    for (const step of l.steps) {
      for (let lv = 1; lv <= 3; lv += 1) {
        const h = hintFor(step, lv, l);
        ok(h.text && !bad(h.text), `${a}×${b} ヒント${lv}: ${h.text}`);
      }
      const max = step.type === 'cell' ? 9 : l.meta.answerLen - 1;
      for (let x = 0; x <= max; x += 1) {
        if (step.type === 'cell' && l.cellById.get(step.cellId).expected === x) continue;
        if (step.type !== 'cell' && step.answer === x) continue;
        const { code, detail } = diagnose(step, x, l);
        const e = explain(code, detail, l);
        const text = [e.title, ...e.lines].join(' ');
        ok(!bad(text), `${a}×${b} ${code}: ${text}`);
        e.visuals.forEach((v) => v.targets.forEach((t) => ok(!bad(t), `${code} target ${t}`)));
      }
    }
  }
});
