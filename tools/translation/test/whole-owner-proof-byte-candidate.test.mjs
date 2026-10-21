import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,Hash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareWholeOwnerProofByteCandidate} from '../prepare-whole-owner-proof-byte-candidate.mjs';
import {prepareWholeOwnerProofByteOriginalTrial} from '../prepare-whole-owner-proof-byte-original-trial.mjs';
import {proposeWholeOwnerProofByteCanonicalTrial,assertWholeOwnerProofByteTrialInputs,wholeOwnerProofByteTrialFilePacket,decodeWholeOwnerProofByteTrialFilePacket} from '../whole-owner-proof-byte-trial-support.mjs';
import {createScopedPrivateNativeProofJsonSerializer as byteNative,createPrivateFrozenJsonComposer as byteFrozen,withOperationProofByteConsumerBridge as operation} from '../operation-proof-byte-bridge.mjs';
import * as bridge from '../operation-proof-byte-bridge.mjs';
import {createScopedPrivateNativeProofJsonSerializer as oldNative} from '../private-native-proof-json.mjs';
import {createPrivateFrozenJsonComposer as oldFrozen} from '../private-frozen-json.mjs';
import * as candidate from '../proof-byte-whole-owner-candidate.mjs';
import * as original from '../derive-bang-context.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),nativeJSON=JSON.stringify,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const hash=value=>createHash('sha256').update(value).digest('hex');
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60000},async()=>{vectors=[];try{await run();}finally{const directory=process.env.ROUTER_WHOLE_OWNER_PROOF_BYTE_EVIDENCE_DIR;if(directory){mkdirSync(directory,{recursive:true});const raw=Buffer.from(nativeJSON({name,vectors})+'\n'),packed=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(packed),raw);writeFileSync(join(directory,hash(name)+'.json.gz'),packed);}}});
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function shared(){return freeze({source:'// whole source 😀\r\n'.repeat(180),tokens:Array.from({length:128},(_,at)=>({at,text:'token-'+at}))});}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function jsonObserver(run){const before=get(JSON,'stringify'),tape=[];try{define(JSON,'stringify',{...before,value:function(...args){tape.push({sameReceiver:this===JSON,args:args.map(value=>({kind:typeof value,primitive:value===null||typeof value!=='object'&&typeof value!=='function'?value:undefined}))});return apply(before.value,this,args);}});return {result:outcome(run),tape};}finally{define(JSON,'stringify',before);}}
function hashObserver(run){const update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),tape=[];try{define(Hash.prototype,'update',{...update,value:function(...args){tape.push({operation:'update',payloads:args.map(value=>typeof value==='string'?value:{base64:Buffer.from(value).toString('base64')})});return apply(update.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape.push({operation:'digest',args,value});return value;}});return {value:run(),tape};}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}}
test('the actual complete copied consumer closure preserves native bindings Hash calls and every full source inverse',()=>{
 const plan=retain('complete-native-consumer-source-plan',prepareWholeOwnerProofByteCandidate());
 assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.files.length,19);assert.equal(plan.physicalOverlays.length,15);assert.equal(plan.serializerBindings.length,5);assert.equal(plan.existingDefaultsUnchanged,true);assert.equal(plan.existingBulkCopiesUnchanged,true);assert.equal(plan.newAcrossInvocationEncodedCache,false);assert.equal(plan.performanceQualified,false);
 for(const row of [...plan.files,...plan.physicalOverlays]){
  assert.equal(row.inverse,row.before);assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
  assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}
 }
 for(const row of plan.files)assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.after,row.path);
 for(const row of plan.inputs)assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.source,row.path);
 for(const row of plan.cycleEvidence)assert.deepEqual(row.topLevelCrossCycleReferences,[]);
 const scope=plan.files.find(row=>row.path.endsWith('/operation-proof-byte-consumer-scope.mjs'));assert.equal(scope.selection.imports.length,1);assert.equal(scope.selection.oldOperationBodyUnchanged,true);
 assert.deepEqual(plan.serializerBindings.map(row=>row.bindings.length),[1,1,1,1,1]);
});
test('the separate original-twelve harness copies every existing whole function deadline and independent source packet reviewer',()=>{
 const plan=retain('complete-native-original-twelve-harness-source-plan',prepareWholeOwnerProofByteOriginalTrial()),row=plan.files[0];
 assert.equal(plan.originalTestChanged,false);assert.equal(plan.originalLimitsChanged,false);assert.equal(plan.productionSelected,false);assert.equal(plan.performanceQualified,false);assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);
 assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);
 for(const original of row.preserved)assert.equal(original.inverse,original.original,original.name);
 assert.ok(row.preserved.some(row=>row.name==='discoverCanonicalTrialInputs'));assert.ok(row.preserved.some(row=>row.name==='runCanonicalDeriveTrialNode'));assert.ok(row.preserved.some(row=>row.name==='joinCanonicalTrialBun'));assert.equal(row.imports.length,1);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
});
test('native and frozen consumer bindings compose identical whole DATA bytes and every native Hash payload',()=>{
 const common=shared(),values=Array.from({length:12},(_,at)=>({compilerMeta:common,recipes:[common],at,unicode:'\u0000\r\n😀\ud800',negativeZero:-0,integerKeys:{12:'twelve',2:'two'}}));retain('complete-immutable-inputs',values);
 for(const [oldFactory,newFactory]of [[oldNative,byteNative],[oldFrozen,byteFrozen]]){
  const old=oldFactory(),next=newFactory(),expected=hashObserver(()=>values.map(value=>{const text=old(value);return {text,digest:createHash('sha256').update(text).digest('hex')};})),actual=hashObserver(()=>operation(()=>values.map(value=>{const text=next(value);return {text,digest:createHash('sha256').update(text).digest('hex')};})));retain('complete-old-new-native-Hash-payload-tapes',{expected,actual});assert.deepEqual(actual,expected);
  for(const value of [undefined,null,true,1,'😀'])assert.equal(operation(()=>next(value)),old(value));
 }
});
test('fallback suspends byte consumers before getters proxies cycles toJSON and late intrinsic callbacks',()=>{
 const common=shared();
 for(const [oldFactory,newFactory]of [[oldNative,byteNative],[oldFrozen,byteFrozen]]){
  const old=oldFactory(),next=newFactory();
  for(const make of [serialize=>({get field(){return {nested:serialize({compilerMeta:common})};}}),()=>new Proxy({value:'proxy'},{}),serialize=>({toJSON(){return {nested:serialize({compilerMeta:common})};}}),()=>{const value={};value.self=value;return value;}]){
   const expected=jsonObserver(()=>old(make(old))),actual=jsonObserver(()=>operation(()=>next(make(next))));retain('complete-legacy-callback-tapes',{expected,actual});assert.deepEqual(actual,expected);
  }
  const marker=new RangeError('original byte consumer callback marker');assert.throws(()=>operation(()=>next({get field(){throw marker;}})),error=>error===marker);
  operation(()=>{assert.equal(next({compilerMeta:common}),old({compilerMeta:common}));const prior=get(Object.prototype,'toJSON');try{define(Object.prototype,'toJSON',{configurable:true,value(){return {late:true,nested:next('native-old-fallback')};}});assert.equal(next(common),old(common));}finally{if(prior)define(Object.prototype,'toJSON',prior);else delete Object.prototype.toJSON;}});
 }
});
test('nested return exception and async boundaries restore original outside-frame serializers without exposing a setter',async()=>{
 const value={compilerMeta:shared()},serialize=byteNative(),expected=nativeJSON(value);let getters=0;
 assert.equal('setSerializer'in bridge,false);assert.equal(operation(()=>{assert.equal(serialize(value),expected);assert.equal(operation(()=>serialize(value)),expected);return serialize(value);}),expected);
 const marker={original:true};assert.throws(()=>operation(()=>{serialize(value);throw marker;}),error=>error===marker);assert.equal(serialize(value),expected);
 const own=Object.defineProperty({},'then',{get(){getters++;throw Error('do not call then');}}),inherited=Object.create(Object.defineProperty({},'then',{get(){getters++;throw Error('do not call inherited then');}}));
 for(const value of [Promise.resolve(1),own,inherited])assert.throws(()=>operation(()=>value),/synchronous|thenable/u);assert.equal(getters,0);
 let continuation;assert.throws(()=>operation(()=>{continuation=Promise.resolve().then(()=>serialize(value));return continuation;}),/thenable/u);assert.equal(await continuation,expected);assert.throws(()=>operation(new Proxy(()=>1,{})),/qualified/u);
 const baseline=jsonObserver(()=>oldNative()(value)),after=jsonObserver(()=>serialize(value));retain('complete-outside-frame-old-hook-tapes',{baseline,after});assert.deepEqual(after,baseline);
});
test('genuine original inputs issue matching copied contexts while foreign copied and mutated contexts remain unjoined',()=>{
 const dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),modules=[{file:'src/lib.rs',path:[],source:'mod model;'},{file:'src/model.rs',path:['model'],source:'#[derive(serde::Serialize,serde::Deserialize,Clone,Debug)] pub struct Payload { value:u8 }'}];
 const deriveContext=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),input={modules,deriveContext,externalModules:deriveFootprintExternalModules(deriveContext),compilationProfile:PRODUCTION_PROFILE};retain('complete-original-module-and-dependency-input',input);
 const old=original.createDeriveBangContext(input),next=candidate.createWholeOwnerDeriveBangContext(input);retain('complete-original-and-byte-candidate-contexts',{old,next});assert.deepEqual(next,old);assert.equal(candidate.isDeriveBangContext(next),true);assert.equal(original.isDeriveBangContext(next),false);assert.equal(candidate.isDeriveBangContext(old),false);
 for(const copied of [{...next},JSON.parse(nativeJSON(next)),{...next,digest:'mutated'}]){assert.equal(candidate.isDeriveBangContext(copied),false);assert.throws(()=>candidate.deriveBangModules(copied),/original|context|sealed/u);}
 const result=candidate.resolveWholeOwnerModuleBindings({...input,deriveBangContext:next});retain('complete-copied-resolver-result',result);assert.equal(result.scopes.find(row=>row.file==='src/model.rs').unresolvedBangMacroScope,false);
});
test('the complete real physical proposal retains every sixteen source packets and refuses omitted mutated or foreign bytes',()=>{
 const proposal=retain('complete-fresh-original-twelve-byte-proposal',proposeWholeOwnerProofByteCanonicalTrial({root:new URL('../../../',import.meta.url).pathname}));assert.equal(proposal.overlays.length,16);assert.equal(proposal.originalTestUnchanged,true);assert.equal(proposal.performanceQualified,false);assert.equal(proposal.test.cases.length,12);
 const facts=proposal.requiredSourceInputs,vector={files:facts};assertWholeOwnerProofByteTrialInputs(vector,proposal);
 for(const row of proposal.overlays){const original=Buffer.from(row.original),trial=Buffer.from(row.candidate),fact={path:row.path,mode:0o644,bytes:original.length,sha256:hash(original)},packet=wholeOwnerProofByteTrialFilePacket(fact,original,trial,{overlays:proposal.overlays}),decoded=decodeWholeOwnerProofByteTrialFilePacket(packet,fact,{overlays:proposal.overlays});assert.deepEqual(decoded,{original,trial});assert.throws(()=>decodeWholeOwnerProofByteTrialFilePacket({...packet,trial:{...packet.trial,sha256:'foreign'}},fact,{overlays:proposal.overlays}),/equation/u);assert.throws(()=>wholeOwnerProofByteTrialFilePacket(fact,original,Buffer.from(row.candidate+'\n'),{overlays:proposal.overlays}),/exact|physical/u);}
 assert.throws(()=>assertWholeOwnerProofByteTrialInputs({files:facts.slice(1)},proposal),/absent|join/u);assert.throws(()=>assertWholeOwnerProofByteTrialInputs(vector,{...proposal,overlays:proposal.overlays.slice(1)}),/fifteen|complete/u);
 const first=facts[0];assert.throws(()=>assertWholeOwnerProofByteTrialInputs({files:[{...first,sha256:'mutated'},...facts.slice(1)]},proposal),/absent|join/u);
});
