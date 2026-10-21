import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,rmSync,symlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {proposeSourceBackedCoreSequencePackets,reviewSourceBackedCoreSequencePackets,SOURCE_BACKED_CORE_SEQUENCE_PACKET_LIMITS as L} from '../source-backed-core-sequence-packets.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {repositorySourceURL,repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../router-core-source-data.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const CLI=fileURLToPath(new URL('../source-backed-core-sequence-packets.mjs',import.meta.url));
const source='\uFEFF#[derive(Clone,Copy)]pub struct Marker{value:u8}\r\n'+
 'pub fn formatted(value:u8)->String{format!("value={value}")}\r\n'+
 'pub fn accepted(value:&crate::translation_core::Str)->bool{matches /* 😀 */ !(value,"a"|"😀")}\r\n'+
 'pub fn values()->Vec<u8>{vec![1u8,2u8]}\r\n#[cfg(test)]mod tests{unknown!();}\r\n';
let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60000},async t=>{
 vectors=[];try{await run(t);}finally{
  const output=process.env.ROUTER_CORE_SEQUENCE_PACKET_EVIDENCE_DIR;
  if(output){mkdirSync(output,{recursive:true});const bytes=Buffer.from(JSON.stringify({name,vectors})+'\n'),packed=gzipSync(bytes,{mtime:0});assert.deepEqual(gunzipSync(packed),bytes);writeFileSync(join(output,hash(name)+'.json.gz'),packed);}
 }
});
function fixture(t,application=source){
 const parent=mkdtempSync(join(tmpdir(),'router-source-sequence-packets-'));t.after(()=>rmSync(parent,{recursive:true,force:true}));const directory=join(parent,'input'),output=join(parent,'proposal');mkdirSync(directory);
 const input={'rust/src/lib.rs':'pub mod translation_core;pub mod app;','rust/src/app.rs':application,'rust/src/translation_core.rs':facade,'rust/src/translation_core/primitives.rs':primitives,'rust/src/translation_core/ranges.rs':ranges,'rust/src/translation_core/base64.rs':base64,'rust/src/translation_core/json_collections.rs':collections,'rust/Cargo.toml':readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),'Cargo.lock':readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),'Cargo.toml':readFileSync(repositoryWorkspaceManifestURL(root),'utf8')};
 for(const [path,text]of Object.entries(input)){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);}
 retain('complete-original-physical-inputs',{directory,input});return {directory,output,input,options:{root:directory,output}};
}
function stored(directory){return retain('complete-stored-packets',readdirSync(directory).sort().map(path=>({path,base64:readFileSync(join(directory,path)).toString('base64')})));}
function read(directory){
 const index=JSON.parse(readFileSync(join(directory,'index.json'),'utf8')),packets=index.packets.map(row=>{const raw=gunzipSync(readFileSync(join(directory,row.file)));assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);return JSON.parse(raw);});return {index,packets};
}
function repack(directory,index,at,value){
 const raw=Buffer.from(JSON.stringify(value)+'\n'),packed=gzipSync(raw,{mtime:0}),row=index.packets[at];
 index.logicalBytes+=raw.length-row.bytes;index.storedBytes+=packed.length-row.storedBytes;Object.assign(row,{bytes:raw.length,sha256:hash(raw),storedBytes:packed.length,storedSha256:hash(packed)});
 writeFileSync(join(directory,row.file),packed);writeFileSync(join(directory,'index.json'),JSON.stringify(index)+'\n');
}
test('fixed actual three-stage packets retain every complete source CST inactive item inverse and base function identity',t=>{
 const f=fixture(t),receipt=retain('complete-native-producer-receipt',proposeSourceBackedCoreSequencePackets(f.options)),actual=read(f.output),review=retain('complete-fresh-native-equation-review',reviewSourceBackedCoreSequencePackets(f.options));stored(f.output);
 assert.equal(receipt.complete,true);assert.equal(receipt.distinctCandidateFunctions,3);assert.equal(receipt.candidateSelections,3);assert.equal(review.freshNativeSourceEquations,true);assert.equal(review.allPacketsDecoded,true);assert.equal(review.completeSourceInverse,true);assert.equal(review.semanticAdmission,false);assert.equal(review.executableCoverageGain,null);assert.equal(review.applicationSourcesInstalled,false);
 assert.deepEqual([L.packetBytes,L.outputBytes,L.packets,L.storedBytes],[64*1024*1024,1024*1024*1024,20000,384*1024*1024]);
 assert.deepEqual(actual.index.limits,L);assert.equal(review.packets,actual.index.packets.length);assert.deepEqual(review.summary.stepSelections.map(row=>row.step),['formatting','matches','vectors']);
 assert.equal(new Set(review.summary.functions.map(row=>row.id)).size,3);for(const fn of review.summary.functions){const original=f.input[fn.path].slice(...fn.span);assert.equal(hash(original),fn.sha256);assert.ok(original.includes('fn '+fn.name));}
 const documents=actual.index.packets.map((row,at)=>[row,actual.packets[at]]).filter(([row])=>row.label.startsWith('complete.sequence.documents:'));
 assert.ok(documents.length>=7);for(const [,document]of documents){assert.equal(transportConcreteSyntaxMeta(document.meta).source,document.source);assert.equal(hash(document.source),document.sha256);}
 assert.ok(documents.some(([,row])=>row.source===source));assert.ok(documents.some(([,row])=>row.source.includes('#[cfg(test)]mod tests{unknown!();}')));
 for(const [path,text]of Object.entries(f.input))assert.equal(readFileSync(join(f.directory,path),'utf8'),text,path);
});
test('packet checksums and schema flags cannot replace the fresh genuine native source substitution equation',t=>{
 const f=fixture(t);proposeSourceBackedCoreSequencePackets(f.options);const actual=read(f.output),at=actual.index.packets.findIndex((row,index)=>row.label.includes('.history:0.proposal.rows:')&&actual.packets[index].proposal?.edits.length);
 assert.ok(at>=0);const row=actual.packets[at];row.proposal.edits[0].replacement='crate::foreign::format!';repack(f.output,actual.index,at,row);stored(f.output);
 assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options),/fresh complete native source equation differs/u);
});
test('source workspace lock and complete physical file census changes refuse even with old packets retained',t=>{
 for(const [path,append]of [['rust/src/app.rs','\n// fresh source\n'],['Cargo.toml','\n# fresh workspace\n'],['Cargo.lock','\n# fresh lock\n']]){
  const f=fixture(t);proposeSourceBackedCoreSequencePackets(f.options);writeFileSync(join(f.directory,path),f.input[path]+append);assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options),TypeError);stored(f.output);
 }
 const f=fixture(t);proposeSourceBackedCoreSequencePackets(f.options);writeFileSync(join(f.directory,'rust/src/additional.rs'),'pub fn additional(){}');assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options),/native source equation/u);
});
test('missing extra truncated duplicate and linked packets or indexes remain incomplete refusals',t=>{
 const f=fixture(t);proposeSourceBackedCoreSequencePackets(f.options);const first=read(f.output).index.packets[0],path=join(f.output,first.file),raw=readFileSync(path);
 writeFileSync(path,raw.subarray(0,Math.max(1,raw.length-1)));assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options),TypeError);writeFileSync(path,raw);
 writeFileSync(join(f.output,'extra.json'),'{}');assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options),/directory/u);rmSync(join(f.output,'extra.json'));
 const external=join(dirname(f.output),'external.gz');writeFileSync(external,raw);rmSync(path);symlinkSync(external,path);assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options),/packet/u);rmSync(path);writeFileSync(path,raw);
 const originalIndex=readFileSync(join(f.output,'index.json'),'utf8'),flagged=JSON.parse(originalIndex);flagged.semanticAdmission=true;writeFileSync(join(f.output,'index.json'),JSON.stringify(flagged)+'\n');assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options),/fixed source-only/u);writeFileSync(join(f.output,'index.json'),originalIndex);
 rmSync(path);assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options));writeFileSync(path,raw);
 const index=JSON.parse(originalIndex);index.packets.push({...first});writeFileSync(join(f.output,'index.json'),JSON.stringify(index)+'\n');assert.throws(()=>reviewSourceBackedCoreSequencePackets(f.options),/descriptor|census/u);stored(f.output);
});
test('unknown local opaque and mixed macro families preserve original bytes instead of becoming new owned APIs',t=>{
 const application='macro_rules! local{()=>{true}}\npub fn blocked()->Vec<u8>{local!();vec![1u8]}\npub fn mixed()->Vec<String>{vec![format!("x")]}\npub fn good()->Vec<bool>{vec![true]}';
 const f=fixture(t,application),receipt=proposeSourceBackedCoreSequencePackets(f.options),review=reviewSourceBackedCoreSequencePackets(f.options);stored(f.output);
 assert.equal(receipt.semanticAdmission,false);assert.equal(review.applicationSourcesInstalled,false);assert.equal(review.executableCoverageGain,null);
 // A local declaration producer can conservatively block the entire file.
 assert.ok(review.summary.functions.every(row=>!['blocked','mixed'].includes(row.name)));assert.equal(readFileSync(join(f.directory,'rust/src/app.rs'),'utf8'),application);
});
test('accessors proxies caller verifiers unknown fields missing Cargo links overlap and existing outputs refuse',t=>{
 const f=fixture(t);let callbacks=0;const accessor={output:f.output};Object.defineProperty(accessor,'root',{enumerable:true,get(){callbacks++;throw Error('getter');}});const proxy=new Proxy(f.options,{ownKeys(){callbacks++;return [];}});
 for(const input of [accessor,proxy,{...f.options,verifier(){callbacks++;}},{...f.options,sequence:'json-readers'}])assert.throws(()=>proposeSourceBackedCoreSequencePackets(input),TypeError);
 assert.equal(callbacks,0);assert.throws(()=>proposeSourceBackedCoreSequencePackets({root:f.directory,output:join(f.directory,'packets')}),/disjoint/u);
 const linked=f.directory+'-linked';symlinkSync(f.directory,linked,'dir');t.after(()=>rmSync(linked,{force:true}));assert.throws(()=>proposeSourceBackedCoreSequencePackets({root:linked,output:f.output}),/unlinked/u);
 const oversized=join(f.directory,'rust/src/oversized.rs');writeFileSync(oversized,' '.repeat(L.fileUnits+1));assert.throws(()=>proposeSourceBackedCoreSequencePackets(f.options),/limit/u);rmSync(oversized);
 rmSync(join(f.directory,'Cargo.lock'));assert.throws(()=>proposeSourceBackedCoreSequencePackets(f.options),/Cargo/u);assert.equal(readdirSync(dirname(f.output)).includes('proposal'),false);
});
test('standalone CLI selects only explicit propose and review and provides no application or old-default dispatch',t=>{
 const f=fixture(t,'pub fn good()->Vec<bool>{vec![true]}');
 for(const mode of ['propose','review']){const child=spawnSync(process.execPath,[CLI,mode,'--root',f.directory,'--output',f.output],{encoding:'utf8',timeout:20000});retain('complete-cli-'+mode,child);assert.equal(child.status,0,child.stderr);const receipt=JSON.parse(child.stdout);assert.equal(receipt.semanticAdmission,false);assert.equal(receipt.executableCoverageGain,null);assert.equal(receipt.applicationSourcesInstalled,false);}
 for(const mode of ['apply','json-readers','caller-verifier']){const child=spawnSync(process.execPath,[CLI,mode,'--root',f.directory,'--output',f.output],{encoding:'utf8',timeout:20000});retain('complete-cli-refusal-'+mode,child);assert.notEqual(child.status,0);assert.match(child.stderr,/usage/u);}
 assert.throws(()=>proposeSourceBackedCoreSequencePackets(f.options),/fresh/u);stored(f.output);assert.equal(readFileSync(join(f.directory,'rust/src/app.rs'),'utf8'),f.input['rust/src/app.rs']);
});
