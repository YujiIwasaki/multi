// 1セット（何問かのまとまり）を始める
import { buildSet } from '../core/generator.js';

export function startSession(ctx, levelId) {
  ctx.session = {
    id: null,
    level: levelId,
    problems: buildSet(levelId, ctx.settings, ctx.progress.recentKeys),
    index: 0,
    results: [],
    startedAt: Date.now(),
  };
  ctx.navigate('#/problem');
}
