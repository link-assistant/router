// Expose upstream classes without modifying the pinned implementation. Every
// substitution is exact and validated; only class exports and an injectable
// emitter constructor differ. Semantic changes live in subclasses below.
import { readFileSync } from 'node:fs';

const core = new URL('../vendor/meta-language/translation/', import.meta.url);
async function exposed(name, replacements) {
  const url = new URL(name, core);
  let source = readFileSync(url, 'utf8');
  for (const [before, after] of replacements) {
    if (source.split(before).length !== 2) throw new Error(`upstream patch anchor drift: ${name}: ${before}`);
    source = source.replace(before, after);
  }
  source = source.replace(/from (['"])(\.\.?\/[^'"]+)\1/gu, (_, quote, path) => `from ${quote}${new URL(path, url).href}${quote}`);
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

export const { RustParser } = await exposed('rust.js', [['class RustParser {', 'export class RustParser {']]);
export const { Checker } = await exposed('check.js', [['class Checker {', 'export class Checker {']]);
export const { JavaScriptEmitter, emitJavaScript: emitWith } = await exposed('emit-javascript.js', [
  ['class JavaScriptEmitter {', 'export class JavaScriptEmitter {'],
  ['export function emitJavaScript(program) {', 'export function emitJavaScript(program, Emitter = JavaScriptEmitter) {'],
  ['return new JavaScriptEmitter(program, state).file();', 'return new Emitter(program, state).file();'],
]);
