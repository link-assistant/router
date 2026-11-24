import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync,renameSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {Hash} from 'node:crypto';
import {proposeSourceBackedFormattingGzipPackets} from '../propose-source-backed-formatting.mjs';
import {reviewSourceBackedFormattingPackets} from '../review-source-backed-formatting-packets.mjs';
import {prepareFormattingPacketCli} from '../prepare-formatting-packet-cli.mjs';
import {openFormattingGzipPackets,SOURCE_FORMATTING_GZIP_LIMITS} from '../formatting-packet-storage.mjs';
import {SOURCE_FORMATTING_PACKET_LIMITS} from '../formatting-packet-io.mjs';
import {CORE_ADOPTION_PACKET_LIMITS} from '../propose-core-adoption-corpus.mjs';
import {CORE_ADOPTION_GZIP_LIMITS} from '../core-adoption-packet-storage.mjs';
import {proposeSourceBackedCoreFormattingCorpus} from '../source-backed-core-formatting.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from '../router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-primitives.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const bound={timeout:60_000},cli=fileURLToPath(new URL('../propose-source-backed-formatting.mjs',import.meta.url));
function fixture(t){
 const directory=mkdtempSync(join(tmpdir(),'router-formatting-cli-')),root=join(directory,'source'),output=join(directory,'packets'),files={'src/lib.rs':'pub mod translation_core;pub mod sample;','src/sample.rs':'pub fn message(name:&str)->String{format!("hello {name}")}#[cfg(test)]mod tests{unknown!();}','src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/untracked.rs':'pub fn ignored()->String{format!("ignored")}'};t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const [path,source]of Object.entries(files)){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}return {directory,root,output,files};
}
function reconstruct(output){
 const reader=openFormattingGzipPackets(output),all=new Map();for(const descriptor of reader.index.packets)all.set(descriptor.path,reader.read(descriptor).toString('utf8'));reader.verify();const packet=reader.index.stages[0].packets,parse=reference=>JSON.parse(all.get(reference.path)),metadata=parse(packet.metadata),fields={rows:packet.rows.map(parse),bindingInspections:packet.bindingInspections.map(parse),inputs:packet.inputs.map(parse),moduleEdges:parse(packet.moduleEdges),moduleDiagnostics:parse(packet.moduleDiagnostics)};
 return {index:reader.index,proposal:Object.fromEntries(metadata.keys.map(key=>[key,Object.hasOwn(metadata.values,key)?metadata.values[key]:fields[key]]))};
}
test('bounded CLI source preparation copies actual complete helpers reader and unchanged quotas',bound,()=>{
 const prepared=prepareFormattingPacketCli();assert.equal(prepared.typescriptVersion,'5.9.3');assert.equal(prepared.allOriginalAPIsUnchanged,true);assert.equal(prepared.allOriginalStorageBoundsUnchanged,true);assert.deepEqual(SOURCE_FORMATTING_PACKET_LIMITS,CORE_ADOPTION_PACKET_LIMITS);assert.deepEqual(SOURCE_FORMATTING_GZIP_LIMITS,CORE_ADOPTION_GZIP_LIMITS);
 for(const row of prepared.files){assert.equal(row.current,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);}
});
test('actual bounded writer and independent full readback retain every formatting field source refusal and inverse',bound,t=>{
 const f=fixture(t),receipt=proposeSourceBackedFormattingGzipPackets({root:f.root,output:f.output}),review=reviewSourceBackedFormattingPackets(f.output),readback=reconstruct(f.output),materialized=proposeSourceBackedCoreFormattingCorpus({files:f.files});assert.equal(receipt.schema,'router-source-backed-formatting-packets-v1');assert.equal(review.schema,'router-source-backed-formatting-readback-v1');assert.equal(receipt.complete,true);assert.equal(review.complete,true);assert.equal(review.semanticAdmission,false);assert.equal(review.sourceAuthority,false);assert.equal(review.executableCoverageGain,null);assert.deepEqual(readback.proposal,JSON.parse(JSON.stringify(materialized)));assert.deepEqual(review.summary,receipt.summary);assert.equal(review.sourceFiles,Object.keys(f.files).length);assert.equal(review.changedFiles,1);assert.equal(readback.proposal.rows.find(row=>row.path==='src/untracked.rs').status,'skipped');
 for(const [path,source]of Object.entries(f.files))assert.equal(readFileSync(join(f.root,path),'utf8'),source);assert.ok(receipt.storedBytes<receipt.logicalBytes);assert.ok(receipt.logicalBytes<SOURCE_FORMATTING_PACKET_LIMITS.outputBytes);assert.ok(receipt.storedBytes<SOURCE_FORMATTING_GZIP_LIMITS.storedBytes);
});
test('the shipped CLI writes a fresh distinct formatting archive and independently reviews every packet',bound,t=>{
 const f=fixture(t),receipt=JSON.parse(execFileSync(process.execPath,[cli,'--root',f.root,'--output',f.output,'--packet-storage','gzip'],{encoding:'utf8',timeout:20_000})),review=JSON.parse(execFileSync(process.execPath,[cli,'--review',f.output],{encoding:'utf8',timeout:20_000}));assert.equal(receipt.sourceFiles,Object.keys(f.files).length);assert.equal(review.packetCount,receipt.packetCount);assert.equal(review.summary.selectedFunctions,1);assert.equal(JSON.parse(readFileSync(join(f.output,'packet-storage.json'),'utf8')).schema,'router-source-backed-formatting-gzip-storage-v1');assert.throws(()=>proposeSourceBackedFormattingGzipPackets({root:f.root,output:f.output}),/fresh outside/);assert.throws(()=>proposeSourceBackedFormattingGzipPackets({root:f.root,output:join(f.root,'forbidden')}),/overlaps/);assert.equal(existsSync(join(f.root,'forbidden')),false);
});
test('independent readback rejects changed stored bytes and unlisted physical entries',bound,t=>{
 const f=fixture(t);proposeSourceBackedFormattingGzipPackets({root:f.root,output:f.output});const stored=JSON.parse(readFileSync(join(f.output,'packet-storage.json'),'utf8')).packets[0],path=join(f.output,stored.file),before=readFileSync(path),changed=Buffer.from(before);changed[0]^=1;writeFileSync(path,changed);assert.throws(()=>reviewSourceBackedFormattingPackets(f.output),/digest|changed/);writeFileSync(path,before);writeFileSync(join(f.output,'unlisted.json'),'{}\n');assert.throws(()=>reviewSourceBackedFormattingPackets(f.output),/unlisted|inventory/);
});
test('actual writer hash observations cannot publish after complete original source or Cargo mutation',bound,t=>{
 for(const target of ['source','Cargo','workspace']){
  const f=fixture(t);writeFileSync(join(f.root,'Cargo.toml'),'standalone manifest');writeFileSync(join(f.root,'Cargo.lock'),'standalone lock');if(target==='workspace'){mkdirSync(join(f.root,'rust'));renameSync(join(f.root,'src'),join(f.root,'rust/src'));writeFileSync(join(f.root,'rust/Cargo.toml'),'standalone manifest');writeFileSync(join(f.root,'Cargo.toml'),'[workspace]\nmembers = ["rust"]\n');}const prior=Object.getOwnPropertyDescriptor(Hash.prototype,'update');let changed=false;
  try{Object.defineProperty(Hash.prototype,'update',{...prior,value:function(...args){if(!changed&&existsSync(join(f.output,'formatting/metadata.json.gz'))){changed=true;const path=join(f.root,target==='source'?'src/sample.rs':target==='Cargo'?'Cargo.lock':'Cargo.toml');writeFileSync(path,readFileSync(path,'utf8')+'\n');}return Reflect.apply(prior.value,this,args);}});assert.throws(()=>proposeSourceBackedFormattingGzipPackets({root:f.root,output:f.output}),/complete source file changed|complete optional Cargo input changed/);}finally{Object.defineProperty(Hash.prototype,'update',prior);}
  assert.equal(changed,true);assert.equal(existsSync(join(f.output,'index.json')),false);assert.equal(existsSync(join(f.output,'packet-storage.json')),false);const failed=JSON.parse(readFileSync(join(f.output,'failure.json'),'utf8'));assert.equal(failed.schema,'router-source-backed-formatting-incomplete-v1');assert.equal(failed.complete,false);assert.equal(failed.semanticAdmission,false);assert.throws(()=>openFormattingGzipPackets(f.output));
 }
});
