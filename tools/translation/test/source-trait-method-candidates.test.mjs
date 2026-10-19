import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {captureOriginalTraitMethodCandidates,originalTraitMethodCandidateFacts,originalTraitMethodCandidateSource,queryOriginalTraitMethodCandidates,originalTraitMethodQueryFacts,proveOriginalTraitMethodAbsent,originalTraitMethodAbsenceFacts,TRAIT_METHOD_CANDIDATE_LIMITS} from '../source-trait-method-candidates.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function original(source,name='Other',profile=PRODUCTION_PROFILE,file='src/lib.rs'){
 const captured=captureSourceModuleViews({source,sourcePath:file,compilationProfile:profile}),view=captured.views[0],module={source,file,path:[],sourceView:view,compilationProfile:profile},item=originalSourceModuleItems(module).find(item=>item.term==='trait'&&item.name===name);assert.ok(item);return {module,item,captured};
}
const retain=(name,value)=>{const root=process.env.ROUTER_METHOD_CANDIDATE_VECTOR_DIR;if(root){mkdirSync(root,{recursive:true});writeFileSync(join(root,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}};
// The production API intentionally accepts only module/item; fixture metadata
// such as the captured view receipt is retained separately, not passed as flags.
function issue(input){return captureOriginalTraitMethodCandidates({module:input.module,item:input.item});}

test('complete generic source census preserves all member namespaces and ordinary receiver alternatives',{timeout:5000},()=>{
 const source='pub trait Other { fn value(self)->bool; fn borrowed(&self)->bool; fn mutable(&mut self)->bool; fn lifetime<\'a>(&\'a self)->bool; fn typed(self: Box<Self>)->bool; fn associated<T>(value: Result<T,u8>)->bool; const MEMBER: bool; type Item; }',input=original(source),token=issue(input),facts=originalTraitMethodCandidateFacts(token);retain('01-complete-source',{source,input:input.captured,facts});
 assert.deepEqual(facts.members.map(member=>[member.kind,member.name]),[['fn','value'],['fn','borrowed'],['fn','mutable'],['fn','lifetime'],['fn','typed'],['fn','associated'],['const','MEMBER'],['type','Item']]);
 assert.deepEqual(facts.members.filter(member=>member.kind==='fn').map(member=>member.receiver.kind),['value','shared-reference','mutable-reference','shared-reference','explicit-self-type','associated-function']);
 assert.equal(facts.members.find(member=>member.name==='associated').parameters.length,1);assert.equal(facts.sourceWrittenCensusComplete,true);
 for(const member of facts.members){assert.equal(source.slice(member.span.start,member.span.end),member.original);for(const token of member.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.text);}
 for(const key of ['compilerValidityProved','inheritedTraitClosureProved','availabilitySelected','callerNamespaceQualified','receiverApplicabilityProved','methodSelectionAuthority','namespaceAuthority','runtimeAuthority','copyAuthority','noDropAuthority'])assert.equal(facts[key],false,key);
 assert.equal(Object.isFrozen(facts.members),true);assert.throws(()=>proveOriginalTraitMethodAbsent(queryOriginalTraitMethodCandidates(token,'absent')),/unresolved source obligation/);
});

test('private own-trait member absence is reusable across arbitrary names and never selects a caller method',{timeout:5000},()=>{
 const source='trait Other{fn something(&self)->bool; const VALUE:bool;} pub fn unchanged(value:i32)->bool{value>=0}',input=original(source),token=issue(input),queries=[];
 for(const name of ['contains','is_finite','parse','from']){const query=queryOriginalTraitMethodCandidates(token,name),proof=proveOriginalTraitMethodAbsent(query),facts=originalTraitMethodAbsenceFacts(proof);queries.push({name,facts});assert.equal(facts.completeOwnTraitMemberAbsence,true);assert.equal(facts.callerNamespaceQualified,false);assert.equal(facts.receiverSearchOrderProved,false);assert.equal(facts.methodSelectionAuthority,false);assert.equal(facts.runtimeAuthority,false);assert.throws(()=>originalTraitMethodAbsenceFacts({...proof}),TypeError);}
 for(const name of ['something','VALUE']){const query=queryOriginalTraitMethodCandidates(token,name),facts=originalTraitMethodQueryFacts(query);assert.equal(facts.members.length,1);assert.equal(facts.sourceWrittenOwnValueMemberAbsent,false);assert.throws(()=>proveOriginalTraitMethodAbsent(query),/written candidate/);}
 assert.throws(()=>queryOriginalTraitMethodCandidates(token,'not a method'),TypeError);retain('02-private-generic-absence',{source,queries});
});

test('all conditional member alternatives remain in the census regardless of explicit or unknown availability',{timeout:5000},()=>{
 const source='trait Other{#[cfg(unix)] fn contains(self)->bool;#[cfg(not(unix))] fn alternative(&self)->bool;type Item;}';const results=[];
 for(const profile of [PRODUCTION_PROFILE,compilationProfile({flags:{unix:true}}),compilationProfile({flags:{unix:false}})]){const input=original(source,'Other',profile),token=issue(input),facts=originalTraitMethodCandidateFacts(token),query=originalTraitMethodQueryFacts(queryOriginalTraitMethodCandidates(token,'contains'));results.push({profile,facts,query});assert.equal(facts.members.length,3);assert.equal(query.members.length,1);assert.equal(query.completeOwnTraitMemberAbsence,false);assert.equal(facts.members.every(member=>member.availabilitySelected===false),true);}
 retain('03-complete-conditional-alternatives',{source,results});
});

test('supertraits attributes doc ownership and nested or opaque macro outputs preserve independent obligations',{timeout:5000},()=>{
 const sources=['trait Other: Parent {fn own(&self)->bool;}','#[cfg_attr(x,doc="unknown owner")] trait Other{fn own(&self)->bool;}','/// documentation owner\ntrait Other{fn own(&self)->bool;}','trait Other{/// field doc owner\nfn own(&self)->bool;}','trait Other{#[custom] fn own(&self)->bool;}','trait Other{fn own(&self)->bool{producer::emit!();true}}','trait Other{fn own(&self,value:type_macro!())->bool{true}}','trait Other{fn own(&self)->bool{/// nested documentation owner\nfn local(){}true}}','trait Other{fn own(&self)->bool{#[macro_export] macro_rules! exported{()=>{}} true}}','trait Other{emit!();fn own(&self)->bool;}'],observations=[];
 for(const source of sources){const input=original(source),token=issue(input),facts=originalTraitMethodCandidateFacts(token),query=queryOriginalTraitMethodCandidates(token,'contains');observations.push({source,facts,query:originalTraitMethodQueryFacts(query)});assert.ok(facts.obligations.length);assert.throws(()=>proveOriginalTraitMethodAbsent(query),/unresolved source obligation/);}
 retain('04-all-unclosed-source-output-obligations',observations);
});

test('exact original source view item and module associations reject copied stale foreign and mutable carriers',{timeout:5000},()=>{
 const source='trait Other{fn own(&self)->bool;}',input=original(source),token=issue(input),query=queryOriginalTraitMethodCandidates(token,'contains'),proof=proveOriginalTraitMethodAbsent(query);
 assert.throws(()=>captureOriginalTraitMethodCandidates({module:input.module,item:structuredClone(input.item)}),/exact original/);assert.throws(()=>originalTraitMethodCandidateFacts({...token}),TypeError);assert.throws(()=>originalTraitMethodQueryFacts({...query}),TypeError);
 const foreign=original(source);assert.throws(()=>captureOriginalTraitMethodCandidates({module:foreign.module,item:input.item}),/exact original/);
 for(const [field,changed]of [['source',source+'\n'],['file','src/other.rs'],['path',['other']],['compilationProfile',compilationProfile({flags:{test:true}})],['sourceView',structuredClone(input.module.sourceView)]]){const previous=input.module[field];input.module[field]=changed;assert.throws(()=>originalTraitMethodAbsenceFacts(proof),TypeError);input.module[field]=previous;assert.equal(originalTraitMethodAbsenceFacts(proof).completeOwnTraitMemberAbsence,true);}
 let reads=0;const getter={};Object.defineProperties(getter,{module:{get(){reads++;return input.module;},enumerable:true},item:{value:input.item,enumerable:true}});assert.throws(()=>captureOriginalTraitMethodCandidates(getter),TypeError);assert.equal(reads,0);
 let traps=0;const proxy=new Proxy(input.module,{get(){traps++;throw new Error('trap');},ownKeys(){traps++;throw new Error('trap');}});assert.throws(()=>captureOriginalTraitMethodCandidates({module:proxy,item:input.item}),TypeError);assert.equal(traps,0);retain('05-identity-and-no-callback-controls',{source,facts:originalTraitMethodCandidateFacts(token),reads,traps});
});

test('complete retained RangeBounds and PartialOrd sources preserve shared signatures and all original method branches',{timeout:5000},()=>{
 const pins=[{stored:'../source-profiles/reversed-ranges/core-ops-range.rs.gz',bytes:38843,sha256:'c070f37e43e4e688a7b5a26eb23e7c6c5ab761b07b41475dfd0a5e54175cbd40',name:'RangeBounds',file:'library/core/src/ops/range.rs'},{stored:'../source-profiles/primitive-from-namespace/library-core-src-cmp.rs.gz',bytes:69754,sha256:'4d99f17bff4740a566d839f9ec990ebb5f593cbfe369334fac5f08463203e1c4',name:'PartialOrd',file:'library/core/src/cmp.rs'}],observations=[];
 for(const pin of pins){const bytes=gunzipSync(readFileSync(new URL(pin.stored,import.meta.url)),{maxOutputLength:128000});assert.equal(bytes.length,pin.bytes);assert.equal(hash(bytes),pin.sha256);const source=bytes.toString('utf8'),input=original(source,pin.name,PRODUCTION_PROFILE,pin.file),token=issue(input),facts=originalTraitMethodCandidateFacts(token),method=pin.name==='RangeBounds'?'contains':'le',query=originalTraitMethodQueryFacts(queryOriginalTraitMethodCandidates(token,method));observations.push({pin,original:originalTraitMethodCandidateSource(token),facts,query});assert.equal(query.members.length,1);assert.equal(query.members[0].receiver.kind,'shared-reference');assert.equal(query.completeOwnTraitMemberAbsence,false);assert.equal(facts.callerNamespaceQualified,false);assert.equal(facts.methodSelectionAuthority,false);}
 const fullRange=observations[0].original.source;for(const fragment of ['pub struct RangeInclusive<Idx>','Self { start, end, exhausted: false }','<Self as RangeBounds<Idx>>::contains(self, item)'])assert.equal(fullRange.includes(fragment),true,fragment);
 const competitor='trait Competing{fn contains(self,item:&f64)->bool;}impl Competing for std::ops::RangeInclusive<f64>{fn contains(self,_item:&f64)->bool{false}}pub fn call(item:&f64)->bool{(0.0..=100.0).contains(item)}',competing=original(competitor,'Competing'),competingToken=issue(competing),competingQuery=originalTraitMethodQueryFacts(queryOriginalTraitMethodCandidates(competingToken,'contains'));assert.equal(competingQuery.members[0].receiver.kind,'value');assert.equal(competingQuery.completeOwnTraitMemberAbsence,false);assert.equal(competingQuery.receiverSearchOrderProved,false);observations.push({original:originalTraitMethodCandidateSource(competingToken),facts:originalTraitMethodCandidateFacts(competingToken),query:competingQuery});
 const range=observations[0].query.members[0].body.original;for(const fragment of ['Included(start) => start <= item','Excluded(start) => start < item','Unbounded => true','Included(end) => item <= end','Excluded(end) => item < end'])assert.equal(range.includes(fragment),true,fragment);
 retain('06-complete-actual-standard-inputs',observations);
});

test('qualifier generic-closer and source bounds stay explicit and opaque syntax never proves absence',{timeout:5000},()=>{
 const source='trait Other{const unsafe extern "C" fn qualified(&self)->bool{true}fn generic<T:Bound<Vec<Vec<u8>>>>(&self,arg:Result<Vec<u8>,u16>)->bool;const POINTER:fn()->bool=||{true};type Item;}',input=original(source),token=issue(input),facts=originalTraitMethodCandidateFacts(token);assert.deepEqual(facts.members.map(row=>row.name),['qualified','generic','POINTER','Item']);assert.equal(facts.members[1].parameters.length,2);assert.equal(facts.members[2].kind,'const');
 const oversized='trait Other{'+Array.from({length:TRAIT_METHOD_CANDIDATE_LIMITS.members+1},(_,index)=>`fn method${index}(&self);`).join('')+'}';assert.throws(()=>issue(original(oversized)),/member bound/);
 for(const source of ['trait Other=Alias;','trait Other{unknown!();}']){const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),view=captured.views[0],module={file:'src/lib.rs',source,path:[],compilationProfile:PRODUCTION_PROFILE,sourceView:view},item=originalSourceModuleItems(module)[0];if(source.includes('=Alias'))assert.throws(()=>issue({module,item}),TypeError);else{const candidate=issue({module,item});assert.equal(originalTraitMethodCandidateFacts(candidate).sourceWrittenCensusComplete,false);assert.throws(()=>proveOriginalTraitMethodAbsent(queryOriginalTraitMethodCandidates(candidate,'contains')),TypeError);}}
 retain('07-complete-qualifiers-and-limits',{source,facts,limits:TRAIT_METHOD_CANDIDATE_LIMITS});
});

test('candidate evidence preserves the checked serialized meta JS strict TS boundary without admitting range dispatch',{timeout:60000},async()=>{
 const source='trait Other{fn unrelated(&self)->bool;}pub fn available(value:i32)->bool{value>=0}',input=original(source),token=issue(input),proof=proveOriginalTraitMethodAbsent(queryOriginalTraitMethodCandidates(token,'contains')),result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});retain('08-whole-source-and-checked-meta',{source,facts:originalTraitMethodAbsenceFacts(proof),result});
 assert.equal(result.meta.sources[0].sha256,hash(source));assert.equal(result.meta.executable.some(row=>row.name==='available'),true);const observations=[];await verifyTypedTargets(result,api=>{observations.push([api.available(-1n),api.available(0n),api.available(1n)]);assert.deepEqual(observations.at(-1),[false,true,true]);},{childTimeoutMs:20000});assert.equal(observations.length,2);
 const range='pub fn blocked(value:&f64)->bool{(0.0..=100.0).contains(value)}',blocked=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>range,compilationProfile:PRODUCTION_PROFILE});assert.equal(blocked.meta.executable.some(row=>row.name==='blocked'),false);assert.equal(JSON.stringify(blocked.meta).includes('only bounded primitive integer ranges are lowered'),true);retain('08-typed-results-and-unchanged-range-refusal',{observations,range,blocked});
});
