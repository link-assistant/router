// Expose upstream classes without modifying the pinned implementation. Every
// substitution is exact and validated. Class exports, an injectable emitter
// constructor and a fresh reserved-name Set isolate every emission; the pinned
// vendor files remain unchanged. Semantic extensions live in subclasses below.
import { readFileSync } from 'node:fs';

const core = new URL('../vendor/meta-language/translation/', import.meta.url);
async function exposed(name, replacements) {
  const url = new URL(name, core);
  let source = readFileSync(url, 'utf8');
  for (const [before, after] of replacements) {
    if (source.split(before).length !== 2) throw new Error(`upstream patch anchor drift: ${name}: ${before}`);
    source = source.replace(before, after);
  }
  source = source.replace(/from (['"])(\.\.?\/[^'"]+)\1/gu, (_, quote, path) => `from ${quote}${(path==='./types.js'?new URL('../checked-types.mjs',import.meta.url):new URL(path, url)).href}${quote}`);
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

export const { RustParser } = await exposed('rust.js', [
  ['class RustParser {', 'export class RustParser {'],
  // Rust excludes unparenthesized record expressions throughout a condition,
  // including right operands. Nested parentheses/call arguments still start
  // an ordinary expression; statement parsing flags stay local to the left.
  ['const right = this.and(path, {});', 'const right = this.and(path, { noStruct: options.noStruct });'],
  ['const right = this.comparison(path, {});', 'const right = this.comparison(path, { noStruct: options.noStruct });'],
  ['const right = this.additive(path, {});', 'const right = this.additive(path, { noStruct: options.noStruct });'],
  ['const right = this.multiplicative(path, {});', 'const right = this.multiplicative(path, { noStruct: options.noStruct });'],
  ['const right = this.cast(path, {});', 'const right = this.cast(path, { noStruct: options.noStruct });'],
  ["if (c.eat('-')) {\n      const arg = this.unary(path, {});", "if (c.eat('-')) {\n      const arg = this.unary(path, { noStruct: options.noStruct });"],
  ["if (c.eat('!')) {\n      const arg = this.unary(path, {});", "if (c.eat('!')) {\n      const arg = this.unary(path, { noStruct: options.noStruct });"],
  ["return this.unary(path, {});\n    }\n    if (c.eat('*')) return this.unary(path, {});", "return this.unary(path, { noStruct: options.noStruct });\n    }\n    if (c.eat('*')) return this.unary(path, { noStruct: options.noStruct });"],
]);
export const { Checker } = await exposed('check.js', [
  ['class Checker {', 'export class Checker {'],
  // Keep the actual checked receiver beneath its written conversion. Returning
  // it directly lets later ownership layers overwrite an inner source proof.
  ["if (arg.type.kind === 'string') return arg;", "if (arg.type.kind === 'string') return { k: 'toString', arg, type: STRING, span: node.span };"],
  ["      }));\n    });\n    this.walk(items, path, (item, itemPath, entry) => {\n      if (item.k !== 'fn') return;", "      }));\n    }, 'declaration-types');\n    this.walk(items, path, (item, itemPath, entry) => {\n      if (item.k !== 'fn') return;"],
  ['      entry.ret = this.resolveType(item.ret, itemPath, item.span);\n    });', "      entry.ret = this.resolveType(item.ret, itemPath, item.span);\n    }, 'declaration-types');"],
  ['    });\n    const build = (list, listPath) =>', "    }, 'declaration-bodies');\n    const build = (list, listPath) =>"],
  ['  walk(items, path, visit) {', '  walk(items, path, visit, phase = null) {'],
  ['if (item.k === \'module\') this.walk(item.items, [...path, item.name], visit);', 'if (item.k === \'module\') this.walk(item.items, [...path, item.name], visit, phase);'],
  ['else visit(item, path, this.items.get([...path, item.name].join(\'.\')));', 'else this.visitDeclaration(item, path, this.items.get([...path, item.name].join(\'.\')), visit, phase);'],
  ['  resolveType(type, path, span) {', '  visitDeclaration(item, path, entry, visit, phase) { return visit(item, path, entry); }\n\n  resolveType(type, path, span) {'],
]);
export const { JavaScriptEmitter, emitJavaScript: emitWith } = await exposed('emit-javascript.js', [
  ['class JavaScriptEmitter {', 'export class JavaScriptEmitter {'],
  ["new EmitState(program, 'JavaScript', ident, KEYWORDS,", "new EmitState(program, 'JavaScript', ident, new Set(KEYWORDS),"],
  ['export function emitJavaScript(program) {', 'export function emitJavaScript(program, Emitter = JavaScriptEmitter) {'],
  ['return new JavaScriptEmitter(program, state).file();', 'return new Emitter(program, state).file();'],
]);
