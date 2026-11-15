// 位の名前などの共通の小道具（DOMに触れない）

const PLACE_NAMES = ['一', '十', '百', '千', '一万', '十万', '百万', '千万'];

/** 位の番号（0 = 一の位）から名前を返す。例 placeName(1) → '十' */
export function placeName(col) {
  return PLACE_NAMES[col] ?? `${col + 1}けた目`;
}

/** 数字を右（一の位）から並べた配列にする。例 305 → [5, 0, 3] */
export function digitsOf(n) {
  return [...String(n)].reverse().map(Number);
}

/** lo以上 hi以下の整数の乱数（rng は 0以上1未満を返す関数） */
export function randInt(lo, hi, rng = Math.random) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** 端末のローカル日付を 'YYYY-MM-DD' で返す */
export function localDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
