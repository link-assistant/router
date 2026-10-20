import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {json} from '../translate.mjs';
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {serializeProjectMetaFieldUtf8} from '../project-meta-field-json.mjs';
import {planProjectMetaStorage,loadProjectMetaStorage,PROJECT_META_STORAGE_LIMITS} from '../project-meta-storage.mjs';
import {planCompressedProjectMetaStorage,planCompressedProjectMetaUtf8ObjectStorage,loadProjectMetaStorageWithCompressedConcrete,PROJECT_META_STORAGE_LIMITS as copiedLimits} from '../project-meta-compressed-storage.mjs';
import {deriveCompressedProjectMetaStorageSource} from '../prepare-compressed-project-meta-storage.mjs';
const path='tools/translation/projects/rust/src/lib.meta.json',hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(){
 const source='\ufeff// retained Ω😀\r\n'+Array.from({length:70},(_,at)=>`pub fn value_${at}(v:u8)->u8{v+1u8}`).join('\r\n'),meta={schema:'compressed-component-fixture-v1',sources:[{source:'rust/src/lib.rs',sha256:hash(source)}],checkedSemanticProgram:{complete:'x'.repeat(4000)},concreteSyntaxMeta:[{source:'rust/src/lib.rs',document:createConcreteSyntaxMeta(source,{language:'Rust'})}],middle:{retained:'Ω😀'},targetSemanticProgram:{complete:'y'.repeat(4200)},runtimeParity:false};
 const original=json(meta),storageLimits={fileBytes:Math.max(...['checkedSemanticProgram','concreteSyntaxMeta','targetSemanticProgram'].map(key=>Buffer.byteLength(json(meta[key]))))+512,totalBytes:2000000};assert.ok(storageLimits.fileBytes<Buffer.byteLength(original));
 const options={storageLimits},legacy=planProjectMetaStorage(path,original,options),plan=planCompressedProjectMetaStorage(path,original,options),targets={meta:path,javascript:'generated.mjs',typescript:'generated.ts',...plan.targets};return {source,meta,original,storageLimits,legacy,plan,targets};
}
function load(f,{plan=f.plan,storageLimits=f.storageLimits,targets=f.targets,read}={}){return loadProjectMetaStorageWithCompressedConcrete(plan.text,{metaPath:path,targets,storageLimits,read:read??(name=>{const row=plan.components.find(row=>row.path===name);assert.ok(row);return row.text;})});}
function mutatePacket(f,mutate){const plan=structuredClone(f.plan),row=plan.components.find(row=>row.field==='concreteSyntaxMeta'),packet=JSON.parse(row.text);mutate(packet);row.text=json(packet);row.bytes=Buffer.byteLength(row.text);row.sha256=hash(row.text);const wrapper=JSON.parse(plan.text),descriptor=wrapper.components.find(value=>value.field===row.field);descriptor.bytes=row.bytes;descriptor.sha256=row.sha256;plan.text=json(wrapper);return plan;}
test('complete string and UTF8 producers emit identical storage and exact original logical CST bytes',{timeout:60000},()=>{
 const f=fixture(),utf8=planCompressedProjectMetaUtf8ObjectStorage(path,f.meta,{storageLimits:f.storageLimits,serializeUtf8:serializeProjectMetaFieldUtf8});assert.deepEqual(utf8,f.plan);const loaded=load(f);assert.equal(loaded.text,f.original);assert.deepEqual(loaded.meta,JSON.parse(f.original));
 const concrete=f.plan.components.find(row=>row.field==='concreteSyntaxMeta'),packet=JSON.parse(concrete.text);assert.equal(packet.schema,'bounded-concrete-meta-gzip-base64-v1');assert.equal(packet.bytes,Buffer.byteLength(json(f.meta.concreteSyntaxMeta)));assert.equal(packet.sha256,hash(json(f.meta.concreteSyntaxMeta)));assert.ok(concrete.bytes<packet.bytes/2);
 assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(loaded.meta.concreteSyntaxMeta[0].document)).source,f.source);for(const field of ['checkedSemanticProgram','targetSemanticProgram'])assert.deepEqual(f.plan.components.find(row=>row.field===field),f.legacy.components.find(row=>row.field===field));assert.equal(f.plan.text.includes(f.source),false);
});
test('new reader accepts exact legacy components while original APIs retain original bytes and refusals',{timeout:60000},()=>{
 const f=fixture();assert.equal(load(f,{plan:f.legacy}).text,f.original);assert.equal(loadProjectMetaStorage(f.legacy.text,{metaPath:path,targets:f.targets,storageLimits:f.storageLimits,read:name=>f.legacy.components.find(row=>row.path===name).text}).text,f.original);
 assert.throws(()=>loadProjectMetaStorage(f.plan.text,{metaPath:path,targets:f.targets,storageLimits:f.storageLimits,read:name=>f.plan.components.find(row=>row.path===name).text}),/logical metadata/);
 const inline='{"retained":"inline Ω😀"}\n';assert.deepEqual(planCompressedProjectMetaStorage(path,inline),planProjectMetaStorage(path,inline));assert.equal(loadProjectMetaStorageWithCompressedConcrete(inline,{metaPath:path,targets:{meta:path,javascript:'a.mjs',typescript:'a.ts'}}).text,inline);
});
test('complete encoded envelope bytes digest lengths fields ordering and raw payload reject tampering',{timeout:60000},()=>{
 for(const mutate of [packet=>{packet.bytes--;},packet=>{packet.sha256='0'.repeat(64);},packet=>{packet.gzipBase64=packet.gzipBase64.slice(0,-8);},packet=>{packet.gzipBase64+='\n';},packet=>{packet.extra=true;},packet=>{delete packet.sha256;},packet=>{packet.schema='unknown-storage-version';}]){const f=fixture(),plan=mutatePacket(f,mutate);assert.throws(()=>load(f,{plan}));}
 const f=fixture(),plan=structuredClone(f.plan),row=plan.components.find(row=>row.field==='concreteSyntaxMeta');row.text=row.text.replace('gzipBase64','gzipBase65');assert.throws(()=>load(f,{plan}),/component bytes\/hash/);
});
test('original decoded file and aggregate budgets remain mandatory despite smaller physical storage',{timeout:60000},()=>{
 const f=fixture();assert.deepEqual(copiedLimits,PROJECT_META_STORAGE_LIMITS);assert.deepEqual(copiedLimits,{fileBytes:67108864,totalBytes:536870912});
 const originalPhysical=Buffer.byteLength(f.legacy.text)+f.legacy.components.reduce((sum,row)=>sum+row.bytes,0),physical=Buffer.byteLength(f.plan.text)+f.plan.components.reduce((sum,row)=>sum+row.bytes,0);assert.ok(originalPhysical>Buffer.byteLength(f.original));assert.ok(physical<Buffer.byteLength(f.original));
 const lowered={...f.storageLimits,totalBytes:originalPhysical-1};assert.ok(lowered.totalBytes>=Buffer.byteLength(f.original));assert.throws(()=>planProjectMetaStorage(path,f.original,{storageLimits:lowered}),/aggregate/);assert.throws(()=>planCompressedProjectMetaStorage(path,f.original,{storageLimits:lowered}),/aggregate/);assert.throws(()=>planCompressedProjectMetaUtf8ObjectStorage(path,f.meta,{storageLimits:lowered,serializeUtf8:serializeProjectMetaFieldUtf8}),/aggregate/);assert.throws(()=>load(f,{storageLimits:lowered}),/aggregate/);
 const rawBytes=JSON.parse(f.plan.components.find(row=>row.field==='concreteSyntaxMeta').text).bytes,small={...f.storageLimits,fileBytes:rawBytes-1};assert.throws(()=>planCompressedProjectMetaStorage(path,f.original,{storageLimits:small}),/file byte/);assert.throws(()=>load(f,{storageLimits:small}),/bounded concrete compression packet/);
 for(const storageLimits of [{fileBytes:67108865},{totalBytes:536870913}])assert.throws(()=>planCompressedProjectMetaStorage(path,f.original,{storageLimits}),/only be lowered/);
});
test('escaping missing reordered and unexpected component targets preserve original pre-read refusals',{timeout:60000},()=>{
 const f=fixture();let reads=0;const targets={...f.targets,concreteSyntaxMeta:'../escaping.json'};assert.throws(()=>load(f,{targets,read(){reads++;return '';}}),/inventory component descriptor/);assert.equal(reads,0);
 for(const change of [wrapper=>wrapper.components.reverse(),wrapper=>wrapper.components.pop(),wrapper=>wrapper.components.push(wrapper.components[2]),wrapper=>{wrapper.components[2].path='foreign.json';}]){const plan=structuredClone(f.plan),wrapper=JSON.parse(plan.text);change(wrapper);plan.text=json(wrapper);assert.throws(()=>load(f,{plan}));}
});
test('source producer preserves complete original implementation guards CST inverses and native planner spans',{timeout:60000},()=>{
 const source=readFileSync(new URL('../project-meta-utf8-storage.mjs',import.meta.url),'utf8'),proposal=deriveCompressedProjectMetaStorageSource(source);assert.equal(readFileSync(new URL('../project-meta-compressed-storage.mjs',import.meta.url),'utf8'),proposal.text);assert.equal(transportConcreteSyntaxMeta(proposal.beforeMeta).source,source);assert.equal(transportConcreteSyntaxMeta(proposal.afterMeta).source,proposal.text);assert.equal(proposal.inverse,source);assert.equal(proposal.budgetStage.inverse,proposal.budgetStage.source);
 assert.deepEqual(proposal.budgetStage.edits.map(row=>row.owner).sort(),['planProjectMetaStorage','planProjectMetaUtf8ObjectStorage'].sort());assert.equal(proposal.logicalBytesUnchanged,true);assert.equal(proposal.limitsUnchanged,true);assert.equal(proposal.semanticAuthority,false);const phases=proposal.trace.map(row=>row.phase);assert.equal(phases[0],'language');assert.equal(phases.at(-1),'repository');assert.equal(phases.filter(phase=>phase==='repository').length,3);
 assert.throws(()=>deriveCompressedProjectMetaStorageSource(source.replace('export function planProjectMetaStorage(', 'export function changedPlanner(')),/Actual original planner declaration|original storage anchor/);
});
