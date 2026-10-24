// Independent expectation source; execution is deferred until all bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createOwnedCollectionsContext,ownedCollectionsRuntimeSources,translateOwnedCollectionsJavaScript,translateOwnedCollectionsTypeScript,readOwnedCollectionsMeta,prepareOwnedCollectionsRuntime,evaluateOwnedCollections,evaluateOwnedCollectionsBatch,emitOwnedCollectionsRust} from '../owned-collections.mjs';
import {prepareOwnedCollections} from '../../prepare-owned-collections.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../../router-core-source-data.mjs';
import {json_macro_null,json_macro_bool,json_macro_string} from '../../json-macro-runtime.mjs';
import {router_core_json_map,router_core_json_filter_map} from '../../json-collections-runtime.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60_000};
const imports='import {router_core_json_map as map,router_core_json_filter_map as filterMap} from "./runtime/json-collections-runtime.mjs";\nimport {router_core_json_copy as copy} from "./runtime/json-update-runtime.mjs";\nimport {serde_json_value_is_null as isNull} from "./runtime/json-runtime.mjs";\n';
const functions='export function copied(values){return map(values,value=>copy(value));}\nexport function selected(values){return filterMap(values,value=>{if(isNull(value)){return {$:"None"};}else{return {$:"Some",field0:copy(value)};}});}\nexport function twice(values){const first=map(values,value=>copy(value));return map(first,value=>copy(value));}\n';
const js=imports+functions;
function data(source=js,typed){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedCollectionsRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},{path:'Cargo.toml',source:readFileSync(join(root,'rust/Cargo.toml'),'utf8')},{path:'Cargo.lock',source:readFileSync(join(root,'rust/Cargo.lock'),'utf8')},{path:'caller.mjs',source},...(typed===undefined?[]:[{path:'caller.mts',source:typed}])]};}
function translate(source=js,typed){const annotated=typed===undefined?source.replaceAll('(values){','(values:Parameters<typeof map>[0]){'):typed,input=data(source,annotated),context=createOwnedCollectionsContext(input),result=translateOwnedCollectionsJavaScript(source,{sourcePath:'caller.mjs',typescriptOutputPath:'caller-reverse.mts',context});return {input,context,result};}
async function targets(t,source=js,typed){
 const row=translate(source,typed),directory=mkdtempSync(join(tmpdir(),'router-owned-collections-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};
 for(const file of row.input.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('caller-reverse.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'caller.mts'),join(directory,'caller-reverse.mts')],{cwd:root,encoding:'utf8',timeout:20_000,stdio:'pipe'});
 for(const file of row.input.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 const modules=[await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/caller.mjs')).href),await import(pathToFileURL(join(directory,'out/caller-reverse.mjs')).href)],token=await prepareOwnedCollectionsRuntime(row.result.program);
 return {...row,modules,token};
}
test('map filter-map and sequential collection callers preserve independent canonical values',limits,async t=>{
 const api=await targets(t),values=Object.freeze([json_macro_null(),json_macro_string('λ😀'),json_macro_bool(false)]),expected=[values[1],values[2]];
 for(const module of api.modules){for(const name of ['copied','twice']){const output=module[name](values);assert.deepEqual(output,values);assert.notEqual(output,values);assert.ok(Object.isFrozen(output));}assert.deepEqual(module.selected(values),expected);assert.deepEqual(module.selected(Object.freeze([])),[]);}
 for(const name of ['copied','twice'])assert.deepEqual(evaluateOwnedCollections(api.result.program,name,[values],api.token),values);
 assert.deepEqual(evaluateOwnedCollections(api.result.program,'selected',[values],api.token),expected);assert.deepEqual(evaluateOwnedCollectionsBatch(api.result.program,[['copied',[values]],['selected',[values]]],api.token),[values,expected]);assert.match(api.result.rust,/crate::translation_core::json_filter_map/);
});
test('paired callback parameter and local types remain independently checked',limits,async t=>{
 const source=imports+'export function copied(values){return map(values,value=>{const current=copy(value);return current;});}',typed=imports+'import type {JsonValue} from "./runtime/json-macro-runtime.mjs";\nexport function copied(values:Parameters<typeof map>[0]){return map(values,(value:JsonValue)=>{const current:JsonValue=copy(value);return current;});}';
 const api=await targets(t,source,typed);assert.deepEqual(api.modules[2].copied(Object.freeze([json_macro_string('x')])),[json_macro_string('x')]);
 assert.throws(()=>translate(source,typed.replace('current:JsonValue','current:boolean')),/paired written local ABI differs/);assert.throws(()=>translate(source,typed.replace('(value:JsonValue)','(value:string)')),/callback parameter differs/);
});
test('native callback order empty input and error short circuit have independent runtime expectations',limits,()=>{
 const values=Object.freeze([json_macro_string('a'),json_macro_string('b'),json_macro_string('c')]),seen=[];
 assert.deepEqual(router_core_json_map(Object.freeze([]),()=>assert.fail('empty callback')),[]);
 const filtered=router_core_json_filter_map(values,value=>{seen.push(value.field0);return value.field0==='b'?{$:'None'}:{$:'Some',field0:value};});assert.deepEqual(seen,['a','b','c']);assert.deepEqual(filtered,[values[0],values[2]]);
 const error=new Error('stop'),visited=[];assert.throws(()=>router_core_json_map(values,value=>{visited.push(value.field0);if(value.field0==='b')throw error;return value;}),value=>value===error);assert.deepEqual(visited,['a','b']);
});
test('callback escapes effects borrowed results nested callbacks and owned Option locals remain refused',limits,()=>{
 for(const body of ['return map(values,value=>value);','return map(values,async value=>copy(value));','return map(values,(value,index)=>copy(value));','return map(values,value=>{values.push(value);return copy(value);});','return map(values,value=>map(values,inner=>copy(inner)));','const callback=value=>copy(value);return map(values,callback);','return filterMap(values,value=>{const result={$:"Some",field0:copy(value)};return result;});','return map([copy(values)],value=>copy(value));'])assert.throws(()=>translate(imports+'export function copied(values){'+body+'}'));
});
test('forged detached meta callbacks and changed native/runtime sources cannot issue caller permission',limits,()=>{
 const {input,context,result}=translate(),program=readOwnedCollectionsMeta(result.meta,{context});assert.equal(emitOwnedCollectionsRust(program),result.rust);
 const forged=structuredClone(program);forged[0].body[0].value.callback.body[0].value={kind:'bool',value:true,type:'json',root:null};assert.throws(()=>emitOwnedCollectionsRust(forged));
 const changed=structuredClone(input);changed.files.find(row=>row.path==='src/translation_core/json_collections.rs').source+='\npub fn unrelated() {}\n';assert.throws(()=>createOwnedCollectionsContext(changed));
 const runtime=structuredClone(input);runtime.files.find(row=>row.path==='runtime/json-collections-runtime.mjs').source+='\nexport const counterfeit=true;\n';assert.throws(()=>createOwnedCollectionsContext(runtime));
});
test('complete copied checker emitter and codec retain original source and both CST inverse sequences',limits,()=>{
 const plan=prepareOwnedCollections();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.ok(row.originalPath.includes('owned-core-'));assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);}
});
test('authoritative TypeScript uses a fresh native projection and retains complete typed source inverses',limits,()=>{
 const typed=imports+'import type {JsonValue} from "./runtime/json-macro-runtime.mjs";\nexport function copied(values:Parameters<typeof map>[0]){return map(values,(value:JsonValue):JsonValue=>copy(value));}',input=data('',typed);input.files=input.files.filter(row=>row.path!=='caller.mjs');
 const context=createOwnedCollectionsContext(input),result=translateOwnedCollectionsTypeScript(typed,{context,sourcePath:'caller.mts'});assert.equal(result.originalTypeScript,typed);assert.equal(result.ownedCollectionTypeScriptHistory.projection.equation.inverse,typed);assert.match(result.rust,/crate::translation_core::json_map/);
 const conflict=data('export function unrelated(){return 1;}',typed),other=createOwnedCollectionsContext(conflict);assert.throws(()=>translateOwnedCollectionsTypeScript(typed,{context:other,sourcePath:'caller.mts'}),/Concurrent differing paired/);
});
