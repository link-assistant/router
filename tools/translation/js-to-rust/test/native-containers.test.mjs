import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadTypeScript, parseNativeJavaScript, emitNativeTypeScript, runtimeAST } from '../native-typescript.mjs';
import { inferenceProgram, typeNode } from '../native-inference.mjs';

const ROOT = process.env.ROUTER_NATIVE_TS_SOURCE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

test('closed builtin Map and Set inference retains nested types and explicit dynamic gaps', async () => {
  const ts = loadTypeScript(ROOT), directory = mkdtempSync(join(tmpdir(), 'router-native-containers-'));
  const source = `export function collections(value) {
  const names = new Set(['a', 'b']);
  const counts = new Map([['a', 2], ['b', 3]]);
  const nested = new Map([['names', new Set(['a'])]]);
  const dynamic = new Map();
  dynamic.set(value, value);
  return { names, counts, nested, dynamic };
}
export function names() { return new Set(['a']); }
export function counts() { return new Map([['a', 2]]); }`;
  try {
    const path = join(directory, 'fixture.mjs'); writeFileSync(path, source);
    const inference = inferenceProgram(ts, directory, ['fixture.mjs']);
    const meta = JSON.parse(JSON.stringify(parseNativeJavaScript(ts, 'fixture.mjs', source, { file: inference.program.getSourceFile(path), checker: inference.checker })));
    assert.deepEqual(meta.locals[0], { kind: 'set', element: { kind: 'primitive', name: 'string' } });
    assert.deepEqual(meta.locals[1], { kind: 'map', key: { kind: 'primitive', name: 'string' }, value: { kind: 'primitive', name: 'number' } });
    assert.equal(meta.locals[2].value.kind, 'set');
    assert.equal(meta.locals[3], null);
    assert.equal(meta.annotations[0].parameters[0], 'any');
    assert.equal(meta.annotations[0].returns, null);
    assert.equal(meta.annotations[1].returns.kind, 'set');
    assert.equal(meta.annotations[2].returns.kind, 'map');
    const output = emitNativeTypeScript(ts, meta);
    assert.match(output.text, /names: Set<string>/u);
    assert.match(output.text, /counts: Map<string, number>/u);
    assert.match(output.text, /nested: Map<string, Set<string>>/u);
    assert.match(output.text, /dynamic: any/u);
    const typed = join(directory, 'fixture.ts'); writeFileSync(typed, output.text);
    const program = ts.createProgram([typed], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
    const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    assert.deepEqual(runtimeAST(ts, erased), runtimeAST(ts, source));
    const runtimePath = join(directory, 'target.mjs'); writeFileSync(runtimePath, erased);
    const runtime = await import(pathToFileURL(runtimePath).href);
    const value = runtime.collections({ supplied: true });
    assert.deepEqual([...value.names], ['a', 'b']);
    assert.deepEqual([...value.counts], [['a', 2], ['b', 3]]);
    assert.deepEqual([...value.nested.get('names')], ['a']);
    assert.deepEqual([...value.dynamic], [[{ supplied: true }, { supplied: true }]]);
    assert.throws(() => typeNode(ts, { kind: 'map', key: { kind: 'primitive', name: 'string' }, value: { kind: 'primitive', name: 'unsafe' } }), /unsupported native type inference hint/u);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('user-defined containers do not inherit builtin inference hints', () => {
  const ts = loadTypeScript(ROOT), directory = mkdtempSync(join(tmpdir(), 'router-native-shadow-containers-'));
  const source = 'class Set { constructor(value) { this.value = value; } } export function create() { const result = new Set(1); return result; }';
  try {
    const path = join(directory, 'fixture.mjs'); writeFileSync(path, source);
    const inference = inferenceProgram(ts, directory, ['fixture.mjs']);
    const meta = parseNativeJavaScript(ts, 'fixture.mjs', source, { file: inference.program.getSourceFile(path), checker: inference.checker });
    assert.deepEqual(meta.locals, [null]);
    assert.equal(meta.annotations.at(-1).returns, null);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
