import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, symlinkSync, realpathSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { loadTypeScript, parseNativeJavaScript, emitNativeTypeScript, runtimeAST, compileNativeTypeScript, regenerateNativeTypeScript, reconstructSyntax, sourceModules } from '../native-typescript.mjs';
import { inferenceProgram, typeNode } from '../native-inference.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SOURCE = process.env.ROUTER_NATIVE_TS_SOURCE_ROOT ? resolve(process.env.ROUTER_NATIVE_TS_SOURCE_ROOT) : ROOT;

test('closed compiler inference exposes primitive returns while retaining dynamic parameter and object gaps', async () => {
  const ts = loadTypeScript(SOURCE);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-inference-'));
  const source = `export function answer(value) { const doubled = value * 2; return doubled + 1; }
export function identity(value) { return value; }
export async function flag() { const mode = true; return mode; }
export function nullable(yes) { return yes ? 'value' : null; }
export function opaque() { const record = { kind: 'object' }; return record; }`;
  try {
    const file = join(directory, 'fixture.mjs'); writeFileSync(file, source);
    const inference = inferenceProgram(ts, directory, ['fixture.mjs']);
    const meta = JSON.parse(JSON.stringify(parseNativeJavaScript(ts, 'fixture.mjs', source, { file: inference.program.getSourceFile(file), checker: inference.checker })));
    const output = emitNativeTypeScript(ts, meta);
    assert.equal(output.inferredReturns, 3);
    assert.equal(output.inferredLocals, 2);
    assert.match(output.text, /answer\(value\?: any\): number/u);
    assert.match(output.text, /identity\(value\?: any\): any/u);
    assert.match(output.text, /flag\(\): Promise<boolean>/u);
    assert.match(output.text, /nullable\(yes\?: any\): (?:string \| null|null \| string)/u);
    assert.match(output.text, /const record: any/u);
    const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    assert.deepEqual(runtimeAST(ts, erased), runtimeAST(ts, source));
    writeFileSync(join(directory, 'target.mjs'), erased);
    const runtime = await import(pathToFileURL(join(directory, 'target.mjs')).href);
    assert.equal(runtime.answer('3'), 7);
    assert.equal(runtime.identity(null), null);
    assert.deepEqual(runtime.identity({ dynamic: true }), { dynamic: true });
    assert.equal(await runtime.flag(), true);
    assert.equal(runtime.nullable(false), null);
    assert.throws(() => typeNode(ts, { kind: 'primitive', name: 'string; runCode()' }), /unsupported native type inference hint/u);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('independent runtime fixture preserves optional chains, receivers, getters, evaluation order and literal data', async () => {
  const ts = loadTypeScript(SOURCE);
  const source = `export async function exercise() {
    let hits = 0; const absent = null; let grouped = false;
    const receiver = { value: 3, get slot() { hits++; return this; }, method(extra = 1) { return this.value + extra; } };
    const short = absent?.foo.bar;
    try { (absent?.foo).bar; } catch (error) { grouped = true; }
    const observed = receiver.slot.method(); const optional = receiver?.method?.(2);
    const order = []; const record = n => { order.push(n); return n; };
    const decision = false && record(1) || true && record(2);
    const literal = String.raw\`line\\n\${7n}\`;
    const regex = /\\u{1F600}/u.test('😀');
    return { hits, grouped, short: short === undefined, observed, optional, order, decision, literal, regex, awaited: await Promise.resolve(11) };
  }`;
  const meta = JSON.parse(JSON.stringify(parseNativeJavaScript(ts, 'fixture.mjs', source)));
  const output = emitNativeTypeScript(ts, meta);
  const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true } }).outputText;
  assert.deepEqual(runtimeAST(ts, erased), runtimeAST(ts, source));
  assert.notDeepEqual(runtimeAST(ts, 'x?.foo.bar;'), runtimeAST(ts, '(x?.foo).bar;'));
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-observations-'));
  try {
    writeFileSync(join(directory, 'source.mjs'), source);
    writeFileSync(join(directory, 'target.mjs'), erased);
    const expected = { hits: 1, grouped: true, short: true, observed: 4, optional: 5, order: [2], decision: 2, literal: 'line\\n7', regex: true, awaited: 11 };
    const original = await import(pathToFileURL(join(directory, 'source.mjs')).href);
    const translated = await import(pathToFileURL(join(directory, 'target.mjs')).href);
    assert.deepEqual(await original.exercise(), expected);
    assert.deepEqual(await translated.exercise(), expected);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('strict types preserve required destructuring and JavaScript property-key coercion', async () => {
  const ts = loadTypeScript(SOURCE);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-keys-'));
  const source = `export function destructured(prefix, { value }) { return String(prefix) + value; }
export function keys(value) { const record = { undefined: 4, null: 5, true: 6 }; return [record[value], record[undefined], record[null], record[true], record?.[undefined]]; }
export function missing() { const absent = null; return absent?.[undefined]; }`;
  try {
    const path = join(directory, 'fixture.mjs'); writeFileSync(path, source);
    const inference = inferenceProgram(ts, directory, ['fixture.mjs']);
    const meta = JSON.parse(JSON.stringify(parseNativeJavaScript(ts, 'fixture.mjs', source, { file: inference.program.getSourceFile(path), checker: inference.checker })));
    const output = emitNativeTypeScript(ts, meta);
    assert.match(output.text, /destructured\(prefix: any, \{ value \}: any\)/u);
    const typed = join(directory, 'fixture.ts'); writeFileSync(typed, output.text);
    const program = ts.createProgram([typed], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
    const erased = ts.transpileModule(output.text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    assert.deepEqual(runtimeAST(ts, erased), runtimeAST(ts, source));
    writeFileSync(join(directory, 'target.mjs'), erased);
    const runtime = await import(pathToFileURL(join(directory, 'target.mjs')).href);
    assert.equal(runtime.destructured('a', { value: 2 }), 'a2');
    assert.throws(() => runtime.destructured('a'), TypeError);
    assert.deepEqual(runtime.keys(true), [6, 4, 5, 6, 4]);
    assert.equal(runtime.missing(), undefined);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('ordinary functions preserve dynamic receivers and arrow lexical receivers under strict types',async()=>{
  const ts=loadTypeScript(SOURCE),directory=mkdtempSync(join(tmpdir(),'router-native-ts-this-'));
  const source=`function Counter(value) { this.value = value; }
Counter.prototype.read = function(extra) { const arrow = () => this.value; function nested() { return this.value; } return [arrow() + extra, nested.call({value:9})]; };
export function run() { return new Counter(4).read(3); }`;
  try {
    const meta=JSON.parse(JSON.stringify(parseNativeJavaScript(ts,'fixture.mjs',source)));
    assert.equal(meta.annotations.filter(hint=>hint.thisContext).length,3);
    const output=emitNativeTypeScript(ts,meta),typed=join(directory,'fixture.ts');writeFileSync(typed,output.text);
    const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
    const erased=ts.transpileModule(output.text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    assert.deepEqual(runtimeAST(ts,erased),runtimeAST(ts,source));
    writeFileSync(join(directory,'target.mjs'),erased);
    assert.deepEqual((await import(pathToFileURL(join(directory,'target.mjs')).href)).run(),[7,9]);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('structured dynamic gap plans preserve extra arguments, comma calls, coercion and undeclared host probing',async()=>{
  const ts=loadTypeScript(SOURCE),directory=mkdtempSync(join(tmpdir(),'router-native-ts-gaps-'));
  const source=`export function run() { function count(value) { return arguments.length; }
    let observed; for(var key in {entry:1}) observed=key; key=false;
    return [count(1,2,3),(0,count)(4,5),count.bind()(6),1+true,typeof __ROUTER_MISSING_HOST_FEATURE__,key,observed]; }`;
  try {
    const path=join(directory,'fixture.mjs');writeFileSync(path,source);
    const inference=inferenceProgram(ts,directory,['fixture.mjs']);
    const meta=JSON.parse(JSON.stringify(parseNativeJavaScript(ts,'fixture.mjs',source,{file:inference.program.getSourceFile(path),checker:inference.checker})));
    assert.deepEqual(meta.globalGaps,['__ROUTER_MISSING_HOST_FEATURE__']);assert.ok(meta.gaps.some(gap=>gap.call));assert.ok(meta.gaps.some(gap=>gap.coercion));
    const output=emitNativeTypeScript(ts,meta),typed=join(directory,'fixture.ts');writeFileSync(typed,output.text);
    const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
    const erased=ts.transpileModule(output.text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
    assert.deepEqual(runtimeAST(ts,erased),runtimeAST(ts,source));
    writeFileSync(join(directory,'target.mjs'),erased);
    assert.deepEqual((await import(pathToFileURL(join(directory,'target.mjs')).href)).run(),[3,2,1,2,'undefined',false,'entry']);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('every native JavaScript module has a structured syntax AST and executable TS draft', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'tools/translation/js-to-rust/generated/native-typescript/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.modules.map((row) => row.source), sourceModules(SOURCE));
  assert.deepEqual(manifest.inferenceInputs.map(row=>row.path), ['packages/javascript/package.json', ...readdirSync(join(SOURCE,'packages/javascript')).filter(name=>name.endsWith('.d.ts')).sort().map(name=>`packages/javascript/${name}`)]);
  for(const row of manifest.inferenceInputs) { assert.equal(row.sha256,createHash('sha256').update(readFileSync(join(SOURCE,row.path))).digest('hex')); assert.equal(typeof row.resolvedByCompiler,'boolean'); }
  assert.ok(manifest.inferenceInputs.some(row=>row.role==='public-declaration'&&row.resolvedByCompiler));
  for (const row of manifest.modules) {
    const meta = JSON.parse(readFileSync(join(ROOT, row.meta), 'utf8'));
    assert.equal(meta.schema, 'native-js-syntax-ast-v1');
    assert.ok(Array.isArray(meta.tree));
    assert.ok(meta.nodes > 0);
    assert.equal('source' in meta, false, 'no opaque file source field');
    const source = readFileSync(join(ROOT, row.target), 'utf8');
    assert.doesNotMatch(source, /@ts-(?:nocheck|ignore|expect-error)/u);
    assert.doesNotMatch(source, /from ['"]\.{1,2}\/[^'"]+\.mjs['"]/u);
    assert.ok(reconstructSyntax(meta).length > 0);
  }
});

test('strict compiler checks the entire generated native package', () => {
  const result = compileNativeTypeScript(ROOT, { sourceRoot: SOURCE });
  assert.ok(result.files >= sourceModules(SOURCE).length);
});

test('regeneration rejects stale, missing, and unexpected TS, meta, and asset artifacts', { timeout: 60_000 }, () => {
  assert.deepEqual(regenerateNativeTypeScript(ROOT, { sourceRoot: SOURCE, check: true }).changed, []);
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-drift-'));
  try {
    regenerateNativeTypeScript(directory, { sourceRoot: SOURCE });
    const target = join(directory, 'packages/typescript/native/core.ts');
    writeFileSync(target, 'stale\n');
    rmSync(join(directory, 'packages/typescript/catalog.json'));
    writeFileSync(join(directory, 'packages/typescript/native/unexpected.ts'), 'export const stale = true;\n');
    writeFileSync(join(directory, 'packages/typescript/unexpected.ts'), 'export const stale = true;\n');
    const result = regenerateNativeTypeScript(directory, { sourceRoot: SOURCE, check: true });
    assert.ok(result.changed.includes('packages/typescript/native/core.ts'));
    assert.ok(result.changed.includes('packages/typescript/catalog.json'));
    assert.ok(result.unexpected.includes('packages/typescript/native/unexpected.ts'));
    assert.ok(result.unexpected.includes('packages/typescript/unexpected.ts'));
    regenerateNativeTypeScript(directory, { sourceRoot: SOURCE });
    assert.equal(existsSync(join(directory, 'packages/typescript/native/unexpected.ts')), false);
    assert.equal(existsSync(join(directory, 'packages/typescript/unexpected.ts')), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('compiled TypeScript executes the shared native runtime fixture suite in Node and Bun', { timeout: 300000 }, async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'router-native-ts-runtime-'));
  try {
    const outDir = join(directory, 'packages/javascript');
    compileNativeTypeScript(ROOT, { sourceRoot: SOURCE, outDir, emit: true });
    cpSync(join(SOURCE, 'parity/fixtures'), join(directory, 'parity/fixtures'), { recursive: true });
    cpSync(join(SOURCE, 'openapi'), join(directory, 'openapi'), { recursive: true });
    mkdirSync(join(outDir, 'test'), { recursive: true });
    const tests = [];
    for (const name of readdirSync(join(SOURCE, 'packages/javascript/test'))) if (/^native-.*\.(?:mjs|js|json)$/u.test(name)) {
      cpSync(join(SOURCE, 'packages/javascript/test', name), join(outDir, 'test', name));
      if (/\.test\.(?:mjs|js)$/u.test(name)) tests.push(join(outDir, 'test', name));
    }
    // Canonical filesystem aliases preserve fixture imports, spawned module
    // URLs and public browser paths without duplicate module cache identities.
    const aliases=folder=>{for(const entry of readdirSync(folder,{withFileTypes:true})) {
      const path=join(folder,entry.name);if(entry.isDirectory()){if(path!==join(outDir,'native/assets'))aliases(path);continue;}if(!path.endsWith('.js'))continue;
      const alias=path.replace(/\.js$/u,'.mjs');symlinkSync(entry.name,alias);
      assert.equal(realpathSync(alias),realpathSync(path));
    }};
    aliases(join(outDir,'native'));aliases(join(outDir,'portable'));
    // Exercise Node's canonical module cache under Node even when Bun hosts
    // this test. Bun's shared runtime fixtures run independently below.
    execFileSync('node', ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import {join} from 'node:path';
      import {pathToFileURL} from 'node:url';
      const root=process.argv[1];
      const canonical=await import(pathToFileURL(join(root,'native/oauth.js')).href);
      assert.equal(await import(pathToFileURL(join(root,'native/oauth.mjs')).href),canonical);
    `, outDir], { encoding: 'utf8', timeout: 10_000, stdio: 'pipe' });
    const original = tests.map((path) => join(SOURCE, 'packages/javascript/test', path.slice(path.lastIndexOf('/') + 1)));
    const nodeArgs = ['--test', '--test-reporter=tap'];
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const run = (binary, args, cwd) => {
      const started=Date.now();
      try { const output=execFileSync(binary, args, { cwd, env, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024, stdio: 'pipe' });context.diagnostic(`${binary} runtime child completed in ${Date.now()-started}ms.`);return output; }
      catch (error) {
        const lines = String(error.stdout ?? '').split('\n');
        const failures = lines.flatMap((line, index) => line.startsWith('not ok') ? lines.slice(index, index + 18) : []).join('\n');
        throw new Error(`Native runtime fixture failure after ${Date.now()-started}ms (code=${error.code}, signal=${error.signal}, status=${error.status}):\n${failures || [String(error.stderr ?? ''),String(error.stdout ?? '').slice(-4000),error.message].filter(Boolean).join('\n').slice(-6000)}`);
      }
    };
    const baseline = run('node', [...nodeArgs, ...original], SOURCE);
    const compiled = run('node', [...nodeArgs, ...tests], directory);
    const count = (text) => Number(/# pass (\d+)/u.exec(text)?.[1]);
    assert.ok(count(compiled) >= 30, 'runtime assertions include core, auth/budgets, provider store, HTTP/protocol/SSE and resources');
    assert.equal(count(compiled), count(baseline), 'source and compiled target execute the same shared runtime expectations');
    context.diagnostic(`${count(compiled)} shared expectations passed against source JavaScript and compiled TypeScript in Node.`);
    // Bun is required in CI when available; local Node-only installations still
    // run all expectations and the strict compiler, without a hidden skip.
    try { execFileSync('bun', ['--version'], { stdio: 'pipe' }); }
    catch (error) { if (error.code === 'ENOENT') { context.diagnostic('Bun is unavailable locally; CI installs Bun and requires its compiled-runtime run.'); return; } throw error; }
    run('bun', ['test', ...tests], directory);
    context.diagnostic('The compiled TypeScript native runtime fixture suite also passed in Bun.');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
