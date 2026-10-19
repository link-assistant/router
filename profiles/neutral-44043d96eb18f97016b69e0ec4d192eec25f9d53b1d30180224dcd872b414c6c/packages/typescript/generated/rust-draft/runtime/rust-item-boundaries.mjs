// Local Rust adapter of formal-ai's pinned topLevelItems implementation.
// Original source and Unlicense remain unchanged under vendor/formal-ai/.
// Only continuation lookahead avoids copying every remaining token array.
// The item boundaries, comments, token slices and UTF-16 spans are preserved.
export function topLevelRustItems(tokens) {
  const items = [];
  let index = 0;
  while (index < tokens.length) {
    const first = tokens[index];
    if (first.type === 'comment') {
      items.push({ start: first.start, end: first.end, comment: true, tokens: [first] });
      index += 1;
      continue;
    }
    const begin = index;
    const statementOnly = endsAtSemicolon(tokens, begin);
    let depth = 0;
    let sawBlock = false;
    let end = -1;
    for (; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.type !== 'punct') continue;
      if (token.text === '{' || token.text === '(' || token.text === '[') {
        depth += 1;
        if (token.text === '{') sawBlock = true;
      } else if (token.text === '}' || token.text === ')' || token.text === ']') {
        depth -= 1;
        const inner = tokens[begin].text === '#' && tokens[index].text === ']';
        if (depth === 0 && inner && tokens[begin + 1]?.text === '!') {
          end = index;
          break;
        }
        if (depth === 0 && token.text === '}' && sawBlock && !statementOnly && !continues(tokens, index)) {
          end = index;
          break;
        }
      } else if (token.text === ';' && depth === 0) {
        end = index;
        break;
      }
    }
    if (end < 0) end = tokens.length - 1;
    items.push({ start: tokens[begin].start, end: tokens[end].end, comment: false, tokens: tokens.slice(begin, end + 1) });
    index = end + 1;
  }
  return items;
}

// A declaration that only a `;` ends, whatever braces it holds: an import,
// a binding, a Rust `use`, `const` or `static`, and a re-export.
function endsAtSemicolon(tokens, begin) {
  let at = begin;
  while (['export', 'pub'].includes(tokens[at]?.text)) at += 1;
  const head = tokens[at];
  if (!head) return false;
  if (head.text === 'const') return tokens[at + 1]?.text !== 'fn';
  return ['import', 'let', 'var', 'use', 'static', 'type', '{', '*'].includes(head.text);
}

// A closing brace that the same statement continues past: `} else`, an
// object literal followed by an operator, or `};` closing a declaration.
function continues(tokens, index) {
  let next;
  for (let at = index + 1; at < tokens.length; at += 1) {
    if (tokens[at].type !== 'comment') { next = tokens[at]; break; }
  }
  if (!next) return false;
  if (next.type === 'punct') return next.text !== '}' && next.text !== '#' && next.text !== '@';
  return next.text === 'else' || next.text === 'as';
}
