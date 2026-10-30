// Independent complete receiving regression SOURCE; no execution while drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {createOwnedStateContext,translateOwnedStateJavaScript,translateOwnedStateTypeScript,readOwnedStateMeta,emitOwnedStateRust,prepareOwnedStateRuntime,evaluateOwnedState,evaluateOwnedStateBatch} from '../owned-state.mjs';
import {translateOwnedStateRust} from '../owned-rust.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../../json-fields-native-source.mjs';
import {prepareJsonFieldSources} from '../../prepare-json-field-sources.mjs';
import {prepareJsonFieldsCore} from '../../prepare-json-fields-core.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object,json_macro_array as array,json_macro_u64 as unsigned,json_macro_i64 as signed} from '../../json-macro-runtime.mjs';
const limits={timeout:60_000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const imports=`import {router_field_json_field as field,router_field_json_index as at,router_field_json_str_field as string,router_field_json_bool_field as boolean,router_field_json_u64_field as count,router_field_json_i64_field as signed} from './runtime/json-fields-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {json_macro_null as nil,json_macro_u64 as number} from './runtime/json-macro-runtime.mjs';
`;
const source=imports+`
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function get(value,key){return field(value,key);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {Parameters<typeof at>[1]} index */
export function index(value,index){return at(value,index);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function getString(value,key){return string(value,key);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function getBoolean(value,key){return boolean(value,key);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function getCount(value,key){return count(value,key);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function getSigned(value,key){return signed(value,key);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function positive(value,key){const result=count(value,key);if(result.$==='None'){return false;}return result.field0>0n;}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function negative(value,key){const result=signed(value,key);if(result.$==='None'){return false;}return result.field0<0n;}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value @param {string} key */
export function countJson(value,key){const result=count(value,key);if(result.$==='None'){return nil();}return number(result.field0);}
`;
function data(files=[{path:'caller.mjs',source}]){const input=ownedStateReceivingData(files);input.files.find(row=>row.path==='src/lib.rs').source+='pub mod translation_json_fields_core;\n';input.files.push({path:'src/translation_json_fields_core.rs',source:JSON_FIELDS_NATIVE_SOURCE});return input;}
function draft(){const input=data(),context=createOwnedStateContext(input),result=translateOwnedStateJavaScript(source,{context,sourcePath:'caller.mjs'});return {input,context,result};}
async function targets(t,row){
 const directory=mkdtempSync(join(tmpdir(),'router-owned-json-fields-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};for(const file of row.input.files.filter(file=>/\.(mjs|mts|ts)$/u.test(file.path)))write(file.path,file.source);write('typed.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20_000});for(const file of row.input.files.filter(file=>file.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 return [await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/typed.mjs')).href)];
}
test('all field Options numeric guards and JSON reuse execute actual JS strict TS and both interpreters',limits,async t=>{
 const row=draft(),modules=await targets(t,row),token=await prepareOwnedStateRuntime(row.result.program),value=object([['name',text('λ😀')],['enabled',bool(false)],['count',unsigned(42n)],['negative',signed(-1n)],['null',nil()]]),some=field0=>({$:'Some',field0}),none={$:'None'},cases=[['get',[value,'null'],some(nil())],['get',[value,'absent'],none],['index',[array([nil()]),0n],some(nil())],['getString',[value,'name'],some('λ😀')],['getBoolean',[value,'enabled'],some(false)],['getCount',[value,'count'],some(42n)],['getSigned',[value,'negative'],some(-1n)],['positive',[value,'count'],true],['positive',[value,'missing'],false],['negative',[value,'negative'],true],['countJson',[value,'count'],unsigned(42n)],['countJson',[value,'name'],nil()]];
 for(const module of modules)for(const [name,args,expected]of cases)assert.deepEqual(module[name](...args),expected);assert.deepEqual(cases.map(([name,args])=>evaluateOwnedState(row.result.program,name,args,token)),cases.map(row=>row[2]));assert.deepEqual(evaluateOwnedStateBatch(row.result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));assert.equal(emitOwnedStateRust(readOwnedStateMeta(row.result.meta,{context:row.context})),row.result.rust);
});
test('authoritative emitted TS and canonical Rust both recheck actual field imports and source histories',limits,()=>{
 const row=draft(),typedInput=data([{path:'caller.mts',source:row.result.typescript}]),typed=translateOwnedStateTypeScript(row.result.typescript,{context:createOwnedStateContext(typedInput),sourcePath:'caller.mts'});assert.equal(typed.rust,row.result.rust);
 const inverseInput={...row.input,files:[...row.input.files,{path:'caller.rs',source:row.result.rust}]},inverse=translateOwnedStateRust(row.result.rust,{context:createOwnedStateContext(inverseInput),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.equal(inverse.rust,row.result.rust);assert.equal(inverse.ownedRustSourceHistory.equation.inverse,row.result.rust);
});
test('native/runtime counterfeit source aliases unknown imports and escaping local loans remain refused',limits,()=>{
 for(const path of ['src/translation_json_fields_core.rs','runtime/json-fields-runtime.mjs']){const input=data();input.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedStateJavaScript(source,{context:createOwnedStateContext(input),sourcePath:'caller.mjs'}));}
 const input=data();input.files.find(row=>row.path==='src/lib.rs').source=input.files.find(row=>row.path==='src/lib.rs').source.replace('pub mod translation_json_fields_core;','');assert.throws(()=>translateOwnedStateJavaScript(source,{context:createOwnedStateContext(input),sourcePath:'caller.mjs'}));
 const local=imports+"/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */ export function invalid(value){const owned=copy(value);return field(owned,'name');}",context=createOwnedStateContext(data([{path:'caller.mjs',source:local}]));assert.throws(()=>translateOwnedStateJavaScript(local,{context,sourcePath:'caller.mjs'}),/live actual input root/);
});
test('complete native root and every prior implementation retain two-sequence CST successors',limits,()=>{
 const native=prepareJsonFieldsCore();assert.equal(native.files.length,1);assert.equal(native.files[0].current,native.files[0].currentAfter);assert.equal(native.rustExecuted,false);
 const source=prepareJsonFieldSources();assert.equal(source.files.length,9);for(const row of source.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
