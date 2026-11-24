// Closed primitive expressions are safe module initializers. Keep their AST
// in Links IR; evaluate only to infer the type and encode static Rust strings.
import { refuse } from './constructs.mjs';

export function constantValue(expr) {
  const value = node => constantValue(node);
  switch (expr.kind) {
    case 'number': return Number(expr.text);
    case 'string': case 'boolean': return expr.value;
    case 'unary':
      if (expr.op === 'not') return !value(expr.operand);
      if (expr.op === 'negate') return -value(expr.operand);
      break;
    case 'choose': {
      // Validate both branches even when one is unreachable: neither may
      // carry a free name, callback, service operation or other dynamic AST.
      const cond = value(expr.cond), yes = value(expr.then), no = value(expr.else);
      return cond ? yes : no;
    }
    case 'binary': {
      const left = value(expr.left), right = value(expr.right);
      switch (expr.op) {
        case 'add': return left + right;
        case 'subtract': return left - right;
        case 'multiply': return left * right;
        case 'divide': return left / right;
        case 'remainder': return left % right;
        case 'equal': return left === right;
        case 'not-equal': return left !== right;
        case 'less': return left < right;
        case 'less-equal': return left <= right;
        case 'greater': return left > right;
        case 'greater-equal': return left >= right;
        case 'and': return left && right;
        case 'or': return left || right;
      }
      break;
    }
  }
  return refuse('statement', 'a non-closed primitive constant initializer');
}

// Split declarations only at a comma outside initializer delimiters. Each
// member retains its source offsets and is checked independently; unsupported
// siblings cannot be admitted as executable translations.
export function splitConstantItems(item) {
  if (item.comment) return [item];
  const tokens = item.tokens;
  const head = tokens[0]?.text === 'export' ? 1 : 0;
  if (tokens[head]?.text !== 'const' || tokens[head + 1]?.type !== 'ident' || tokens[head + 2]?.text !== '=') return [item];
  const prefix = tokens.slice(0, head + 1);
  const groups = [];
  let begin = head + 1, depth = 0;
  for (let index = begin; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== 'punct') continue;
    if (['(', '{', '['].includes(token.text)) depth++;
    if ([')', '}', ']'].includes(token.text)) depth--;
    if (depth === 0 && token.text === ',') { groups.push(tokens.slice(begin, index)); begin = index + 1; }
  }
  if (!groups.length) return [item];
  groups.push(tokens.slice(begin));
  return groups.map((group, index) => ({
    ...item, start: index === 0 ? item.start : group[0].start, end: group.at(-1).end,
    tokens: [...prefix, ...group],
  }));
}
