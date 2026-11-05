// Independent source-only regressions; no execution during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createOwnedIterationContext,ownedIterationRuntimeSources,translateOwnedIterationJavaScript,translateOwnedIterationTypeScript,readOwnedIterationMeta,prepareOwnedIterationRuntime,evaluateOwnedIteration,evaluateOwnedIterationBatch} from '../owned-iteration.mjs';
import {emitOwnedCoreProgram} from '../owned-iteration-operations.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../../json-iteration-native-source.mjs';
import {prepareOwnedIteration} from '../../prepare-owned-iteration.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../../router-core-source-data.mjs';
import {json_macro_null,json_macro_bool,json_macro_string} from '../../json-macro-runtime.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),limits={timeout:60_000};
const imports='import {router_core_json_filter as filter,router_core_json_any as any,router_core_json_all as all,router_core_json_find as find,router_core_json_fold as fold} from "./runtime/json-iteration-runtime.mjs";\nimport {router_core_json_copy as copy} from "./runtime/json-update-runtime.mjs";\nimport {serde_json_value_is_null as isNull} from "./runtime/json-runtime.mjs";\n';
const functions='export function selected(values){return filter(values,value=>!isNull(value));}\nexport function hasNull(values){return any(values,value=>isNull(value));}\nexport function noNull(values){return all(values,value=>!isNull(value));}\nexport function firstNull(values){return find(values,value=>isNull(value));}\nexport function last(values,initial){return fold(values,initial,(accumulator,value)=>copy(value));}\nexport function firstOr(values,initial){const found=find(values,value=>!isNull(value));if(found.$==="Some"){return copy(found.field0);}else{return copy(initial);}}\n';
const js=imports+functions;
function typed(source){return source.replace(imports,imports+'import type {JsonValue} from "./runtime/json-macro-runtime.mjs";\n').replaceAll('(values){','(values:Parameters<typeof filter>[0]){').replaceAll('(values,initial){','(values:Parameters<typeof filter>[0],initial:JsonValue){');}
function data(source=js,typescript=typed(source)){return {runtimeRoot:'runtime',declarationRoot:'runtime',files:[...ownedIterationRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\npub mod translation_collections_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},{path:'src/translation_collections_core.rs',source:JSON_ITERATION_NATIVE_SOURCE},{path:'Cargo.toml',source:readFileSync(join(root,'rust/Cargo.toml'),'utf8')},{path:'Cargo.lock',source:readFileSync(join(root,'Cargo.lock'),'utf8')},{path:'caller.mjs',source},{path:'caller.mts',source:typescript}]};}
function translate(source=js,typescript=typed(source)){const input=data(source,typescript),context=createOwnedIterationContext(input);return {input,context,result:translateOwnedIterationJavaScript(source,{context,sourcePath:'caller.mjs',typescriptOutputPath:'reverse.mts'})};}
async function targets(t){
 const row=translate(),directory=mkdtempSync(join(tmpdir(),'router-owned-iteration-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),source);};
 for(const file of row.input.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('reverse.mts',row.result.typescript);
 execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'caller.mts'),join(directory,'reverse.mts')],{cwd:root,encoding:'utf8',timeout:20_000,stdio:'pipe'});
 for(const file of row.input.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 const modules=[await import(pathToFileURL(join(directory,'caller.mjs')).href),await import(pathToFileURL(join(directory,'out/caller.mjs')).href),await import(pathToFileURL(join(directory,'out/reverse.mjs')).href)],token=await prepareOwnedIterationRuntime(row.result.program);return {...row,modules,token};
}
test('all five iteration callers and an owned find projection reach strict targets and both interpreters',limits,async t=>{
 const api=await targets(t),values=Object.freeze([json_macro_null(),json_macro_string('λ😀'),json_macro_bool(false)]),initial=json_macro_string('initial');
 for(const module of api.modules){assert.deepEqual(module.selected(values),[values[1],values[2]]);assert.equal(module.hasNull(values),true);assert.equal(module.noNull(values),false);assert.deepEqual(module.firstNull(values),{$:'Some',field0:json_macro_null()});assert.deepEqual(module.last(values,initial),json_macro_bool(false));assert.deepEqual(module.last(Object.freeze([]),initial),initial);assert.deepEqual(module.firstOr(values,initial),values[1]);assert.deepEqual(module.firstOr(Object.freeze([]),initial),initial);}
 const requests=[['selected',[values]],['hasNull',[values]],['noNull',[values]],['firstNull',[values]],['last',[values,initial]],['firstOr',[values,initial]]],expected=[[values[1],values[2]],true,false,{$:'Some',field0:json_macro_null()},json_macro_bool(false),values[1]];
 assert.deepEqual(requests.map(([name,args])=>evaluateOwnedIteration(api.result.program,name,args,api.token)),expected);assert.deepEqual(evaluateOwnedIterationBatch(api.result.program,requests,api.token),expected);assert.match(api.result.rust,/crate::translation_collections_core::json_fold/);assert.match(api.result.rust,/__ro_copy\(initial\)/);
});
test('predicate result accumulator arity callback effects and borrowed outputs retain explicit refusals',limits,()=>{
 for(const body of ['return any(values,value=>copy(value));','return fold(values,initial,value=>copy(value));','return fold(values,initial,(accumulator,value)=>value);','return find(values,async value=>isNull(value));','return any(values,value=>{values.push(value);return isNull(value);});','return filter(values,value=>any(values,inner=>isNull(inner)));'])assert.throws(()=>translate(imports+'export function selected(values,initial){'+body+'}'));
});
test('detached callbacks altered native leaves and absent real module edges cannot issue caller permission',limits,()=>{
 const {input,context,result}=translate(),program=readOwnedIterationMeta(result.meta,{context}),forged=structuredClone(program);assert.equal(emitOwnedCoreProgram(program,'rust'),result.rust);forged[0].body[0].value.callback.returns='json';assert.throws(()=>emitOwnedCoreProgram(forged,'rust'));
 for(const edit of [files=>{files.find(row=>row.path==='src/lib.rs').source='pub mod translation_core;\n';},files=>{files.find(row=>row.path==='src/translation_collections_core.rs').source+='\npub fn counterfeit(){}\n';}]){const bad=structuredClone(input);edit(bad.files);assert.throws(()=>createOwnedIterationContext(bad));}
});
test('authoritative TypeScript iteration source retains its complete inverse and actual written domains',limits,()=>{
 const source=typed(js),input=data(js,source);input.files=input.files.filter(row=>row.path!=='caller.mjs');const context=createOwnedIterationContext(input),result=translateOwnedIterationTypeScript(source,{context,sourcePath:'caller.mts'});assert.equal(result.ownedCollectionTypeScriptHistory.projection.equation.inverse,source);assert.match(result.rust,/crate::translation_collections_core::json_any/);
});
test('five complete preceding implementations retain fresh native selection and full two-phase inverses',limits,()=>{
 const plan=prepareOwnedIteration();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.ok(row.originalPath.includes('owned-collections'));assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);}
});
