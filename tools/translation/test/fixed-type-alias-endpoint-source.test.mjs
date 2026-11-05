// Independent genuine paired alias endpoint source. SOURCE ONLY; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {proposeCoreFixedTypesCorpus as ordinary} from '../migrate-core-fixed-types.mjs';
import {proposeCoreFixedTypesCorpus as bound} from '../source-bound-owned-migrate-core-fixed-types.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE} from '../fixed-type-core-source.mjs';
import {originalFixedTypeAliasEndpoint} from '../fixed-type-alias-endpoint-source.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareFixedTypeAliasEndpointSources} from '../prepare-fixed-type-alias-endpoint-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::',aliases=[['u8','U8'],['u16','U16'],['u32','U32'],['u64','U64'],['u128','U128'],['i8','I8'],['i16','I16'],['i32','I32'],['i64','I64'],['i128','I128'],['bool','Bool'],['f64','F64']];
const source=aliases.map(([type,name])=>'pub type First'+name+'='+C+name+';pub type Second'+name+'=First'+name+';pub fn identity_'+type+'(value:Second'+name+')->Second'+name+'{value}').join('\n');
function fixture(body=source,{native=FIXED_TYPE_CORE_NATIVE_SOURCE,declaration='pub mod translation_fixed_types_core;\n'}={}){const files={'src/lib.rs':declaration+body,'src/translation_fixed_types_core.rs':native};return {entry:'src/lib.rs',files};}
function translate(input){return translateProject({entry:input.entry,paths:Object.keys(input.files),readSource:path=>input.files[path]});}
test('all twelve scalar endpoints resolve through two genuine original monomorphic aliases and retain whole checked meta and JS/strict TS domains',limits,async()=>{
 const result=translate(fixture()),wire=JSON.stringify(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);assert.equal(result.meta.executable.filter(row=>row.name.startsWith('identity_')).length,12);await verifyTypedTargets(result,api=>{for(const [type]of aliases){if(type==='bool'){assert.equal(api.identity_bool(false),false);assert.equal(api.identity_bool(true),true);continue;}if(type==='f64'){for(const value of [NaN,-0,0,Infinity,-Infinity,Number.MIN_VALUE])assert.ok(Object.is(api.identity_f64(value),value));continue;}const bits=BigInt(type.slice(1)),signed=type[0]==='i',min=signed?-(1n<<(bits-1n)):0n,max=(1n<<(signed?bits-1n:bits))-1n;for(const value of [min,0n,1n,max])assert.equal(api['identity_'+type](value),value);assert.throws(()=>api['identity_'+type](min-1n));assert.throws(()=>api['identity_'+type](max+1n));assert.throws(()=>api['identity_'+type](1));}},{childTimeoutMs:20000});
});
for(const [label,propose]of [['ordinary',ordinary],['source-bound',bound]])test(label+' actual bare alias declaration adoption remains usable as a user-facing source type through the protected endpoint',limits,async()=>{
 const input=fixture('pub type Count=u64;pub type Total=Count;pub fn identity(value:Total)->Total{value}'),proposal=propose(input);assert.ok(proposal.after[input.entry].includes('pub type Count='+C+'U64;'));const result=translate({...input,files:proposal.after});await verifyTypedTargets(result,api=>{for(const value of [0n,1n,18446744073709551615n])assert.equal(api.identity(value),value);},{childTimeoutMs:20000});
});
test('unresolved caller alias scopes cycles missing native edges and changed native source remain refused despite lexical qualified endpoints',limits,()=>{
 for(const body of ['unknown!();'+source,'pub type LoopA=LoopB;pub type LoopB=LoopA;pub fn identity(value:LoopA)->LoopA{value}','pub type Generic<T>=T;pub fn identity(value:Generic<u64>)->Generic<u64>{value}']){const result=translate(fixture(body));assert.equal(result.meta.executable.some(row=>row.name==='identity'||row.name.startsWith('identity_')),false);}for(const options of [{native:FIXED_TYPE_CORE_NATIVE_SOURCE+'\n'},{declaration:''},{declaration:'#[cfg(all())]pub mod translation_fixed_types_core;\n'}]){const result=translate(fixture(source,options));assert.equal(result.meta.executable.some(row=>row.name.startsWith('identity_')),false);}assert.throws(()=>originalFixedTypeAliasEndpoint({},['crate','translation_fixed_types_core','U64'],{start:0,end:1}));assert.equal(originalFixedTypeAliasEndpoint({},['other','U64'],{start:0,end:1}),null);
});
test('three complete compiler equations retain source owners CST both phases and full original inverses',limits,()=>{const plan=prepareFixedTypeAliasEndpointSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
