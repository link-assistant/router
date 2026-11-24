import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { writeFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { translateJavaScript,parseMeta,TranslationError } from '../translator.mjs';
import { evaluate } from '../interpreter.mjs';
import { loadTypeScript } from '../native-typescript.mjs';

const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
test('closed defaults trigger only for omission/undefined and retain payload identity and parameter order',async()=>{
  const source=`/** @param {number} n @returns {number} */ export function defaults(n = 1) { return n; }
export function number(value=7){return value;}
export function boolean(value=false){return value;}
export function text(value='fallback'){return value;}
export function absent(value=null){return value;}
export function ordered(first=1,second=2,third=3){return {first,second,third};}
/** @returns {number} */ export function supplied(){return defaults(0);}
/** @returns {number} */ export function omitted(){return defaults();}
export function observer(value=1){return typeof value==='number';}
export function observedDefault(){return observer();}
export function observedUndefined(){return observer(undefined);}`;
  const result=translateJavaScript(source),directory=mkdtempSync(join(tmpdir(),'router-closed-defaults-')),ts=loadTypeScript(ROOT);
  try {
    const original=join(directory,'original.mjs'),typed=join(directory,'generated.ts'),target=join(directory,'generated.mjs');writeFileSync(original,source);writeFileSync(typed,result.typescript);
    const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,skipLibCheck:true});assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
    writeFileSync(target,ts.transpileModule(result.typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
    const originalRuntime=await import(pathToFileURL(original).href),typedRuntime=await import(pathToFileURL(target).href);
    assert.deepEqual(parseMeta(result.meta),result.program);
    for(const name of ['number','boolean','text','absent']) {
      const fallback={number:7,boolean:false,text:'fallback',absent:null}[name];
      for(const value of [undefined,null,NaN,-0,0,false,true,'','\ud800','\udc00',1n,Symbol(),{},()=>{},[],{[Symbol.toPrimitive](){throw Error('defaults must not coerce');}}])for(const invoke of [originalRuntime[name],typedRuntime[name],(...args)=>evaluate(result.program,name,args)])assert.ok(Object.is(invoke(value),value===undefined?fallback:value),name);
      for(const invoke of [originalRuntime[name],typedRuntime[name],(...args)=>evaluate(result.program,name,args)])assert.ok(Object.is(invoke(),fallback));
    }
    for(const runtime of [originalRuntime,typedRuntime]) {
      assert.equal(runtime.defaults(),1);assert.equal(runtime.defaults(undefined),1);assert.ok(Object.is(runtime.defaults(-0),-0));assert.ok(Object.is(runtime.defaults(NaN),NaN));assert.equal(runtime.supplied(),0);assert.equal(runtime.omitted(),1);
      assert.deepEqual(runtime.ordered(),{first:1,second:2,third:3});assert.deepEqual(runtime.ordered(null,undefined,false),{first:null,second:2,third:false});
    }
    assert.deepEqual(evaluate(result.program,'ordered',[null,undefined,false]),{first:null,second:2,third:false});assert.equal(evaluate(result.program,'supplied',[]),0);assert.equal(evaluate(result.program,'omitted',[]),1);
    for(const value of [undefined,null,NaN,-0,0,false,'',1n,Symbol(),{},()=>{}])for(const invoke of [originalRuntime.observer,typedRuntime.observer,(value)=>evaluate(result.program,'observer',[value])])assert.equal(invoke(value),typeof(value===undefined?1:value)==='number');
    for(const name of ['observedDefault','observedUndefined']) {
      assert.equal(originalRuntime[name](),true);assert.equal(typedRuntime[name](),true);
      assert.equal(evaluate(result.program,name.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()),[]),true);
    }
    assert.match(result.rust,/observer\(JsValue::Undefined\)/u);
    assert.doesNotMatch(result.rust,/observer\(JsPayload::Undefined\)/u);
    assert.match(result.rust,/fn defaults\(n: Option<f64>\)/u);assert.match(result.rust,/defaults\(Some\(0\.0\)\)/u);assert.match(result.rust,/defaults\(None\)/u);
    const ordered=result.rust.slice(result.rust.indexOf('fn ordered'));
    assert.ok(ordered.indexOf('let first =')<ordered.indexOf('let second ='));assert.ok(ordered.indexOf('let second =')<ordered.indexOf('let third ='));
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('effectful/dependent defaults and wrong default/return tags remain refused before emission',()=>{
  const cases=[
    '/** @param {number} n @returns {number} */ export function defaults(n = sideEffect()) { return n; }',
    'export function dependent(first=1,second=first){return second;}',
    'export function object(value={}){return value;}',
    'export function getter(value=source.field){return value;}',
    'export function rest(...values=1){return values;}',
    '/** @param {number} value @returns {number} */ export function wrong(value=null){return value;}',
    '/** @param {number} value @returns {number} */ export function wrong(value=false){return value;}',
  ];
  for(const source of cases)assert.throws(()=>translateJavaScript(source),TranslationError,source);
  const trace='let order=[];function side(label){order.push(label);return label;}function defaults(first=side("first"),second=side("second")){return [first,second];}defaults();order;';
  assert.deepEqual(Array.from(vm.runInNewContext(trace)),['first','second']);assert.throws(()=>translateJavaScript(trace),TranslationError);
  const valid=translateJavaScript('export function defaults(value=1){return value;}');
  assert.throws(()=>parseMeta(valid.meta.replace('(default (number 1))','(default (call absent))')));
});
