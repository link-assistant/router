import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {json} from '../translate.mjs';
import {planProjectMetaStorage,loadProjectMetaStorage,PROJECT_META_STORAGE_LIMITS} from '../project-meta-storage.mjs';
import {loadProjectMetaStorageWithCompressedConcrete} from '../project-meta-compressed-storage.mjs';
import {planRegeneration,applyRegenerationPlan} from '../bulk.mjs';
import {reviewTranslationDraft,reviewGeneratedMethods} from '../../../scripts/review-translation-draft.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const metaPath='tools/translation/projects/src/lib.meta.json';
const directory=process.env.ROUTER_PROJECT_META_STORAGE_VECTOR_DIR;
const retain=(name,value)=>{if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),json(value));}};
function sample(){return {schema:'tracked-rust-project-semantic-meta-v1',entry:'src/lib.rs',runtimeParity:false,first:'Ω😀\\\"{}',map:new Map([['b',3n],['a',undefined]]),omitted:undefined,checkedSemanticProgram:{schema:'checked-rust-semantic-meta-v1',program:{ordered:[1,2],original:'x'.repeat(1800)}},middle:{n:undefined,v:7n},targetSemanticProgram:{schema:'checked-rust-semantic-meta-v1',program:{ordered:[2,1],original:'y'.repeat(1900)}},last:'retained'};}
function fixture(){const original=json(sample()),storageLimits={fileBytes:3000,totalBytes:20000},plan=planProjectMetaStorage(metaPath,original,{storageLimits}),files=new Map(plan.components.map(row=>[row.path,row.text])),targets={meta:metaPath,javascript:'out.mjs',typescript:'out.ts',...plan.targets};return {original,storageLimits,plan,files,targets};}
function load(f,root=f.plan.text,files=f.files,targets=f.targets){return loadProjectMetaStorage(root,{metaPath,targets,read:name=>{if(!files.has(name))throw Error('missing '+name);return files.get(name);},storageLimits:f.storageLimits});}
function failure(call,pattern){let observed;assert.throws(()=>{try{call();}catch(error){observed={name:error.name,message:error.message};throw error;}},pattern);return observed;}
test('inline metadata preserves the exact existing json serializer bytes and never reads components',()=>{
 const original=json(sample()),plan=planProjectMetaStorage(metaPath,original);assert.equal(plan.text,original);assert.deepEqual(plan.components,[]);assert.deepEqual(plan.targets,{});let reads=0;
 const loaded=loadProjectMetaStorage(plan.text,{metaPath,targets:{meta:metaPath},read(){reads++;throw Error('unexpected');}});assert.equal(loaded.text,original);assert.deepEqual(loaded.meta,JSON.parse(original));assert.equal(reads,0);retain('01-inline-exact-original-json',{original,plan,loaded,reads});
});
test('complete components roundtrip original Map BigInt undefined Unicode key order and every proof field exactly',()=>{
 const f=fixture(),loaded=load(f),wrapper=JSON.parse(f.plan.text);assert.equal(f.plan.components.length,2);assert.deepEqual(Object.keys(f.plan.targets),['checkedProgramMeta','targetProgramMeta']);assert.equal(loaded.text,f.original);assert.deepEqual(Object.keys(loaded.meta),Object.keys(JSON.parse(f.original)));
 for(const row of f.plan.components){assert.equal(row.text,json(JSON.parse(f.original)[row.field]));assert.equal(row.bytes,Buffer.byteLength(row.text));assert.equal(row.sha256,hash(row.text));assert.ok(row.bytes<=f.storageLimits.fileBytes);}
 assert.equal(wrapper.logical.bytes,Buffer.byteLength(f.original));assert.equal(wrapper.logical.sha256,hash(f.original));assert.equal(loaded.meta.omitted,undefined);assert.deepEqual(loaded.meta.map,{b:{$bigint:'3'}});assert.deepEqual(loaded.meta.middle,{v:{$bigint:'7'}});assert.equal(loaded.meta.runtimeParity,false);
 assert.equal(loadProjectMetaStorage(f.plan.text,{metaPath,targets:f.targets,read:name=>f.files.get(name)}).text,f.original);
 retain('02-complete-special-json-roundtrip',{...f,files:Object.fromEntries(f.files),loaded});
});
test('large Unicode components preserve complete bytes and reject noncanonical parent separators',()=>{
 const payload='Ω😀\\\"{}\n'.repeat(17000),original=json({schema:'tracked-rust-project-semantic-meta-v1',checkedSemanticProgram:{payload},middle:{payload},targetSemanticProgram:{payload}});
 const storageLimits={fileBytes:Buffer.byteLength(json({payload}))+2048,totalBytes:8*1024*1024};
 const plan=planProjectMetaStorage(metaPath,original,{storageLimits}),files=new Map(plan.components.map(row=>[row.path,row.text]));
 assert.ok(original.length>65536);assert.equal(plan.components.length,2);
 const loaded=loadProjectMetaStorage(plan.text,{metaPath,targets:{meta:metaPath,javascript:'out.mjs',typescript:'out.ts',...plan.targets},read:name=>files.get(name),storageLimits});
 assert.equal(loaded.text,original);assert.deepEqual(loaded.meta,JSON.parse(original));
 for(const changed of [' '+original,original.replace(',"middle":',', "middle":'),original.slice(0,-1)])assert.throws(()=>planProjectMetaStorage(metaPath,changed,{storageLimits}),/complete canonical json\(meta\) required/);
 retain('02-large-complete-unicode-parent-comparison',{original,plan,loaded});
});
test('complete storage bytes hash logical digest field ordering and component roles reject tampering',()=>{
 const f=fixture(),failures=[];for(const change of [root=>{root.logical.sha256='0'.repeat(64);},root=>{root.logical.bytes++;},root=>{root.logical.keys.reverse();},root=>{delete root.root.last;},root=>{root.root.extra='forged';},root=>{root.components.reverse();},root=>{root.components[0].bytes++;},root=>{root.components[0].sha256='f'.repeat(64);},root=>{root.components.push(root.components[0]);}]){
  const root=JSON.parse(f.plan.text);change(root);failures.push({root,failure:failure(()=>load(f,json(root)))});
 }
 const files=new Map(f.files),first=f.plan.components[0];files.set(first.path,first.text.replace('ordered','changed'));failures.push({failure:failure(()=>load(f,f.plan.text,files),/bytes\/hash/)});retain('03-complete-wrapper-and-payload-refusals',{original:f.original,plan:f.plan,failures});
});
test('inventory exact component paths prevent traversal foreign baseline substitution missing and inline extras',()=>{
 const f=fixture(),failures=[];for(const value of ['../escape.json','/absolute.json','other.meta.json.parts/checkedSemanticProgram.json','a\\b.json']){
  const root=JSON.parse(f.plan.text);root.components[0].path=value;let reads=0;failures.push({value,failure:failure(()=>loadProjectMetaStorage(json(root),{metaPath,targets:f.targets,read(){reads++;throw Error('callback');},storageLimits:f.storageLimits}),/descriptor/),reads});assert.equal(reads,0);
 }
 failures.push({failure:failure(()=>load(f,f.plan.text,new Map()),/missing/)});
 for(const targets of [{meta:metaPath},{...f.targets,checkedProgramMeta:'foreign/checked.json'}])failures.push({targets,failure:failure(()=>load(f,f.plan.text,f.files,targets))});
 failures.push({failure:failure(()=>loadProjectMetaStorage(f.original,{metaPath,targets:f.targets}),/inline/)});retain('04-exact-inventory-and-source-rooted-refusals',{plan:f.plan,failures});
});
test('lower-only bounds refuse oversized complete components root residue and aggregate before callbacks',()=>{
 const f=fixture(),failures=[];
 for(const storageLimits of [{fileBytes:PROJECT_META_STORAGE_LIMITS.fileBytes+1},{totalBytes:PROJECT_META_STORAGE_LIMITS.totalBytes+1},{fileBytes:0},{other:1},{fileBytes:100,totalBytes:20000},{fileBytes:3000,totalBytes:4000}])failures.push({storageLimits,failure:failure(()=>planProjectMetaStorage(metaPath,f.original,{storageLimits}))});
 const large=sample();large.checkedSemanticProgram.program.original='x'.repeat(5000);failures.push({failure:failure(()=>planProjectMetaStorage(metaPath,json(large),{storageLimits:f.storageLimits}),/file byte budget/)});
 const residue=sample();residue.extra='z'.repeat(5000);failures.push({failure:failure(()=>planProjectMetaStorage(metaPath,json(residue),{storageLimits:f.storageLimits}),/file byte budget/)});
 let reads=0;failures.push({failure:failure(()=>loadProjectMetaStorage(f.plan.text,{metaPath,targets:f.targets,read(){reads++;return '';},storageLimits:{fileBytes:3000,totalBytes:1000}}),/invalid original logical metadata record/)});assert.equal(reads,0);
 const physicalBytes=Buffer.byteLength(f.plan.text)+f.plan.components.reduce((sum,row)=>sum+row.bytes,0),physicalLimit=physicalBytes-1,readOrder=[];assert.ok(physicalLimit>Buffer.byteLength(f.original));
 failures.push({physicalBytes,physicalLimit,failure:failure(()=>loadProjectMetaStorage(f.plan.text,{metaPath,targets:f.targets,read(name){readOrder.push(name);return f.files.get(name);},storageLimits:{fileBytes:3000,totalBytes:physicalLimit}}),/aggregate/)});assert.deepEqual(readOrder,[f.plan.components[0].path]);
 retain('05-unchanged-maxima-and-lowered-bound-refusals',{limits:PROJECT_META_STORAGE_LIMITS,failures,reads,readOrder});
});
function repository(){
 const root=mkdtempSync(join(tmpdir(),'router-project-storage-')),source=Array.from({length:12},(_,i)=>`pub fn item_${i}(v:u8)->u8{v+${i}u8}`).join('\n'),write=(name,value)=>{mkdirSync(dirname(join(root,name)),{recursive:true});writeFileSync(join(root,name),value);};write('src/lib.rs',source);
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:10000,env:{...process.env,GIT_AUTHOR_NAME:'Router fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',GIT_COMMITTER_NAME:'Router fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid',GIT_AUTHOR_DATE:'2026-10-15T00:00:00Z',GIT_COMMITTER_DATE:'2026-10-15T00:00:00Z'}});
 git(['init','-q']);git(['add','src/lib.rs']);
 const plain=planRegeneration({root,sources:['src/lib.rs']});applyRegenerationPlan(plain);const original=readFileSync(join(root,metaPath),'utf8'),meta=JSON.parse(original),rootOnly={...meta};delete rootOnly.checkedSemanticProgram;delete rootOnly.targetSemanticProgram;
 const fileBytes=Math.max(Buffer.byteLength(json(rootOnly))+1600,Buffer.byteLength(json(meta.checkedSemanticProgram)),Buffer.byteLength(json(meta.targetSemanticProgram)))+128;assert.ok(fileBytes<Buffer.byteLength(original));const storageLimits={fileBytes,totalBytes:PROJECT_META_STORAGE_LIMITS.totalBytes};
 const plan=planRegeneration({root,sources:['src/lib.rs'],projectMetaStorageLimits:storageLimits});applyRegenerationPlan(plan);const project=plan.manifest.projects[0];assert.ok(project.targets.checkedProgramMeta&&project.targets.targetProgramMeta);
 return {root,source,write,git,plan,project,storageLimits,original,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
test('real bulk writer lists complete sidecars and regeneration checks missing stale unexpected and restored outputs',{timeout:60000},()=>{
 const f=repository();try{
  const options={root:f.root,sources:['src/lib.rs'],projectMetaStorageLimits:f.storageLimits},paths=Object.values(f.project.targets);for(const name of paths)assert.ok(f.plan.outputs.some(row=>row.path===name));assert.deepEqual(applyRegenerationPlan(f.plan,{check:true}).failures,[]);
  const first=f.project.targets.checkedProgramMeta,second=f.project.targets.targetProgramMeta,extra=metaPath+'.parts/extra.json';unlinkSync(join(f.root,first));f.write(second,'stale');f.write(extra,'{}');const failures=applyRegenerationPlan(f.plan,{check:true}).failures;assert.ok(failures.includes('missing: '+first));assert.ok(failures.includes('stale: '+second));assert.ok(failures.includes('unexpected: '+extra));applyRegenerationPlan(f.plan);assert.deepEqual(applyRegenerationPlan(f.plan,{check:true}).failures,[]);
  const loaded=loadProjectMetaStorageWithCompressedConcrete(readFileSync(join(f.root,metaPath)),{metaPath,targets:f.project.targets,read:name=>readFileSync(join(f.root,name)),storageLimits:f.storageLimits});assert.equal(loaded.text,f.original);retain('06-real-bulk-complete-outputs',{source:f.source,storageLimits:f.storageLimits,project:f.project,outputPlan:f.plan.outputs,failures,loaded});
 }finally{f.cleanup();}
});
test('independent reviewer rehydrates current and exact Git baseline components before all original checks',{timeout:60000},()=>{
 const f=repository();try{
  // The real bulk output test above covers complete compiler discovery. This
  // independent review fixture uses its existing bounded compiler witness
  // contract instead of falsely declaring absent repository compiler files.
  const inventoryPath='parity/rust-source-inventory.json',compiler='// original bounded storage review compiler witness\n';f.write('compiler.mjs',compiler);
  const installReviewInventory=()=>{const inventory=JSON.parse(readFileSync(join(f.root,inventoryPath),'utf8'));inventory.implementationHashes={'compiler.mjs':hash(compiler)};f.write(inventoryPath,json(inventory));};installReviewInventory();
  const baselineHashes=Object.fromEntries([f.project.targets.checkedProgramMeta,f.project.targets.targetProgramMeta].map(name=>[name,hash(readFileSync(join(f.root,name)))]));
  f.git(['add','.']);f.git(['-c','core.hooksPath=/dev/null','commit','-qm','complete component baseline']);const baseline=f.git(['rev-parse','HEAD']).trim(),review=()=>reviewTranslationDraft({root:f.root,baselineSha:baseline,projectMetaStorageLimits:f.storageLimits});
  // Both sides remain valid but have different complete component bytes. The
  // pure function declarations have no initialization effects; reversing their
  // item sequence distinguishes Git-baseline reads from current-file reads.
  const currentMeta=JSON.parse(f.original);for(const key of ['checkedSemanticProgram','targetSemanticProgram']){assert.ok(currentMeta[key].program.items.length>1);currentMeta[key].program.items.reverse();}
  const currentPlan=planProjectMetaStorage(metaPath,json(currentMeta),{storageLimits:f.storageLimits});f.write(metaPath,currentPlan.text);for(const row of currentPlan.components){f.write(row.path,row.text);assert.notEqual(row.sha256,baselineHashes[row.path]);}
  const positive=review();assert.equal(positive.projects.length,1);for(const name of [f.project.targets.checkedProgramMeta,f.project.targets.targetProgramMeta]){assert.ok(positive.outputs.some(row=>row.path===name));assert.equal(positive.baselineProjectInputs.find(row=>row.path===name).sha256,baselineHashes[name]);assert.notEqual(positive.outputs.find(row=>row.path===name).sha256,baselineHashes[name]);}
  const sidecar=f.project.targets.checkedProgramMeta,bytes=readFileSync(join(f.root,sidecar));unlinkSync(join(f.root,sidecar));symlinkSync(join(f.root,f.project.targets.targetProgramMeta),join(f.root,sidecar));const linked=failure(review,/linked/);unlinkSync(join(f.root,sidecar));f.write(sidecar,bytes);
  const extra=metaPath+'.parts/extra.json';f.write(extra,'{}');const unexpected=failure(review,/Unexpected project metadata component/);unlinkSync(join(f.root,extra));
  f.write(sidecar,bytes.toString().replace('schemaVersion','schemaChanged'));const changed=failure(review,/bytes\/hash/);f.write(sidecar,bytes);
  const wrapper=JSON.parse(readFileSync(join(f.root,metaPath),'utf8'));wrapper.logical.sha256='f'.repeat(64);f.write(metaPath,json(wrapper));const logical=failure(review,/logical metadata/);f.write(metaPath,currentPlan.text);
  assert.equal(review().projects[0].comparison.newlyExecutableItems.length,0);retain('07-independent-current-and-baseline-review',{source:f.source,project:f.project,storageLimits:f.storageLimits,baselineHashes,currentPlan,positive,failures:{linked,unexpected,changed,logical}});
 }finally{f.cleanup();}
});
test('valid storage hashes preserve existing semantic refusal after reconstructed IR is forged',()=>{
 const f=fixture(),loaded=load(f);loaded.meta.checkedSemanticProgram={schema:'checked-rust-semantic-meta-v1',program:{schemaVersion:1,sourceLanguage:'JavaScript',declarations:{$map:[]},items:[],padding:'x'.repeat(1800)}};loaded.meta.targetSemanticProgram=structuredClone(loaded.meta.checkedSemanticProgram);const original=json(loaded.meta),plan=planProjectMetaStorage(metaPath,original,{storageLimits:f.storageLimits}),files=new Map(plan.components.map(row=>[row.path,row.text])),targets={...f.targets,...plan.targets};const reconstructed=loadProjectMetaStorage(plan.text,{metaPath,targets,read:name=>files.get(name),storageLimits:f.storageLimits});assert.equal(reconstructed.text,original);
 const refused=failure(()=>reviewGeneratedMethods(reconstructed.meta,{entry:'src/lib.rs',checkedGeneratedMethods:0}),/invalid checked Rust semantic meta/);retain('08-storage-hashes-not-semantic-authority',{plan,reconstructed,refused});
});
