// ひっ算もんだい画面（設計書 6.1・9.2）
import { h } from '../dom.js';
import { sound } from '../sound.js';
import { renderGrid } from '../components/grid.js';
import { renderKeypad } from '../components/keypad.js';
import { renderPanel } from '../components/explain-panel.js';
import { renderInstruction } from '../components/prompt.js';
import { buildLayout } from '../../core/layout.js';
import { judgeStep, starsFor } from '../../core/judge.js';
import { diagnose, FOCUS_CODES } from '../../core/diagnosis.js';
import { explain, hintFor } from '../../core/explain.js';
import { similarProblem, keyOf } from '../../core/generator.js';
import { placeName, localDate } from '../../core/places.js';
import { promptPolicy, recordPrompt, applyProblemResult, saveProgress, touchStreak } from '../../data/progress.js';
import { addRecord, updateRecord } from '../../data/db.js';

const VISUAL_CLASS = { highlight: 'vx-hl', blink: 'vx-blink', dim: 'vx-dim', link: 'vx-link' };

export function render(root, ctx) {
  const { settings, progress } = ctx;
  const session = ctx.session;
  if (!session) {
    ctx.navigate('#/home');
    return undefined;
  }
  sound.enabled = settings.sound;
  const set = session.problems;

  // --- 状態 ---------------------------------------------------------------
  let p; // いまの問題
  let layout;
  let stepIdx;
  let entered; // cellId → { value, fixed, revealed }
  let visible; // 表示するマス
  let startedRows; // 書きはじめた段
  let guideRows; // 右の薄い「0」を出す段
  let attempts; // いまのステップでまちがえた回数
  let hintLevel; // いまのステップで見たヒントの段階
  let rec; // この問題の記録
  let panel = null;
  let wrong = null;
  let visuals = [];
  let busy = false;
  let wrongTimer = null;

  const step = () => layout.steps[stepIdx] ?? null;
  const expectedOf = (s) => (s.type === 'cell' ? layout.cellById.get(s.cellId).expected : s.answer);
  const answerLabel = (s) => {
    if (s.type === 'cell') return String(expectedOf(s));
    if (s.type === 'chooseDigit') return `${layout.meta.bDigits[s.answer]}`;
    return `${placeName(s.answer)}の位`;
  };

  function startProblem() {
    p = set[session.index];
    const policy = promptPolicy(settings, progress, p);
    // くり上がりは暗算する前提なので、くり上がりマスは作らない
    layout = buildLayout(p.a, p.b, { carryInput: false, ...policy });
    stepIdx = 0;
    entered = new Map();
    visible = new Set();
    startedRows = new Set();
    guideRows = new Set();
    rec = { mistakes: [], hintsUsed: 0, codes: new Set(), start: Date.now() };
    panel = null;
    busy = false;
    enterStep();
  }

  function enterStep() {
    attempts = 0;
    hintLevel = 0;
    wrong = null;
    visuals = [];
    const s = step();
    if (!s) {
      finishProblem();
      return;
    }
    if (s.type === 'cell') {
      visible.add(s.cellId);
      if (s.row >= 0) {
        startedRows.add(s.row);
        if (layout.meta.rows[s.row].j > 0) guideRows.add(s.row);
      }
    }
    draw();
  }

  /** 正しく答えた（または答えを見た）ので次のステップへ */
  function commit(s, revealed, panelAfter = null) {
    if (s.type === 'cell') {
      entered.set(s.cellId, { value: expectedOf(s), fixed: attempts > 0 && !revealed, revealed });
    }
    stepIdx += 1;
    panel = panelAfter;
    enterStep();
  }

  function flashWrong(w) {
    wrong = w;
    clearTimeout(wrongTimer);
    wrongTimer = setTimeout(() => {
      wrong = null;
      draw();
    }, 900);
  }

  // --- 入力 ---------------------------------------------------------------
  function onInput(value) {
    if (busy) return;
    const s = step();
    if (!s) return;
    const correct = judgeStep(s, value, layout);
    if (s.type !== 'cell') recordPrompt(progress, s.type, correct);
    if (correct) {
      sound.ok();
      commit(s, false);
      return;
    }

    attempts += 1;
    sound.ng();
    const { code, detail } = diagnose(s, value, layout);
    if (attempts === 1) {
      rec.mistakes.push({ stepIndex: stepIdx, cellId: s.cellId ?? null, input: value, expected: expectedOf(s), code });
      rec.codes.add(code);
    }
    flashWrong(s.type === 'cell' ? { cellId: s.cellId, value } : s.type === 'chooseDigit' ? { digit: value } : { slot: value });

    const exp = explain(code, detail, layout);
    const lines = exp.lines.length ? exp.lines : [hintFor(s, 1, layout).text];
    visuals = exp.visuals;

    if (attempts >= 3) {
      // 3回目：答えを見せて進む（ヒント3段階目と同じ扱い）
      rec.hintsUsed += 1;
      busy = true;
      panel = {
        type: 'explain', title: exp.title, lines, extra: `こたえは ${answerLabel(s)} だよ`,
        button: { label: 'つぎへ', onclick: () => { busy = false; commit(s, true); } },
      };
    } else {
      let extra = attempts === 1 ? 'もう いちど やってみよう' : null;
      if (attempts === 2 && settings.hintsEnabled) {
        // 2回目：ヒントを1段階自動で上げる（答えは見せない）
        hintLevel = Math.min(2, hintLevel + 1);
        extra = `ヒント：${hintFor(s, hintLevel, layout).text}`;
      }
      panel = { type: 'explain', title: exp.title, lines, extra };
    }
    draw();
  }

  function onHint() {
    if (busy || !settings.hintsEnabled) return;
    const s = step();
    if (!s) return;
    hintLevel = Math.min(3, hintLevel + 1);
    rec.hintsUsed += 1;
    const hint = hintFor(s, hintLevel, layout);
    if (hint.reveal) {
      commit(s, true, { type: 'hint', text: `こたえは ${answerLabel(s)} だよ` });
      return;
    }
    panel = { type: 'hint', text: hint.text };
    visuals = [{ type: 'highlight', targets: hint.targets }];
    draw();
  }

  // --- 1問おわり ------------------------------------------------------------
  async function finishProblem() {
    busy = true;
    const mistakeCount = rec.mistakes.length;
    const stars = starsFor({ mistakeCount, hintsUsed: rec.hintsUsed });
    const correct = mistakeCount === 0 && rec.hintsUsed === 0;
    const key = keyOf(p.a, p.b);
    const codes = [...rec.codes];
    applyProblemResult(progress, { setLevel: session.level, correct, stars, key });
    session.results.push({ a: p.a, b: p.b, level: p.level, correct, stars, codes, hintsUsed: rec.hintsUsed, isFollowUp: !!p.isFollowUp });

    // 重点の誤りがあったら、同じ型の類題を次に1問入れる（類題の類題は出さない）
    let follow = null;
    if (!p.isFollowUp) {
      const focus = codes.find((c) => FOCUS_CODES.includes(c));
      if (focus) {
        const exclude = new Set([...progress.recentKeys, ...set.map((q) => keyOf(q.a, q.b))]);
        follow = similarProblem(focus, p, exclude);
        set.splice(session.index + 1, 0, follow);
      }
    }

    if (correct) sound.clear();
    const isLast = session.index + 1 >= set.length;
    panel = {
      type: 'praise',
      title: correct ? 'かんぺき！' : 'できたね！',
      lines: [`${p.a} × ${p.b} = ${p.a * p.b}`, `★ ${stars}こ ゲット`, follow ? 'つぎは にた もんだいで たしかめよう' : null].filter(Boolean),
      button: { label: isLast ? 'けっかを 見る' : 'つぎの もんだい', onclick: next },
    };
    draw();

    try {
      if (!session.id) session.id = await addRecord('sessions', { level: session.level, startedAt: session.startedAt, finished: false });
      await addRecord('attempts', {
        sessionId: session.id,
        date: localDate(),
        startedAt: rec.start,
        durationMs: Date.now() - rec.start,
        level: p.level,
        a: p.a,
        b: p.b,
        correct,
        hintsUsed: rec.hintsUsed,
        codes,
        mistakes: rec.mistakes,
        isFollowUp: !!p.isFollowUp,
      });
      await saveProgress(progress);
    } catch (e) {
      console.error('記録の保存に失敗しました', e);
    }
  }

  async function next() {
    busy = false;
    session.index += 1;
    if (session.index < set.length) {
      startProblem();
      return;
    }
    // セットおわり
    touchStreak(progress);
    const results = session.results;
    try {
      await updateRecord('sessions', {
        id: session.id,
        level: session.level,
        startedAt: session.startedAt,
        endedAt: Date.now(),
        finished: true,
        count: results.length,
        correctCount: results.filter((r) => r.correct).length,
        stars: results.reduce((s, r) => s + r.stars, 0),
      });
      await saveProgress(progress);
    } catch (e) {
      console.error('記録の保存に失敗しました', e);
    }
    ctx.lastResult = session;
    ctx.session = null;
    ctx.navigate('#/result');
  }

  async function quit() {
    if (!window.confirm('とちゅうで やめる？（ここまでの スターは のこるよ）')) return;
    await saveProgress(progress);
    ctx.session = null;
    ctx.navigate('#/home');
  }

  // --- 描画 ---------------------------------------------------------------
  function marks() {
    const m = new Map();
    const add = (t, c) => {
      if (!m.has(t)) m.set(t, []);
      m.get(t).push(c);
    };
    const s = step();
    if (s && s.type === 'cell') {
      const c = layout.cellById.get(s.cellId);
      if (c.kind === 'partial' || c.kind === 'carry') {
        add(`a:${c.src.i}`, 'hl-a'); // 今かけている2つの数字（E5対策）
        add(`b:${c.src.j}`, 'hl-b');
      }
      if (c.kind === 'sum' || c.kind === 'sumCarry') add(`col:${c.src.col}`, 'hl-col');
    }
    visuals.forEach((v) => v.targets.forEach((t) => add(t, VISUAL_CLASS[v.type] ?? 'vx-hl')));
    return m;
  }

  function draw() {
    const s = step();
    const grid = renderGrid(layout, {
      step: busy && panel && panel.type === 'praise' ? null : s,
      entered, visible, startedRows, guideRows,
      showZeroGuide: settings.showZeroGuide,
      wrong,
      marks: marks(),
      onSlot: (col) => onInput(col),
      onPickDigit: (j) => onInput(j),
    });
    const keypadDisabled = busy || !s || s.type !== 'cell';
    root.replaceChildren(h('div', { class: 'screen screen-problem' },
      h('header', { class: 'topbar' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: quit }, '← やめる'),
        h('div', { class: 'topbar-title' },
          `もんだい ${session.index + 1} / ${set.length}`,
          p.isFollowUp ? h('span', { class: 'badge' }, 'にた もんだい') : null),
        h('div', { class: 'topbar-stars', 'aria-label': `スター ${progress.stars}こ` }, `★ ${progress.stars}`)),
      h('main', { class: 'problem-main' },
        h('section', { class: 'grid-area' }, grid),
        h('aside', { class: 'side' },
          renderInstruction(busy && panel && panel.type === 'praise' ? null : s, layout),
          renderPanel(panel),
          renderKeypad({ onDigit: onInput, disabled: keypadDisabled }),
          settings.hintsEnabled
            ? h('button', { class: 'btn btn-hint', type: 'button', disabled: busy || !s, onclick: onHint }, hintLevel > 0 ? `ヒント（${hintLevel}/3）` : 'ヒント')
            : null))));
  }

  startProblem();
  return () => clearTimeout(wrongTimer);
}
