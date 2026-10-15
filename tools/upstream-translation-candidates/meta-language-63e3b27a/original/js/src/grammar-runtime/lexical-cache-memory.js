// Optional lexical matches are held separately from mandatory rule memo cells.
import { acceptLexicalCacheReservation } from '../translation/frontend-rules.js';

export function releaseLexicalCaches(memory) {
  for (const cache of memory.lexicalCaches ?? []) {
    memory.cells -= cache.cells;
    cache.entries = new WeakMap();
    cache.cells = 0;
    cache.size = 0;
  }
  memory.lexicalCaches?.clear();
}

export function retainLexicalCache(memory, cache, count) {
  if (!acceptLexicalCacheReservation(memory.cells, count, memory.limit)) releaseLexicalCaches(memory);
  if (!acceptLexicalCacheReservation(memory.cells, count, memory.limit)) return false;
  memory.cells += count;
  cache.cells += count;
  (memory.lexicalCaches ??= new Set()).add(cache);
  return true;
}
