// IndexedDB の小さなラッパー（設計書 8章）
// IndexedDB が使えない環境（プライベートブラウズなど）では、メモリ上に保存して動き続ける。

const DB_NAME = 'hissan-trainer';
const DB_VERSION = 1;

let dbPromise = null;
const memory = { settings: new Map(), progress: new Map(), sessions: new Map(), attempts: new Map() };
let memoryId = 1;
let useMemory = false;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      useMemory = true;
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress');
      if (!db.objectStoreNames.contains('sessions')) {
        const s = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('startedAt', 'startedAt');
      }
      if (!db.objectStoreNames.contains('attempts')) {
        const s = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
        s.createIndex('sessionId', 'sessionId');
        s.createIndex('date', 'date');
        s.createIndex('codes', 'codes', { multiEntry: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      useMemory = true;
      resolve(null);
    };
  });
  return dbPromise;
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode = 'readonly') {
  const db = await open();
  if (!db || useMemory) return null;
  return db.transaction(name, mode).objectStore(name);
}

/** キー指定で1件読む（settings / progress 用） */
export async function getValue(name, key) {
  const s = await store(name);
  if (!s) return memory[name].get(key);
  return wrap(s.get(key));
}

/** キー指定で1件書く（settings / progress 用） */
export async function putValue(name, key, value) {
  const s = await store(name, 'readwrite');
  if (!s) {
    memory[name].set(key, structuredClone(value));
    return key;
  }
  return wrap(s.put(value, key));
}

/** 自動採番のストアに追加し、id を返す（sessions / attempts 用） */
export async function addRecord(name, value) {
  const s = await store(name, 'readwrite');
  if (!s) {
    const id = memoryId++;
    memory[name].set(id, { ...structuredClone(value), id });
    return id;
  }
  return wrap(s.add(value));
}

/** 自動採番のストアのレコードを更新する */
export async function updateRecord(name, value) {
  const s = await store(name, 'readwrite');
  if (!s) {
    memory[name].set(value.id, structuredClone(value));
    return value.id;
  }
  return wrap(s.put(value));
}

/** ストアの全件 */
export async function getAll(name) {
  const s = await store(name);
  if (!s) return [...memory[name].values()];
  return wrap(s.getAll());
}

/** 全データを JSON 用のオブジェクトにする（バックアップ） */
export async function exportAll() {
  return {
    app: 'hissan-trainer',
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    settings: (await getValue('settings', 'main')) ?? null,
    progress: (await getValue('progress', 'main')) ?? null,
    sessions: await getAll('sessions'),
    attempts: await getAll('attempts'),
  };
}

/** バックアップから全データを戻す（いまのデータは消える） */
export async function importAll(data) {
  if (!data || data.app !== 'hissan-trainer') throw new Error('このアプリの バックアップ ファイルでは ありません');
  const db = await open();
  if (!db || useMemory) {
    Object.values(memory).forEach((m) => m.clear());
  } else {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['settings', 'progress', 'sessions', 'attempts'], 'readwrite');
      ['settings', 'progress', 'sessions', 'attempts'].forEach((n) => tx.objectStore(n).clear());
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  if (data.settings) await putValue('settings', 'main', data.settings);
  if (data.progress) await putValue('progress', 'main', data.progress);
  for (const s of data.sessions ?? []) await updateRecord('sessions', s);
  for (const a of data.attempts ?? []) await updateRecord('attempts', a);
}

/** ストレージの自動削除を避けるよう要求する（設計書 8.3） */
export async function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (e) {
    // 使えない環境では何もしない
  }
  return false;
}
