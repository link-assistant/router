// Genuine SDK/library and complete application receiving SOURCE; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compactSparseGit} from '../compact-sparse-git-io-20261102.mjs';
import * as coreSource from '../js-to-rust/owned-core-source.mjs';
import * as core from '../js-to-rust/owned-core-operations.mjs';
import * as vectorSource from '../js-to-rust/owned-vector-candidate-source.mjs';
import * as vector from '../js-to-rust/owned-vector-candidate-operations.mjs';
import {borrowedStandardMapReverseLibrarySources} from '../borrowed-standard-map-20261103-typescript-library.mjs';
import {borrowedStandardMapReverseRuntimeSources} from '../borrowed-standard-map-20261103-reverse-calls.mjs';
import {proposeBorrowedStandardMapLibrarySources} from '../borrowed-standard-map-20261103-library-profile.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const caller="import {router_borrowed_text_map_matches_literals as predicate} from './runtime/borrowed-standard-map-20261102-runtime.mjs';\nexport function query(map: ReadonlyMap<string,string>,key: string): boolean{return predicate(map,key,['true','1']);}\n";
function input(sourceApi,candidate,{library=true,extra=[],source=caller}={}){
 const paths=compactSparseGit(ROOT,['ls-files','-z','--','rust/src'],{maxBytes:8388608}).split('\0').filter(Boolean),files=new Map(paths.map(path=>[path.slice(5),readFileSync(join(ROOT,path),'utf8')]));assert.ok(files.size>500);assert.ok(files.has('src/openai.rs'));
 files.set('Cargo.toml',readFileSync(join(ROOT,'rust/Cargo.toml'),'utf8'));files.set('Cargo.lock',readFileSync(join(ROOT,'Cargo.lock'),'utf8'));
 for(const row of [...sourceApi.ownedCoreRuntimeSources(),...borrowedStandardMapReverseRuntimeSources(),...(library?borrowedStandardMapReverseLibrarySources():[]),...extra])files.set(row.path,row.source);files.set('caller.mts',source);
 return {runtimeRoot:'runtime',declarationRoot:'runtime',...(candidate?{vectorBindings:[]}:{}),files:[...files].map(([path,source])=>({path,source}))};
}
for(const [sourceApi,operations,candidate]of [[coreSource,core,false],[vectorSource,vector,true]]){
 test('actual '+(candidate?'vector':'core')+' checker selects ReadonlyMap through complete genuine SDK library declarations',{timeout:60000},async()=>{
  const data=input(sourceApi,candidate),context=sourceApi.createOwnedCoreSourceContext(data),result=operations.analyzeOwnedCoreModule(context,'caller.mts');assert.equal(result.program.length,1,JSON.stringify(result.diagnostics));assert.equal(result.program[0].params[0].type,'standard-text-map-input');
  const rebuilt=operations.checkOwnedCoreProgram(JSON.parse(JSON.stringify(result.program)),context),runtime=await operations.prepareOwnedCoreRuntime(rebuilt),map=new Map([['stream','true'],['','1'],['λ','false']]);
  for(const [key,expected]of [['stream',true],['',true],['λ',false],['missing',false]])assert.equal(operations.evaluateOwnedCoreProgram(rebuilt,'query',[map,key],runtime),expected);
  assert.match(operations.emitOwnedCoreProgram(rebuilt,'rust'),/::std::collections::BTreeMap/u);assert.match(operations.emitOwnedCoreProgram(rebuilt,'typescript'),/__ro_borrowedStandardMapInput\(map\)/u);
 });
 test('actual '+(candidate?'vector':'core')+' checker refuses unowned, shadowed, merged or edited standard-library types',{timeout:60000},()=>{
  const variants=[{library:false},{extra:[{path:'foreign-library.d.ts',source:'interface ReadonlyMap<K,V>{fake(): void;}'}]},{source:caller.replace('export function query','type ReadonlyMap<K,V>={value: K};\nexport function query'),topLevelRefusal:true}];
  for(const options of variants){const context=sourceApi.createOwnedCoreSourceContext(input(sourceApi,candidate,options));if(options.topLevelRefusal){assert.throws(()=>operations.analyzeOwnedCoreModule(context,'caller.mts'),{name:'TypeError'});continue;}const result=operations.analyzeOwnedCoreModule(context,'caller.mts');assert.equal(result.program.length,0);assert.ok(result.diagnostics.length>0);}
  const data=input(sourceApi,candidate),library=data.files.find(row=>row.path==='typescript-standard-library-20261103/lib.es2015.collection.d.ts');assert.ok(library);library.source+='\n// edited source\n';const context=sourceApi.createOwnedCoreSourceContext(data),result=operations.analyzeOwnedCoreModule(context,'caller.mts');assert.equal(result.program.length,0);assert.ok(result.diagnostics.length>0);
 });
}
test('library type-owner source integration preserves both complete predecessor branches and phase CST',()=>{
 const value=proposeBorrowedStandardMapLibrarySources();assert.equal(value.files.length,3);assert.equal(value.semanticAuthority,false);
 for(const row of value.files){assert.equal(readFileSync(join(ROOT,row.path),'utf8'),row.after);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.history.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.history.afterMeta).source,stage.after);}}
});
