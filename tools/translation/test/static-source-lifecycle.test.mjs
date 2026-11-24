import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,symlinkSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareStaticSourceLifecycleProposalReleased as prepareStaticSourceLifecycleProposal,writeStaticSourceLifecycleProposal,STATIC_SOURCE_LIFECYCLE_CASES,STATIC_SOURCE_LIFECYCLE_PROFILES,STATIC_SOURCE_LIFECYCLE_LIMITS,selectRealSourceFixture,transportStaticSourceLifecycleCanonicalsShared as transportStaticSourceLifecycleCanonicals,visitStaticSourceLifecycleCanonicals} from '../prepare-real-source-fixtures.mjs';
import {readStaticSourceLifecyclePreflight as readStaticSourceLifecycle,staticSourceLifecycleContext,originalRealSourceManifest} from './real-source-fixtures.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,transportConcreteSyntaxMetaChunks,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),ASSETS=fileURLToPath(new URL('../source-profiles/static-source-lifecycle/',import.meta.url)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
function retain(name,value){const output=process.env.ROUTER_STATIC_SOURCE_LIFECYCLE_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json.gz'),gzipSync(JSON.stringify(value)+'\n'));}}
function context(name='fixed-arrays.test.mjs',options={}){return staticSourceLifecycleContext(name,options);}
function changedFolder(t,mutate,preimage){const folder=mkdtempSync(join(tmpdir(),'router-static-source-tamper-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const {bundle,index}=JSON.parse(preimage);mutate(bundle,index);const raw=Buffer.from(JSON.stringify(bundle)+'\n'),packed=gzipSync(raw);delete index.storage;writeFileSync(join(folder,'originals.json.gz'),packed);writeFileSync(join(folder,'manifest.json'),JSON.stringify({...index,rawBytes:raw.length,rawSha256:hash(raw),bytes:packed.length,sha256:hash(packed)}));return folder;}

test('all fixed historical universes and every existing original frontier pin remain complete',{timeout:60000},()=>{
 const data=readStaticSourceLifecycle(),a=context(),b=context('option-ok-or-else.test.mjs');retain('01-full-bank-and-current-source-joins',{data,a,b});
 assert.equal(Object.keys(STATIC_SOURCE_LIFECYCLE_CASES).length,16);assert.equal(data.bundle.profiles.length,2);
 for(const profile of data.bundle.profiles){const expected=STATIC_SOURCE_LIFECYCLE_PROFILES[profile.revision];assert.equal(profile.files.length,expected.files);assert.equal(profile.files.reduce((sum,row)=>sum+row.bytes,0),expected.bytes);assert.equal(profile.sourceSetSha256,expected.sourceSetSha256);}
 assert.equal(a.inputs.sources.length,806);assert.equal(b.inputs.sources.length,808);assert.notEqual(a.inputs.sourceHead,b.inputs.sourceHead);
 const frontier=JSON.parse(read('../fixtures/formatting-owner-frontier.json'));assert.equal(frontier.originalFiles.length,176);
 for(const row of frontier.originalFiles){const source=a.source(row.source);assert.equal(hash(source),row.sha256);assert.equal(Buffer.byteLength(source),row.bytes);}
 const inventory=JSON.parse(read('../fixtures/static-source-performance/original-rust-inputs.json'));assert.equal(inventory.originalRustFiles,804);
 for(const row of inventory.rustSources){const source=a.source(row.path),record=a.inputs.sources.find(entry=>entry.source===row.path);assert.equal(hash(source),row.sha256);assert.equal(Buffer.byteLength(source),row.bytes);assert.equal(record.gitBlob,row.gitBlob);}
 assert.equal(a.source('Cargo.toml'),b.source('Cargo.toml'));assert.equal(a.source('Cargo.lock'),b.source('Cargo.lock'));assert.deepEqual(data.bundle.authority,{namespace:false,dispatch:false,ownership:false,semantic:false,executable:false});
});

test('actual sibling producer is deterministic and complete without changing the legacy archive',{timeout:60000},t=>{
 const oldIndex=read('../source-profiles/real-source-fixtures/manifest.json'),oldArchive=hash(readFileSync(new URL('../source-profiles/real-source-fixtures/originals.json.gz',import.meta.url))),a=prepareStaticSourceLifecycleProposal({root:ROOT,historyArchive:ASSETS}),b=prepareStaticSourceLifecycleProposal({root:ROOT,historyArchive:ASSETS});
 retain('02-two-complete-proposals',{a,b});assert.deepEqual(a,b);assert.deepEqual(a.trace.map(row=>row.phase),['language','repository']);assert.equal(a.files.length,3);assert.deepEqual(a.before,a.after);assert.equal(a.completeInverse,true);
 const folder=mkdtempSync(join(tmpdir(),'router-static-source-proposal-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));writeStaticSourceLifecycleProposal(a,folder);
 // Complete decoded bytes and every manifest meaning field are uniform
 // across native gzip implementations; compressed bytes need not be equal.
 const compareArchives=(actual,installed)=>{
  const left=gunzipSync(actual,{maxOutputLength:STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes}),right=gunzipSync(installed,{maxOutputLength:STATIC_SOURCE_LIFECYCLE_LIMITS.outputBytes});
  assert.ok(left.equals(right),'complete decoded installed archive bytes');
  return [[actual,left],[installed,right]].map(([packed,decoded])=>({bytes:packed.length,sha256:hash(packed),rawBytes:decoded.length,rawSha256:hash(decoded)}));
 };
 let archiveFacts;
 for(const row of a.files){const raw=readFileSync(join(folder,row.path.split('/').at(-1)));assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);
  const name=row.path.split('/').at(-1),installed=readFileSync(join(ASSETS,name));
  if(name==='originals.json.gz')archiveFacts=compareArchives(raw,installed);
  else if(name==='manifest.json'){
   assert.ok(archiveFacts,'actual complete archive must precede its manifest');const actualIndex=JSON.parse(raw.toString('utf8')),installedIndex=JSON.parse(installed.toString('utf8'));
   for(const [index,facts]of [[actualIndex,archiveFacts[0]],[installedIndex,archiveFacts[1]]]){assert.equal(index.archive,'originals.json.gz');for(const key of ['bytes','sha256','rawBytes','rawSha256'])assert.equal(index[key],facts[key],key+' authenticates its own complete archive');}
   assert.deepEqual(actualIndex,{...installedIndex,bytes:actualIndex.bytes,sha256:actualIndex.sha256},'all other complete manifest fields are identical');
  }else{assert.equal(name,'NOTICE.md');assert.ok(raw.equals(installed),'complete installed NOTICE bytes');}
 }
 const produced=readStaticSourceLifecycle({folder}),installed=readStaticSourceLifecycle();assert.deepEqual(produced.bundle,installed.bundle);
 assert.equal(read('../source-profiles/real-source-fixtures/manifest.json'),oldIndex);assert.equal(hash(readFileSync(new URL('../source-profiles/real-source-fixtures/originals.json.gz',import.meta.url))),oldArchive);
});

test('all changed full current parents preserve whole CST token boundaries and complete inverses',{timeout:60000},()=>{
 const {bundle}=readStaticSourceLifecycle(),rows=[],documents=transportStaticSourceLifecycleCanonicals(Object.entries(bundle.sources).filter(([,row])=>row.canonical!==undefined));
 for(const stage of bundle.lineage)for(const row of stage.files){if(row.status==='deleted'){assert.equal(row.originalPreserved,true);assert.ok(bundle.sources[row.before.sourceId].source);continue;}
  const before=bundle.sources[row.before.sourceId],after=bundle.sources[row.after.sourceId],original=documents.get(row.before.sourceId),current=documents.get(row.after.sourceId);assert.equal(original.source,before.source);assert.equal(current.source,after.source);
  const boundaries=new Set([0,before.source.length,...original.nodes.flatMap(node=>[node[2],node[3]])]);assert.ok(boundaries.has(row.edit.span[0]));assert.ok(boundaries.has(row.edit.span[1]));
  assert.equal(before.source.slice(...row.edit.span),row.edit.expected);assert.equal(before.source.slice(0,row.edit.span[0])+row.edit.replacement+before.source.slice(row.edit.span[1]),after.source);
  assert.equal(after.source.slice(...row.inverse.span),row.inverse.expected);assert.equal(after.source.slice(0,row.inverse.span[0])+row.inverse.replacement+after.source.slice(row.inverse.span[1]),before.source);rows.push(row);
 }
 assert.ok(rows.length>0);
 for(const path of ['src/credential_recovery_store.rs','src/accounts_cli.rs']){const row=rows.find(row=>row.path===path);assert.ok(row,path);const before=bundle.sources[row.before.sourceId],after=bundle.sources[row.after.sourceId],old=applyConcreteSyntaxSubstitutions(documents.get(row.before.sourceId),{languageRules:[],repositoryRules:[{id:'repository.reviewed-native-adoption-history',edits:[row.edit]}]});
  assert.equal(old.value.source,after.source);assert.equal(serializeConcreteSyntaxMeta(old.value),after.canonical);assert.equal(hash(serializeConcreteSyntaxMeta(old.value)),row.afterCanonicalSha256);assert.deepEqual(row.trace,[{phase:'language',id:'static-fixture.whole-original-cst-span'},{phase:'repository',id:'static-fixture.exact-current-parent-and-inverse'}]);
 }
 // The default Map still returns every full native document. The explicit
 // visitor observes the same complete rows without retaining the full graph.
 const selected=Object.entries(bundle.sources).filter(([,row])=>row.canonical!==undefined).slice(0,2),visited=[];
 visitStaticSourceLifecycleCanonicals(selected,(id,document)=>{
  assert.equal(document.source,bundle.sources[id].source);assert.equal(document.language,'Rust');assert.equal(JSON.stringify(document),JSON.stringify(documents.get(id)));
  const expected=new Set([0,document.source.length,...documents.get(id).nodes.flatMap(node=>[node[2],node[3]])]),actual=new Set([0,document.source.length]);
  for(const node of document.nodes){actual.add(node[2]);actual.add(node[3]);}assert.deepEqual(actual,expected);visited.push(id);
 });assert.deepEqual(visited,selected.map(([id])=>id));
 const scalarSources=['// é😀 complete trivia\npub fn alpha(){ let text = "Ω"; }','pub fn beta(){ /* nested ( 😀 ) */ let group = [1,2]; }'],scalarRows=scalarSources.map((source,index)=>['scalar-'+index,{source,canonical:transportConcreteSyntaxSource(source,{language:'Rust'}).meta}]),scalarMap=transportStaticSourceLifecycleCanonicals(scalarRows),scalarVisited=[];
 visitStaticSourceLifecycleCanonicals(scalarRows,(id,document)=>{assert.equal(JSON.stringify(document),JSON.stringify(scalarMap.get(id)));assert.equal(document.source,scalarRows.find(([name])=>name===id)[1].source);assert.ok(document.nodes.some(node=>node[0]==='group'));assert.ok(document.nodes.some(node=>node[1]==='comment'));scalarVisited.push(id);});assert.deepEqual(scalarVisited,scalarRows.map(([id])=>id));
 for(const change of ['source','classification']){const [id,row]=selected[0],document=JSON.parse(row.canonical);if(change==='source')document.source+=' ';else document.nodes[1][0]='unknown-classification';assert.throws(()=>visitStaticSourceLifecycleCanonicals([[id,{...row,canonical:JSON.stringify(document)}]],()=>assert.fail('forged canonical must not reach visitor')),TypeError);}
 retain('03-full-current-and-original-cst-inverses',{rows,authority:bundle.authority,visitorIds:visited,scalarSources,scalarVisited});
});

test('original native constants and a current complete formatting body retain independent typed behavior',{timeout:60000},async()=>{
 const bank=context(),arrayPin=JSON.parse(read('../fixtures/rust-fixed-array-sources.json')).find(row=>row.name==='MODEL_FAMILIES'),original=bank.source(arrayPin.path),item=sourceItems(original).find(row=>row.term==='const'&&row.name===arrayPin.name),historical=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>original.slice(item.start,item.end)});
 retain('04-full-original-constant-and-result',{original,item,arrayPin,historical});assert.equal(hash(original),arrayPin.fileSha256);assert.equal(hash(original.slice(item.start,item.end)),arrayPin.declarationSha256);assert.ok(historical.meta.executable.some(row=>row.name==='MODEL_FAMILIES'));assert.deepEqual(historical.meta.refused,[]);
 await verifyTypedTargets(historical,api=>{assert.deepEqual(api.MODEL_FAMILIES,['opus','sonnet','haiku']);assert.ok(Object.isFrozen(api.MODEL_FAMILIES));},{childTimeoutMs:20000});
 const entry=originalRealSourceManifest().entries.find(row=>row.id==='format-resume_message'),parent=bank.sourceCurrent(entry.path),selection=selectRealSourceFixture(parent,entry,{current:true}),files={'src/lib.rs':'pub mod translation_core;\n'+selection.source};
 for(const row of bank.current.files){const logical=row.path.startsWith('rust/')?row.path.slice(5):row.path;if(logical==='src/translation_core.rs'||logical.startsWith('src/translation_core/'))files[logical]=bank.sourceCurrent(row.path);}
 const dependencies={manifest:bank.sourceCurrent('rust/Cargo.toml'),lock:bank.sourceCurrent('Cargo.lock')},result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest:dependencies.manifest,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),compilationProfile:PRODUCTION_PROFILE});
 retain('04-full-current-parent-selection-and-core',{parent,selection,files,dependencies,result,scope:'Actual complete selected current function in declared Core carrier, not whole-parent admission.'});
 assert.ok(result.meta.executable.some(row=>row.name==='resume_message'),JSON.stringify(result.meta.refused));assert.equal(result.meta.refused.some(row=>row.source==='src/lib.rs'),false,JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{for(const [name,paused,wanted]of [['primary',true,'resumed primary'],['Ω/😀',false,'Ω/😀 was not paused'],['',true,'resumed '],['{name}',false,'{name} was not paused']])assert.equal(api.resume_message(name,paused),wanted);assert.throws(()=>api.resume_message('a',1n),TypeError);},{childTimeoutMs:20000});
});

test('matching complete ancestry and Cargo stay distinct and unknown profiles cannot be mixed',{timeout:60000},()=>{
 const a=context(),b=context('option-ok-or-else.test.mjs');assert.equal(hash(a.source('src/anthropic_nonstream.rs')),'932f7546b64d336c3c0611dc369b985e9aca91825fc62cd556570baa89f578a5');assert.equal(hash(b.source('src/anthropic_nonstream.rs')),'a5cf42efe25b0a60414f332d81cd77f4b8f6c10afe7253b4e070924588c46b0a');
 assert.equal(hash(a.source('src/activitypub.rs')),'1eec701e38326ba002bea83922b861fb8c4cae773384fe8c27d7a6a6adba0645');assert.equal(hash(a.source('src/credential_recovery_store.rs')),'91af0053ff35f899efd181962f0492665e10bfab06b59e2c30b261dfabbc8f5e');
 assert.throws(()=>context('unknown.test.mjs'),/fixed original test/);assert.throws(()=>a.source('src/not-a-tracked-source.rs'),/unknown historical source/);assert.throws(()=>a.sourceCurrent('../Cargo.toml'),/unknown current source/);
 retain('05-full-distinct-original-contexts',{a,b});
});

test('forged archives paths source spans CST and inverse facts cannot replace complete originals',{timeout:60000},t=>{
 // One complete data-only preimage for this CASE; each altered bank below
 // remains a fresh full packet passed through the unchanged untrusted reader.
 // Keep the full original preimage, not its duplicate parsed object graph,
 // through every fresh mutation reader. Canonical selection moves earlier
 // only in this explicit data-only fixture schedule.
 const {preimage,canonical}=(()=>{const pristine=readStaticSourceLifecycle();return {preimage:JSON.stringify(pristine),canonical:Object.values(pristine.bundle.sources).find(row=>row.canonical).canonical};})();
 const controls=[bundle=>{bundle.cases['fixed-arrays.test.mjs']='foreign';},bundle=>{bundle.profiles[0].files[0].sourceId='0'.repeat(64);},bundle=>{bundle.profiles[0].files.push(bundle.profiles[0].files[0]);},bundle=>{const row=Object.values(bundle.sources)[0];row.source+=' ';},bundle=>{const row=bundle.lineage.flatMap(stage=>stage.files).find(row=>row.status==='changed');row.edit.span[0]++;},bundle=>{const row=bundle.lineage.flatMap(stage=>stage.files).find(row=>row.status==='changed');row.inverse.replacement+=' ';},bundle=>{const row=Object.values(bundle.sources).find(row=>row.canonical);const doc=JSON.parse(row.canonical);doc.source+=' ';row.canonical=JSON.stringify(doc);},bundle=>{bundle.current.files[0].path='../outside.rs';}];
 for(const [index,mutate]of controls.entries()){const folder=changedFolder(t,mutate,preimage);assert.throws(()=>readStaticSourceLifecycle({folder}),TypeError);retain('06-tampered-'+index,{folder,kind:'full fresh digest recomputed around deliberately forged source association; refused'});}
 for(const side of ['before','after']){const folder=changedFolder(t,bundle=>{const row=bundle.lineage.flatMap(stage=>stage.files).find(row=>row.status==='changed');delete bundle.sources[row[side].sourceId].canonical;},preimage);assert.throws(()=>readStaticSourceLifecycle({folder}),/both changed-parent canonical documents required/);retain('06-missing-'+side+'-canonical',{folder,scope:'Full original and latest changed-parent canonical documents are each mandatory.'});}
 // The complete native transport still executes here; only its source
 // primitive is needed across the following independent forgery attempts.
 const actualSource=transportConcreteSyntaxMeta(canonical).source;
 for(const mutate of [doc=>{doc.nodes[1][2]++;},doc=>{doc.nodes[1][0]='unknown-classification';},doc=>{doc.sourceEncoding.utf8Bytes++;},doc=>{doc.unknown=true;},doc=>{doc.source='cross-row source';}]){const doc=JSON.parse(canonical);mutate(doc);assert.throws(()=>transportConcreteSyntaxMetaChunks([[JSON.stringify(doc)]]),TypeError);}
 assert.throws(()=>transportStaticSourceLifecycleCanonicals([['bounded',{source:'',canonical:' '.repeat(33554433)}]]),/canonical code-unit bound/);
 assert.throws(()=>transportStaticSourceLifecycleCanonicals([['deep',{source:'',canonical:'['.repeat(258)+'0'+']'.repeat(258)}]]),TypeError);
 const metas=[canonical,canonical];Object.defineProperty(metas,'1',{get(){throw new Error('late accessor must not run');},enumerable:true});assert.throws(()=>transportConcreteSyntaxMetaChunks([metas]),TypeError);
 assert.equal(actualSource,JSON.parse(canonical).source);
 const folder=changedFolder(t,()=>{},preimage),packed=readFileSync(join(folder,'originals.json.gz'));packed[packed.length-1]^=1;writeFileSync(join(folder,'originals.json.gz'),packed);assert.throws(()=>readStaticSourceLifecycle({folder}),TypeError);
});

test('every old804 witness remains available while actual current additions and changes stay separate',{timeout:60000},()=>{
 const bank=context('rust-structure-performance.test.mjs'),inventory=JSON.parse(read('../fixtures/static-source-performance/original-rust-inputs.json')),rows=[];
 for(const pin of inventory.rustSources){const original=bank.source(pin.path);assert.equal(hash(original),pin.sha256);assert.equal(Buffer.byteLength(original),pin.bytes);rows.push({path:pin.path,source:original,current:bank.current.files.some(row=>row.path===pin.path)?bank.sourceCurrent(pin.path):null});}
 assert.equal(rows.length,804);const policy=rows.find(row=>row.path==='src/account_policy_catalog.rs');assert.ok(policy);assert.equal(hash(policy.source),inventory.rustSources.find(row=>row.path===policy.path).sha256);assert.ok(bank.current.files.length>=806);retain('07-all-originals-and-actual-current-parents',{rows,current:bank.current,scope:'Source data only. The unchanged old complete lexer comparison still processes all historical and every current Rust file plus dependency/compiler members.'});
});

test('stale physical roots missing declarations and output aliases remain explicit failures',{timeout:60000},t=>{
 const folder=mkdtempSync(join(tmpdir(),'router-static-source-root-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));mkdirSync(join(folder,'src'));writeFileSync(join(folder,'src/lib.rs'),'pub fn changed(){}');execFileSync('/usr/bin/git',['init','--quiet'],{cwd:folder});execFileSync('/usr/bin/git',['add','src/lib.rs'],{cwd:folder});assert.throws(()=>context('fixed-arrays.test.mjs',{root:folder}),/current source set/);
 const proposal={schema:'router-static-source-lifecycle-proposal-v1',sourceRoot:ROOT,files:['manifest.json','originals.json.gz','NOTICE.md'].map(name=>{const bytes=readFileSync(join(ASSETS,name));return {path:'tools/translation/source-profiles/static-source-lifecycle/'+name,encoding:'base64',content:bytes.toString('base64'),bytes:bytes.length,sha256:hash(bytes)};})},outside=join(folder,'outside');mkdirSync(outside);const alias=join(folder,'alias');symlinkSync(ROOT,alias,'dir');assert.throws(()=>writeStaticSourceLifecycleProposal(proposal,alias),/overlaps/);assert.deepEqual(readdirSync(outside),[]);
 const bank=context(),entry=originalRealSourceManifest().entries.find(row=>row.id==='format-resume_message'),parent=bank.source(entry.path);assert.throws(()=>selectRealSourceFixture(parent.replace('resume_message','changed_name'),entry),/unique original declaration/);assert.equal(selectRealSourceFixture(parent,entry,{current:true,unknown:'no authority'}).namespaceAuthority,undefined);
 const output=join(folder,'complete');writeStaticSourceLifecycleProposal(proposal,output);assert.throws(()=>writeStaticSourceLifecycleProposal(proposal,output),/EEXIST/);assert.equal(readFileSync(join(output,'proposal.json'),'utf8'),JSON.stringify(proposal,null,2)+'\n');retain('08-root-and-output-refusals',{folder,proposal,alias,entry,parent});
});
