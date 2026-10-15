// Expose upstream classes without modifying the pinned implementation. Every
// substitution is exact and validated. Class exports, an injectable emitter
// constructor and a fresh reserved-name Set isolate every emission; the pinned
// vendor files remain unchanged. Semantic extensions live in subclasses below.
import { readFileSync } from 'node:fs';
import {createRulePipeline,exactSubstitutionRule} from '../rule-pipeline.mjs';

const core = new URL('../vendor/meta-language/translation/', import.meta.url);
async function exposed(name, replacements) {
  const url = new URL(name, core);
  const pipeline=createRulePipeline([
    {phase:'language',rules:replacements.map(([id,before,after])=>exactSubstitutionRule(`${name}:${id}`,before,after,`upstream patch anchor drift: ${name}: ${before}`))},
    {phase:'repository',rules:[{id:`${name}:resolve-imports`,apply:source=>source.replace(/from (['"])(\.\.?\/[^'"]+)\1/gu, (_, quote, path) => `from ${quote}${(path==='./types.js'?new URL('../checked-types.mjs',import.meta.url):new URL(path, url)).href}${quote}`)}]},
  ]);
  const source=pipeline.run(readFileSync(url,'utf8')).value;
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

export const { RustParser } = await exposed('rust.js', [
  ['export-rust-parser', 'class RustParser {', 'export class RustParser {'],
  // Rust excludes unparenthesized record expressions throughout a condition,
  // including right operands. Nested parentheses/call arguments still start
  // an ordinary expression; statement parsing flags stay local to the left.
  ['condition-or-operand', 'const right = this.and(path, {});', 'const right = this.and(path, { noStruct: options.noStruct });'],
  ['condition-and-operand', 'const right = this.comparison(path, {});', 'const right = this.comparison(path, { noStruct: options.noStruct });'],
  ['condition-comparison-operand', 'const right = this.additive(path, {});', 'const right = this.additive(path, { noStruct: options.noStruct });'],
  ['condition-additive-operand', 'const right = this.multiplicative(path, {});', 'const right = this.multiplicative(path, { noStruct: options.noStruct });'],
  ['condition-multiplicative-operand', 'const right = this.cast(path, {});', 'const right = this.cast(path, { noStruct: options.noStruct });'],
  ['condition-negative-operand', "if (c.eat('-')) {\n      const arg = this.unary(path, {});", "if (c.eat('-')) {\n      const arg = this.unary(path, { noStruct: options.noStruct });"],
  ['condition-not-operand', "if (c.eat('!')) {\n      const arg = this.unary(path, {});", "if (c.eat('!')) {\n      const arg = this.unary(path, { noStruct: options.noStruct });"],
  ['condition-reference-operand', "return this.unary(path, {});\n    }\n    if (c.eat('*')) return this.unary(path, {});", "return this.unary(path, { noStruct: options.noStruct });\n    }\n    if (c.eat('*')) return this.unary(path, { noStruct: options.noStruct });"],
]);
export const { Checker } = await exposed('check.js', [
  ['export-checker', 'class Checker {', 'export class Checker {'],
  // Keep the actual checked receiver beneath its written conversion. Returning
  // it directly lets later ownership layers overwrite an inner source proof.
  ['retain-string-conversion-source', "if (arg.type.kind === 'string') return arg;", "if (arg.type.kind === 'string') return { k: 'toString', arg, type: STRING, span: node.span };"],
  ['constructor-type-phase', "      }));\n    });\n    this.walk(items, path, (item, itemPath, entry) => {\n      if (item.k !== 'fn') return;", "      }));\n    }, 'declaration-types');\n    this.walk(items, path, (item, itemPath, entry) => {\n      if (item.k !== 'fn') return;"],
  ['function-type-phase', '      entry.ret = this.resolveType(item.ret, itemPath, item.span);\n    });', "      entry.ret = this.resolveType(item.ret, itemPath, item.span);\n    }, 'declaration-types');"],
  ['declaration-body-phase', '    });\n    const build = (list, listPath) =>', "    }, 'declaration-bodies');\n    const build = (list, listPath) =>"],
  ['walk-phase-parameter', '  walk(items, path, visit) {', '  walk(items, path, visit, phase = null) {'],
  ['walk-phase-recursion', 'if (item.k === \'module\') this.walk(item.items, [...path, item.name], visit);', 'if (item.k === \'module\') this.walk(item.items, [...path, item.name], visit, phase);'],
  ['declaration-visitor-dispatch', 'else visit(item, path, this.items.get([...path, item.name].join(\'.\')));', 'else this.visitDeclaration(item, path, this.items.get([...path, item.name].join(\'.\')), visit, phase);'],
  ['declaration-visitor-hook', '  resolveType(type, path, span) {', '  visitDeclaration(item, path, entry, visit, phase) { return visit(item, path, entry); }\n\n  resolveType(type, path, span) {'],
]);
export const { JavaScriptEmitter, emitJavaScript: emitWith } = await exposed('emit-javascript.js', [
  ['export-javascript-emitter', 'class JavaScriptEmitter {', 'export class JavaScriptEmitter {'],
  ['fresh-reserved-name-set', "new EmitState(program, 'JavaScript', ident, KEYWORDS,", "new EmitState(program, 'JavaScript', ident, new Set(KEYWORDS),"],
  ['inject-emitter-constructor', 'export function emitJavaScript(program) {', 'export function emitJavaScript(program, Emitter = JavaScriptEmitter) {'],
  ['instantiate-emitter-constructor', 'return new JavaScriptEmitter(program, state).file();', 'return new Emitter(program, state).file();'],
]);
