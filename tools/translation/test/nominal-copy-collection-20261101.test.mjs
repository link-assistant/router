// Independently authored actual-copy-profile/native/JS/strict-TS cases. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {proposeNominalCopyCollectionProfile} from '../nominal-copy-collection-20261101-profile.mjs';
import {compileNominalCopyCollections,nominalCopyIteratorItem,withNominalCopyCollections,finalizeNominalCopyCollectionProgram,incrementalNominalCopyCollectionOutput} from '../nominal-copy-collection-20261101.mjs';
import {receiveNominalCopyCollectionProfile} from './nominal-copy-collection-20261101-profile-receiving.mjs';
import {hostRuntimeAssetsNamedDataAliases} from '../host-assets.mjs';
import {effectRuntimeAssets} from '../effect-assets.mjs';
import {verifyScalarReceivingTargets} from './scalar-target-receiving-20261101.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),manifest=read('Cargo.toml'),lock=read('Cargo.lock'),limits={timeout:60000};
const actualPolicy=read('src/client_policy.rs'),begin=actualPolicy.indexOf('/// Why an entitlement matrix cell is usable.'),end=actualPolicy.indexOf('/// Exact immutable managed-client identity',begin);
assert.ok(begin>=0&&end>begin);
// Retain the exact actual declaration including all docs and derive attributes.
// Detaching it creates a NEW fixture scope; this is NOT production admission.
const actualDeclaration=actualPolicy.slice(begin,end);
const copied='pub fn duplicate(input:&[EntitlementDecision])->Vec<EntitlementDecision>{input.iter().copied().collect()}',cloned='pub fn cloned(input:&[EntitlementDecision])->Vec<EntitlementDecision>{input.iter().cloned().collect()}';
const request=(source=actualDeclaration+copied+cloned)=>({entry:'src/lib.rs',files:[{path:'src/lib.rs',source}],manifest,lock});
function successful(t,operation='compile',extra={}){const received=receiveNominalCopyCollectionProfile(t,{request:request(),operation,...extra},{startedAt:extra.startedAt??performance.now()});assert.equal(received.result.ok,true,JSON.stringify(received.result.error));return received.result.result;}
function targetInputs(result){const runtime=hostRuntimeAssetsNamedDataAliases(),effects=effectRuntimeAssets();runtime.set('effects.mjs',effects.javascript);runtime.set('effects.d.mts',effects.declarations);return {data:{runtimeRoot:'runtime',declarationRoot:'runtime',files:[...runtime].map(([path,source])=>({path:'runtime/'+path,source}))},proposal:{modules:[{artifacts:[{path:'src/lib.mjs',language:'JavaScript',source:result.javascript},{path:'src/lib.mts',language:'TypeScript',source:result.typescript}]}]}};}
const verifySource=`(target)=>{
 const api=target.translated,tags=['Native','Proxied','Override','Denied'];
 for(const operation of ['duplicate','cloned']){
  for(const tag of tags){const value=Object.freeze({$:tag}),input=Object.freeze([value]);const output=api[operation](input);assert.deepEqual(output,[{$:tag}]);assert.notEqual(output,input);assert.equal(Object.isFrozen(output),true);}
  const shared=Object.freeze({$:'Override'}),input=Object.freeze(Array(4096).fill(shared)),output=api[operation](input);
  assert.deepEqual(output,Array.from({length:4096},()=>({$:'Override'})));assert.notEqual(output,input);assert.equal(Object.isFrozen(output),true);assert.deepEqual(api[operation](Object.freeze([])),[]);
  const ordered=Object.freeze(tags.flatMap(tag=>[Object.freeze({$:tag}),shared]));assert.deepEqual(api[operation](ordered).map(value=>value.$),['Native','Override','Proxied','Override','Override','Override','Denied','Override']);
  let traps=0;const bad=[];Object.defineProperty(bad,'0',{get(){traps++;throw Error('accessor must remain opaque');},enumerable:true});Object.freeze(bad);
  const proxy=new Proxy(input,{get(){traps++;throw Error('proxy must remain opaque');},ownKeys(){traps++;throw Error('proxy must remain opaque');}});
  const badTag={};Object.defineProperty(badTag,'$',{get(){traps++;throw Error('tag accessor must remain opaque');},enumerable:true});Object.freeze(badTag);
  for(const value of [bad,proxy,Object.freeze([,]),[shared],Object.freeze([{$:'Native'}]),Object.freeze([Object.freeze({$:'Other'})]),Object.freeze([Object.freeze({$:'Native',extra:1})]),Object.freeze([badTag]),Object.freeze(Array(4097).fill(shared))])assert.throws(()=>api[operation](value));
  assert.equal(traps,0);
 }
}`;
test('full immutable four-file source equations preserve predecessors and additive 4096 migration receipt',limits,()=>{
 const proposal=proposeNominalCopyCollectionProfile();assert.equal(proposal.substitutions.length,4);assert.equal(proposal.additions.length,1);assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.inputEnvelopeChanged,true);
 assert.deepEqual(proposal.substitutions.map(row=>row.path),['tools/translation/extensions/iterators.mjs','tools/translation/extensions/clone-source-body.mjs','tools/translation/extensions/host-contracts.mjs','tools/translation/project.mjs']);
 for(const row of proposal.substitutions){assert.notEqual(row.before,row.after);assert.equal(row.history.inverse,row.before);assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.before);}
 assert.throws(()=>compileNominalCopyCollections(request()),/source (?:size )?differs|not installed/);assert.throws(()=>nominalCopyIteratorItem({}, {kind:'data',name:'EntitlementDecision'}, {start:0,end:1},'copied'));
});
test('actual original declaration in a detached fixture privately admits copied and derived-cloned; executes emitted JS and separately strict TS',limits,async t=>{
 const startedAt=performance.now(),result=successful(t,'compile',{startedAt});
 assert.deepEqual(result.meta.refused,[]);assert.ok(result.nominalCopyCollections.owners.some(row=>row.typePath.join('::')==='crate::EntitlementDecision'));assert.ok(result.meta.checkedGeneratedMethods.some(row=>row.name==='EntitlementDecision.clone'));
 assert.equal(result.meta.nominalCopyCollectionProfile.inputEnvelopeChanged,true);assert.equal(result.meta.nominalCopyCollectionProfile.maxValues,4096);assert.equal(result.nominalCopyCollections.productionPolicyAdmitted,false);assert.equal(result.inputEnvelopeChanged,true);assert.equal(result.originalUnboundedInputEquivalent,false);
 const inputs=targetInputs(result),report=await verifyScalarReceivingTargets(t,inputs.data,inputs.proposal,{verifySource,startedAt});assert.equal(report.targets.length,2);assert.equal(report.compilerVersion,'Version 5.9.3');assert.equal(report.cleanupSucceeded,true);
});
for(const language of ['JavaScript','TypeScript'])test(language+' complete current projection reissues original native Rust and all CST history; edits refuse',limits,t=>{
 const startedAt=performance.now(),result=successful(t,'inverse',{language,startedAt});assert.equal(result.exactOriginalRustEntry,request().files[0].source);assert.equal(result.sources[0].source,request().files[0].source);assert.equal(result.exactCurrentProjectionOnly,true);assert.equal(result.nativeRestorationOnly,true);assert.equal(result.canonicalSemanticRustEmitted,false);assert.equal(result.privateFreshReissue,true);assert.equal(result.equation.inverse,result.source);
 const refused=receiveNominalCopyCollectionProfile(t,{request:request(),operation:'inverse',language,mutate:'stale'},{startedAt});assert.equal(refused.result.ok,false);assert.match(refused.result.error.message,/edited\/stale\/foreign target/);
});
test('complete semantic meta fresh reissue rejects stale public flags and cannot issue nominal admission',limits,t=>{
 const startedAt=performance.now(),fresh=successful(t,'meta',{startedAt});assert.ok(fresh.nominalCopyCollections.owners.length);const refused=receiveNominalCopyCollectionProfile(t,{request:request(),operation:'meta',mutate:'stale'},{startedAt});assert.equal(refused.result.ok,false);assert.match(refused.result.error.message,/submitted meta differs/);
 const forged={...request(),verified:true,copyCertificate:{verified:true},nominalOwner:'EntitlementDecision'};assert.throws(()=>compileNominalCopyCollections(forged),/exact bounded complete project source request/);
});
for(const [name,source]of [
 ['missing actual Copy',actualDeclaration.replace('Clone, Copy,','Clone,')+copied],
 ['manual Drop',actualDeclaration+'impl Drop for EntitlementDecision{fn drop(&mut self){}}'+copied],
 ['custom Clone effects',actualDeclaration.replace('Clone, Copy,','Copy,')+'impl Clone for EntitlementDecision{fn clone(&self)->Self{panic!("custom clone")}}'+cloned],
 ['payload aggregate fields',actualDeclaration.replace('Native,','Native(u64),')+copied],
 ['unknown owner attribute',actualDeclaration.replace('#[derive','#[unknown]#[derive')+copied],
 ['nominal map move',actualDeclaration+'pub fn duplicate(input:&[EntitlementDecision])->Vec<EntitlementDecision>{input.iter().copied().map(|value|value).collect()}'],
])test(name+' remains a complete original-source refusal',limits,t=>{
 const received=receiveNominalCopyCollectionProfile(t,{request:request(source),operation:'compile'},{startedAt:performance.now()});
 if(received.result.ok){const result=received.result.result;assert.equal(result.meta.executable.some(row=>['duplicate','cloned'].includes(row.name)),false,JSON.stringify(result.meta.refused));assert.ok(result.meta.refused.length||result.meta.unloweredItems.length);}else assert.match(received.result.error.message,/Copy|Clone|unit|nominal|original|layout|source|budget|checked|map/i);
});
test('whole real crate retains actual EntitlementDecision scope and records qualified/refused original policy prerequisites without a production unlock claim',limits,t=>{
 const startedAt=performance.now(),files=[],sourceRoot=fileURLToPath(repositorySourceURL('src',root));
 const collect=(directory,prefix)=>{for(const name of readdirSync(directory)){const path=join(directory,name),info=lstatSync(path);assert.equal(info.isSymbolicLink(),false);if(info.isDirectory())collect(path,prefix+'/'+name);else if(name.endsWith('.rs'))files.push({path:prefix+'/'+name,source:readFileSync(path,'utf8')});}};collect(sourceRoot,'src');
 const selected=files.find(row=>row.path==='src/client_policy.rs');assert.equal(selected.source,actualPolicy);selected.source+='\npub fn nominal_decisions(input:&[EntitlementDecision])->Vec<EntitlementDecision>{input.iter().copied().collect()}\n';
 const received=receiveNominalCopyCollectionProfile(t,{request:{entry:'src/lib.rs',files,manifest,lock},operation:'compile'},{startedAt});
 // This is an admission attempt receipt, not a passing detached fixture credit.
 // Existing independent source/namespace/budget refusals remain decisive.
 if(received.result.ok){const result=received.result.result;assert.equal(result.nominalCopyCollections.productionPolicyAdmitted,false);assert.equal(result.inputEnvelopeChanged,true);for(const owner of result.nominalCopyCollections.owners)if(owner.typePath.at(-1)==='EntitlementDecision'){assert.equal(owner.source,'src/client_policy.rs');assert.equal(owner.privateCopyNoDropCoherenceRechecked,true);}t.diagnostic(JSON.stringify({kind:'whole-real-crate-admission-attempt',executable:result.meta.executable.filter(row=>row.name.includes('nominal_decisions')),refused:result.meta.refused,unloweredItems:result.meta.unloweredItems}));}
 else t.diagnostic(JSON.stringify({kind:'whole-real-crate-admission-attempt-refused',error:received.result.error}));
 assert.equal(read('src/client_policy.rs'),actualPolicy);
});

test('public callback/finalizer observes no fabricated private program or installation; falsy primary throws remain exact',limits,()=>{
 for(const primary of [undefined,null,false,0,'']){let caught=false;try{withNominalCopyCollections(()=>{throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);}
 const result=withNominalCopyCollections(()=>{finalizeNominalCopyCollectionProgram({}, {declarations:new Map()});return {meta:{verified:true,copyCertificate:{verified:true}},javascript:'',typescript:''};});assert.equal(result.nominalCopyCollections.sourceInstalled,false);assert.equal(result.nominalCopyCollections.genuineNominalSourceJoined,false);assert.equal(result.nominalCopyCollections.checkedProgramPasses,0);assert.deepEqual(result.nominalCopyCollections.owners,[]);
});

test('caught then restored installed-source failure poisons the whole source operation',limits,t=>{
 const received=receiveNominalCopyCollectionProfile(t,{request:request(),operation:'source-poison'},{startedAt:performance.now()});assert.equal(received.result.ok,false);assert.match(received.result.error.message,/source size differs|stable immutable source differs/);assert.doesNotMatch(received.result.error.message,/failed to poison/);
});

test('incremental whole-output admission keeps separate UTF16/UTF8 alias occurrence budgets before retention',limits,()=>{
 const root={rows:[]},budget=incrementalNominalCopyCollectionOutput(root),shared={text:'😀'.repeat(1048576)};budget.append(root.rows,shared);budget.append(root.rows,shared);assert.equal(root.rows.length,2);assert.throws(()=>budget.append(root.rows,{first:shared,second:shared}));assert.equal(root.rows.length,2);
 const alias=[];assert.throws(()=>incrementalNominalCopyCollectionOutput({first:alias,second:alias}));const other={rows:[]},guard=incrementalNominalCopyCollectionOutput(other);let reads=0;const field={};Object.defineProperty(field,'value',{get(){reads++;throw Error('opaque');},enumerable:true});assert.throws(()=>guard.append(other.rows,field));assert.equal(reads,0);assert.equal(other.rows.length,0);
});

test('129 complete received Rust source rows retain every original without exceeding the unchanged per-transaction128 equation bound',limits,t=>{
 const startedAt=performance.now(),input=request();for(let index=0;index<128;index++)input.files.push({path:'src/unreferenced_'+index+'.rs',source:'// inert original source Ω😀 '+index+'\n'});
 const received=receiveNominalCopyCollectionProfile(t,{request:input,operation:'compile'},{startedAt});assert.equal(received.result.ok,true,JSON.stringify(received.result.error));const result=received.result.result;assert.equal(result.sources.length,129);assert.equal(result.histories.length,131);for(let index=0;index<input.files.length;index++)assert.equal(result.sources[index].source,input.files[index].source);assert.equal(result.canonicalSemanticRustEmitted,false);
});

for(const operation of ['unobserved-source-restore','same-bytes-replacement'])test(operation+' refuses from initial identity/time stamps even without an intermediate reader',limits,t=>{
 const received=receiveNominalCopyCollectionProfile(t,{request:request(),operation},{startedAt:performance.now()});assert.equal(received.result.ok,false);assert.match(received.result.error.message,/initial identity\/time differs|ancestor identity\/time changed/);assert.doesNotMatch(received.result.error.message,/failed to poison/);
});
test('closing source failures preserve every falsy and frozen exact primary and cleanup still runs',limits,t=>{
 const received=receiveNominalCopyCollectionProfile(t,{request:request(),operation:'primary-source-close'},{startedAt:performance.now()});assert.equal(received.result.ok,true,JSON.stringify(received.result.error));assert.equal(received.result.result.allExactPrimariesPreserved,true);assert.equal(received.report.cleanupSucceeded,true);
});
