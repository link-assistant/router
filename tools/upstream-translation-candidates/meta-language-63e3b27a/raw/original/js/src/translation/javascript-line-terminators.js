import { acceptJavaScriptLineTerminator } from './javascript-line-terminator-rules.js';

// The host supplies exact UTF-16 code units; the shared rule owns the decision.
export function findJavaScriptLineTerminator(source, start, end = source.length) {
  let index = start;
  while (index < end && !acceptJavaScriptLineTerminator(source.charCodeAt(index))) index += 1;
  return index;
}
