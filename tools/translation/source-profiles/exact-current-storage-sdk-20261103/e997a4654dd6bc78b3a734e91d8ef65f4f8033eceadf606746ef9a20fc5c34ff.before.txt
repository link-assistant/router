// Explicit future receiving case SOURCE. No case has been executed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {proposeOrderedTextMapUnitSourceSuccessors,orderedTextMapUnitParentSourceData} from '../ordered-text-map-callers-20261102-unit-profile.mjs';
import {orderedMapUnitReferences,orderedMapUnitRuntimeSources,withOrderedMapUnitSourceScope} from '../ordered-text-map-callers-20261102-unit-inputs.mjs';
import {OWNED_OUTCOME_NATIVE_INPUTS,ownedOutcomeUnitRuntimeSources,translateOwnedOutcomeUnit} from '../owned-outcome-unit.mjs';
import {translateOwnedProjectUnit} from '../owned-project-unit.mjs';
import {ownedCoreRuntimeSources} from '../js-to-rust/owned-outcome-source.mjs';
import {createOwnedOutcomeContext,readOwnedOutcomeMeta,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome} from '../js-to-rust/owned-outcome.mjs';
import {analyzeOwnedCoreModule} from '../js-to-rust/owned-outcome-operations.mjs';
import {serializeOwnedCoreDocument} from '../js-to-rust/owned-outcome-document.mjs';
import {rustPackageSourcePath} from '../repository-layout.mjs';
import {produceOrderedTextMapCallerSources} from '../ordered-text-map-callers-20261102-producer.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const unit={id:'ordered-map-receiving',profile:'owned-outcome',paths:{Rust:'receiving/caller.rs',JavaScript:'js/caller.mjs',TypeScript:'ts/caller.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'}};
unit.nativeSources=OWNED_OUTCOME_NATIVE_INPUTS.map(path=>({path,sourcePath:rustPackageSourcePath(root,path)}));
const imports="import {router_text_map_new as empty,router_text_map_insert as insert,router_text_map_get as get,router_text_map_len as len,router_text_map_keys as keys,router_text_map_pairs as pairs,router_text_map_from_pairs as fromPairs} from './runtime/ordered-text-map-20261102-runtime.mjs';\n";
const javascript=imports+`export function make(){const map=empty();return insert(map,'stream','true');}
/** @param {Parameters<typeof get>[0]} map @param {string} key */
export function lookup(map,key){return get(map,key);}
/** @param {Parameters<typeof len>[0]} map */
export function size(map){return len(map);}
/** @param {Parameters<typeof keys>[0]} map */
export function projectedKeys(map){return keys(map);}
/** @param {Parameters<typeof pairs>[0]} map */
export function projectedPairs(map){return pairs(map);}
/** @param {Parameters<typeof fromPairs>[0]} entries */
export function makePairs(entries){return fromPairs(entries);}`;
function captured(run){
 return withOrderedMapUnitSourceScope(root,scope=>{
  const read=path=>readFileSync(join(root,path),'utf8'),declared=unit.nativeSources.map(row=>({path:row.path,source:read(row.sourcePath)})),nativeSources=scope.captureNative(unit,declared,read),runtimeSources=[...ownedOutcomeUnitRuntimeSources(unit),...orderedMapUnitRuntimeSources(unit)];
  return run({nativeSources,runtimeSources});
 });
}
test('complete unit source equations retain both stages and every original inverse',{timeout:60000},()=>{
 const full=proposeOrderedTextMapUnitSourceSuccessors(),data=orderedTextMapUnitParentSourceData();assert.equal(full.files.length,12);assert.equal(full.sourceInstalled,false);
 for(const row of full.files){assert.equal(row.inverse,row.before);assert.ok(row.after.split('\n').length-1<1000);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.deepEqual(data.find(item=>item.path===row.path),{path:row.path,before:row.before,after:row.after,inverse:row.before});}
 assert.equal(ownedCoreRuntimeSources().some(row=>row.path.includes('ordered-text-map')),false);
});
test('actual outcome unit forward/meta/interpreter and complete authoritative Rust inverse',{timeout:60000},async()=>{
 const inputs=captured(value=>value),current={Rust:null,JavaScript:javascript,TypeScript:null},result=translateOwnedOutcomeUnit({unit,language:'JavaScript',current,...inputs});
 assert.match(result.Rust,/text_map_insert/u);assert.match(result.Rust,/fn lookup<'ro_map>\(map: &'ro_map /u);assert.match(result.Rust,/key: &str/u);assert.equal(result.Rust.includes("'a"),false);
 const context=createOwnedOutcomeContext({runtimeRoot:unit.runtimes.JavaScript,declarationRoot:unit.runtimes.TypeScript,files:[...inputs.nativeSources,...inputs.runtimeSources,{path:unit.paths.JavaScript,source:javascript}]}),analysis=analyzeOwnedCoreModule(context,unit.paths.JavaScript);assert.deepEqual(analysis.diagnostics,[]);assert.equal(analysis.program.length,6);
 const meta=serializeOwnedCoreDocument(analysis.program,{context}),program=readOwnedOutcomeMeta(meta,{context}),runtime=await prepareOwnedOutcomeRuntime(program),name=value=>program.find(row=>row.javascript===value).name,map=evaluateOwnedOutcome(program,name('make'),[],runtime);
 assert.equal(evaluateOwnedOutcome(program,name('size'),[map],runtime),1n);assert.deepEqual(evaluateOwnedOutcome(program,name('projectedKeys'),[map],runtime),['stream']);assert.deepEqual(evaluateOwnedOutcome(program,name('projectedPairs'),[map],runtime),[['stream','true']]);assert.deepEqual(evaluateOwnedOutcome(program,name('lookup'),[map,'stream'],runtime),{$:'Some',field0:'true'});
 const inverse=translateOwnedOutcomeUnit({unit,language:'Rust',current:{Rust:result.Rust,JavaScript:javascript,TypeScript:result.TypeScript},...inputs});assert.equal(inverse.Rust,result.Rust);assert.ok(inverse.meta.semanticMeta);assert.ok(inverse.meta.ownedRustSourceHistory);
 for(const source of [javascript.replace("return get(map,key);","const other=map;return get(other,key);"),javascript.replace('return get(map,key);',"const local=empty();return get(local,key);")])assert.throws(()=>translateOwnedOutcomeUnit({unit,language:'JavaScript',current:{...current,JavaScript:source},...inputs}));
 assert.throws(()=>translateOwnedOutcomeUnit({unit,language:'JavaScript',current,...inputs,nativeSources:inputs.nativeSources.filter(row=>row.path!=='src/translation_ordered_text_map_core.rs')}));
});
test('actual project unit distributes and freshly checks genuine map caller modules',{timeout:60000},()=>{
 const inputs=captured(value=>value),projectUnit={...unit,profile:'owned-project',dependencies:{JavaScript:[],TypeScript:[],Rust:[]}},result=translateOwnedProjectUnit({unit:projectUnit,language:'JavaScript',current:{Rust:null,JavaScript:javascript,TypeScript:null},dependencies:{JavaScript:[],TypeScript:[],Rust:[]},...inputs});
 assert.match(result.Rust,/text_map_insert/u);assert.equal(result.projectSources.filter(row=>row.language==='TypeScript').length,1);assert.ok(result.meta.moduleDistributionHistories.length);
 const inverse=translateOwnedProjectUnit({unit:projectUnit,language:'Rust',current:{Rust:result.Rust,JavaScript:javascript,TypeScript:result.TypeScript},dependencies:{JavaScript:[],TypeScript:[],Rust:[]},...inputs});assert.equal(inverse.Rust,result.Rust);assert.ok(inverse.meta.moduleRestorationHistory);
});
test('source selection follows main/pair/reexport edges and ignores unused map assets',()=>{
 const runtimeSources=orderedMapUnitRuntimeSources(unit),plain={Rust:null,JavaScript:'export function value(){return true;}',TypeScript:null};assert.equal(orderedMapUnitReferences({unit,current:plain,runtimeSources}),false);
 const pair={...plain,JavaScript:"import {router_text_map_tuple_pairs} from './runtime/ordered-text-map-callers-20261102-pair-runtime.mjs';export function value(){return router_text_map_tuple_pairs;}"};assert.equal(orderedMapUnitReferences({unit,current:pair,runtimeSources}),true);
 const aggregate={path:'js/runtime/aggregate.mjs',source:"export {router_text_map_len} from './ordered-text-map-20261102-runtime.mjs';"};assert.equal(orderedMapUnitReferences({unit,current:{...plain,JavaScript:"import {router_text_map_len} from './runtime/aggregate.mjs';"},runtimeSources:[...runtimeSources,aggregate]}),true);
 assert.equal(orderedMapUnitReferences({unit,current:{...plain,Rust:'// OrderedTextMap is not a native input reference\nfn value() -> bool { true }'},runtimeSources}),false);
});
test('native platform containment uses native separators with POSIX logical source mapping',{timeout:60000},()=>{
 assert.ok(root.includes(sep));if(process.platform==='win32')assert.match(root,/^[A-Za-z]:\\/u);
 captured(({nativeSources})=>{assert.ok(nativeSources.some(row=>row.path==='src/lib.rs'));assert.ok(nativeSources.some(row=>row.path==='src/translation_ordered_text_map_core.rs'));assert.ok(nativeSources.every(row=>!row.path.includes('\\')));});
});
test('full compiler source transfer includes complete actual tracked production Rust/Cargo/build inputs',{timeout:60000},()=>{
 const parent=mkdtempSync(join(tmpdir(),'ordered-map-unit-transfer-'));try{
  const receipt=produceOrderedTextMapCallerSources({sourceRoot:root,destination:join(parent,'package')}),paths=new Set(receipt.receivingNativeInputs.map(row=>row.path));
  for(const logical of ['src/lib.rs','src/openai.rs','src/translation_ordered_text_map_core.rs','Cargo.toml','Cargo.lock','build.rs']){const path=rustPackageSourcePath(root,logical);assert.ok(paths.has(path),path);assert.equal(readFileSync(join(receipt.destination,path),'utf8'),readFileSync(join(root,path),'utf8'));}
  assert.ok(paths.has('Cargo.toml'));assert.equal(receipt.sourceExecuted,false);assert.equal(receipt.tests,'UNRUN');assert.equal(receipt.legacyRawLimitUnchanged,true);
 }finally{rmSync(parent,{recursive:true,force:true});}
});
test('unit source scope closes escaped callbacks and preserves caught undefined primary',{timeout:60000},()=>{
 let escaped;withOrderedMapUnitSourceScope(root,scope=>{escaped=scope.captureNative;return null;});assert.throws(()=>escaped(unit,[],()=>''));
 const declared=unit.nativeSources.map(row=>({path:row.path,source:readFileSync(join(root,row.sourcePath),'utf8')}));let outer=false,primary;
 try{withOrderedMapUnitSourceScope(root,scope=>{let first=false;try{scope.captureNative(unit,declared,()=>{throw undefined;});}catch(error){first=true;assert.equal(error,undefined);}assert.equal(first,true);let second=false;try{scope.captureNative(unit,declared,()=>{throw new Error('must not replace original primary');});}catch(error){second=true;assert.equal(error,undefined);}assert.equal(second,true);return null;});}catch(error){outer=true;primary=error;}assert.equal(outer,true);assert.equal(primary,undefined);
 assert.throws(()=>withOrderedMapUnitSourceScope(root,()=>Promise.resolve(null)));
});
