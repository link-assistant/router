import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepareLiteralPacketCli} from '../prepare-literal-packet-cli.mjs';
import {proposeCoreLiteralGzipPackets,proposeCoreAdoptionSequence,CORE_ADOPTION_PACKET_LIMITS} from '../propose-core-adoption-corpus.mjs';
import {openCoreAdoptionGzipPackets} from '../core-adoption-packet-storage.mjs';
import {transportConcreteSyntaxMeta,transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-primitives.mjs';
const root=new URL('../../../',import.meta.url),script=fileURLToPath(new URL('../propose-core-adoption-corpus.mjs',import.meta.url)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t){
 const directory=mkdtempSync(join(tmpdir(),'router-literal-cli-')),source=join(directory,'source'),inputs={'rust/src/lib.rs':'pub mod translation_core;\nuse std::fs;pub fn answer()->String{"CLI Ω😀\\0".to_owned()}','rust/src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'rust/src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'rust/src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'rust/src/unreachable.rs':'pub fn orphan()->String{"must stay".to_owned()}','Cargo.toml':readFileSync(new URL('Cargo.toml',root),'utf8'),'rust/Cargo.toml':readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),'Cargo.lock':readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
 for(const [path,text]of Object.entries(inputs)){const absolute=join(source,path);mkdirSync(dirname(absolute),{recursive:true});writeFileSync(absolute,text);}t.after(()=>rmSync(directory,{recursive:true,force:true}));return {directory,source,inputs};
}
function validatePayload(descriptor,raw){assert.ok(['json','rust-source'].includes(descriptor.kind));const text=raw.toString('utf8');assert.deepEqual(Buffer.from(text,'utf8'),raw);if(descriptor.kind==='json')JSON.parse(text);else assert.equal(transportConcreteSyntaxMeta(transportConcreteSyntaxSource(text,{language:'Rust'}).meta).source,text);return {path:descriptor.path,kind:descriptor.kind,text};}
function compressed(output){const reader=openCoreAdoptionGzipPackets(output),packets=reader.index.packets.map(descriptor=>{const raw=reader.read(descriptor);assert.equal(raw.length,descriptor.bytes);assert.equal(hash(raw),descriptor.sha256);return validatePayload(descriptor,raw);});reader.verify();return {index:reader.index,packets};}
function plain(output){const index=JSON.parse(readFileSync(join(output,'index.json'))),packets=index.packets.map(descriptor=>{const raw=readFileSync(join(output,descriptor.path));assert.equal(raw.length,descriptor.bytes);assert.equal(hash(raw),descriptor.sha256);return validatePayload(descriptor,raw);});return {index,packets};}

test('actual literal CLI producer retains all original APIs bounded writer bodies and complete CST inverses',{timeout:60000},()=>{
 const plan=prepareLiteralPacketCli(),ts=ownershipCompiler();assert.equal(plan.files.length,1);assert.equal(plan.allOriginalPublicFunctionBodiesUnchanged,true);assert.equal(plan.allOriginalWriterAndQuotaBoundsUnchanged,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);assert.equal(CORE_ADOPTION_PACKET_LIMITS.outputBytes,1024*1024*1024);assert.equal(CORE_ADOPTION_PACKET_LIMITS.packetBytes,64*1024*1024);
 for(const row of plan.files){assert.equal(row.before,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);assert.deepEqual(row.trace.map(step=>step.phase),['language','repository']);const parse=source=>ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),before=parse(row.original),after=parse(row.after);assert.equal(before.parseDiagnostics.length,0);assert.equal(after.parseDiagnostics.length,0);for(const node of before.statements.filter(ts.isFunctionDeclaration)){const selected=after.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name.text===node.name.text);assert.equal(selected.length,1);assert.equal(selected[0].getText(after),node.getText(before));}}
});

test('every streamed gzip packet equals the complete original materialized literal operation in the physical Rust layout',{timeout:60000},async t=>{
 const f=fixture(t),oldOut=join(f.directory,'original'),newOut=join(f.directory,'streamed');await proposeCoreAdoptionSequence({root:f.source,output:oldOut},'literal');const receipt=await proposeCoreLiteralGzipPackets({root:f.source,output:newOut}),old=plain(oldOut),current=compressed(newOut),sort=rows=>[...rows].sort((a,b)=>a.path.localeCompare(b.path));assert.deepEqual(sort(current.packets),sort(old.packets));assert.deepEqual(current.index.stages[0].summary,old.index.stages[0].summary);assert.equal(current.index.stages[0].summary.selections,1);assert.equal(current.index.stages[0].summary.skippedFiles,1);assert.equal(current.index.entry,'rust/src/lib.rs');assert.equal(current.index.semanticAdmission,false);assert.equal(receipt.complete,true);assert.equal(receipt.packetStorage,'gzip');assert.equal(current.index.sequence,'literal');assert.deepEqual(current.index.stages[0].trace.map(row=>row.phase),['language','repository']);assert.deepEqual(current.index.stages[0].trace.map(row=>row.id),['core-adoption:prepare-literal-corpus-stream','core-adoption:literal-stream-complete-packets']);for(const [path,text]of Object.entries(f.inputs))assert.equal(readFileSync(join(f.source,path),'utf8'),text);assert.equal(current.packets.filter(row=>row.path.startsWith('literal/proposals/')).length,old.index.stages[0].summary.proposals);
});

test('cold literal gzip CLI selects the actual detached path and preserves every bounded progress record',{timeout:60000},t=>{
 const f=fixture(t),output=join(f.directory,'cold'),args=[script,'--root',f.source,'--output',output,'--sequence','literal','--packet-storage','gzip','--progress'],child=spawnSync(process.execPath,args,{encoding:'utf8',timeout:20000,maxBuffer:8*1024*1024});assert.equal(child.status,0,child.stderr);assert.equal(child.signal,null);assert.equal(child.error,undefined);const receipt=JSON.parse(child.stdout),current=compressed(output),progress=child.stderr.trim().split('\n').map(line=>JSON.parse(line));assert.ok(progress.length>4);assert.ok(progress.every(row=>typeof row.elapsedMilliseconds==='number'&&row.elapsedMilliseconds>=0));for(let at=1;at<progress.length;at++)assert.ok(progress[at].elapsedMilliseconds>=progress[at-1].elapsedMilliseconds);assert.equal(receipt.complete,true);assert.equal(current.index.sequence,'literal');assert.equal(current.index.stages[0].summary.selections,1);assert.equal(current.index.stages[0].trace[0].id,'core-adoption:prepare-literal-corpus-stream');for(const [path,text]of Object.entries(f.inputs))assert.equal(readFileSync(join(f.source,path),'utf8'),text);
});

test('changed physical sources and thrown observers retain incomplete output and never publish a successful index',{timeout:60000},async t=>{
 for(const kind of ['source-change','observer-throw']){const f=fixture(t),output=join(f.directory,kind),marker=new RangeError('exact literal packet observer marker');let observed=false,caught;
  try{await proposeCoreLiteralGzipPackets({root:f.source,output},row=>{if(!observed&&row.stage==='plan'&&row.state==='end'){observed=true;if(kind==='source-change')writeFileSync(join(f.source,'rust/src/lib.rs'),f.inputs['rust/src/lib.rs']+'\n');else throw marker;}});}catch(error){caught=error;}
  assert.equal(observed,true);assert.ok(caught);if(kind==='observer-throw')assert.equal(caught,marker);else assert.match(caught.message,/changed/);assert.equal(existsSync(join(output,'index.json')),false);const failure=JSON.parse(readFileSync(join(output,'failure.json')));assert.equal(failure.complete,false);assert.equal(failure.semanticAdmission,false);assert.ok(failure.packetCount>0);assert.throws(()=>compressed(output));
 }
});
