import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createOwnedCoreSourceContext,translateOwnedCoreJavaScript,translateOwnedCoreConcreteSyntaxMeta,parseOwnedCoreMeta,analyzeJavaScript,emitRust} from '../translator.mjs';
import {ownedCoreRuntimeSources,ownedCoreSourceData} from '../owned-core-source.mjs';
import {evaluate,prepareOwnedCoreRuntime} from '../interpreter.mjs';
import {prepareReverseConcreteSource} from '../concrete-source.mjs';
import {json_macro_null,json_macro_string,json_macro_object,json_macro_bool,json_macro_array} from '../../json-macro-runtime.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const limits={timeout:60000};
const imports="import {router_core_json_copy as copy,router_core_json_with_field as update,router_core_json_index_str as index,router_core_json_index_usize as at} from './runtime/json-update-runtime.mjs';\n";
const param='/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value */\n';
function corpus(source){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'Cargo.toml',source:original('Cargo.toml')},{path:'Cargo.lock',source:original('Cargo.lock')},{path:'caller.mjs',source}]};}
function original(path){return existsSync(join(root,path))?readFileSync(join(root,path),'utf8'):execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:16777216});}
function translate(source){const data=corpus(source),context=createOwnedCoreSourceContext(data);return {data,context,result:translateOwnedCoreJavaScript(source,{sourcePath:'caller.mjs',context})};}
async function targets(t,source){
 const {data,context,result}=translate(source),directory=mkdtempSync(join(tmpdir(),'owned-reverse-ts-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const row of data.files.filter(row=>row.path.endsWith('.mjs')||row.path.endsWith('.mts'))){mkdirSync(dirname(join(directory,row.path)),{recursive:true});writeFileSync(join(directory,row.path),row.source);}
 writeFileSync(join(directory,'caller.mts'),result.typescript);
 const compiler=join(root,'packages/javascript/node_modules/typescript/bin/tsc');
 const args=[compiler,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'caller.mts')];
 try{execFileSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:20000,stdio:'pipe'});}catch(error){assert.fail('strict emitted TypeScript failed\n'+String(error.stdout??'')+'\n'+String(error.stderr??''));}
 // tsc leaves runtime .mjs inputs in place; emitted code imports its sibling.
 mkdirSync(join(directory,'out/runtime'),{recursive:true});for(const row of data.files.filter(row=>row.path.startsWith('runtime/')))writeFileSync(join(directory,'out',row.path),row.source);
 const sourceModule=await import(pathToFileURL(join(directory,'caller.mjs')).href),typed=await import(pathToFileURL(join(directory,'out/caller.mjs')).href),runtime=await prepareOwnedCoreRuntime(result.program);
 return {sourceModule,typed,result,context,run:(name,args)=>evaluate(result.program,name,args,runtime)};
}
test('owned copy and update retain independent source, IR and strict TypeScript behavior',limits,async t=>{
 const source=imports+param+'export function changed(value){ const result=update(value,"k",copy(value)); return result; }';
 const api=await targets(t,source),input=json_macro_object([['old',json_macro_string('🦀')]]),expected=json_macro_object([['old',json_macro_string('🦀')],['k',input]]);
 for(const result of [api.sourceModule.changed(input),api.typed.changed(input),api.run('changed',[input])]){assert.deepEqual(result,expected);assert.notEqual(result,input);assert.ok(Object.isFrozen(result));}
 assert.deepEqual(input,json_macro_object([['old',json_macro_string('🦀')]]));assert.match(api.result.rust,/crate::translation_core::json_with_field/u);
 const reused=await targets(t,imports+param+'export function retained(value){const local=copy(value);const alias=local;return update(local,"again",alias);}');const object=json_macro_object([['a',json_macro_bool(true)]]);assert.deepEqual(reused.run('retained',[object]),reused.typed.retained(object));assert.match(reused.result.rust,/let alias = __ro_copy\(&local\)/u);assert.match(reused.result.rust,/let __ro_arg_[0-9]+ = &local;/u);
});
test('all source arguments bind before consuming copies and complete meta edits refuse',limits,async t=>{
 const api=await targets(t,imports+param+'export function preserved(value){ const next=update(value,"nested",value); return update(next,"again",value); }');
 const input=json_macro_bool(true);assert.throws(()=>api.sourceModule.preserved(input),/object or null/u);
 const text=api.result.rust;assert.ok(text.indexOf('let __ro_arg_0')<text.indexOf('__ro_with_field(__ro_arg_0'));
 assert.throws(()=>parseOwnedCoreMeta(api.result.meta.replace('nested','forged'),{context:api.context}));
 const decoded=parseOwnedCoreMeta(api.result.meta,{context:api.context});assert.equal(emitRust(decoded),text);
});
test('borrowed indices use the actual input root and canonical Null semantics',limits,async t=>{
 const source=imports+param+'export function first(value){ return index(value,"name"); }';const api=await targets(t,source),leaf=json_macro_string('é'),input=json_macro_object([['name',leaf]]);
 assert.deepEqual(api.run('first',[input]),leaf);assert.equal(api.sourceModule.first(json_macro_null()).$, 'Null');assert.equal(api.typed.first(json_macro_null()).$,'Null');
 const bad=imports+param+'export function dangling(value){return index(copy(value),"name");}';assert.throws(()=>translate(bad),/live input root/u);
 const mapSource="import {router_core_json_map_index as mapi} from './runtime/json-update-runtime.mjs';\n/** @param {Parameters<typeof mapi>[0]} value */\nexport function required(value){return mapi(value,\"name\");}";
 const mapApi=await targets(t,mapSource);assert.deepEqual(mapApi.run('required',[input.field0]),leaf);assert.throws(()=>mapApi.typed.required(json_macro_object([]).field0),/no entry found for key/u);
});
test('whole-function immutable branches and independent borrowed keys retain ordering',limits,async t=>{
 const source=imports+'/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value @param {boolean} yes */\nexport function choose(value,yes){if(yes){return copy(value);}else{return update(value,"ok",copy(value));}}';
 const api=await targets(t,source),input=json_macro_null();for(const flag of [true,false])assert.deepEqual(api.run('choose',[input,flag]),api.typed.choose(input,flag));
 assert.throws(()=>translate(source.replace('return copy(value);','value=copy(value);return value;')),/effects/u);
});
test('shadowed, forged, reexport-mutated and custom source calls never gain host permission',limits,()=>{
 const source=imports+param+'export function copied(value){return copy(value);}';const data=corpus(source);
 const runtime=data.files.find(row=>row.path==='runtime/json-update-runtime.mjs');runtime.source+='\nexport const forged=()=>0;';assert.throws(()=>createOwnedCoreSourceContext(data),/runtime differs/u);
 assert.throws(()=>translate(imports+param+'export function copied(value){const copy=value;return copy(value);}'),/actual import symbol/u);
 assert.throws(()=>translate(imports+param+'export function copied(value){return value.clone();}'),/direct original imported call/u);
 const altered=corpus(source);altered.files.find(row=>row.path==='src/translation_core/primitives.rs').source+='\n';assert.throws(()=>createOwnedCoreSourceContext(altered),/owned Rust sources differ/u);
 const inputData=corpus(source);Object.defineProperty(inputData,'runtimeRoot',{get(){assert.fail('accessor invoked');}});assert.throws(()=>createOwnedCoreSourceContext(inputData),/accessor/u);
});
test('CST reconstruction and checked Links reissue retain all source and type boundaries',limits,async t=>{
 const source=imports+param+'export function copied(value){return copy(value);}';const {context,result}=translate(source);
 const again=translateOwnedCoreConcreteSyntaxMeta(result.concreteSyntax.meta,{sourcePath:'caller.mjs',context});assert.equal(again.rust,result.rust);assert.equal(again.meta,result.meta);
 assert.throws(()=>parseOwnedCoreMeta(result.meta.replace('owned-function','function'),{context}));
 const fake=JSON.parse(JSON.stringify(result.program));fake[0].returns='bool';assert.throws(()=>emitRust(fake),/unissued/u);
 assert.ok(analyzeJavaScript(source).diagnostics.length);assert.equal(ownedCoreSourceData(context).files.find(row=>row.path==='caller.mjs').source,source);
 const invalidJavaScript=imports+'export function copied(value: string){return copy(value);}';assert.throws(()=>translate(invalidJavaScript),/native source syntax/u);
 const typedData=corpus(source);typedData.files.find(row=>row.path==='caller.mjs').path='caller.mts';const typedContext=createOwnedCoreSourceContext(typedData);assert.throws(()=>translateOwnedCoreJavaScript(source,{sourcePath:'caller.mts',context:typedContext}),/source language/u);
 const typedSource=imports+'import type {JsonValue} from "./runtime/json-macro-runtime.mjs";\nexport function copied(value: JsonValue): import("./runtime/json-macro-runtime.mjs").JsonValue {return copy(value);}';
 const receive=text=>{const data=corpus(text);data.files.find(row=>row.path==='caller.mjs').path='caller.mts';const context=createOwnedCoreSourceContext(data),stage=prepareReverseConcreteSource(text,'TypeScript');return {data,context,result:translateOwnedCoreConcreteSyntaxMeta(stage.concreteSyntax.meta,{sourcePath:'caller.mts',context})};};
 const received=receive(typedSource),directory=mkdtempSync(join(tmpdir(),'owned-written-return-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const row of received.data.files.filter(row=>row.path.startsWith('runtime/'))){mkdirSync(dirname(join(directory,row.path)),{recursive:true});writeFileSync(join(directory,row.path),row.source);}
 writeFileSync(join(directory,'original.mts'),typedSource);writeFileSync(join(directory,'caller.mts'),received.result.typescript);
 try{execFileSync(process.execPath,[join(root,'packages/javascript/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'original.mts'),join(directory,'caller.mts')],{cwd:root,encoding:'utf8',timeout:20000,stdio:'pipe'});}catch(error){assert.fail('strict original/emitted written-return TypeScript failed\n'+String(error.stdout??'')+'\n'+String(error.stderr??''));}
 mkdirSync(join(directory,'out/runtime'),{recursive:true});for(const row of received.data.files.filter(row=>row.path.startsWith('runtime/')))writeFileSync(join(directory,'out',row.path),row.source);
 const actual=await import(pathToFileURL(join(directory,'out/original.mjs')).href),emitted=await import(pathToFileURL(join(directory,'out/caller.mjs')).href),input=json_macro_object([['name',json_macro_string('🦀')]]),golden=json_macro_object([['name',json_macro_string('🦀')]]);
 assert.deepEqual(actual.copied(input),golden);assert.deepEqual(emitted.copied(input),golden);assert.notEqual(emitted.copied(input),input);
 assert.equal(parseOwnedCoreMeta(received.result.meta,{context:received.context})[0].returns,'json');
 const borrowed=receive(typedSource.replace('return copy(value);','return index(value,"name");'));assert.equal(borrowed.result.program[0].returns,'json-ref');assert.equal(borrowed.result.program[0].resultRoot,'value');
 assert.throws(()=>receive(typedSource.replace(': import("./runtime/json-macro-runtime.mjs").JsonValue',': boolean')),/written return ABI/u);
 assert.throws(()=>receive(typedSource.replace(': import("./runtime/json-macro-runtime.mjs").JsonValue',': Promise<boolean>')),/actual import symbol/u);
 const shadow=typedSource.replace('import type {JsonValue} from "./runtime/json-macro-runtime.mjs";','type JsonValue = {readonly counterfeit: true};');assert.throws(()=>receive(shadow),/unsupported declaration/u);
 const malformedJSDoc=imports+param+'/** @returns {boolean} */\nexport function copied(value){return copy(value);}';assert.throws(()=>translate(malformedJSDoc),/written input domain required/u);
 const wrongJSDocReturn=imports+'/** @param {import("./runtime/json-macro-runtime.mjs").JsonValue} value\n * @returns {boolean} */\nexport function copied(value){return copy(value);}';assert.throws(()=>translate(wrongJSDocReturn),/written return ABI/u);

});
test('canonical JSON aggregate boundaries and wrong kinds preserve actual runtime refusals',limits,async t=>{
 const api=await targets(t,imports+param+'export function copied(value){return copy(value);}');
 const values=Array.from({length:4095},()=>json_macro_null()),limit=json_macro_array(values);assert.deepEqual(api.run('copied',[limit]),limit);
 assert.throws(()=>json_macro_array([...values,json_macro_null()]),/canonical/u);
 const forged=Object.freeze({$:'String',field0:{toString(){assert.fail('coercion invoked');}}});assert.throws(()=>api.run('copied',[forged]),/scalar domain/u);
 const changed=imports+param+'export function bad(value){try{return copy(value);}catch(error){return copy(value);}}';assert.throws(()=>translate(changed),/effects/u);
});
test('parse and callback operations remain explicitly unsupported until their own complete profiles',limits,()=>{
 const source="import {router_core_json_parse as parse} from './runtime/json-update-runtime.mjs';\n/** @param {string} value */\nexport function parsed(value){return parse(value);}";
 assert.throws(()=>translate(source),/original runtime has no such export|unregistered source operation/u);
 const source2=imports+param+'export function copied(value){return copy(()=>value);}';assert.throws(()=>translate(source2),/unimplemented expression/u);
 const plain=imports+'/** @param {bigint} value */\nexport function indexed(value){return at(copy(value),value);}';assert.throws(()=>translate(plain),/written type domain/u);
});
