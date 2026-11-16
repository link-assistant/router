// Complete-tree receiving case SOURCE. Never executed during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {compactSparseGit} from '../compact-sparse-git-io-20261102.mjs';
import * as coreSource from '../js-to-rust/owned-core-source.mjs';
import * as core from '../js-to-rust/owned-core-operations.mjs';
import * as vectorSource from '../js-to-rust/owned-vector-candidate-source.mjs';
import * as vector from '../js-to-rust/owned-vector-candidate-operations.mjs';
import {borrowedStandardMapReverseRuntimeSources} from '../borrowed-standard-map-20261103-reverse-calls.mjs';
import {withBorrowedStandardMapReverseNativeSources} from '../borrowed-standard-map-20261103-reverse-native.mjs';
import {proposeBorrowedStandardMapReverseSources} from '../borrowed-standard-map-20261103-reverse-profile.mjs';
import {proposeBorrowedStandardMapLibrarySources} from '../borrowed-standard-map-20261103-library-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),NAME='router_borrowed_text_map_matches_literals';
function production(){
 const paths=compactSparseGit(ROOT,['ls-files','-z','--','rust/src'],{maxBytes:8388608}).split('\0').filter(Boolean),files=new Map(paths.map(path=>[path.slice(5),readFileSync(join(ROOT,path),'utf8')]));
 assert.ok(files.size>500);assert.ok(files.has('src/openai.rs'));assert.ok(files.has('src/borrowed_standard_map_20261102.rs'));files.set('Cargo.toml',readFileSync(join(ROOT,'rust/Cargo.toml'),'utf8'));files.set('Cargo.lock',readFileSync(join(ROOT,'Cargo.lock'),'utf8'));return files;
}
function caller(body='return predicate(map,key,["true","1"]);'){
 return 'import {'+NAME+" as predicate} from './runtime/borrowed-standard-map-20261102-runtime.mjs';\n"+
 '/** @param {Parameters<typeof predicate>[0]} map @param {string} key @returns {boolean} */\nexport function query(map,key){'+body+'}\n';
}
function input(sourceApi,source=caller(),candidate=false){
 const files=production();for(const row of [...sourceApi.ownedCoreRuntimeSources(),...borrowedStandardMapReverseRuntimeSources()])files.set(row.path,row.source);files.set('caller.mjs',source);
 return {runtimeRoot:'runtime',declarationRoot:'runtime',...(candidate?{vectorBindings:[]}:{}),files:[...files].map(([path,source])=>({path,source}))};
}
for(const [sourceApi,operations,candidate]of [[coreSource,core,false],[vectorSource,vector,true]]){
 test('actual '+(candidate?'vector':'core')+' reverse path emits and independently interprets unrestricted standard map callers',{timeout:60000},async()=>{
  const data=input(sourceApi,caller(),candidate),context=sourceApi.createOwnedCoreSourceContext(data),result=operations.analyzeOwnedCoreModule(context,'caller.mjs');assert.equal(result.program.length,1);
  const checked=operations.checkOwnedCoreProgram(JSON.parse(JSON.stringify(result.program)),context);assert.equal(checked[0].params[0].type,'standard-text-map-input');assert.equal(checked[0].returns,'bool');assert.equal(checked[0].resultRoot,null);
  const rust=operations.emitOwnedCoreProgram(checked,'rust'),typescript=operations.emitOwnedCoreProgram(checked,'typescript');assert.match(rust,/::std::collections::BTreeMap<::std::string::String, ::std::string::String>/u);assert.match(rust,/crate::borrowed_standard_map_20261102::borrowed_text_map_matches_literals/u);assert.match(rust,/&\["true", "1"\]/u);assert.match(typescript,/Parameters<typeof __ro_router_borrowed_text_map_matches_literals>\[0\]/u);assert.match(typescript,/__ro_borrowedStandardMapInput\(map\)/u);
  const token=await operations.prepareOwnedCoreRuntime(checked),map=new Map(Array.from({length:5001},(_,at)=>['k'+at,'value']));map.set('unused','x'.repeat(1048577));map.set('stream','true');const before=[...map];
  for(const [key,expected]of [['stream',true],['missing',false],['unused',false]])assert.equal(operations.evaluateOwnedCoreProgram(checked,'query',[map,key],token),expected);
  map.set('stream','1');assert.equal(operations.evaluateOwnedCoreProgram(checked,'query',[map,'stream'],token),true);map.set('stream','True');assert.equal(operations.evaluateOwnedCoreProgram(checked,'query',[map,'stream'],token),false);map.set('stream','true');assert.deepEqual([...map],before);
  assert.throws(()=>operations.evaluateOwnedCoreProgram(checked,'query',[new Proxy(map,{}),'stream'],token));assert.throws(()=>operations.evaluateOwnedCoreProgram(checked,'query',[{},'stream'],token));
  const forged=JSON.parse(JSON.stringify(checked));forged[0].body[0].value.literals=['injected'];assert.throws(()=>operations.checkOwnedCoreProgram(forged,context));
 });
 test('actual '+(candidate?'vector':'core')+' reverse path refuses unsupported literal and shared alias domains',{timeout:60000},()=>{
  for(const body of ['return predicate(map,key,[...[]]);','return predicate(map,key,[key]);','const alias=map;return predicate(alias,key,["true"]);','return predicate(map,key,['+Array.from({length:65},()=> '"x"').join(',')+']);']){
   const context=sourceApi.createOwnedCoreSourceContext(input(sourceApi,caller(body),candidate)),result=operations.analyzeOwnedCoreModule(context,'caller.mjs');assert.equal(result.program.length,0);assert.equal(result.items[0].status,'unsupported');assert.ok(result.diagnostics.length>0);
  }
 });
}
test('fresh complete native source operation has no copied or expired source permit',{timeout:60000},()=>{
 const files=production();let ran=false;assert.equal(withBorrowedStandardMapReverseNativeSources(files,()=>{ran=true;return 17;}),17);assert.equal(ran,true);
 const missing=new Map(files);missing.delete('src/borrowed_standard_map_20261102.rs');assert.throws(()=>withBorrowedStandardMapReverseNativeSources(missing,()=>assert.fail('missing source admitted')));
 const changed=new Map(files);assert.throws(()=>withBorrowedStandardMapReverseNativeSources(changed,()=>{changed.set('src/lib.rs',changed.get('src/lib.rs')+'\n// changed\n');}));
});
test('complete reverse source recipes preserve independent phase CST and full inverses',()=>{
 const proposal=proposeBorrowedStandardMapReverseSources();assert.equal(proposal.files.length,4);assert.equal(proposal.semanticAuthority,false);
 for(const row of proposal.files){assert.equal(row.inverse,row.before);const later=proposeBorrowedStandardMapLibrarySources().files.find(value=>value.path===row.path);if(later)assert.equal(later.before,row.after);assert.equal(readFileSync(join(ROOT,row.path),'utf8'),later?.after??row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
});
