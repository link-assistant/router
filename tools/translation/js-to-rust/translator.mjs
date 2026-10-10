// Executable JavaScript -> checked Links IR -> Rust / TypeScript.
// Frontend/checker adapted from the pinned public-domain formal-ai translator;
// see provenance.json. Unsupported source is reported, never put in envelopes.
import { lex, topLevelItems } from './vendor/lexer.mjs';
import { parseJavaScriptItem } from './vendor/frontends.mjs';
import { check, signatures, toLino, fromLino, FRAGMENT } from './vendor/ir.mjs';
import { isRefusal } from './vendor/constructs.mjs';
import { emitRust, emitTypeScript } from './targets.mjs';
import { parseLinks } from './vendor/lino.mjs';

export class TranslationError extends Error {
  constructor(diagnostic) {
    super(`${diagnostic.kind}: ${diagnostic.message}`);
    this.name = 'TranslationError';
    this.diagnostic = diagnostic;
  }
}

const diagnostic = (error, item, source) => ({
  kind: error.slug ?? 'syntax',
  message: error.message,
  span: { start: item.start, end: item.end, encoding: 'utf16' },
  example: source.slice(item.start, item.end).split('\n').map((line) => line.trim()).filter(Boolean).join(' ').slice(0, 180),
});

function returns(body) {
  return body.some((statement) => statement.kind === 'return' || statement.kind === 'if' && statement.else !== null && returns(statement.then) && returns(statement.else));
}

/** Discover and independently check every top-level source item. */
export function analyzeJavaScript(source) {
  let raw;
  try {
    raw = topLevelItems(lex(source, 'JavaScript'));
  } catch (error) {
    return { fragment: FRAGMENT, program: [], items: [], diagnostics: [diagnostic(error, { start: 0, end: source.length }, source)] };
  }
  const items = [];
  let doc = '';
  for (const item of raw) {
    if (item.comment) {
      doc += `${item.tokens[0].text}\n`;
      continue;
    }
    const row = { start: item.start, end: item.end, status: 'unsupported' };
    try {
      row.parsed = parseJavaScriptItem(item.tokens, doc);
      if (row.parsed.kind === 'function' && !returns(row.parsed.body)) {
        throw Object.assign(new Error('a path ends without a return'), { slug: 'missing-return' });
      }
      row.name = row.parsed.name;
      row.status = 'parsed';
    } catch (error) {
      if (!isRefusal(error) && !error.slug) throw error;
      row.diagnostic = diagnostic(error, item, source);
    }
    items.push(row);
    doc = '';
  }
  // Remove failed definitions before checking their dependants. A call to a
  // refused function cannot accidentally count as executable translation.
  let changed = true;
  while (changed) {
    changed = false;
    const candidates = items.filter((item) => ['parsed', 'translated'].includes(item.status));
    const names = new Set();
    const table = signatures(candidates.map((item) => item.parsed));
    for (const item of candidates) {
      try {
        if (names.has(item.name)) throw Object.assign(new Error(`duplicate definition ${item.name}`), { slug: 'name' });
        names.add(item.name);
        item.checked = check(item.parsed, table);
        item.status = 'translated';
      } catch (error) {
        if (!isRefusal(error) && !error.slug) throw error;
        item.status = 'unsupported';
        item.diagnostic = diagnostic(error, item, source);
        changed = true;
      }
    }
  }
  return {
    fragment: FRAGMENT,
    program: items.filter((item) => item.status === 'translated').map((item) => item.checked),
    items: items.map(({ parsed, checked, ...item }) => item),
    diagnostics: items.filter((item) => item.diagnostic).map((item) => item.diagnostic),
  };
}

/** Strict executable translation: any unsupported item fails the module. */
export function translateJavaScript(source) {
  const analyzed = analyzeJavaScript(source);
  if (analyzed.diagnostics.length) throw new TranslationError(analyzed.diagnostics[0]);
  const meta = `${analyzed.program.map(toLino).join('\n')}\n`;
  // Both targets consume the serialized/reparsed meta-language document.
  const program = parseMeta(meta);
  return { ...analyzed, meta, rust: emitRust(program), typescript: emitTypeScript(program) };
}

export function parseMeta(text) {
  const links = parseLinks(text);
  if (links.some((link) => !['function', 'constant'].includes(link[0]))) throw new Error('unsupported top-level meta-language link');
  const items = fromLino(text);
  if (JSON.stringify(links) !== JSON.stringify(parseLinks(items.map(toLino).join('\n')))) throw new Error('noncanonical or malformed meta-language fields');
  const names = new Set();
  for (const item of items) {
    if (names.has(item.name)) throw new Error(`duplicate meta-language definition ${item.name}`);
    names.add(item.name);
    if (item.kind === 'function' && !returns(item.body)) throw new Error(`meta-language function ${item.name} has a path without a return`);
  }
  const table = signatures(items);
  return items.map((item) => check(item, table));
}

export { emitRust, emitTypeScript };
