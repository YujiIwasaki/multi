// スター・連続日数・選択ステップの習熟（設計書 8章、仕様 4.5）
// レベルは最初からすべて選べるので、解放のしくみは持たない
import { getValue, putValue } from './db.js';
import { localDate } from '../core/places.js';

const AUTO_SKIP_AFTER = 10; // 選択ステップを10回つづけて正解したら省略
const RECENT_WINDOW = 10; // レベルごとに直近10問の正誤を表示用に残す
const RECENT_KEYS = 50; // 直近50問とは重ならないようにする

export const DEFAULT_PROGRESS = {
  stars: 0,
  streak: 0,
  lastDate: null,
  recent: {}, // levelId → [true, false, ...]（新しいものが最後）
  promptStreak: { digit: 0, startCol: 0 },
  recentKeys: [],
};

export async function loadProgress() {
  const saved = (await getValue('progress', 'main')) ?? {};
  return { ...structuredClone(DEFAULT_PROGRESS), ...saved };
}

export async function saveProgress(p) {
  await putValue('progress', 'main', p);
}

/**
 * 1問の結果を反映する
 * @param {string} setLevel セットのレベル（混ぜた0の問題もセットのレベルとして数える）
 */
export function applyProblemResult(progress, { setLevel, correct, stars, key }) {
  progress.stars += stars;
  progress.recentKeys = [...progress.recentKeys, key].slice(-RECENT_KEYS);
  progress.recent[setLevel] = [...(progress.recent[setLevel] ?? []), correct].slice(-RECENT_WINDOW);
}

/** 連続学習日数を更新する */
export function touchStreak(progress, today = localDate()) {
  if (progress.lastDate === today) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  progress.streak = progress.lastDate === localDate(y) ? progress.streak + 1 : 1;
  progress.lastDate = today;
}

/** いまの問題で選択ステップを出すか（設計書 4.5） */
export function promptPolicy(settings, progress, problem) {
  const decide = (mode, streak) => (mode === 'always' ? true : mode === 'never' ? false : streak < AUTO_SKIP_AFTER);
  return {
    askDigit: decide(settings.askDigit, progress.promptStreak.digit),
    // 0を含む問題では「書きはじめの位」をいつも聞く（Z3対策）
    askStartCol: settings.askStartCol !== 'never' && (problem.isZero || decide(settings.askStartCol, progress.promptStreak.startCol)),
  };
}

/** 選択ステップの正誤を記録する（まちがえたら連続正解数を0に戻す） */
export function recordPrompt(progress, type, ok) {
  const k = type === 'chooseDigit' ? 'digit' : 'startCol';
  progress.promptStreak[k] = ok ? progress.promptStreak[k] + 1 : 0;
}
