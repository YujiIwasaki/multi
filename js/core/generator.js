// 問題生成（設計書 5章）
import { digitsOf, randInt } from './places.js';
import { buildLayout } from './layout.js';

/** レベル一覧（画面表示にも使う） */
export const LEVELS = [
  { id: '1', group: 'normal', name: 'レベル1', desc: '2けた × 2けた（くり上がりなし）', example: '23 × 12' },
  { id: '2', group: 'normal', name: 'レベル2', desc: '2けた × 2けた（くり上がりあり）', example: '47 × 36' },
  { id: '3', group: 'normal', name: 'レベル3', desc: '3けた × 2けた', example: '258 × 47' },
  { id: '4', group: 'normal', name: 'レベル4', desc: '3けた × 3けた', example: '386 × 274' },
  { id: '5-1', group: 'zero', name: '0コース1', desc: 'かけられる数の 中に 0', example: '305 × 8' },
  { id: '5-2', group: 'zero', name: '0コース2', desc: 'かける数の さいごに 0', example: '47 × 30' },
  { id: '5-3', group: 'zero', name: '0コース3', desc: 'りょうほうの さいごに 0', example: '450 × 30' },
  { id: '5-4', group: 'zero', name: '0コース4', desc: 'かける数の 中に 0', example: '305 × 208' },
];

export const LEVEL_ORDER = {
  normal: ['1', '2', '3', '4'],
  zero: ['5-1', '5-2', '5-3', '5-4'],
};

const hasZero = (n) => String(n).includes('0');
const noZero = (n) => !hasZero(n);
/** 0と1以外の数字を2つ以上ふくむ（ひっ算にする意味がうすい問題を除く） */
const meaningful = (a, b) => [...`${a}${b}`].filter((ch) => ch !== '0' && ch !== '1').length >= 2;
const tens = (n) => Math.floor(n / 10) % 10;
const ones = (n) => n % 10;

function hasCarry(a, b) {
  return buildLayout(a, b).cells.some((c) => c.kind === 'carry' || c.kind === 'sumCarry');
}

/** 各レベルの条件。index はセットの中の何問目か（5-1 で使う）、opt.twoDigitA は 5-2 で a を2けたにする */
export const RULES = {
  '1': {
    make: (rng) => [randInt(11, 99, rng), randInt(11, 99, rng)],
    ok: (a, b) => noZero(a) && noZero(b) && !hasCarry(a, b),
  },
  '2': {
    make: (rng) => [randInt(11, 99, rng), randInt(11, 99, rng)],
    ok: (a, b) => noZero(a) && noZero(b) && hasCarry(a, b),
  },
  '3': {
    make: (rng) => [randInt(101, 999, rng), randInt(11, 99, rng)],
    ok: (a, b) => noZero(a) && noZero(b),
  },
  '4': {
    make: (rng) => [randInt(101, 999, rng), randInt(101, 999, rng)],
    ok: (a, b) => noZero(a) && noZero(b),
  },
  '5-1': {
    // a の十の位が0。最初の2問は b が1けた。0の位にくり上がりが入るようにする（Z2を練習するため）
    make: (rng, index = 2) => [randInt(101, 999, rng), index < 2 ? randInt(2, 9, rng) : randInt(11, 99, rng)],
    ok: (a, b) => tens(a) === 0 && ones(a) !== 0 && noZero(b) && ones(a) * ones(b) >= 10,
  },
  '5-2': {
    make: (rng, index, opt = {}) => [opt.twoDigitA ? randInt(11, 99, rng) : randInt(11, 999, rng), randInt(2, 9, rng) * 10],
    ok: (a, b) => noZero(a) && ones(b) === 0 && tens(b) !== 0,
  },
  '5-3': {
    make: (rng) => [randInt(11, 99, rng) * 10, randInt(2, 99, rng) * 10],
    ok: (a, b) => noZero(a / 10) && noZero(b / 10),
  },
  '5-4': {
    make: (rng) => [randInt(101, 999, rng), randInt(1, 9, rng) * 100 + randInt(1, 9, rng)],
    ok: (a, b) => noZero(a) && tens(b) === 0 && ones(b) !== 0,
  },
};

/** 条件に合う問題が乱数で作れなかったときの予備 */
const FALLBACK = {
  '1': [[23, 12], [32, 13], [21, 34], [42, 21], [13, 32]],
  '2': [[47, 36], [58, 24], [36, 47], [69, 28], [75, 43]],
  '3': [[258, 47], [364, 29], [527, 86], [439, 65], [816, 37]],
  '4': [[386, 274], [459, 127], [628, 395], [734, 268], [913, 456]],
  '5-1': [[305, 8], [406, 7], [508, 6], [305, 24], [709, 36]],
  '5-2': [[47, 30], [258, 40], [36, 70], [519, 60], [83, 20]],
  '5-3': [[450, 30], [320, 150], [270, 60], [680, 40], [530, 120]],
  '5-4': [[386, 204], [305, 208], [457, 302], [628, 405], [519, 703]],
};

const keyOf = (a, b) => `${a}x${b}`;

/**
 * 1問作る
 * @param {string} levelId
 * @param {Object} [o]
 * @param {Set<string>} [o.exclude] 出さない問題のキー（'47x36' の形）
 * @param {number} [o.index] セットの中の何問目か
 * @param {Function} [o.rng]
 * @param {Function} [o.extra] 追加の条件 (a, b) => boolean
 * @param {boolean} [o.twoDigitA]
 */
export function makeProblem(levelId, o = {}) {
  const { exclude = new Set(), index = 2, rng = Math.random, extra = () => true, twoDigitA = false } = o;
  const rule = RULES[levelId];
  if (!rule) throw new Error(`未知のレベル: ${levelId}`);
  for (let t = 0; t < 1000; t += 1) {
    const [a, b] = rule.make(rng, index, { twoDigitA });
    if (rule.ok(a, b) && meaningful(a, b) && extra(a, b) && !exclude.has(keyOf(a, b))) {
      return { a, b, level: levelId, isZero: levelId.startsWith('5') };
    }
  }
  const pool = FALLBACK[levelId].filter(([a, b]) => !exclude.has(keyOf(a, b)) && extra(a, b));
  const [a, b] = (pool.length ? pool : FALLBACK[levelId])[randInt(0, (pool.length || FALLBACK[levelId].length) - 1, rng)];
  return { a, b, level: levelId, isZero: levelId.startsWith('5') };
}

/**
 * 1セット作る（設計書 5.2）
 * @param {string} levelId
 * @param {{setSize:number, zeroMix:number}} settings
 * @param {string[]} [recentKeys] 直近に出した問題のキー（重ならないようにする）
 * @param {Function} [rng]
 */
export function buildSet(levelId, settings, recentKeys = [], rng = Math.random) {
  const n = settings.setSize;
  const exclude = new Set(recentKeys);
  const problems = [];

  if (levelId.startsWith('5')) {
    for (let i = 0; i < n; i += 1) {
      const p = makeProblem(levelId, { exclude, index: i, rng });
      exclude.add(keyOf(p.a, p.b));
      problems.push(p);
    }
    return problems;
  }

  // 通常レベル：0を含む問題を zeroMix 問まぜる（1問目は通常問題）
  const mix = Math.max(0, Math.min(settings.zeroMix, n - 1));
  const slots = [];
  const candidates = Array.from({ length: n - 1 }, (_, i) => i + 1);
  for (let k = 0; k < mix; k += 1) {
    const pick = randInt(0, candidates.length - 1, rng);
    slots.push(candidates.splice(pick, 1)[0]);
  }
  for (let i = 0; i < n; i += 1) {
    let p;
    if (slots.includes(i)) {
      if (levelId === '1' || levelId === '2') {
        p = makeProblem('5-2', { exclude, rng, twoDigitA: true });
      } else {
        p = makeProblem(rng() < 0.5 ? '5-1' : '5-4', { exclude, rng });
      }
    } else {
      p = makeProblem(levelId, { exclude, rng });
    }
    exclude.add(keyOf(p.a, p.b));
    problems.push(p);
  }
  return problems;
}

/** 解説のあとに出す類題（設計書 5.3） */
export function similarProblem(code, problem, exclude = new Set(), rng = Math.random) {
  const lv = problem.level;
  const isZero = lv.startsWith('5');
  const bDistinct = (a, b) => {
    const d = digitsOf(b).filter((x) => x !== 0);
    return new Set(d).size === d.length;
  };
  let target = lv;
  let extra = () => true;
  switch (code) {
    case 'E4':
      target = isZero ? '5-4' : (lv === '1' ? '2' : lv);
      break;
    case 'E5':
      target = isZero ? '5-4' : (lv === '1' ? '2' : lv);
      extra = bDistinct;
      break;
    case 'Z1':
    case 'Z2':
      target = '5-1';
      break;
    case 'Z3':
      target = '5-4';
      break;
    case 'Z4':
      target = lv === '5-3' ? '5-3' : '5-2';
      break;
    default:
      break;
  }
  const p = makeProblem(target, { exclude, rng, extra });
  return { ...p, isFollowUp: true, followUpFor: code };
}

export { keyOf };
