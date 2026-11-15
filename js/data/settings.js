// 設定の既定値と読み書き（設計書 8.1）
import { getValue, putValue } from './db.js';

export const DEFAULT_SETTINGS = {
  nickname: 'きみ',
  setSize: 5, // 1セットの問題数（3 / 5 / 10）
  zeroMix: 2, // 通常セットに混ぜる0の問題数（0〜3）
  askDigit: 'auto', // 'auto'（習熟で省略）/ 'always' / 'never'
  askStartCol: 'auto', // 同上
  showZeroGuide: true, // 2段目以降の右の薄い「0」・省略した0の段の点線
  hintsEnabled: true,
  sound: true,
};
// くり上がりは暗算する前提なので、くり上がりマスは出さない（設定項目もなし）
// レベルは最初からすべて選べる（解放のしくみはなし）

export async function loadSettings() {
  const saved = (await getValue('settings', 'main')) ?? {};
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings) {
  await putValue('settings', 'main', settings);
}
