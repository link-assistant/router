// The host expression walk uses the same translated form classifier as Rust.
import { readLexicalCacheExpressionForm } from '../translation/frontend-rules.js';

export function acceptFixedLexicalExpression(expression, cache) {
  const pending = [[expression, false]];
  const active = new Set();
  while (pending.length > 0) {
    const [item, finished] = pending.pop();
    if (cache.has(item)) continue;
    const form = readLexicalCacheExpressionForm(item.kind);
    if (form === 0 || form === 1) {
      cache.set(item, form === 1);
      continue;
    }
    const children = form === 2 ? item.items : [item.item];
    if (finished) {
      active.delete(item);
      cache.set(item, children.every(child => cache.get(child) === true));
      continue;
    }
    if (active.has(item)) {
      cache.set(item, false);
      continue;
    }
    active.add(item);
    pending.push([item, true]);
    for (const child of children) if (!cache.has(child)) pending.push([child, false]);
  }
  return cache.get(expression) === true;
}
