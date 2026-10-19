import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { translateJavaScript, analyzeJavaScript, parseMeta, TranslationError } from '../translator.mjs';
import { evaluate } from '../interpreter.mjs';
import { loadTypeScript } from '../native-typescript.mjs';
import { TRIM_HELPER } from '../targets.mjs';

const ROOT = process.env.ROUTER_NATIVE_TS_SOURCE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const source = `export const synthetic = value => typeof value === 'string' && value.startsWith('emergency-bypass-');
export const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export const retryable = value => [401,429,529,500,502,503,504].includes(value);
export const tag = value => typeof value;
export const signed = value => typeof value === 'number' && value < 0;
export const enabled = value => typeof value === 'boolean' && value;
export const membership = value => ['x',true,-0,0/0,1/0].includes(value);
export function branch(value) { if (typeof value === 'string') { return value.endsWith('-ok'); } else { return false; } }
export function fallback(value) { return typeof value !== 'string' || value.includes('ok'); }
export const choose = value => typeof value === 'string' ? value : 'fallback';`;

test('all native value categories keep guarded behavior in JS, IR and strict TypeScript', async () => {
  const ts = loadTypeScript(ROOT), directory = mkdtempSync(join(tmpdir(), 'router-guarded-predicates-'));
  try {
    const result = translateJavaScript(source);
    assert.deepEqual(parseMeta(result.meta), result.program);
    assert.match(result.typescript, /synthetic\(value\?: unknown\)/u);
    assert.doesNotMatch(result.typescript, /\bany\b/u);
    assert.match(result.rust, /value: JsValue<'_>/u);
    assert.match(result.rust, /\.type_name\(\)/u);
    assert.match(result.rust, /\.as_string\(\)/u);
    assert.match(result.rust, /\.as_number\(\)/u);
    assert.match(result.rust, /\.as_boolean\(\)/u);
    assert.match(result.rust, /left\.is_nan\(\) && right\.is_nan\(\)/u);
    const typed = join(directory, 'fixture.ts'); writeFileSync(typed, result.typescript);
    const program = ts.createProgram([typed], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), []);
    const runtimePath = join(directory, 'target.mjs');
    writeFileSync(runtimePath, ts.transpileModule(result.typescript, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
    const originalPath = join(directory, 'source.mjs'); writeFileSync(originalPath, source);
    const original = await import(pathToFileURL(originalPath).href);
    const translated = await import(pathToFileURL(runtimePath).href);
    // Authored expectations avoid narrowing unknown public parameters. Boxed
    // values must not invoke coercion hooks; JS typeof null is object.
    const cases = [
      [undefined,'undefined',false,false,false,false,false,false],
      [null,'object',false,false,false,false,false,false],
      [{},'object',false,false,false,false,false,false],
      [new String('emergency-bypass-ok'),'object',false,false,false,false,false,false],
      [new Number(401),'object',false,false,false,false,false,false],
      [new Boolean(true),'object',false,false,false,false,false,false],
      [[], 'object',false,false,false,false,false,false],
      [401n,'bigint',false,false,false,false,false,false],
      [Symbol('x'),'symbol',false,false,false,false,false,false],
      [()=>{},'function',false,false,false,false,false,false],
      [true,'boolean',false,false,false,false,true,true],
      [false,'boolean',false,false,false,false,false,false],
      [-1,'number',false,false,false,true,false,false],
      [401,'number',false,false,true,false,false,false],
      ['401','string',false,true,false,false,false,false],
      [NaN,'number',false,false,false,false,false,true],
      [Infinity,'number',false,false,false,false,false,true],
      [-0,'number',false,false,false,false,false,true],
      ['emergency-bypass-ok','string',true,true,false,false,false,false],
      ['x','string',false,true,false,false,false,true],
      ['\ufeff\u2000 \n','string',false,false,false,false,false,false],
      ['\u0085','string',false,true,false,false,false,false],
      ['\u180e','string',false,true,false,false,false,false],
      ['😀','string',false,true,false,false,false,false],
    ];
    const names = ['tag','synthetic','nonempty','retryable','signed','enabled','membership'];
    for (const [value,...expected] of cases) for (let i=0;i<names.length;i++) {
      const name = names[i];
      assert.deepEqual(original[name](value), expected[i], `source ${name}: ${typeof value}`);
      assert.deepEqual(evaluate(result.program,name,[value]), expected[i], `IR ${name}: ${typeof value}`);
      assert.deepEqual(translated[name](value), expected[i], `TS ${name}: ${typeof value}`);
    }
    const coercion = { [Symbol.toPrimitive]() { throw new Error('coercion must not run'); } };
    for (const name of ['synthetic','nonempty','retryable','membership']) {
      assert.equal(evaluate(result.program,name,[coercion]),false);
      assert.equal(translated[name](coercion),false);
    }
    for (const [value, branch, fallback, choose] of [['x-ok',true,true,'x-ok'],['no',false,false,'no'],[{},false,true,'fallback'],[undefined,false,true,'fallback']]) {
      for (const [name, expected] of [['branch',branch],['fallback',fallback],['choose',choose]]) {
        assert.deepEqual(evaluate(result.program,name,[value]),expected);
        assert.deepEqual(translated[name](value),expected);
      }
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('emitted Rust trim character ranges match ECMAScript over all Unicode scalars', () => {
  const ranges = [...TRIM_HELPER.matchAll(/'\\u\{([0-9a-f]+)\}'(?:\.\.='\\u\{([0-9a-f]+)\}')?/gu)].map(([,low,high]) => [parseInt(low,16),parseInt(high??low,16)]);
  for (let codepoint=0;codepoint<=0x10ffff;codepoint++) {
    if (codepoint>=0xd800 && codepoint<=0xdfff) continue;
    const expected = String.fromCodePoint(codepoint).trim() === '';
    const emitted = ranges.some(([low,high])=>codepoint>=low && codepoint<=high);
    if (expected !== emitted) assert.fail(`trim mismatch U+${codepoint.toString(16)}`);
  }
});

test('real native predicate declarations are admitted without removing neighboring refusals', () => {
  for (const [path,name] of [['accounts.mjs','retryable_status'],['codex-login.mjs','nonempty'],['emergency-auth.mjs','is_synthetic_token_id']]) {
    const result = analyzeJavaScript(readFileSync(join(ROOT,'js/src',path),'utf8'));
    const fn = result.program.find(item=>item.name===name);
    assert.equal(fn?.kind,'function');
    assert.equal(fn.params[0].type,'value');
    assert.equal(fn.returns,'boolean');
    assert.ok(result.diagnostics.length>0);
  }
});

test('unguarded, wrong-edge, dynamic-data and effectful constructs remain refused', () => {
  for (const source of [
    "export const unsafe = value => value.startsWith('x');",
    "export const unsafe = value => typeof value === 'string' || value.startsWith('x');",
    "export const unsafe = value => typeof value !== 'string' && value.startsWith('x');",
    "export const unsafe = value => value === value;",
    "export const unsafe = value => typeof value === 'object' && value.name;",
    "export const unsafe = value => [value].includes(value);",
    "export const unsafe = value => [1,2].includes(value,1);",
    "export const unsafe = value => typeof value === 'string' ? value : false;",
    "export const unsafe = value => typeof value === 'string' && value[0];",
    "export const unsafe = async value => typeof value;",
    "export const unsafe = value => fetch(value);",
  ]) assert.throws(()=>translateJavaScript(source),TranslationError,source);
});
