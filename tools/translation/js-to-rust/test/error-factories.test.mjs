import {rustPackageSourcePath} from "../../repository-layout.mjs";
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync,writeFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join,resolve } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { analyzeJavaScript,translateJavaScript,parseMeta,emitRust,emitTypeScript,TranslationError } from '../translator.mjs';
import { toLino } from '../vendor/ir.mjs';
import { privateErrorContracts } from '../vendor/private-contracts.mjs';
import { evaluate } from '../interpreter.mjs';
import { loadTypeScript } from '../native-typescript.mjs';

const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
async function runtimes(ts,directory,name,source,typescript) {
  const original=join(directory,name+'-source.mjs'),typed=join(directory,name+'.ts'),target=join(directory,name+'-target.mjs');
  writeFileSync(original,source);writeFileSync(typed,typescript);
  const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,skipLibCheck:true});
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  writeFileSync(target,ts.transpileModule(typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  return [await import(pathToFileURL(original).href),await import(pathToFileURL(target).href)];
}
function retainedValues() {
  return [undefined,null,false,true,0,-0,NaN,Infinity,1n,2n**100n,Symbol('x'),{},()=>{},['nested'],new String('boxed'),{get x(){throw Error('no getter');},[Symbol.toPrimitive](){throw Error('no coercion');}}];
}
function errorGolden(error,message,fields) {
  assert.ok(error instanceof Error);assert.equal(Object.getPrototypeOf(error),Error.prototype);
  assert.deepEqual(Object.getOwnPropertyDescriptor(error,'message'),{value:message,writable:true,enumerable:false,configurable:true});
  assert.equal(error.name,'Error');assert.deepEqual(Object.keys(error),Object.keys(fields));
  for(const [key,value]of Object.entries(fields)) {
    const descriptor=Object.getOwnPropertyDescriptor(error,key);
    assert.equal(descriptor.writable,true);assert.equal(descriptor.enumerable,true);assert.equal(descriptor.configurable,true);assert.ok(Object.is(descriptor.value,value),key);
  }
}

test('thirteen original private factories and all 192 source calls prove UTF16 messages and retain real Error behavior',{timeout:45000},async()=>{
  const fixtures=[
    ['auth-service.mjs','fail',1,16,'code','status',400,null],
    ['codex-login.mjs','fail',1,23,'code','status',400,null],
    ['credential-operations.mjs','fail',1,14,'code','exitCode',1,null],
    ['emergency-auth.mjs','failure',0,3,null,null,null,{code:'invalid_emergency_config',status:400}],
    ['managed-server.mjs','fail',0,51,null,null,null,{code:'managed_server'}],
    ['managed-server.mjs','unsupported',0,4,null,null,null,{code:'unsupported'}],
    ['operation-input.mjs','fail',0,3,null,null,null,{code:'operation_input',exitCode:2}],
    ['provider-manifest.mjs','fail',0,14,null,null,null,{code:'provider_import',exitCode:2}],
    ['provider-provision.mjs','failure',1,4,'outcome',null,null,{code:'provider_acceptance',exitCode:1}],
    ['remote-operations.mjs','error',0,24,null,'exitCode',1,{code:'remote-operation'}],
    ['resources.mjs','unsupported',0,8,null,null,null,{code:'unsupported'}],
    ['resources.mjs','bad',0,21,null,null,null,{code:'invalid_resource'}],
    ['token-import.mjs','fail',0,7,null,null,null,{code:'token_import',exitCode:2}],
  ];
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-private-errors-'));let calls=0;
  try {
    for(const [path,name,messageIndex,callCount,dynamicKey,defaultKey,fallback,constantFields]of fixtures) {
      const source=readFileSync(join(ROOT,'js/src',path),'utf8'),contracts=privateErrorContracts(source),analyzed=analyzeJavaScript(source);
      assert.equal(contracts.owned,true,path);const item=analyzed.items.find(item=>item.name===name&&item.status==='translated'),fn=analyzed.program.find(item=>item.name===name);
      assert.ok(item,`${path}:${name}`);assert.equal(fn.params[messageIndex].type,'utf16-string');assert.equal(fn.exported,false);
      const plan=[...contracts.bindings.values()].find(plan=>plan.message===messageIndex&&plan.calls.length===callCount&&!plan.reason);
      assert.ok(plan,path+':'+name);assert.ok(plan.calls.every(call=>call.proved));calls+=plan.calls.length;
      const program=parseMeta(toLino(fn));assert.deepEqual(program,[fn]);
      const typescript=emitTypeScript(program),rust=emitRust(program),span=source.slice(item.start,item.end);
      const [original,typed]=await runtimes(ts,directory,path+'-'+name,span+`\nexport {${name}};`,typescript+`\nexport {${name}};`);
      const implementations=[original[name],typed[name],(...args)=>evaluate(program,name,args)];
      for(const message of ['', 'ordinary','\ud800','\udc00','\ud800x\udc00','\ud83d\ude00'])for(const value of retainedValues()) {
        const args=messageIndex===1?[value,message]:[message];
        if(defaultKey)args.push(value);
        const expected={...(constantFields??{}),...(dynamicKey?{[dynamicKey]:value}:{}),...(defaultKey?{[defaultKey]:value===undefined?fallback:value}:{})};
        // Match the original literal field order independently of IR metadata.
        const ordered=dynamicKey==='outcome'?{code:expected.code,outcome:value,exitCode:expected.exitCode}:expected;
        for(const invoke of implementations){const first=invoke(...args),second=invoke(...args);assert.notEqual(first,second);errorGolden(first,message,ordered);}
      }
      if(defaultKey)for(const invoke of implementations){const args=messageIndex===1?['code','message']:['message'];const expected={...(constantFields??{}),...(dynamicKey?{[dynamicKey]:'code'}:{}),[defaultKey]:fallback};errorGolden(invoke(...args),'message',expected);}
      assert.match(rust,/message: &\[u16\]/u);assert.match(rust,/pub message: Vec<u16>/u);assert.match(rust,/JsErrorProjection/u);assert.doesNotMatch(rust,/pub stack|pub prototype|impl std::error::Error/u);
    }
    assert.equal(calls,192);
    const publicSource=readFileSync(join(ROOT,rustPackageSourcePath(ROOT,'js/src/client-files.mjs')),'utf8');assert.equal(analyzeJavaScript(publicSource).program.some(fn=>fn.name==='client_failure'),false);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('fresh Error projections share generated aliases without exposing stack or prototype capabilities',async()=>{
  const ts=loadTypeScript(ROOT),directory=mkdtempSync(join(tmpdir(),'router-error-aliases-'));
  const source=`const make=(code,message,status=400)=>Object.assign(new Error(message),{code,status});
export function pair(code){const error=make(code,'message');return {first:error,second:error};}`;
  try {
    const result=translateJavaScript(source),[original,typed]=await runtimes(ts,directory,'aliases',source,result.typescript);
    for(const input of retainedValues())for(const invoke of [original.pair,typed.pair,(value)=>evaluate(result.program,'pair',[value])]) {
      const first=invoke(input),second=invoke(input);assert.equal(first.first,first.second);assert.notEqual(first.first,second.first);errorGolden(first.first,'message',{code:input,status:400});first.first.status=0;assert.equal(first.second.status,0);assert.equal(second.first.status,400);
    }
    assert.match(result.rust,/message: \(message\)\.to_vec\(\)/u);assert.match(result.rust,/first: error\.clone\(\), second: error\.clone\(\)/u);assert.match(result.rust,/make\(code, &\[109, 101, 115, 115, 97, 103, 101\], JsPayload::Undefined\)/u);
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('whole-module contracts refuse message coercion, aliases, intrinsic mutations, special setters, reflection and throws',()=>{
  const factory="const make=message=>Object.assign(new Error(message),{code:'fixed'});",call='make("message");';
  const defects=[
    'make(unknown);','make(new String("boxed"));','make(Symbol());','make();','make(...args);','make?.("message");',
    'const alias=make;','consume(make);','export {make};','const hidden=`${make}`;','function nested(make){return make("x");}',
    'Error=custom;','const Error=custom;','function nested(Error){return 1;}','globalThis["Err"+"or"]=custom;',
    'Object.assign=custom;','(Object.assign)=custom;','[Object.assign]=[custom];','delete(Object.assign);',
    'const Object=custom;','const hidden=`${Error.prototype.code=custom}`;','const hidden=`${globalThis.Error=custom}`;',
    'Error.prototype.code=custom;','Object.defineProperty(Error.prototype,"code",{set(value){}});',
    'const proto=Object["getPrototypeOf"](new Error("x"));','eval("Error=custom");','Function("Error=custom")();',
    'const observed=make("x").stack;','const observed=make("x").constructor;',
  ];
  for(const defect of defects) {
    const source=factory+call+defect;
    assert.equal(analyzeJavaScript(source).program.some(fn=>fn.name==='make'),false,defect);
    assert.throws(()=>translateJavaScript(source),TranslationError,defect);
  }
  for(const body of ['throw make("x");','return typeof make("x");','return make("x")===make("x");','const error=make("x");return error===error;']) {
    const source=factory+`export function observer(){${body}}`,analyzed=analyzeJavaScript(source);
    assert.equal(analyzed.program.some(fn=>fn.name==='make'),true,body);
    assert.equal(analyzed.program.some(fn=>fn.name==='observer'),false,body);
    assert.throws(()=>translateJavaScript(source),TranslationError,body);
  }
  for(const fields of ['{__proto__:value}','{constructor:value}','{message:value}','{name:value}','{stack:value}','{toString:value}','{valueOf:value}','{...value}','{get code(){return value;}}','{code:value.x}']) {
    const source=`const make=(value,message)=>Object.assign(new Error(message),${fields});make(1,'x');`;
    assert.equal(analyzeJavaScript(source).program.some(fn=>fn.name==='make'),false,fields);
  }
  for(const source of [
    'export function array(){const values=[];return values===values;}',
    'export function record(){const value={code:1};return value===value;}',
  ])assert.throws(()=>translateJavaScript(source),TranslationError,source);
  const checked=translateJavaScript(factory+'export function retained(){return make("x");}');
  const wrongReturn=structuredClone(checked.program);wrongReturn[0].returns='value';
  assert.throws(()=>parseMeta(wrongReturn.map(toLino).join('\n')));
  const wrongField=structuredClone(checked.program);wrongField[0].body[0].value.fields[0].name='message';
  assert.throws(()=>parseMeta(wrongField.map(toLino).join('\n')));
  assert.throws(()=>translateJavaScript('export const make=message=>Object.assign(new Error(message),{code:"x"});'),TranslationError);
  assert.throws(()=>translateJavaScript('/** @param {source-owned-utf16-string} message */ export function forged(message){return new Error(message);}'),TranslationError);
  const setterSource=factory+'let effects=[];Object.defineProperty(Error.prototype,"code",{set(value){effects.push(value)}});make("message");effects;';
  assert.deepEqual(Array.from(vm.runInNewContext(setterSource)),['fixed'],'actual inherited setter effect is refused, not silently replaced by an own field');
  const templateSource=factory+'let effects=0;const value={[Symbol.toPrimitive](){effects++;return "message"}};make(`${value}`);effects;';
  assert.equal(vm.runInNewContext(templateSource),1,'argument template coercion occurs before the proved string reaches the helper');
  assert.equal([...privateErrorContracts(templateSource).bindings.values()][0].reason,null);
});
