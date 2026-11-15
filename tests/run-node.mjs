// Node.js でテストを実行する： node tests/run-node.mjs
import { run } from './all.js';

const results = await run();
for (const r of results) console.log(`${r.pass ? 'OK  ' : 'NG  '} ${r.name}${r.pass ? '' : `\n      ${r.error}`}`);
const ng = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - ng} / ${results.length} 件 合格`);
process.exit(ng ? 1 : 0);
