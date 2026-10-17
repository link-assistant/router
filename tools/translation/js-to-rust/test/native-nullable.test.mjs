import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyzeJavaScript, translateJavaScript, parseMeta, emitRust, emitTypeScript, TranslationError } from '../translator.mjs';
import { toLino } from '../vendor/ir.mjs';
import { evaluate } from '../interpreter.mjs';
import { loadTypeScript } from '../native-typescript.mjs';

const ROOT = process.env.ROUTER_NATIVE_TS_SOURCE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

async function compiledFixture(ts, directory, name, source, output) {
  const original = join(directory, `${name}-source.mjs`), typed = join(directory, `${name}.ts`), target = join(directory, `${name}-target.mjs`);
  writeFileSync(original, source); writeFileSync(typed, output);
  const program = ts.createProgram([typed], { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')), []);
  writeFileSync(target, ts.transpileModule(output, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
  return [await import(pathToFileURL(original).href), await import(pathToFileURL(target).href)];
}

test('four original native functions retain independent nullable and integer goldens', async () => {
  const ts = loadTypeScript(ROOT), directory = mkdtempSync(join(tmpdir(),'router-native-nullable-'));
  const coercion = { [Symbol.toPrimitive]() { throw new Error('number predicate must not coerce'); } };
  const nonstrings = [undefined,null,true,1,1n,Symbol('x'),()=>{},[],new String('text'),new Number(12),coercion];
  const fixtures = [
    { path:'client-status.mjs', name:'text', type:'nullable-string', cases:[...nonstrings.map(value=>[value,null]),['', ''],['😀','😀'],['\ufeff','\ufeff']] },
    { path:'oauth.mjs', name:'nonempty', type:'nullable-string', cases:[...nonstrings.map(value=>[value,null]),['',null],[' ', ' '],['😀','😀'],['\ufeff','\ufeff']] },
    { path:'usage.mjs', name:'integer', type:'optional-number', cases:[...nonstrings.filter(value=>value!==1).map(value=>[value,undefined]),[0,0],[-0,-0],[1,1],[-1,undefined],[1.5,undefined],[NaN,undefined],[Infinity,undefined],[9007199254740991,9007199254740991],[9007199254740992,undefined]] },
    { path:'admin.mjs', name:'ttl', type:'number', cases:[...nonstrings.filter(value=>value!==1).map(value=>[value,8760]),[0,8760],[-0,8760],[1,1],[12,12],[8761,8760],[-1,8760],[1.5,8760],[NaN,8760],[Infinity,8760]] },
  ];
  try {
    for (const fixture of fixtures) {
      const source = readFileSync(join(ROOT,'packages/javascript/native',fixture.path),'utf8');
      const result = analyzeJavaScript(source), fn = result.program.find(item=>item.name===fixture.name);
      assert.equal(fn?.returns,fixture.type,fixture.path);
      assert.equal(fn.params[0].type,'value');
      const item = result.items.find(item=>item.name===fixture.name && item.status==='translated');
      const original = `${source.slice(item.start,item.end)}\nexport { ${fixture.name} };\n`;
      const checked = parseMeta(toLino(fn));
      assert.deepEqual(checked,[fn]);
      const typescript = emitTypeScript(checked), rust = emitRust(checked);
      assert.match(typescript,/\?: unknown/u);
      if (fixture.type==='optional-number') {
        assert.match(typescript,/: number \| undefined/u);
        assert.match(rust,/JsOptional<f64>/u);
        assert.match(rust,/JsOptional::Value\(value\.as_number\(\)\)/u);
        assert.match(rust,/JsOptional::Undefined/u);
      }
      if (fixture.type==='nullable-string') {
        assert.match(typescript,/: string \| null/u);
        assert.match(rust,/JsNullable<String>/u);
        assert.match(rust,/JsNullable::Value\(value\.as_string\(\)\.to_string\(\)\)/u);
        assert.match(rust,/JsNullable::Null/u);
      }
      const [javascript, translated] = await compiledFixture(ts,directory,`${fixture.name}-${fixture.path}`,original,`${typescript}\nexport { ${fixture.name} };\n`);
      for (const [input,expected] of fixture.cases) {
        assert.ok(Object.is(javascript[fixture.name](input),expected),`JS ${fixture.path}: ${typeof input}`);
        assert.ok(Object.is(evaluate(checked,fixture.name,[input]),expected),`IR ${fixture.path}: ${typeof input}`);
        assert.ok(Object.is(translated[fixture.name](input),expected),`TS ${fixture.path}: ${typeof input}`);
      }
      assert.ok(result.diagnostics.length>0,'neighboring dynamic/I/O declarations remain refused');
    }
  } finally { rmSync(directory,{recursive:true,force:true}); }
});

test('Boolean control contexts preserve numeric/string truthiness and distinct absence contracts', async () => {
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-native-truthiness-'));
  const oldRefusal='/** @param {number} n @returns {number} */ export function truthy(n) { if (n) { return 1; } return 0; }';
  const source=`${oldRefusal}
/** @param {string} value @returns {number} */ export function stringTruthy(value) { return value ? 1 : 0; }
export function nullable(value) { if(typeof value==='string') { return value; } return null; }
export const optional=value=>typeof value==='string'?value:undefined;
export const finite=value=>Number.isFinite(value)?value:null;
export const onlyNaN=value=>Number.isNaN(value)?value:undefined;
export const nil=()=>null;
export const missing=()=>undefined;
export const nullTag=()=>typeof null;
export const undefinedTag=()=>typeof undefined;`;
  try {
    const result=translateJavaScript(source);
    assert.deepEqual(parseMeta(result.meta),result.program);
    assert.match(result.meta,/\(null\)/u);assert.match(result.meta,/\(undefined\)/u);
    const [javascript,translated]=await compiledFixture(ts,directory,'truthiness',source,result.typescript);
    for(const [input,expected] of [[0,0],[-0,0],[NaN,0],[1,1],[-1,1],[Infinity,1],[-Infinity,1]]) {
      assert.equal(javascript.truthy(input),expected);assert.equal(evaluate(result.program,'truthy',[input]),expected);assert.equal(translated.truthy(input),expected);
    }
    for(const [input,expected] of [['',0],[' ',1],['😀',1]])assert.equal(translated.stringTruthy(input),expected);
    assert.equal(translated.nullable(null),null);assert.equal(translated.optional(null),undefined);
    assert.equal(translated.nil(),null);assert.equal(translated.missing(),undefined);
    assert.match(result.rust,/fn nil\(\) -> JsNull/u);assert.match(result.rust,/fn missing\(\) -> JsUndefined/u);
    assert.equal(evaluate(result.program,'null_tag',[]),'object');assert.equal(translated.nullTag(),'object');
    assert.equal(evaluate(result.program,'undefined_tag',[]),'undefined');assert.equal(translated.undefinedTag(),'undefined');
    for(const input of [undefined,null,true,1n,Symbol(),new Number(1),'1',NaN,Infinity])assert.equal(translated.finite(input),null);
    for(const input of [undefined,null,true,1n,Symbol(),new Number(NaN),'NaN',Infinity])assert.equal(translated.onlyNaN(input),undefined);
    assert.ok(Object.is(translated.finite(-0),-0));assert.ok(Number.isNaN(translated.onlyNaN(NaN)));
    assert.match(result.rust,/"object"\.to_string\(\)/u);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('unknown truthiness, arbitrary unions and value-producing coercive logical operations remain refused',()=>{
  for(const source of [
    '/** @param {*} n @returns {number} */ export function truthy(n) { if (n) { return 1; } return 0; }',
    'export const unsafe=value=>typeof value===\'string\' && value.length;',
    'export const unsafe=value=>typeof value===\'string\'?value:undefined===null;',
    'export const unsafe=value=>typeof value===\'string\'?null:undefined;',
    'export const unsafe=value=>Number.isSafeInteger(value)||value>0;',
    'export const unsafe=value=>Number.isFinite(value)?value:1n;',
    'export const unsafe=value=>typeof value===\'string\'?value:null===undefined;',
  ])assert.throws(()=>translateJavaScript(source),TranslationError,source);
});

test('inferred sibling signatures are checked before typeof lowering uses their return type', async()=>{
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-native-inferred-calls-'));
  const source='export const primitive=()=>1; export const probe=()=>typeof primitive(); export const equality=()=>null===null; export const nullMembership=()=>[1].includes(null);';
  try {
    const result=translateJavaScript(source);
    assert.deepEqual(parseMeta(result.meta),result.program);
    assert.match(result.rust,/"number"\.to_string\(\)/u);
    const [,translated]=await compiledFixture(ts,directory,'inferred-calls',source,result.typescript);
    assert.equal(translated.probe(),'number');assert.equal(translated.equality(),true);
    assert.equal(translated.nullMembership(),false);assert.equal(evaluate(result.program,'null_membership',[]),false);
    assert.equal(evaluate(result.program,'probe',[]),'number');
    const unresolved=analyzeJavaScript('export const probe=()=>typeof primitive(); export const primitive=()=>1;');
    assert.equal(unresolved.items.find(item=>item.name==='probe').status,'unsupported');
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('shadowed Number ownership blocks partial admission even when imports are refused',()=>{
  const predicate='export const integer=value=>Number.isSafeInteger(value)?value:undefined;';
  for(const prefix of [
    'import Number from "custom";',
    'import * as Number from "custom";',
    'import { other as Number } from "custom";',
    'const Number = { isSafeInteger:()=>true };',
    'let unrelated=1, Number={};',
    'async function Number() {}',
    'class Number {}',
    'Number = custom;',
    'Number.isSafeInteger=custom;',
    'globalThis.Number=custom;',
  ])assert.equal(analyzeJavaScript(prefix+predicate).program.some(fn=>fn.name==='integer'),false,prefix);
  for(const source of [
    'export const integer=Number=>Number.isSafeInteger(1);',
    'export function integer(value) {const Number=custom;return Number.isSafeInteger(value);}',
  ])assert.throws(()=>translateJavaScript(source),TranslationError);
  assert.equal(analyzeJavaScript('import { Number as CustomNumber } from "custom";'+predicate).program.some(fn=>fn.name==='integer'),true);
  assert.equal(analyzeJavaScript('import { custom as undefined } from "custom"; export const missing=()=>undefined;').program.some(fn=>fn.name==='missing'),false);
});
