// ヒント文と解説文の生成（設計書 7章）
// 文は小3までの漢字だけを使い、子どもが読みやすいように言葉の区切りに空白を入れる。
import { placeName } from './places.js';

/** 掛ける数の桁 j の呼び名。例「十の位の 3」 */
function bLabel(meta, j) {
  return `${placeName(j)}の位の ${meta.bDigits[j]}`;
}

/**
 * ヒント（設計書 7.1）
 * @param {Object} step
 * @param {1|2|3} level ヒントの段階
 * @param {Object} layout
 * @returns {{text: string, reveal: boolean, targets: string[]}}
 */
export function hintFor(step, level, layout) {
  const { meta } = layout;
  const reveal = level >= 3;

  if (step.type === 'chooseDigit') {
    const r = meta.rows[step.row];
    if (level === 1) return { text: '1だんめは いちばん 右の 数字、2だんめは その となりの 数字… と じゅんに かけるよ', reveal, targets: [] };
    return { text: `${step.row + 1}だんめで かけるのは ${bLabel(meta, r.j)} だよ`, reveal, targets: [`b:${r.j}`] };
  }

  if (step.type === 'chooseStartCol') {
    const r = meta.rows[step.row];
    if (level === 1) return { text: 'かける数字が どこに あるか 見てみよう', reveal, targets: [`b:${r.j}`] };
    return { text: `かける数字 ${r.bj} の 真下から 書きはじめるよ`, reveal, targets: [`b:${r.j}`, `slot:${r.startCol}`] };
  }

  const cell = layout.cellById.get(step.cellId);
  const s = cell.src;

  switch (cell.kind) {
    case 'partial': {
      const targets = [`a:${s.i}`, `b:${s.j}`];
      if (s.digitPos === 1) {
        if (level === 1) return { text: `さっきの こたえ ${s.value} の、のこりの 数字を 書こう`, reveal, targets };
        return { text: `${s.value} の 十の位の ${Math.floor(s.value / 10)} を 書くよ`, reveal, targets };
      }
      if (level === 1) {
        const plus = s.carryIn > 0 ? `。くり上がりの ${s.carryIn} も わすれずに` : '';
        return { text: `${s.ai} × ${s.bj} を けいさん しよう${plus}`, reveal, targets };
      }
      const prod = s.ai * s.bj;
      let text = `${s.ai} × ${s.bj} = ${prod}`;
      if (s.carryIn > 0) text += `。くり上がりの ${s.carryIn} を たして ${s.value}`;
      const isLast = s.i === meta.aDigits.length - 1;
      if (isLast && s.value >= 10) text += `。${s.value} を そのまま 書くよ（まず ${s.value % 10}）`;
      else if (s.value >= 10) text += `。${s.value % 10} を 書いて、${Math.floor(s.value / 10)} を くり上げる`;
      else text += `。${s.value} を 書くよ`;
      return { text, reveal, targets };
    }
    case 'carry': {
      const targets = [`a:${s.i}`, `b:${s.j}`];
      if (level === 1) return { text: 'くり上がりは いくつ かな？', reveal, targets };
      return { text: `${s.value} の 十の位の ${Math.floor(s.value / 10)} を くり上げるよ`, reveal, targets };
    }
    case 'sum': {
      const targets = [`col:${s.col}`];
      if (level === 1) return { text: 'この 列を たてに たそう', reveal, targets };
      const parts = [...s.addends];
      if (s.carryIn > 0) parts.push(s.carryIn);
      const expr = parts.length > 1 ? `${parts.join(' + ')} = ${s.value}` : `${s.value}`;
      const tail = s.value >= 10 ? `。${s.value % 10} を 書いて、${Math.floor(s.value / 10)} を くり上げる` : '';
      return { text: `${expr}${tail}`, reveal, targets };
    }
    case 'sumCarry': {
      if (level === 1) return { text: 'たし算の くり上がりは いくつ かな？', reveal, targets: [`col:${s.col}`] };
      return { text: `${s.value} の 十の位の ${Math.floor(s.value / 10)} を くり上げるよ`, reveal, targets: [`col:${s.col}`] };
    }
    case 'zeroTail': {
      if (level === 1) return { text: 'かける数の 右の 数字を 見てみよう', reveal, targets: zeroTargets(meta) };
      return { text: `かける数の ${placeName(s.col)}の位が 0 だから、答えの ${placeName(s.col)}の位も 0 だよ`, reveal, targets: zeroTargets(meta) };
    }
    default:
      return { text: '', reveal, targets: [] };
  }
}

/** 掛ける数の右に続く0（答えの右に0を書く理由）を指す */
function zeroTargets(meta) {
  return Array.from({ length: meta.lead }, (_, j) => `b:${j}`);
}

/**
 * 解説（設計書 7.2・7.3）
 * @returns {{code:string, title:string, lines:string[], visuals:{type:string, targets:string[]}[]}}
 */
export function explain(code, d, layout) {
  const { meta } = layout;
  const rowName = (row) => `${row + 1}だんめ`;

  switch (code) {
    case 'E4': {
      return {
        code, title: '書きはじめる 位が ずれているよ',
        lines: [
          `${rowName(d.row)}は ${bLabel(meta, d.j)} を かけているよ`,
          `${d.bj}${'0'.repeat(d.j)} を かけるのと おなじ だから、${d.bj} の 真下から 書きはじめるんだ`,
        ],
        visuals: [{ type: 'link', targets: [`b:${d.j}`, `slot:${d.startCol}`] }],
      };
    }
    case 'E5': {
      const lines = d.bk !== undefined && d.k !== undefined && d.bk !== d.bj
        ? [`いまは ${rowName(d.row)}。かけるのは ${bLabel(meta, d.k)} ではなく、${bLabel(meta, d.j)} だよ`]
        : [`いまは ${rowName(d.row)}。かけるのは ${bLabel(meta, d.j)} だよ`];
      const dim = meta.bDigits.map((_, k) => k).filter((k) => k !== d.j).map((k) => `b:${k}`);
      return {
        code, title: 'かける 数字が ちがうよ', lines,
        visuals: [{ type: 'blink', targets: [`b:${d.j}`] }, { type: 'dim', targets: dim }],
      };
    }
    case 'Z1':
      return {
        code, title: '0の かけ算',
        lines: ['0 に なにを かけても 0 だよ', `0 × ${d.bj} = 0${d.c > 0 ? `。そこに くり上がりの ${d.c} を たして ${d.v}` : ''}`],
        visuals: [{ type: 'highlight', targets: [`a:${d.i}`, `b:${d.j}`] }],
      };
    case 'Z2':
      return {
        code, title: 'くり上がりを わすれずに',
        lines: [`0 × ${d.bj} は 0。そこに くり上がった ${d.c} を たすから ${d.v} だよ`],
        visuals: [{ type: 'link', targets: [`a:${d.i}`, `cell:${d.cell.id}`] }, ...carryVisual(layout, d)],
      };
    case 'Z3': {
      const skipped = d.skipped.map((s) => `ghost:${s}`);
      return {
        code, title: '0の だんを とばしたら',
        lines: [
          '0の だんは 書かずに とばしたね',
          `だから ${rowName(d.row)}は ${d.bj} の 真下、${placeName(d.startCol)}の位から 書くんだ`,
        ],
        visuals: [{ type: 'highlight', targets: skipped }, { type: 'link', targets: [`b:${d.j}`, `slot:${d.startCol}`] }],
      };
    }
    case 'Z4':
      return {
        code, title: 'さいごの 0を わすれずに',
        lines: d.lead === 1
          ? ['かける数の 一の位が 0 だから、0の だんは とばしたね', 'そのかわり、答えの 一の位には 0 を 書くんだ']
          : [`かける数の 右に 0 が ${d.lead}こ あるから、答えの 右にも 0 を ${d.lead}こ 書くんだ`],
        visuals: [{ type: 'highlight', targets: zeroTargets(meta) }],
      };
    case 'E1':
      return {
        code, title: '九九を たしかめよう',
        lines: [`${d.ai} × ${d.bj} = ${d.ai * d.bj} だよ${d.c > 0 ? `。くり上がりの ${d.c} を たすと ${d.v}` : ''}`],
        visuals: [{ type: 'highlight', targets: [`a:${d.i}`, `b:${d.j}`] }],
      };
    case 'E2':
      return {
        code, title: 'くり上がりを たそう',
        lines: [`${d.ai} × ${d.bj} = ${d.ai * d.bj}。くり上がりの ${d.c} を たして ${d.v} だよ`],
        visuals: carryVisual(layout, d),
      };
    case 'E3':
      return {
        code, title: 'かけてから たすよ',
        lines: [`さきに ${d.ai} × ${d.bj} = ${d.ai * d.bj} を して、あとから くり上がりの ${d.c} を たすよ`],
        visuals: carryVisual(layout, d),
      };
    case 'E6': {
      const parts = [...(d.addends ?? [])];
      if (d.carryIn > 0) parts.push(d.carryIn);
      return {
        code, title: 'たし算を たしかめよう',
        lines: [`この 列を たてに たすと ${parts.length > 1 ? `${parts.join(' + ')} = ` : ''}${d.value} だよ`],
        visuals: [{ type: 'highlight', targets: [`col:${d.col}`] }],
      };
    }
    default:
      return { code: 'UNKNOWN', title: 'もう一度 やってみよう', lines: [], visuals: [] };
  }
}

/** このマスに入るくり上がり（前の桁で書いた小さい数字）を強調する */
function carryVisual(layout, d) {
  const carryCell = layout.cells.find((c) => c.kind === 'carry' && c.row === d.row && c.col === d.cell.col);
  return carryCell ? [{ type: 'highlight', targets: [`cell:${carryCell.id}`] }] : [];
}
