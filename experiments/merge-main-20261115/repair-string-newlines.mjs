// Re-escape raw line feeds that a past writer unescaped inside single/double
// quoted JavaScript string literals ('...\n...' became a real newline, which is
// a syntax error). Template literals, comments and regex literals are skipped.
// Usage: node repair-string-newlines.mjs [--dry] file...
// Prints each repaired line number so every change can be reviewed.
import {readFileSync, writeFileSync} from 'node:fs';

const dry = process.argv.includes('--dry');
const files = process.argv.slice(2).filter(a => a !== '--dry');
const REGEX_PREFIX = /[(,=:[!&|?{};+\-*%<>~^]$|(?:^|[^\w$])(?:return|typeof|case|do|else|in|of|void|yield|await)$/u;

function repair(source) {
  let out = '', i = 0, line = 1;
  const repaired = [], templateDepth = [];
  const prevSignificant = () => out.replace(/\s+$/u, '');
  while (i < source.length) {
    const c = source[i], n = source[i + 1];
    if (c === '\n') line++;
    if (c === '/' && n === '/') { const end = source.indexOf('\n', i); const stop = end < 0 ? source.length : end; out += source.slice(i, stop); i = stop; continue; }
    if (c === '/' && n === '*') { const end = source.indexOf('*/', i + 2) + 2; line += (source.slice(i, end).match(/\n/gu) ?? []).length; out += source.slice(i, end); i = end; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1, text = c;
      while (j < source.length && source[j] !== c) {
        if (source[j] === '\\') { text += source[j] + source[j + 1]; if (source[j + 1] === '\n') line++; j += 2; continue; }
        if (source[j] === '\n') { text += '\\n'; repaired.push(line); line++; j++; continue; }
        text += source[j++];
      }
      out += text + c; i = j + 1; continue;
    }
    if (c === '`') { templateDepth.push(0); out += c; i++; i = template(i); continue; }
    if (c === '}' && templateDepth.length && templateDepth[templateDepth.length - 1] === 0) { out += c; i++; i = template(i); continue; }
    if (c === '{' && templateDepth.length) templateDepth[templateDepth.length - 1]++;
    if (c === '}' && templateDepth.length) templateDepth[templateDepth.length - 1]--;
    if (c === '/' && REGEX_PREFIX.test(prevSignificant() || ';')) {
      let j = i + 1, klass = false;
      while (j < source.length && source[j] !== '\n') {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === '[') klass = true; else if (source[j] === ']') klass = false;
        else if (source[j] === '/' && !klass) break;
        j++;
      }
      out += source.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return {out, repaired};
  // Consume template text until `${` (push expression) or closing backtick.
  function template(at) {
    while (at < source.length) {
      const ch = source[at];
      if (ch === '\n') line++;
      if (ch === '\\') { out += ch + source[at + 1]; at += 2; continue; }
      if (ch === '`') { templateDepth.pop(); out += ch; return at + 1; }
      if (ch === '$' && source[at + 1] === '{') { templateDepth[templateDepth.length - 1] = 0; out += '${'; return at + 2; }
      out += ch; at++;
    }
    return at;
  }
}

for (const file of files) {
  const {out, repaired} = repair(readFileSync(file, 'utf8'));
  if (!dry && repaired.length) writeFileSync(file, out);
  console.log(`${repaired.length} repaired [${repaired.join(',')}]: ${file}`);
}
