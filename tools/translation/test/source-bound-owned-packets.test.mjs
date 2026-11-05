// Independent physical packet storage SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {repositorySourceURL,repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
import {proposeSourceBoundOwnedCorePackets} from '../propose-core-adoption-corpus.mjs';
import {openCoreAdoptionGzipPackets} from '../core-adoption-packet-storage.mjs';
import {prepareSourceBoundOwnedPacketSources} from '../prepare-source-bound-owned-packet-sources.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url);
const source='pub mod translation_core;pub mod translation_text_core;pub mod translation_integer_core;\n#[rustfmt::skip]pub fn blank(value:&str)->bool{value.trim().is_empty()}\n#[rustfmt::skip]pub fn increment(value:u64)->u64{value.saturating_add(1)}';
function receiving(t){const directory=mkdtempSync(join(tmpdir(),'router-owned-packets-')),project=join(directory,'project'),output=join(directory,'output'),files={'Cargo.toml':readFileSync(repositoryWorkspaceManifestURL(root),'utf8'),'rust/Cargo.toml':readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),'Cargo.lock':readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),'rust/src/lib.rs':source,'rust/src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'rust/src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'rust/src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'rust/src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'rust/src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'rust/src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'rust/src/translation_integer_core.rs':INTEGER_NATIVE_SOURCE};t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const [path,text]of Object.entries(files)){mkdirSync(dirname(join(project,path)),{recursive:true});writeFileSync(join(project,path),text);}return {project,output,files};}
test('gzip packet proposal preserves complete decoded packet census and original physical source',limits,async t=>{
 const input=receiving(t),receipt=await proposeSourceBoundOwnedCorePackets({root:input.project,output:input.output},['text-methods','integer-methods']),reader=openCoreAdoptionGzipPackets(input.output);assert.equal(receipt.complete,true);assert.equal(receipt.packetStorage,'gzip');assert.equal(receipt.applicationSourcesInstalled,false);assert.equal(receipt.semanticAdmission,false);assert.equal(receipt.executableCoverageGain,null);assert.ok(receipt.outputBytes<500000000);assert.equal(reader.index.sequence,'source-bound-owned:text-methods,integer-methods');assert.deepEqual(reader.index.stages.map(row=>row.name),['text-methods','integer-methods']);
 let bytes=0;for(const packet of reader.index.packets){const raw=reader.read(packet);bytes+=raw.length;assert.equal(raw.length,packet.bytes);if(packet.kind==='json')assert.deepEqual(Buffer.from(JSON.stringify(JSON.parse(raw.toString('utf8')))+'\n'),raw);}assert.equal(bytes,reader.index.packetBytes);assert.equal(reader.verify(),true);
 for(const [path,text]of Object.entries(input.files))assert.equal(readFileSync(join(input.project,path),'utf8'),text);assert.ok(reader.index.dependencyInputs.length>=3);const captured=reader.index.dependencyInputs.map(packet=>JSON.parse(reader.read(packet)));assert.ok(captured.some(row=>row.path==='Cargo.toml'));assert.ok(captured.some(row=>row.path==='rust/Cargo.toml'));assert.ok(captured.some(row=>row.path==='Cargo.lock'));
});
test('a source change observed before final publication leaves no complete packet index',limits,async t=>{
 const input=receiving(t);let changed=false;await assert.rejects(proposeSourceBoundOwnedCorePackets({root:input.project,output:input.output},['text-methods'],event=>{if(event.stage==='fingerprint'&&!changed){changed=true;writeFileSync(join(input.project,'rust/src/lib.rs'),source+'\n');}}),/changed|census/u);assert.equal(changed,true);assert.equal(existsSync(join(input.output,'index.json')),false);assert.ok(existsSync(join(input.output,'failure.json')));
});
test('unknown duplicate accessor and malformed stage data cannot create completed output',limits,async t=>{
 const input=receiving(t);await assert.rejects(proposeSourceBoundOwnedCorePackets({root:input.project,output:input.output},['unknown']),/unknown fixed/u);assert.equal(existsSync(input.output),false);await assert.rejects(proposeSourceBoundOwnedCorePackets({root:input.project,output:input.output},['text-methods','text-methods']),/unique own/u);
 const stages=['text-methods'];Object.defineProperty(stages,'0',{get(){throw Error('must not invoke');}});await assert.rejects(proposeSourceBoundOwnedCorePackets({root:input.project,output:input.output},stages),/own owned stage/u);
});
test('three original source equations retain both phases and exact inverse',limits,()=>{
 const plan=prepareSourceBoundOwnedPacketSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
