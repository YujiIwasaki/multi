// オフライン用キャッシュ（設計書 10.3）
// ★ アプリのファイルを直したら、CACHE の数字を必ず上げてから GitHub に上げること。
//   上げ忘れると iPad で古い版が表示され続けます。
const CACHE = 'hissan-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/core/places.js',
  './js/core/layout.js',
  './js/core/generator.js',
  './js/core/judge.js',
  './js/core/diagnosis.js',
  './js/core/explain.js',
  './js/data/db.js',
  './js/data/settings.js',
  './js/data/progress.js',
  './js/ui/dom.js',
  './js/ui/sound.js',
  './js/ui/session.js',
  './js/ui/components/grid.js',
  './js/ui/components/keypad.js',
  './js/ui/components/prompt.js',
  './js/ui/components/explain-panel.js',
  './js/ui/screens/home.js',
  './js/ui/screens/level.js',
  './js/ui/screens/problem.js',
  './js/ui/screens/result.js',
  './js/ui/screens/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hissan-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// 画面の「あたらしい バージョン」ボタンから呼ばれる
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// キャッシュ優先。なければネットから取得
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request)),
  );
});
