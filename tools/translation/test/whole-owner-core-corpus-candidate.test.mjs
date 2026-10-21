import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {repositorySourceURL,repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../router-core-source-data.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareWholeOwnerCoreCorpusCandidate} from '../prepare-whole-owner-core-corpus-candidate.mjs';
import {runOriginalCoreSequenceStage as legacyStage} from '../core-sequence-stage-source.mjs';
import {proposeSourceBackedCoreSequenceStream as legacyStream} from '../source-backed-core-sequence-stream.mjs';
import {runOriginalCoreSequenceStage,reviewOriginalCoreSequenceStage,proposeSourceBackedCoreSequenceStream,reviewSourceBackedCoreSequenceStream} from '../whole-owner-core-corpus-candidate.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {wholeOwnerCoreCorpusInspectionReady} from '../whole-owner-core-corpus-inspection-data.mjs';
import {decodeCompleteIndexedHookWire,encodeCompleteIndexedHookWire,compareCompleteIndexedHookWires} from './fixtures/complete-indexed-hook-wire.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex'),wire=value=>JSON.parse(JSON.stringify(value)),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const application='\uFEFF#[derive(Clone,Copy)]pub struct Marker{value:u8}\r\npub fn formatted(value:u8)->String{format!("value={value}")}\r\npub fn accepted(value:&crate::translation_core::Str)->bool{matches!(value,"a"|"b")}\r\npub fn values()->Vec<u8>{vec![1u8,2u8]}\r\n#[cfg(test)]mod tests{unknown!();}\r\n';
function sources(source=application){return {'src/lib.rs':'pub mod translation_core;pub mod app;','src/app.rs':source,'src/translation_core.rs':facade,'src/translation_core/primitives.rs':primitives,'src/translation_core/ranges.rs':ranges,'src/translation_core/base64.rs':base64,'src/translation_core/json_collections.rs':collections};}
function physical(t,source=application){const parent=mkdtempSync(join(tmpdir(),'router-whole-owner-corpus-')),directory=join(parent,'input'),output=join(parent,'candidate'),baseline=join(parent,'baseline');t.after(()=>rmSync(parent,{recursive:true,force:true}));mkdirSync(directory);const rust=Object.fromEntries(Object.entries(sources(source)).map(([path,text])=>['rust/'+path,text])),files={...rust,'Cargo.toml':readFileSync(repositoryWorkspaceManifestURL(root),'utf8'),'Cargo.lock':cargo.lock,'rust/Cargo.toml':cargo.manifest};for(const [path,text]of Object.entries(files)){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);}return {directory,output,baseline,files};}
function packets(output){const index=JSON.parse(readFileSync(join(output,'index.json'),'utf8')),values=index.packets.map(row=>{const packed=readFileSync(join(output,row.file)),raw=gunzipSync(packed);assert.equal(packed.length,row.storedBytes);assert.equal(hash(packed),row.storedSha256);assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);return JSON.parse(raw);});return {index,values};}
function repack(output,index,at,value){const raw=Buffer.from(JSON.stringify(value)+'\n'),packed=gzipSync(raw,{mtime:0}),row=index.packets[at];index.logicalBytes+=raw.length-row.bytes;index.storedBytes+=packed.length-row.storedBytes;Object.assign(row,{bytes:raw.length,sha256:hash(raw),storedBytes:packed.length,storedSha256:hash(packed)});writeFileSync(join(output,row.file),packed);writeFileSync(join(output,'index.json'),JSON.stringify(index)+'\n');}

test('six complete native corpus copies retain original template equations source bindings both CST phases and whole inverses',{timeout:60000},()=>{
 const plan=prepareWholeOwnerCoreCorpusCandidate();assert.equal(plan.files.length,6);assert.equal(plan.originalDefaultsUnchanged,true);assert.equal(plan.fullPrimitiveJsonWireContract,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.performanceQualified,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepStrictEqual(row.trace.map(part=>part.phase),['language','repository']);}
 for(const prerequisite of plan.originalTemplateProducers)for(const row of prerequisite.files)assert.equal(row.current,row.after);const support=plan.files[0];assert.equal(support.selection.completeOriginalFactoryFallback,true);assert.equal(support.selection.captureBeforeFirstInspection,true);assert.equal(support.selection.selectedEffectsInOriginalLazyOrder,true);assert.equal(support.selection.noPrivateFrameAcrossYield,true);assert.equal(plan.files.at(-1).selection.distinctCandidateSchema,true);
});

test('every complete formatting matches vector stage field equals the actual original full JSON wire result',{timeout:60000},()=>{
 let current=sources();for(const name of ['formatting','matches','vectors']){const input={name,entry:'src/lib.rs',files:current,dependencyInputs:cargo,compilationProfile:PRODUCTION_PROFILE},baseline=legacyStage(input),candidate=runOriginalCoreSequenceStage(input);assert.deepStrictEqual(wire(candidate),wire(baseline));assert.deepStrictEqual(reviewOriginalCoreSequenceStage(candidate),reviewOriginalCoreSequenceStage(baseline));assert.ok(candidate.proposal.inputs.every(row=>row.source===current[row.path]));assert.equal(candidate.proposal.semanticAdmission,false);assert.equal(candidate.proposal.summary.selectedFunctions,1);current=candidate.files;}
 const changed=runOriginalCoreSequenceStage({name:'formatting',entry:'src/lib.rs',files:sources(),dependencyInputs:cargo,compilationProfile:PRODUCTION_PROFILE});const corrupted=wire(changed);corrupted.proposal.inputs[0].source+=' ';assert.throws(()=>assert.deepStrictEqual(corrupted,wire(changed)),assert.AssertionError,'one nested original source remains part of the full strict equation');
});

test('eager capture preserves exact lazy successful-inspection order and omits untouched or failed physical files',{timeout:60000},()=>{
 const files=sources('pub fn idle(){}');delete files['src/app.rs'];files['src/lib.rs']='pub mod translation_core;mod a;mod untouched;mod z;#[derive(Clone)]pub struct Root;';files['src/a.rs']='#[derive(Clone)]pub struct A;pub fn first()->String{format!("a")}';files['src/z.rs']='#[derive(Clone)]pub struct Z;pub fn last()->String{format!("z")}';files['src/untouched.rs']='#[derive(Clone)]pub struct Unseen;';const input={name:'formatting',entry:'src/lib.rs',files,dependencyInputs:cargo,compilationProfile:PRODUCTION_PROFILE},baseline=legacyStage(input),candidate=runOriginalCoreSequenceStage(input);assert.deepStrictEqual(wire(candidate),wire(baseline));assert.deepStrictEqual(candidate.proposal.producerEffects.selections.map(row=>row.file),['src/a.rs','src/lib.rs','src/z.rs']);assert.equal(candidate.proposal.rows.find(row=>row.path==='src/untouched.rs').status,'unchanged');
 const blocked={...files,'src/lib.rs':files['src/lib.rs']+'mod blocked;','src/blocked.rs':'#[derive(Clone)]pub struct Blocked;unknown!();pub fn blocked()->String{format!("blocked")}'},failedInput={...input,files:blocked},failedOriginal=legacyStage(failedInput),failedCandidate=runOriginalCoreSequenceStage(failedInput);assert.deepStrictEqual(wire(failedCandidate),wire(failedOriginal));assert.equal(failedCandidate.proposal.rows.find(row=>row.path==='src/blocked.rs').status,'skipped');assert.ok(!failedCandidate.proposal.producerEffects.selections.some(row=>row.file==='src/blocked.rs'));
});

test('distinct full production stream retains every original packet field and complete fresh independent source inverse',{timeout:60000},t=>{
 const f=physical(t),baseline=legacyStream({root:f.directory,output:f.baseline}),candidate=proposeSourceBackedCoreSequenceStream({root:f.directory,output:f.output}),checked=reviewSourceBackedCoreSequenceStream({root:f.directory,output:f.output}),old=packets(f.baseline),actual=packets(f.output);assert.deepStrictEqual(candidate.summary,baseline.summary);assert.equal(checked.completeSourceInverse,true);assert.equal(checked.allPacketsDecoded,true);assert.equal(checked.freshNativeSourceEquations,true);assert.equal(candidate.schema,'router-complete-whole-owner-core-sequence-stream-candidate-v1');
 const expected=wire(old.index);expected.wire.schema='router-complete-whole-owner-core-sequence-stream-candidate-v1';assert.deepStrictEqual(actual.index,expected,'the one declared outer schema replacement is the entire complete index equation');assert.deepStrictEqual(actual.values,old.values);assert.deepStrictEqual(actual.index.wire.stages.map(row=>row.name),['formatting','matches','vectors']);assert.equal(actual.index.wire.newAcrossInvocationCache,false);for(const [path,text]of Object.entries(f.files))assert.equal(readFileSync(join(f.directory,path),'utf8'),text);
});

test('validly recompressed detached span and producer effect DATA never replace fresh native source equations',{timeout:60000},t=>{
 const available=wholeOwnerCoreCorpusInspectionReady(),parse=Object.getOwnPropertyDescriptor(JSON,'parse');let calls=0;try{Object.defineProperty(JSON,'parse',{...parse,value:function(){calls++;return {forged:'capture'};}});assert.equal(wholeOwnerCoreCorpusInspectionReady(),false);assert.equal(calls,0);Object.defineProperty(JSON,'parse',{configurable:parse.configurable,enumerable:parse.enumerable,get(){calls++;return parse.value;}});assert.equal(wholeOwnerCoreCorpusInspectionReady(),false);assert.equal(calls,0);}finally{Object.defineProperty(JSON,'parse',parse);}assert.equal(wholeOwnerCoreCorpusInspectionReady(),available);if(!process.versions.bun&&process.versions.node==='20.19.4')assert.equal(available,true,'pinned actual Node must qualify the actual native DATA parser');
 for(const kind of ['attribute','effect']){const f=physical(t);proposeSourceBackedCoreSequenceStream({root:f.directory,output:f.output});const stored=packets(f.output),at=stored.values.findIndex(value=>kind==='attribute'?value?.sourceInspectionOnly===true&&value.attributes?.length:value?.selections?.length&&value.schema==='core-adoption-original-producer-effects-v1');assert.ok(at>=0);const changed=wire(stored.values[at]);if(kind==='attribute')changed.attributes[0].expected+=' ';else changed.selections[0].sourceSha256='0'.repeat(64);repack(f.output,stored.index,at,changed);assert.throws(()=>reviewSourceBackedCoreSequenceStream({root:f.directory,output:f.output}),/native stage equation|source|span/u);}
});

test('independent complete three-stage engines retain full actual JSON refusals Hash payloads and all successful outputs',{timeout:60000},t=>{
 const fixture=fileURLToPath(new URL('./fixtures/whole-owner-core-corpus-hook-child.mjs',import.meta.url));let storedBytes=0,logicalBytes=0;
 for(const kind of ['json-hook','hash-hook']){
  const runs=['legacy','whole'].map(mode=>spawnSync(process.execPath,[fixture,mode,kind],{encoding:'utf8',timeout:12500,maxBuffer:64*1024*1024}));
  for(const run of runs){assert.equal(run.error,undefined);assert.equal(run.signal,null);assert.equal(run.status,0,run.stderr);assert.equal(run.stderr,'');assert.ok(Buffer.byteLength(run.stdout)<=64*1024*1024);}
  const sizes=compareCompleteIndexedHookWires(runs[0].stdout,runs[1].stdout);for(const row of Object.values(sizes)){storedBytes+=row.storedBytes;logicalBytes+=row.logicalBytes;}t.diagnostic(JSON.stringify({kind,children:sizes,cumulativeStoredBytes:storedBytes,cumulativeIndexedRepresentationBytes:logicalBytes,sequentialChildren:true,expandedTapeIsNotStringified:true}));
  runs[1].stdout='';const baseline=decodeCompleteIndexedHookWire(runs[0].stdout);assert.equal(baseline.workload.state,'complete-formatting-matches-vectors-operation');
  if(kind==='hash-hook'){
   assert.ok(baseline.workload.tape.length>0);assert.equal(baseline.workload.result.value.length,3);const row=baseline.workload.tape.find(row=>typeof row.value==='string');assert.ok(row);const original=row.value;
   try{row.value+=' ';const changed=encodeCompleteIndexedHookWire(baseline);assert.throws(()=>compareCompleteIndexedHookWires(runs[0].stdout,changed),/complete decoded bytes/u);}finally{row.value=original;}
  }else{assert.equal(baseline.workload.result.error.name,'TypeError');assert.match(baseline.workload.result.error.message,/native|original|concrete/iu);}
  runs[0].stdout='';
 }
});
