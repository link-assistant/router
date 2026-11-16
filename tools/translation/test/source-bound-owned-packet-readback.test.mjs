// Independent full packet/fresh source readback SOURCE. Every case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {repositorySourceURL,repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
import {proposeSourceBoundOwnedCorePackets} from '../propose-core-adoption-corpus.mjs';
import {reviewSourceBoundOwnedCorePackets} from '../source-bound-owned-packet-readback.mjs';
import {prepareSourceBoundOwnedReadbackSources} from '../prepare-source-bound-owned-readback-sources.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),sha=value=>createHash('sha256').update(value).digest('hex');
const source='pub mod translation_core;pub mod translation_text_core;\n#[rustfmt::skip]pub fn blank(value:&str)->bool{value.trim().is_empty()}';
async function receiving(t){const directory=mkdtempSync(join(tmpdir(),'router-owned-readback-')),project=join(directory,'project'),output=join(directory,'output'),files={'Cargo.toml':readFileSync(repositoryWorkspaceManifestURL(root),'utf8'),'rust/Cargo.toml':readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),'Cargo.lock':readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),'rust/src/lib.rs':source,'rust/src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'rust/src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'rust/src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'rust/src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'rust/src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'rust/src/translation_text_core.rs':TEXT_NATIVE_SOURCE};t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const [path,text]of Object.entries(files)){mkdirSync(dirname(join(project,path)),{recursive:true});writeFileSync(join(project,path),text);}await proposeSourceBoundOwnedCorePackets({root:project,output},['text-methods']);return {project,output,files};}
// Change DATA and consistently rebuild every raw/compressed/index binding.
// Byte/hash validity must not substitute for fresh original producer equality.
function forgePacket(output,path,change){
 const indexPath=join(output,'index.json'),storagePath=join(output,'packet-storage.json'),index=JSON.parse(readFileSync(indexPath,'utf8')),storage=JSON.parse(readFileSync(storagePath,'utf8')),stored=storage.packets.find(row=>row.path===path),value=JSON.parse(gunzipSync(readFileSync(join(output,stored.file))));change(value);const raw=Buffer.from(JSON.stringify(value)+'\n'),packed=gzipSync(raw,{mtime:0});writeFileSync(join(output,stored.file),packed);Object.assign(stored,{rawBytes:raw.length,rawSha256:sha(raw),bytes:packed.length,sha256:sha(packed)});
 function replace(node){if(!node||typeof node!=='object')return;if(node.path===path&&node.kind==='json'&&Object.hasOwn(node,'bytes')&&Object.hasOwn(node,'sha256')){node.bytes=raw.length;node.sha256=sha(raw);}for(const child of Object.values(node))replace(child);}replace(index);index.packetBytes=index.packets.reduce((sum,row)=>sum+row.bytes,0);const indexRaw=Buffer.from(JSON.stringify(index)+'\n');writeFileSync(indexPath,indexRaw);storage.index.bytes=indexRaw.length;storage.index.sha256=sha(indexRaw);writeFileSync(storagePath,JSON.stringify(storage)+'\n');
}
test('all complete decoded source/graph/CST proposals match freshly reconstructed original stages',limits,async t=>{
 const input=await receiving(t),result=await reviewSourceBoundOwnedCorePackets(input.output,input.project);assert.equal(result.complete,true);assert.equal(result.wholeOriginalProducersReexecuted,true);assert.equal(result.completeSourceInverses,true);assert.equal(result.sourceInverseIsReverseExecution,false);assert.equal(result.semanticAdmission,false);assert.equal(result.applicationSourcesInstalled,false);assert.equal(result.executableCoverageGain,null);assert.equal(result.newAcrossInvocationCache,false);assert.deepEqual(result.stages,['text-methods']);assert.ok(result.packetCount>0);for(const [path,text]of Object.entries(input.files))assert.equal(readFileSync(join(input.project,path),'utf8'),text);
});
test('consistent forged hashes cannot promote copied producer metadata to fresh source facts',limits,async t=>{
 const input=await receiving(t),index=JSON.parse(readFileSync(join(input.output,'index.json'),'utf8'));forgePacket(input.output,index.stages[0].packets.metadata.path,value=>{value.values.producerEffects.executableAdmission=true;});await assert.rejects(reviewSourceBoundOwnedCorePackets(input.output,input.project),/fresh complete packet differs/u);
});
test('consistent forged hashes cannot replace a complete native graph source view',limits,async t=>{
 const input=await receiving(t),index=JSON.parse(readFileSync(join(input.output,'index.json'),'utf8'));forgePacket(input.output,index.stages[0].packets.moduleGraph.modules[0].path,value=>{value.source+='\n';});await assert.rejects(reviewSourceBoundOwnedCorePackets(input.output,input.project),/fresh complete packet differs/u);
});
test('actual workspace Cargo and source changes refuse original packet association',limits,async t=>{
 const input=await receiving(t);writeFileSync(join(input.project,'Cargo.toml'),input.files['Cargo.toml']+'\n');await assert.rejects(reviewSourceBoundOwnedCorePackets(input.output,input.project),/fresh complete packet|association/u);
});
test('four complete source equations retain exact owner spans phases and inverse',limits,()=>{
 const plan=prepareSourceBoundOwnedReadbackSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
