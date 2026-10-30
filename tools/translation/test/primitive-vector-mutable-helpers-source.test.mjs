// Independent actual native caller/body case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {requireOriginalJsonProjectionEmission,hasOriginalRouterCoreJsonProjection} from '../router-core-json-updates.mjs';
import {hostRuntimeAssets} from '../host-assets.mjs';
import {preparePrimitiveVectorMutableHelperSources} from '../prepare-primitive-vector-mutable-helpers-sources.mjs';
import {checkRouterPrimitiveVectorMutableHelperLet} from '../router-core-json-updates.mjs';
const limits={timeout:60000},namespace='crate::translation_primitive_vectors_core::',native=readFileSync(new URL('../../../rust/src/translation_primitive_vectors_core.rs',import.meta.url),'utf8'),sequence=readFileSync(new URL('../../../rust/src/translation_primitive_sequences_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
// Deliberately independent extrema, never read from translation rule/catalog DATA.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
function files(source,leaf=native,slice=sequence){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\npub mod translation_primitive_vectors_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_sequences_core.rs':slice,'src/translation_primitive_vectors_core.rs':leaf};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
for(const [domain,minimum,maximum]of domains)test(domain+' actual mutable helper initialization retains full native ownership graph',limits,async()=>{
 const type='::core::primitive::'+domain,v='::std::vec::Vec<'+type+'>',n=op=>namespace+'vec_'+domain+'_'+op,text=`
fn seed(value:${type})->${v}{${n('from_slice')}(&[value])}
fn middle(value:${type})->${v}{seed(value)}
fn copy_slice(values:&[${type}])->${v}{${n('from_slice')}(values)}
fn bounded(input:${v})->${v}{let values=${n('truncate')}(input,18446744073709551615_u64);values}
pub fn unchanged(value:${type})->${v}{let mut values=middle(value);values}
pub fn grown(value:${type})->${v}{let mut values=middle(value);values=${n('push')}(values,value);values}
pub fn counted(value:${type},limit: ::core::primitive::u64)->${v}{let mut values=middle(value);for index in 0_u64..limit{values=${n('push')}(values,value);}values}
pub fn copied(values:&[${type}])->${v}{let mut result=copy_slice(values);result}
pub fn through_owned(value:${type})->${v}{let mut result=bounded(seed(value));result=${n('push')}(result,value);result}
pub fn helper_only(value:${type})->${v}{let mut values=middle(value);let moved=values;values=middle(value);values}`;
 const result=project(files(text));for(const name of ['seed','middle','copy_slice','bounded','unchanged','grown','counted','copied','through_owned','helper_only'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{for(const value of [minimum,maximum]){assert.deepEqual(api.unchanged(value),[value]);assert.deepEqual(api.helper_only(value),[value]);assert.deepEqual(api.grown(value),[value,value]);assert.deepEqual(api.through_owned(value),[value,value]);for(const count of [0n,1n,3n])assert.deepEqual(api.counted(value,count),Array(1+Number(count)).fill(value));const original=Object.freeze([value,value]),copy=api.copied(original);assert.deepEqual(copy,original);assert.notStrictEqual(copy,original);assert.ok(Object.isFrozen(copy));}},{childTimeoutMs:20000});
});
test('mutable helper selection cannot bypass source body, move, entry guard, recursion or module refusals',limits,()=>{
 const t='::core::primitive::u8',v='::std::vec::Vec<'+t+'>',n=op=>namespace+'vec_u8_'+op,seed='fn seed(value:'+t+')->'+v+'{'+n('push')+'('+n('new')+'(),value)}';
 for(const body of [
  'let mut values=seed(value);let alias=values;values='+n('push')+'(values,value);alias',
  'let mut values=seed(value);let alias=values;values='+n('append')+'(values,alias);values',
  'let mut values=seed(value);values='+n('append')+'(values,values);values',
  'let mut values=seed(value);for index in 0_u64..limit{let moved='+n('push')+'(values,value);}values',
 ])assert.equal(admitted(project(files(seed+'pub fn bad(value:'+t+',limit: ::core::primitive::u64)->'+v+'{'+body+'}')),'bad'),false);
 for(const helper of ['fn seed(value:'+t+')->'+v+'{seed(value)}','fn seed(value:'+t+')->'+v+'{vec![value]}'])assert.equal(admitted(project(files(helper+'pub fn bad(value:'+t+')->'+v+'{let mut values=seed(value);values}')),'bad'),false);
 const unbounded='fn identity(values:'+v+')->'+v+'{values}'+seed+'pub fn bad(value:'+t+')->'+v+'{let mut values=identity(seed(value));values}';assert.equal(admitted(project(files(unbounded)),'bad'),false);
 const foreign='mod other{pub fn seed(value:'+t+')->'+v+'{'+n('push')+'('+n('new')+'(),value)}}pub fn bad(value:'+t+')->'+v+'{let mut values=other::seed(value);values}';assert.equal(admitted(project(files(foreign)),'bad'),false);
 assert.equal(checkRouterPrimitiveVectorMutableHelperLet({}, {k:'let',mutable:true,value:{k:'app',fn:{k:'name',path:['seed']}}},new Map(),[],undefined,false),null);
});
test('mutable helper callers rejoin current paired source and keep counterfeit emission refused',limits,()=>{const text='fn seed(value: ::core::primitive::u8)->::std::vec::Vec<::core::primitive::u8>{'+namespace+'vec_u8_push('+namespace+'vec_u8_new(),value)}pub fn caller(value: ::core::primitive::u8)->::std::vec::Vec<::core::primitive::u8>{let mut values=seed(value);values}';assert.equal(admitted(project(files(text,native+'\n// changed current source\n')),'caller'),false);const fake={k:'routerHostCall',id:'router_vec_u8_new',args:[],type:{kind:'array'},compatibilityCore:{sourceProjectionKey:'counterfeit'}};assert.equal(hasOriginalRouterCoreJsonProjection(fake),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},fake),/rechecked actual source function/u);});
test('three complete mutable helper source equations retain exact before/after inverses and both phases',limits,()=>{const plan=preparePrimitiveVectorMutableHelperSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
