import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync,writeFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { analyzeJavaScript,translateJavaScript,parseMeta,TranslationError } from '../translator.mjs';
import { evaluate } from '../interpreter.mjs';
import { loadTypeScript } from '../native-typescript.mjs';

const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
async function runtimes(ts,directory,name,source,result) {
  const original=join(directory,name+'-source.mjs'),typed=join(directory,name+'.ts'),target=join(directory,name+'-target.mjs');
  writeFileSync(original,source);writeFileSync(typed,result.typescript);
  const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,skipLibCheck:true});
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  writeFileSync(target,ts.transpileModule(result.typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  return [await import(pathToFileURL(original).href),await import(pathToFileURL(target).href)];
}
function values() {
  const trap={get x(){throw Error('no property read');},[Symbol.toPrimitive](){throw Error('no coercion');}};
  return [undefined,null,false,true,0,-0,NaN,Infinity,-Infinity,1n,2n**100n,Symbol('x'),{},trap,()=>{},new String('x'),new Number(-0),new Boolean(false),['nested',{x:1}],[],new Map(),'', 'ordinary','\ud800','\udc00','\ud800x\udc00','\ud83d\ude00'];
}

test('six original native helper bodies retain arbitrary payloads and fresh aggregate allocations',{timeout:30000},async()=>{
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-native-aggregate-'));
  const fixtures=[['affinities.mjs','persisted_provider_kind','persistedProviderKind','identity'],['remote-operations.mjs','nullish','nullish','nullish'],['credential-operations.mjs','output','output','record'],['managed-server.mjs','out','out','rest'],['remote-operations.mjs','out','out','rest'],['operations.mjs','output','output','rest']];
  try {
    for(const [path,name,binding,kind]of fixtures) {
      const source=readFileSync(join(ROOT,'packages/javascript/native',path),'utf8'),analyzed=analyzeJavaScript(source),item=analyzed.items.find(item=>item.name===name&&item.status==='translated');
      assert.ok(item,`${path}:${name}`);assert.equal(analyzed.program.find(item=>item.name===name).kind,'function');
      const span=source.slice(item.start,item.end),kernel=span.startsWith('export ')?span:'export '+span,result=translateJavaScript(kernel);
      assert.deepEqual(parseMeta(result.meta),result.program);
      const [original,typed]=await runtimes(ts,directory,path+'-'+name,kernel,result);
      const implementations=[original[binding],typed[binding],(...args)=>evaluate(result.program,name,args)];
      for(const input of values()) {
        for(const invoke of implementations) {
          const first=invoke(input),second=invoke(input);
          if(kind==='identity'||kind==='nullish')assert.ok(Object.is(first,kind==='nullish'&&input===undefined?null:input));
          else {
            assert.notEqual(first,second,'each output record is fresh');assert.deepEqual(Object.keys(first),['output']);
            if(kind==='record')assert.ok(Object.is(first.output,input),'original input container/payload identity is retained');
            else {assert.notEqual(first.output,second.output,'rest array is fresh');assert.equal(first.output.length,1);assert.ok(Object.is(first.output[0],input));}
          }
        }
      }
      if(kind==='identity')for(const invoke of implementations){assert.equal(invoke('z.ai-coding-plan'),'zai-coding-plan');assert.equal(invoke('zai-coding-plan'),'zai-coding-plan');}
      if(kind==='rest')for(const invoke of implementations){const item={};const result=invoke(item,item);assert.equal(result.output[0],result.output[1]);assert.equal(result.output[0],item);assert.deepEqual(invoke().output,[]);}
      assert.match(result.rust,new RegExp(`fn ${name}<'a>\\(`));assert.match(result.rust,/String\(&'a \[u16\]\)/u);assert.match(result.rust,/Object\(&'a dyn std::any::Any\)/u);
      if(kind==='rest')assert.match(result.rust,/Vec<JsPayload<'a>>/u);
      if(kind==='record'||kind==='rest')assert.match(result.rust,/Rc::new\(std::cell::RefCell::new/u);
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('old identity source and generic aliases preserve null/undefined, nested containers, UTF16 and strict equality',async()=>{
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-payload-aliases-'));
  const source=`export function untyped(value) { return value; }
export function wrap(value){const array=[value,value];return {first:array,second:array};}
export function records(value){const record={payload:value};return {first:record,second:record};}
export function absent(value){return value===undefined;}
export function nullValue(value){return value===null;}
export function zero(value){return value===0;}
export function nan(value){return value===(0/0);}`;
  try {
    const result=translateJavaScript(source);assert.deepEqual(parseMeta(result.meta),result.program);
    const [original,typed]=await runtimes(ts,directory,'aliases',source,result);
    const implementations=[original,typed,new Proxy({}, {get:(_,name)=>(...args)=>evaluate(result.program,name==='nullValue'?'null_value':name,args)})];
    for(const input of values())for(const runtime of implementations) {
      assert.ok(Object.is(runtime.untyped(input),input));assert.equal(runtime.absent(input),input===undefined);assert.equal(runtime.nullValue(input),input===null);assert.equal(runtime.zero(input),input===0);assert.equal(runtime.nan(input),false);
      const first=runtime.wrap(input),next=runtime.wrap(input);assert.equal(first.first,first.second);assert.notEqual(first.first,next.first);assert.ok(Object.is(first.first[0],input));assert.ok(Object.is(first.first[1],input));first.first.push('change');assert.equal(first.second.length,3);
      const record=runtime.records(input);assert.equal(record.first,record.second);assert.ok(Object.is(record.first.payload,input));record.first.extra=1;assert.equal(record.second.extra,1);
    }
    assert.match(result.rust,/JsPayload::Undefined/u);assert.match(result.rust,/JsPayload::Null/u);assert.match(result.rust,/first: array\.clone\(\), second: array\.clone\(\)/u);assert.match(result.rust,/strict_primitive/u);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('aggregate ownership and payload capability crossings refuse effects, observations and inconsistent tags',()=>{
  const sources=[
    'export function bad(value){return {...value};}','export function bad(value){return {[value]:1};}',
    'export function bad(value){return {get field(){return value;}};}','export function bad(value){return {field:1,field:2};}',
    'export function bad(value){return {__proto__:value};}','export function bad(value){return {field:value.x};}',
    'export function bad(value){return {field:String(value)};}','export function bad(value){return [value,...value];}',
    'export function bad(...values,value){return values;}','export function bad(...values){values.push(1);return values;}',
    'export function bad(value){return value===value;}','export function bad(value){return value+1;}',
    'export function bad(value){const field=typeof value===\'string\';return {field:field,payload:value};}',
    '/** @param {string} value */ export function bad(value){return {field:value};}',
    '/** @returns {number} */ export function bad(value){return {field:value};}',
    'export function observer(value){return typeof value===\'string\';} export function bad(value){return {field:observer(value)};}',
    'export function bad(value){return {field:observer(value)};} export function observer(value){return typeof value===\'string\';}',
    'export function identity(value){return value;} export function observer(value){return typeof identity(value);}',
    'export function observer(value){return typeof identity(value);} export function identity(value){return value;}',
  ];
  for(const source of sources)assert.throws(()=>translateJavaScript(source),TranslationError,source);
  const valid=translateJavaScript('export function wrap(value){return {field:value};}');
  assert.throws(()=>parseMeta(valid.meta.replace('record%3A%5B%5B%22field%22%2C%22value%22%5D%5D','number')));
  const rest=translateJavaScript('export function rest(...values){return values;}');
  assert.throws(()=>parseMeta(rest.meta.replace('array-value (rest)','value (rest)')));
});
