// 起動処理と画面ルーター（設計書 9.1・10章）
import { loadSettings } from './data/settings.js';
import { loadProgress } from './data/progress.js';
import { requestPersist } from './data/db.js';
import * as home from './ui/screens/home.js';
import * as level from './ui/screens/level.js';
import * as problem from './ui/screens/problem.js';
import * as result from './ui/screens/result.js';
import * as settingsScreen from './ui/screens/settings.js';

// 画面は location.hash で切り替える（GitHub Pages のサブパスでも再読み込みで404にならない）
const ROUTES = {
  '#/home': home,
  '#/level': level,
  '#/problem': problem,
  '#/result': result,
  '#/settings': settingsScreen,
};

const root = document.getElementById('app');
let cleanup = null;
let swRegistration = null;

const ctx = {
  settings: null,
  progress: null,
  session: null, // 解いているセット
  lastResult: null, // 直前のセットの結果
  updateReady: false,
  navigate(hash) {
    if (location.hash === hash) renderRoute();
    else location.hash = hash;
  },
  async reload() {
    ctx.settings = await loadSettings();
    ctx.progress = await loadProgress();
  },
  applyUpdate() {
    if (swRegistration && swRegistration.waiting) swRegistration.waiting.postMessage('skipWaiting');
    else location.reload();
  },
};

function renderRoute() {
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  const screen = ROUTES[location.hash] ?? home;
  try {
    cleanup = screen.render(root, ctx);
  } catch (e) {
    console.error(e);
    root.textContent = `エラーが おきました：${e.message}`;
  }
  window.scrollTo(0, 0);
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./service-worker.js').then((reg) => {
    swRegistration = reg;
    const markReady = () => {
      ctx.updateReady = true;
      if (location.hash === '#/home' || location.hash === '') renderRoute();
    };
    if (reg.waiting && navigator.serviceWorker.controller) markReady();
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) markReady();
      });
    });
  }).catch((e) => console.warn('Service Worker を登録できませんでした', e));

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

async function main() {
  await ctx.reload();
  requestPersist();
  setupServiceWorker();
  window.addEventListener('hashchange', renderRoute);
  // 解いているとちゅうで再読み込みしたときなどは、ホームから始める
  if (location.hash !== '#/home') history.replaceState(null, '', '#/home');
  renderRoute();
}

main();
