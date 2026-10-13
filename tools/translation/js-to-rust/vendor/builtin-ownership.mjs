// Module binding ownership is checked before partial admission. A refused
// import/declaration may still shadow a standard builtin used by another item.
export function shadowedBuiltins(items) {
  const result = new Set();
  const add = token => { if (token?.type === 'ident' && ['Number', 'Math', 'Buffer', 'Map', 'Set', 'undefined'].includes(token.text)) result.add(token.text); };
  for (const item of items) {
    if (item.comment) continue;
    const tokens = item.tokens.filter(token => token.type !== 'comment');
    let head = tokens[0]?.text === 'export' ? 1 : 0;
    if (tokens[head]?.text === 'default') head++;
    if (tokens[head]?.text === 'async' && tokens[head + 1]?.text === 'function') head++;
    const term = tokens[head]?.text;
    if (term === 'import' && tokens[head + 1]?.type !== 'string' && tokens[head + 1]?.text !== '(') {
      let index = head + 1;
      if (tokens[index]?.type === 'ident') { add(tokens[index++]); if (tokens[index]?.text === ',') index++; }
      if (tokens[index]?.text === '*') { add(tokens[index + 2]); continue; }
      if (tokens[index]?.text === '{') {
        let begin = ++index;
        for (; index < tokens.length; index++) {
          if ([',', '}'].includes(tokens[index].text)) {
            const binding = tokens.slice(begin, index);
            const alias = binding.findIndex(token => token.text === 'as');
            add(alias < 0 ? binding[0] : binding[alias + 1]);
            begin = index + 1;
            if (tokens[index].text === '}') break;
          }
        }
      }
    }
    if (['function', 'class', 'let', 'var', 'const'].includes(term)) {
      // Multiple const declarations have already been split. Destructuring is
      // refused; conservatively retain builtin-looking names in its pattern.
      const binding = tokens.slice(head + 1, tokens.findIndex((token, index) => index > head && token.text === '='));
      if (['{', '['].includes(tokens[head + 1]?.text)) binding.forEach(add);
      else add(tokens[head + 1]);
      if (['let', 'var'].includes(term)) {
        let depth = 0;
        for (let index = head + 1; index < tokens.length; index++) {
          if (['{', '[', '('].includes(tokens[index].text)) depth++;
          if (['}', ']', ')'].includes(tokens[index].text)) depth--;
          if (tokens[index].text === ',' && depth === 0) add(tokens[index + 1]);
        }
      }
    }
    if (['Number', 'Math', 'Buffer', 'Map', 'Set', 'undefined'].includes(term) && tokens[head + 1]?.text === '=') add(tokens[head]);
    for (let index = 0; index < tokens.length; index++) {
      if (['Number', 'Math', 'Buffer', 'Map', 'Set'].includes(tokens[index].text) && tokens[index + 1]?.text === '.' && tokens[index + 3]?.text === '=') add(tokens[index]);
      if (['globalThis', 'global', 'window'].includes(tokens[index].text) && tokens[index + 1]?.text === '.' && tokens[index + 3]?.text === '=') add(tokens[index + 2]);
    }
  }
  return result;
}
