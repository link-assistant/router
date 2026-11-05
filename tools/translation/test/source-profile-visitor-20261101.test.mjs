// Actual authoritative edited JS/TS -> checked changed Rust -> receiving SOURCE.
// All new implementation and independent cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{readFileSync} from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {visitSourceProfileEquations} from '../source-profile-visitor-20261101.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData} from '../primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {gunzipSync} from 'node:zlib';
import {receiveStreamedSourceProfile,streamedProfileReceivingReadSource} from './source-profile-visitor-20261101-receiving.mjs';
import {hostRuntimeAssetsNamedDataAliases} from '../host-assets.mjs';
import {effectRuntimeAssets} from '../effect-assets.mjs';
import {verifyScalarReceivingTargets} from './scalar-target-receiving-20261101.mjs';
import {checkedNominalEditedMapResult,withNominalEditedOperation} from '../nominal-edited-target-20261101-domain.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),manifest=read('Cargo.toml'),lock=read('Cargo.lock'),limits={timeout:60000};
const actual=read('src/client_policy.rs'),start=actual.indexOf('/// Why an entitlement matrix cell is usable.'),end=actual.indexOf('/// Exact immutable managed-client identity',start);assert.ok(start>=0&&end>start);
const declaration=actual.slice(start,end),remap='pub fn remap(input:&[EntitlementDecision])->Vec<EntitlementDecision>{input.iter().copied().map(|_value|EntitlementDecision::Native).collect()}',flags='pub fn flags(input:&[EntitlementDecision])->Vec<bool>{input.iter().copied().map(|value|match value{EntitlementDecision::Native=>true,EntitlementDecision::Proxied=>false,EntitlementDecision::Override=>true,EntitlementDecision::Denied=>false}).collect()}';
const request=(source=declaration+remap+flags)=>({entry:'src/lib.rs',files:[{path:'src/lib.rs',source}],manifest,lock});
function inputs(result){const assets=hostRuntimeAssetsNamedDataAliases(),effects=effectRuntimeAssets();assets.set('effects.mjs',effects.javascript);assets.set('effects.d.mts',effects.declarations);return {data:{runtimeRoot:'runtime',declarationRoot:'runtime',files:[...assets].map(([path,source])=>({path:'runtime/'+path,source}))},proposal:{modules:[{artifacts:[{language:'JavaScript',path:'src/lib.mjs',source:result.javascript},{language:'TypeScript',path:'src/lib.mts',source:result.typescript}]}]}};}
const verifyConstant=`(target)=>{
 const api=target.translated,tags=['Native','Proxied','Override','Denied'];
 assert.deepEqual(api.remap(Object.freeze([])),[]);
 const input=Object.freeze(tags.map($=>Object.freeze({$}))),output=api.remap(input);assert.deepEqual(output,Array.from({length:4},()=>({$:'Denied'})));assert.notEqual(output,input);assert.equal(Object.isFrozen(output),true);
 const alias=Object.freeze({$:'Override'}),fullInput=Object.freeze(Array(4096).fill(alias)),full=api.remap(fullInput);assert.deepEqual(full,Array.from({length:4096},()=>({$:'Denied'})));assert.notEqual(full,fullInput);assert.equal(Object.isFrozen(full),true);
 assert.deepEqual(api.flags(input),[true,false,true,false]);
 let reads=0;const bad=[];Object.defineProperty(bad,'0',{get(){reads++;throw Error('opaque');},enumerable:true});Object.freeze(bad);const proxy=new Proxy(fullInput,{get(){reads++;throw Error('opaque');},ownKeys(){reads++;throw Error('opaque');}});
 for(const value of [bad,proxy,Object.freeze([,]),[alias],Object.freeze([{$:'Native'}]),Object.freeze([Object.freeze({$:'Other'})]),Object.freeze([Object.freeze({$:'Native',field:1})]),Object.freeze(Array(4097).fill(alias))])assert.throws(()=>api.remap(value));assert.equal(reads,0);
}`;
const verifyPredicate=`(target,core)=>{
 const api=target.translated,input=Object.freeze(['Native','Proxied','Override','Denied'].map($=>Object.freeze({$})));assert.deepEqual(api.flags(input),[false,false,true,false]);assert.deepEqual(api.flags(Object.freeze([])),[]);
 const full=api.flags(Object.freeze(Array(4096).fill(Object.freeze({$:'Native'}))));assert.deepEqual(full,Array(4096).fill(false));assert.equal(Object.isFrozen(full),true);assert.equal(core.router_vec_bool_len(full),4096n);
 assert.deepEqual(api.remap(input),Array.from({length:4},()=>({$:'Native'})));assert.throws(()=>api.flags(Object.freeze(Array(4097).fill(Object.freeze({$:'Native'})))));
}`;
for(const language of ['JavaScript','TypeScript'])for(const kind of ['constant','predicate'])test(language+' '+kind+' edits produce real changed native semantic body and exact emitted JS/strict-TS targets',limits,async t=>{
 const startedAt=performance.now(),qualifiedNames=[kind==='constant'?'remap':'flags'],received=receiveStreamedSourceProfile(t,{request:request(),qualifiedNames,kind,language,operation:'edited'},{startedAt});assert.equal(received.result.ok,true,JSON.stringify(received.result.error));assert.equal(received.report.fullEquationsConsumed,62);const result=received.result.result;
 assert.deepEqual(result.ruleTrace.map(row=>row.phase),['language','language','repository']);assert.equal(result.nativeSemanticBodyChanged,true);assert.equal(result.canonicalNativeFromFreshCheckedIR,true);assert.equal(result.authoritativeTargetExactlyReproduced,true);assert.equal(result.exactOriginalRestorationOnly,false);assert.equal(result.inputEnvelopeChanged,true);assert.equal(result.productionPolicyAdmitted,false);assert.equal(result.runtimeExecuted,false);
 const native=result.canonicalNativeSources.find(row=>row.path==='src/lib.rs');assert.notEqual(native.source,request().files[0].source);assert.ok(native.source.startsWith(declaration));assert.match(native.source,/\.iter\(\)\.copied\(\)\.map/);assert.equal(result.beforePlans[0].owner,'EntitlementDecision');assert.equal(result.checkedPlans[0].owner,'EntitlementDecision');
 if(kind==='constant')assert.match(native.source,/crate::EntitlementDecision::Denied/);else{assert.equal(result.beforePlans[0].callback.cases.find(row=>row.variant==='Native').leaf.value,true);assert.equal(result.checkedPlans[0].callback.cases.find(row=>row.variant==='Native').leaf.value,false);}
 for(const history of result.histories)assert.equal(history.inverse,history.before);
 assert.equal(result.source,language==='JavaScript'?result.javascript:result.typescript);const target=inputs(result),report=await verifyScalarReceivingTargets(t,target.data,target.proposal,{verifySource:kind==='constant'?verifyConstant:verifyPredicate,startedAt});assert.equal(report.targets.length,2);assert.equal(report.compilerVersion,'Version 5.9.3');assert.equal(report.cleanupSucceeded,true);
});
for(const language of ['JavaScript','TypeScript'])for(const mutate of ['extra-source','foreign-variant','capture','extra-field','freeze-call','noncanonical'])test(language+' authoritative '+mutate+' edit refuses without a public owner shortcut',limits,t=>{
 const received=receiveStreamedSourceProfile(t,{request:request(),qualifiedNames:['remap'],kind:'constant',language,operation:'edited',mutate},{startedAt:performance.now()});assert.equal(received.result.ok,false);assert.match(received.result.error.message,/canonical|variant|constructor|literal|entire source|exactly regenerated/i);
});
test('owned match pattern edits refuse; Boolean value edits are the exact first predicate domain',limits,t=>{
 const received=receiveStreamedSourceProfile(t,{request:request(),qualifiedNames:['flags'],kind:'predicate',language:'JavaScript',operation:'edited',mutate:'switch-tag'},{startedAt:performance.now()});assert.equal(received.result.ok,false);assert.match(received.result.error.message,/pattern|branch|entire source/);
});
for(const language of ['JavaScript','TypeScript'])test(language+' fresh semantic-meta reissue cannot accept stale document flags',limits,t=>{
 const received=receiveStreamedSourceProfile(t,{request:request(),qualifiedNames:['remap'],kind:'constant',language,operation:'meta',mutate:'stale-meta'},{startedAt:performance.now()});assert.equal(received.result.ok,false);assert.match(received.result.error.message,/submitted edited nominal meta differs/);
});
for(const [label,source]of [
 ['borrowed filter',declaration+'pub fn remap(input:&[EntitlementDecision])->Vec<EntitlementDecision>{input.iter().copied().filter(|value|true).collect()}'],
 ['foreign nominal owner',declaration+'#[derive(Clone,Copy)]enum Other{Native,Denied}pub fn remap(input:&[EntitlementDecision])->Vec<Other>{input.iter().copied().map(|_value|Other::Native).collect()}'],
 ['captured nominal constant',declaration+'const CAPTURED:EntitlementDecision=EntitlementDecision::Native;pub fn remap(input:&[EntitlementDecision])->Vec<EntitlementDecision>{input.iter().copied().map(|_value|CAPTURED).collect()}'],
 ['missing genuine Copy',declaration.replace('Clone, Copy,','Clone,')+remap],
 ['manual Drop',declaration+'impl Drop for EntitlementDecision{fn drop(&mut self){}}'+remap],
 ['owned field payload',declaration.replace('Native,','Native(u64),')+remap],
])test(label+' original native source refuses rather than guessing ownership/traits',limits,t=>{
 const received=receiveStreamedSourceProfile(t,{request:request(source),qualifiedNames:['remap'],operation:'prepare'},{startedAt:performance.now()});assert.equal(received.result.ok,false);assert.match(received.result.error.message,/owner|Copy|Clone|unit|whole|refused|constructor|body|pipeline|source|IR|unsupported/i);
});
test('domain frame and public DATA observations cannot register raw names/certificates as actual map authority',limits,()=>{
 assert.equal(checkedNominalEditedMapResult({}, {kind:'data',name:'EntitlementDecision'}, {kind:'data',name:'EntitlementDecision'}, {start:0,end:1}),false);
 assert.throws(()=>withNominalEditedOperation(()=>checkedNominalEditedMapResult({items:new Map(),verified:true}, {kind:'data',name:'EntitlementDecision'}, {kind:'data',name:'EntitlementDecision'}, {start:0,end:1})));
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('primary'))]){let caught=false;try{withNominalEditedOperation(()=>{throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);}
});


const archivePath='tools/translation/source-profiles/nominal-edited-target-20261101/nominal-edited-target-20261101-complete-sources.json.gz';
function sourceFixture(){
 const directory=fs.mkdtempSync(join(tmpdir(),'router-source-visitor-data-')),bytes=readFileSync(new URL('../../../'+archivePath,import.meta.url)),plan=JSON.parse(gunzipSync(bytes,{maxOutputLength:16777216}).toString('utf8'));let written=0;
 const put=(path,value)=>{written+=Buffer.byteLength(value);assert.ok(written<=67108864);const full=join(directory,path);fs.mkdirSync(full.slice(0,full.lastIndexOf('/')),{recursive:true});fs.writeFileSync(full,value);};put(archivePath,bytes);for(const row of plan.rows)put(row.path,row.physicalBefore);for(const row of plan.additions)put(row.path,row.source);return {directory,plan,put,cleanup:()=>fs.rmSync(directory,{recursive:true,force:true})};
}
test('every complete prior/nominal/literal/edited CST and inverse reaches a synchronous callback, while only bounded raw images remain',limits,()=>{
 const fixture=sourceFixture(),seen=[];try{const images=visitSourceProfileEquations(event=>{
  assert.equal(event.index,seen.length);assert.equal(event.history.inverse,event.history.before);assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,event.history.before);assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source,event.history.after);assert.deepEqual(event.history.trace.map(row=>row.phase),['language','repository']);assert.equal(Object.isFrozen(event.history),true);
  seen.push({index:event.index,path:event.path,beforeVersion:event.beforeVersion,afterVersion:event.afterVersion,inverseVersion:event.inverseVersion});return {consumed:event.index};
 },{directory:fixture.directory});assert.equal(images.equationsVisited,62);assert.equal(seen.length,62);assert.equal(images.chronology.length,62);assert.equal(images.fullCstRetained,false);assert.equal(images.allFullEquationsDelivered,true);assert.equal(images.sourceInstalled,false);assert.equal(Object.isFrozen(images),true);accountPrimitiveVectorIteratorBulkData(images);
 for(const [index,row]of images.chronology.entries()){assert.equal(row.beforeVersion,seen[index].beforeVersion);assert.equal(row.afterVersion,seen[index].afterVersion);assert.equal(row.inverseVersion,row.beforeVersion);assert.deepEqual(row.tracePhases,['language','repository']);assert.equal(Object.hasOwn(row,'beforeMeta'),false);}
 for(const row of images.substitutions){const original=fixture.plan.rows.find(value=>value.path===row.path);assert.equal(images.versions[row.beforeVersion].source,original.physicalBefore);assert.equal(images.versions[row.afterVersion].source,original.after);}assert.equal(images.additions.length,fixture.plan.additions.length);
 }finally{fixture.cleanup();}
});
test('visitor refuses oversized aliased callback DATA and asynchronous/accessor results without publishing images',limits,()=>{
 const fixture=sourceFixture();try{
  const shared='😀'.repeat(2097152);assert.throws(()=>visitSourceProfileEquations(()=>({first:shared,second:shared}),{directory:fixture.directory}),/UTF8|UTF16|budget/);
  assert.throws(()=>visitSourceProfileEquations(()=>Promise.resolve(null),{directory:fixture.directory}));let reads=0;const answer={};Object.defineProperty(answer,'value',{get(){reads++;throw Error('opaque');},enumerable:true});assert.throws(()=>visitSourceProfileEquations(()=>answer,{directory:fixture.directory}));assert.equal(reads,0);
  assert.throws(()=>visitSourceProfileEquations(async()=>null,{directory:fixture.directory}));const options={};Object.defineProperty(options,'directory',{get(){reads++;throw Error('opaque');},enumerable:true});assert.throws(()=>visitSourceProfileEquations(()=>null,options));assert.equal(reads,0);
 }finally{fixture.cleanup();}
});
test('callback throws preserve exact falsy/frozen primaries and immutable equation edits refuse',limits,()=>{
 const fixture=sourceFixture();try{for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('exact original'))]){let caught=false;try{visitSourceProfileEquations(()=>{throw primary;},{directory:fixture.directory});}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);}
 assert.throws(()=>visitSourceProfileEquations(event=>{event.history.inverse+='forged';},{directory:fixture.directory}),TypeError);
 }finally{fixture.cleanup();}
});
for(const mode of ['caught-source-failure','unobserved-restore','same-bytes-replacement'])test(mode+' poisons the complete visitor and prevents raw image publication',limits,()=>{
 const fixture=sourceFixture(),target=join(fixture.directory,fixture.plan.rows[0].path),original=readFileSync(target);let changed=false,caught=false;
 try{try{visitSourceProfileEquations(()=>{if(changed)return;changed=true;if(mode==='same-bytes-replacement'){const next=target+'.replacement';fs.writeFileSync(next,original);fs.renameSync(next,target);}else{fs.writeFileSync(target,Buffer.concat([original,Buffer.from('\n//source failure')]));try{if(mode==='caught-source-failure')try{visitSourceProfileEquations(()=>null,{directory:fixture.directory});}catch{}}finally{fs.writeFileSync(target,original);}}return null;},{directory:fixture.directory});}catch{caught=true;}assert.equal(changed,true);assert.equal(caught,true);
 }finally{fixture.cleanup();}
});
test('complete visitor FD acquisition preserves read primary over secondary close, and close-only failure remains decisive',{...limits,concurrency:false},()=>{
 const fixture=sourceFixture(),read=Object.getOwnPropertyDescriptor(fs,'readSync'),close=Object.getOwnPropertyDescriptor(fs,'closeSync');
 try{for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('read primary'))]){const secondary=Object.freeze(new Error('close secondary'));let caught=false,actual,closed=0;Object.defineProperty(fs,'readSync',{...read,value(){throw primary;}});Object.defineProperty(fs,'closeSync',{...close,value(descriptor){Reflect.apply(close.value,undefined,[descriptor]);closed++;throw secondary;}});syncBuiltinESMExports();try{visitSourceProfileEquations(()=>null,{directory:fixture.directory});}catch(error){caught=true;actual=error;}finally{Object.defineProperty(fs,'readSync',read);Object.defineProperty(fs,'closeSync',close);syncBuiltinESMExports();}assert.equal(caught,true);assert.strictEqual(actual,primary);assert.ok(closed>0);}
 const secondary=Object.freeze(new Error('close only'));let caught=false,actual;Object.defineProperty(fs,'closeSync',{...close,value(descriptor){Reflect.apply(close.value,undefined,[descriptor]);throw secondary;}});syncBuiltinESMExports();try{visitSourceProfileEquations(()=>null,{directory:fixture.directory});}catch(error){caught=true;actual=error;}finally{Object.defineProperty(fs,'closeSync',close);syncBuiltinESMExports();}assert.equal(caught,true);assert.strictEqual(actual,secondary);
 }finally{Object.defineProperty(fs,'readSync',read);Object.defineProperty(fs,'closeSync',close);syncBuiltinESMExports();fixture.cleanup();}
});

test('receiving bounded FD reader preserves every primary over failed close and refuses close-only failure',{...limits,concurrency:false},()=>{
 const fixture=sourceFixture(),target=join(fixture.directory,archivePath),read=Object.getOwnPropertyDescriptor(fs,'readSync'),close=Object.getOwnPropertyDescriptor(fs,'closeSync');
 try{for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('receiving read primary'))]){let caught=false,actual,closed=0;const secondary=Object.freeze(new Error('receiving close secondary'));Object.defineProperty(fs,'readSync',{...read,value(){throw primary;}});Object.defineProperty(fs,'closeSync',{...close,value(fd){Reflect.apply(close.value,undefined,[fd]);closed++;throw secondary;}});syncBuiltinESMExports();try{streamedProfileReceivingReadSource(target,16777216);}catch(error){caught=true;actual=error;}finally{Object.defineProperty(fs,'readSync',read);Object.defineProperty(fs,'closeSync',close);syncBuiltinESMExports();}assert.equal(caught,true);assert.strictEqual(actual,primary);assert.equal(closed,1);}
 const secondary=Object.freeze(new Error('receiving close only'));let caught=false,actual;Object.defineProperty(fs,'closeSync',{...close,value(fd){Reflect.apply(close.value,undefined,[fd]);throw secondary;}});syncBuiltinESMExports();try{streamedProfileReceivingReadSource(target,16777216);}catch(error){caught=true;actual=error;}finally{Object.defineProperty(fs,'closeSync',close);syncBuiltinESMExports();}assert.equal(caught,true);assert.strictEqual(actual,secondary);
 }finally{Object.defineProperty(fs,'readSync',read);Object.defineProperty(fs,'closeSync',close);syncBuiltinESMExports();fixture.cleanup();}
});
