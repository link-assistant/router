import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,readdirSync,rmSync,symlinkSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareCoreSequenceStreamSources} from '../prepare-core-sequence-stream-sources.mjs';
import {proposeSourceBackedCoreSequenceStream as propose,reviewSourceBackedCoreSequenceStream as review} from '../source-backed-core-sequence-stream.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {formattingPacketIO as IO} from '../formatting-packet-io.mjs';
import {SOURCE_BACKED_CORE_SEQUENCE_PACKET_LIMITS as LIMITS} from '../source-backed-core-sequence-packets.mjs';
import {repositorySourceURL,repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE as facade,ROUTER_CORE_PRIMITIVES_SOURCE as primitives,ROUTER_CORE_RANGES_SOURCE as ranges,ROUTER_CORE_BASE64_SOURCE as base64,ROUTER_CORE_JSON_COLLECTIONS_SOURCE as collections} from '../router-core-source-data.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const CLI=fileURLToPath(new URL('../source-backed-core-sequence-stream.mjs',import.meta.url));
const application='\uFEFF#[derive(Clone,Copy)]pub struct Marker{value:u8}\r\n'+
 'pub fn formatted(value:u8)->String{format!("value={value}")}\r\n'+
 'pub fn accepted(value:&crate::translation_core::Str)->bool{matches /* 😀 */ !(value,"a"|"😀")}\r\n'+
 'pub fn values()->Vec<u8>{vec![1u8,2u8]}\r\n#[cfg(test)]mod tests{unknown!();}\r\n';
let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60000},async t=>{
 vectors=[];try{await run(t);}finally{
  const output=process.env.ROUTER_CORE_SEQUENCE_STREAM_EVIDENCE_DIR;
  if(output){mkdirSync(output,{recursive:true});const raw=Buffer.from(JSON.stringify({name,vectors})+'\n'),packed=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(packed),raw);writeFileSync(join(output,hash(name)+'.json.gz'),packed);}
 }
});
function fixture(t,source=application){
 const parent=mkdtempSync(join(tmpdir(),'router-stagewise-source-'));t.after(()=>rmSync(parent,{recursive:true,force:true}));const directory=join(parent,'input'),output=join(parent,'proposal');mkdirSync(directory);
 const files={'rust/src/lib.rs':'pub mod translation_core;pub mod app;','rust/src/app.rs':source,'rust/src/translation_core.rs':facade,'rust/src/translation_core/primitives.rs':primitives,'rust/src/translation_core/ranges.rs':ranges,'rust/src/translation_core/base64.rs':base64,'rust/src/translation_core/json_collections.rs':collections,'rust/Cargo.toml':readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),'Cargo.lock':readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),'Cargo.toml':readFileSync(repositoryWorkspaceManifestURL(root),'utf8')};
 for(const [path,text]of Object.entries(files)){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);}
 retain('complete-physical-inputs',{directory,files});return {directory,output,files,options:{root:directory,output}};
}
function packets(output){
 const index=JSON.parse(readFileSync(join(output,'index.json'),'utf8')),values=index.packets.map(row=>{const packed=readFileSync(join(output,row.file)),raw=gunzipSync(packed);assert.equal(hash(packed),row.storedSha256);assert.equal(hash(raw),row.sha256);assert.equal(raw.length,row.bytes);return JSON.parse(raw);});
 retain('complete-packets',{index,values});return {index,values};
}
function repack(output,index,at,value){const raw=Buffer.from(JSON.stringify(value)+'\n'),packed=gzipSync(raw,{mtime:0}),row=index.packets[at];index.logicalBytes+=raw.length-row.bytes;index.storedBytes+=packed.length-row.storedBytes;Object.assign(row,{bytes:raw.length,sha256:hash(raw),storedBytes:packed.length,storedSha256:hash(packed)});writeFileSync(join(output,row.file),packed);writeFileSync(join(output,'index.json'),JSON.stringify(index)+'\n');}
test('native copied whole stage and IO helpers retain complete source bindings CSTs and old-module inverses',()=>{
 const plan=retain('complete-native-source-plan',prepareCoreSequenceStreamSources());assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.defaultAPIsUnchanged,true);assert.equal(plan.files.length,2);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.before,readFileSync(new URL(row.originalPath,root),'utf8'));assert.equal(row.inverse,row.before);assert.equal(row.beforeSha256,hash(row.before));assert.equal(row.afterSha256,hash(row.after));assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.completeInverse,true);}for(const selection of row.selections)assert.equal(row.before.slice(...selection.span),selection.source);}
 assert.equal(plan.files[0].language,plan.files[0].before);assert.ok(plan.files[1].selections.length>6);assert.match(plan.files[0].after,/complete current original stage source changed/u);assert.match(plan.files[1].after,/complete current original packet source changed/u);
});
test('three stage stream retains complete intermediate documents rows and distinct original function coordinates',t=>{
 const f=fixture(t),events=[],receipt=retain('complete-proposal-receipt',propose(f.options,event=>{events.push(event);assert.ok(Object.isFrozen(event));})),stored=packets(f.output),checked=retain('complete-independent-review',review(f.options));retain('complete-progress',events);
 assert.equal(receipt.summary.candidateSelections,3);assert.equal(receipt.summary.distinctCandidateFunctions,3);assert.equal(checked.completeSourceInverse,true);assert.equal(checked.freshNativeSourceEquations,true);assert.equal(checked.allPacketsDecoded,true);assert.equal(checked.semanticAdmission,false);assert.equal(checked.executableCoverageGain,null);assert.equal(checked.applicationSourcesInstalled,false);assert.deepEqual(receipt.summary,checked.summary);assert.deepEqual(stored.index.limits,LIMITS);
 const manifest=stored.index.wire;assert.deepEqual(manifest.stages.map(stage=>stage.name),['formatting','matches','vectors']);assert.equal(manifest.sourceCstInverseIsReverseExecution,false);assert.ok(!Object.hasOwn(manifest,'history'));
 for(const row of manifest.documents){const doc=stored.values[row.packet.packet];assert.equal(transportConcreteSyntaxMeta(doc.meta).source,doc.source);assert.equal(hash(doc.source),doc.sha256);}
 const appDocs=manifest.documents.filter(row=>row.path==='rust/src/app.rs').map(row=>stored.values[row.packet.packet].source);assert.equal(appDocs.length,4);assert.ok(appDocs.includes(application));assert.ok(appDocs.every(text=>text.startsWith('\uFEFF#[derive(Clone,Copy)]')&&text.endsWith('#[cfg(test)]mod tests{unknown!();}\r\n')));
 for(const group of receipt.summary.functions){assert.equal(group.sha256,hash(f.files[group.path].slice(...group.span)));assert.deepEqual(group.selectedBy,[group.name==='formatted'?'formatting':group.name==='accepted'?'matches':'vectors']);}
 assert.deepEqual(events.filter(event=>event.stage==='corpus'&&event.state==='end').map(event=>event.phase),['formatting','matches','vectors']);assert.equal(events.at(-1).phase,'all-stages-EOF-and-full-packet-reopen');for(const [path,text]of Object.entries(f.files))assert.equal(readFileSync(join(f.directory,path),'utf8'),text);
});
test('valid recompressed packets cannot forge an actual stage source equation and storage census stays exact',t=>{
 const f=fixture(t);propose(f.options);const stored=packets(f.output),stage=stored.index.wire.stages[0],at=stage.rows.find(row=>row.path==='rust/src/app.rs').packet.packet,row=structuredClone(stored.values[at]);row.proposal.functions[0].name='forged';repack(f.output,stored.index,at,row);assert.throws(()=>review(f.options),/native stage equation/u);
 repack(f.output,stored.index,at,stored.values[at]);writeFileSync(join(f.output,'unlisted.json'),'{}');assert.throws(()=>review(f.options),/directory/u);rmSync(join(f.output,'unlisted.json'));
 const first=join(f.output,stored.index.packets[0].file),raw=readFileSync(first),external=join(dirname(f.output),'linked.gz');writeFileSync(external,raw);rmSync(first);symlinkSync(external,first);assert.throws(()=>review(f.options),/packet/u);rmSync(first);writeFileSync(first,raw);
 const index=JSON.parse(readFileSync(join(f.output,'index.json'),'utf8'));index.wire.stages[1].inputs=index.wire.stages[0].inputs;writeFileSync(join(f.output,'index.json'),JSON.stringify(index)+'\n');assert.throws(()=>review(f.options),/document/u);
});
test('fresh review rechecks source Cargo workspace lock and complete physical source membership',t=>{
 for(const path of ['rust/src/app.rs','rust/Cargo.toml','Cargo.toml','Cargo.lock']){const f=fixture(t);propose(f.options);writeFileSync(join(f.directory,path),f.files[path]+'\n');assert.throws(()=>review(f.options),/physical source-only manifest/u);}
 const f=fixture(t);propose(f.options);writeFileSync(join(f.directory,'rust/src/additional.rs'),'pub fn additional(){}');assert.throws(()=>review(f.options),/physical source-only manifest/u);
});
test('callback exceptions or physical input mutation leave finite incomplete receipts and no success index',t=>{
 for(const mutation of ['throw','source','workspace','packet']){const f=fixture(t);let fired=false;
  assert.throws(()=>propose(f.options,event=>{if(fired)return;if(mutation==='packet'){if(event.phase!=='all-stages-EOF-and-full-packet-reopen')return;fired=true;writeFileSync(join(f.output,'000000.json.gz'),'corrupt');return;}if(event.stage!=='corpus'||event.state!=='start')return;fired=true;if(mutation==='throw')throw Error('observer stop');const path=mutation==='source'?'rust/src/app.rs':'Cargo.toml';writeFileSync(join(f.directory,path),f.files[path]+'\n');}));assert.equal(fired,true);assert.equal(existsSync(join(f.output,'index.json')),false);const failure=retain('complete-incomplete-'+mutation,JSON.parse(readFileSync(join(f.output,'failure.json'),'utf8')));assert.equal(failure.complete,false);assert.equal(failure.semanticAdmission,false);assert.equal(failure.stage,mutation==='packet'?'complete-index':'formatting');}
 const f=fixture(t);assert.throws(()=>propose(f.options,{}),/callback/u);assert.equal(existsSync(f.output),false);
});
test('unknown local opaque mixed and foreign macro families remain original refused source',t=>{
 const source='macro_rules! local{()=>{true}}\npub fn blocked()->Vec<u8>{local!();vec![1u8]}\npub fn mixed()->Vec<String>{vec![format!("x")]}\npub fn foreign()->Vec<u8>{other::vec![vec![1u8]]}\npub fn good()->Vec<bool>{vec![true]}';
 const f=fixture(t,source),receipt=propose(f.options),checked=review(f.options),stored=packets(f.output);assert.ok(receipt.summary.functions.every(row=>!['blocked','mixed','foreign'].includes(row.name)));assert.equal(checked.applicationSourcesInstalled,false);assert.equal(readFileSync(join(f.directory,'rust/src/app.rs'),'utf8'),source);
 for(const stage of stored.index.wire.stages){const row=stored.values[stage.rows.find(row=>row.path==='rust/src/app.rs').packet.packet];if(row.proposal){IO.assertAdoptionInverse(row.proposal);assert.ok(row.proposal.functions.every(fn=>!['blocked','mixed','foreign'].includes(fn.name)));}}
});
test('strict options original budgets and explicit CLI provide no installation or caller verifier path',t=>{
 const f=fixture(t,'pub fn good()->Vec<bool>{vec![true]}');let invoked=0;const accessor={output:f.output};Object.defineProperty(accessor,'root',{enumerable:true,get(){invoked++;}});const proxy=new Proxy(f.options,{ownKeys(){invoked++;return [];}});for(const options of [accessor,proxy,{...f.options,verifier(){invoked++;}}])assert.throws(()=>propose(options),TypeError);assert.equal(invoked,0);assert.throws(()=>propose({root:f.directory,output:join(f.directory,'nested')}),/disjoint/u);
 const oversized=join(f.directory,'rust/src/oversized.rs');writeFileSync(oversized,' '.repeat(LIMITS.fileUnits+1));assert.throws(()=>propose(f.options),/limit/u);rmSync(oversized);
 assert.deepEqual([LIMITS.packetBytes,LIMITS.outputBytes,LIMITS.packets,LIMITS.storedBytes],[64*1024*1024,1024*1024*1024,20000,384*1024*1024]);
 for(const mode of ['propose','review']){const child=retain('complete-cli-'+mode,spawnSync(process.execPath,[CLI,mode,'--root',f.directory,'--output',f.output,'--progress'],{encoding:'utf8',timeout:20000}));assert.equal(child.status,0,child.stderr);const result=JSON.parse(child.stdout);assert.equal(result.semanticAdmission,false);assert.equal(result.applicationSourcesInstalled,false);assert.equal(result.executableCoverageGain,null);assert.ok(child.stderr.includes('rust-meta-translation-progress-v1'));}
 assert.throws(()=>propose(f.options),/fresh/u);rmSync(join(f.directory,'Cargo.lock'));assert.throws(()=>review(f.options),/Cargo/u);assert.equal(readFileSync(join(f.directory,'rust/src/app.rs'),'utf8'),f.files['rust/src/app.rs']);
});
