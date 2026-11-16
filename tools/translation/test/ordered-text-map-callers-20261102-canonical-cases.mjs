// Explicit canonical receiving case SOURCE. UNRUN; default discovery excludes it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createOwnedCoreSourceContext,ownedCoreRuntimeSources,ownedCoreMapRuntimeSources,ownedCoreSourceData} from '../js-to-rust/owned-core-source.mjs';
import {analyzeOwnedCoreJavaScript,parseOwnedCoreDocumentMeta} from '../js-to-rust/translator.mjs';
import {serializeOwnedCoreDocument} from '../js-to-rust/owned-core-document.mjs';
import {emitRust,emitTypeScript} from '../js-to-rust/targets.mjs';
import {prepareOwnedCoreRuntime,evaluateOwnedCoreProgram} from '../js-to-rust/owned-core-operations.mjs';
import {captureOwnedCoreCorpus,buildOwnedCoreDocumentArtifacts} from '../js-to-rust/owned-core-corpus.mjs';
import {proposeOrderedTextMapCanonicalSourceSuccessors,orderedTextMapCanonicalParentSourceData} from '../ordered-text-map-canonical-20261102-profile.mjs';
import {rustPackageSourcePath} from '../repository-layout.mjs';
import {createOrderedMapCanonicalSourceCustody} from '../ordered-text-map-callers-20261102-canonical-source-custody.mjs';
const packageRoot=fileURLToPath(new URL('../../../',import.meta.url)),jsRoot='js/generated/rust-project',tsRoot='ts/generated/rust-project';
const imports="import {router_text_map_new as empty,router_text_map_insert as insert,router_text_map_get as get,router_text_map_contains as contains,router_text_map_from_pairs as fromPairs,router_text_map_pairs as pairs,router_text_map_keys as keys} from './runtime/ordered-text-map-20261102-runtime.mjs';\n";
const javascript=imports+`export function make(){const original=empty();return insert(original,'stream','true');}
export function requested(map){const value=get(map,'stream');return value.$==='Some'&&(value.field0==='true'||value.field0==='1');}
export function localContains(key){const map=insert(empty(),'stream','true');return contains(map,key);}
export function pairRoundTrip(map){return fromPairs(pairs(map));}
export function projectedKeys(map){return keys(map);}`;
const typescript=imports+`export function make():ReturnType<typeof empty>{const original=empty();return insert(original,'stream','true');}
export function requested(map:Parameters<typeof get>[0]):boolean{const value=get(map,'stream');return value.$==='Some'&&(value.field0==='true'||value.field0==='1');}
export function localContains(key:string):boolean{const map=insert(empty(),'stream','true');return contains(map,key);}
export function pairRoundTrip(map:Parameters<typeof pairs>[0]):ReturnType<typeof fromPairs>{return fromPairs(pairs(map));}
export function projectedKeys(map:Parameters<typeof keys>[0]):ReturnType<typeof keys>{return keys(map);}`;
function put(root,path,source){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);}
function receivingRoot(){
 const root=mkdtempSync(join(tmpdir(),'ordered-map-canonical-'));
 for(const path of ['Cargo.toml','Cargo.lock','rust/Cargo.toml'])put(root,path,readFileSync(join(packageRoot,path)));
 cpSync(join(packageRoot,'rust/src'),join(root,'rust/src'),{recursive:true});
 for(const row of [...ownedCoreRuntimeSources(jsRoot+'/runtime',tsRoot+'/runtime'),...ownedCoreMapRuntimeSources(jsRoot+'/runtime',tsRoot+'/runtime')])put(root,row.path,row.source);
 put(root,jsRoot+'/caller.mjs',javascript);put(root,tsRoot+'/caller.ts',typescript);return root;
}
test('complete canonical source successors retain original guards and DATA rows issue no permit',{timeout:60000},()=>{
 const proposal=proposeOrderedTextMapCanonicalSourceSuccessors(),data=orderedTextMapCanonicalParentSourceData();assert.equal(proposal.files.length,3);assert.equal(proposal.sourceInstalled,false);
 for(const file of proposal.files){assert.equal(file.inverse,file.before);assert.equal(file.after.split('\n').length-1<1000,true);assert.deepEqual(file.stages.map(stage=>stage.phase),['language','repository']);assert.deepEqual(data.find(row=>row.path===file.path),{path:file.path,before:file.before,after:file.after,inverse:file.before});}
 const source=proposal.files.find(row=>row.path.endsWith('/owned-core-source.mjs'));assert.ok(source.after.includes('withOwnedRuntimeImportEdges'));assert.ok(source.after.includes('runtimeImportEpochClose'));assert.ok(source.after.includes('requireCanonicalOrderedMapSources'));
 const operations=proposal.files.find(row=>row.path.endsWith('/owned-core-operations.mjs'));assert.ok(operations.after.includes('withOwnedCoreItemChecks'));assert.ok(operations.after.includes('withOwnedRuntimeImportEdges'));
 assert.equal(ownedCoreRuntimeSources().some(row=>row.path.includes('ordered-text-map-20261102-runtime')),false);assert.equal(ownedCoreMapRuntimeSources().some(row=>row.path.endsWith('ordered-text-map-20261102-runtime.mjs')),true);
});
test('actual canonical API and corpus routes reissue complete active native source closure and map bodies',{timeout:60000},async()=>{
 const root=receivingRoot();try{
  const capture=captureOwnedCoreCorpus(root),runtimeRoot=jsRoot+'/runtime',declarationRoot=tsRoot+'/runtime';assert.ok(capture.files.some(row=>row.path==='src/translation_ordered_text_map_core.rs'));assert.ok(capture.files.some(row=>row.path==='src/openai.rs'));
  const context=createOwnedCoreSourceContext({files:capture.files,runtimeRoot,declarationRoot}),analysis=analyzeOwnedCoreJavaScript(javascript,{context,sourcePath:jsRoot+'/caller.mjs'});assert.equal(analysis.program.length,5,JSON.stringify(analysis.diagnostics));
  const document=serializeOwnedCoreDocument(analysis.program,{context}),decoded=parseOwnedCoreDocumentMeta(document,{context});assert.equal(decoded.length,5);
  const rust=emitRust(decoded),written=emitTypeScript(decoded,{outputPath:tsRoot+'/caller.ts'});assert.match(rust,/text_map_copy/u);assert.match(rust,/text_map_pairs/u);assert.equal(rust.includes("'a"),false);assert.match(written,/ReturnType/u);
  const token=await prepareOwnedCoreRuntime(decoded),name=javascript=>decoded.find(row=>row.javascript===javascript).name,map=evaluateOwnedCoreProgram(decoded,name('make'),[],token);assert.equal(evaluateOwnedCoreProgram(decoded,name('requested'),[map],token),true);assert.equal(evaluateOwnedCoreProgram(decoded,name('localContains'),['stream'],token),true);assert.equal(evaluateOwnedCoreProgram(decoded,name('localContains'),['missing'],token),false);assert.deepEqual(evaluateOwnedCoreProgram(decoded,name('projectedKeys'),[map],token),['stream']);assert.deepEqual(evaluateOwnedCoreProgram(decoded,name('pairRoundTrip'),[map],token),map);
  const artifacts=buildOwnedCoreDocumentArtifacts(root);assert.ok(artifacts.artifacts.size>0);capture.requireCurrent();
  const copied=JSON.parse(JSON.stringify(analysis.program));assert.throws(()=>emitRust(copied));const data=ownedCoreSourceData(context);assert.throws(()=>createOwnedCoreSourceContext({...data,mapEnabled:true}));
  const bad={...data,files:data.files.filter(row=>row.path!=='src/translation_ordered_text_map_core.rs')};assert.throws(()=>{const badContext=createOwnedCoreSourceContext(bad);analyzeOwnedCoreJavaScript(javascript,{context:badContext,sourcePath:jsRoot+'/caller.mjs'});});
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('canonical capture uses logical/physical Cargo mapping without substituting a fixture library',()=>{
 assert.equal(rustPackageSourcePath(packageRoot,'src/lib.rs'),'rust/src/lib.rs');
});
test('only reachable actual source imports activate native map input coverage',{timeout:60000},()=>{
 const root=receivingRoot();try{
  put(root,jsRoot+'/caller.mjs','export function plain(value){return value;}');put(root,tsRoot+'/caller.ts','export function plain(value:string):string{return value;}');
  const unused=captureOwnedCoreCorpus(root);assert.equal(unused.files.some(row=>row.path==='src/translation_ordered_text_map_core.rs'),false);unused.requireCurrent();
  const bridge="import {router_text_map_tuple_pairs as pairs} from './runtime/ordered-text-map-callers-20261102-pair-runtime.mjs';export function projected(map){return pairs(map);}";
  put(root,jsRoot+'/caller.mjs',bridge);put(root,tsRoot+'/caller.ts','export function plain(value:string):string{return value;}');const pairCapture=captureOwnedCoreCorpus(root);assert.ok(pairCapture.files.some(row=>row.path==='src/translation_ordered_text_map_core.rs'));pairCapture.requireCurrent();
  put(root,jsRoot+'/runtime/map-export.mjs',"export {router_text_map_new as empty} from './ordered-text-map-20261102-runtime.mjs';");put(root,jsRoot+'/caller.mjs',"import {empty} from './runtime/map-export.mjs';export function make(){return empty();}");
  const throughRuntime=captureOwnedCoreCorpus(root);assert.ok(throughRuntime.files.some(row=>row.path==='src/translation_ordered_text_map_core.rs'));throughRuntime.requireCurrent();
  // Coverage never claims that tagged pair calls or arbitrary aggregates are
  // accepted by the original semantic checker; genuine private facts decide.
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('physical custody closes whole batches at boundaries and keeps a sticky original failure',async()=>{
 const fs=await import('node:fs'),{syncBuiltinESMExports}=await import('node:module'),root=mkdtempSync(join(tmpdir(),'ordered-map-custody-'));
 const original=fs.default.lstatSync;try{
  const paths=Array.from({length:128},(_,index)=>join(root,String(index)+'.mjs'));for(const path of paths)writeFileSync(path,'export const value=1;\n');
  const target=fs.default.realpathSync(paths[0]);let calls=0;fs.default.lstatSync=(...args)=>{calls++;return original(...args);};syncBuiltinESMExports();const scope=createOrderedMapCanonicalSourceCustody(root);for(const path of paths)scope.read(path);const before=calls;scope.close();assert.ok(calls-before<256);assert.ok(before<8192);
  fs.default.lstatSync=(path,...rest)=>path===target?(()=>{throw undefined;})():original(path,...rest);syncBuiltinESMExports();let thrown=false,value;try{scope.close();}catch(error){thrown=true;value=error;}assert.equal(thrown,true);assert.equal(value,undefined);
  fs.default.lstatSync=original;syncBuiltinESMExports();thrown=false;try{scope.close();}catch(error){thrown=true;value=error;}assert.equal(thrown,true);assert.equal(value,undefined);
 }finally{fs.default.lstatSync=original;syncBuiltinESMExports();rmSync(root,{recursive:true,force:true});}
});
