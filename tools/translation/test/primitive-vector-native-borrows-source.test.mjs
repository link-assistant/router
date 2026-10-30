// Independent actual native caller/body case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {OwnershipChecker} from '../extensions/ownership.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {requireOriginalJsonProjectionEmission,hasOriginalRouterCoreJsonProjection} from '../router-core-json-updates.mjs';
import {hostRuntimeAssets} from '../host-assets.mjs';
import {preparePrimitiveVectorNativeBorrowSources} from '../prepare-primitive-vector-native-borrows-sources.mjs';
import {checkRouterPrimitiveVectorSharedHelperBorrow,qualifyRouterPrimitiveVectorSharedHelperBorrow} from '../router-core-json-updates.mjs';
const limits={timeout:60000},namespace='crate::translation_primitive_vectors_core::',native=readFileSync(new URL('../../../rust/src/translation_primitive_vectors_core.rs',import.meta.url),'utf8'),sequence=readFileSync(new URL('../../../rust/src/translation_primitive_sequences_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
// Deliberately independent extrema, never read from translation rule/catalog DATA.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
function files(source,leaf=native,slice=sequence){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\npub mod translation_primitive_vectors_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_sequences_core.rs':slice,'src/translation_primitive_vectors_core.rs':leaf};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
function callers(domain){const t='::core::primitive::'+domain,v='::std::vec::Vec<'+t+'>',n=op=>namespace+'vec_'+domain+'_'+op;return `
fn seed(value:${t})->${v}{${n('from_slice')}(&[value])}
pub fn helper_count(input:&${v})->::core::primitive::u64{let checked=${n('len')}(input);${n('len')}(input)}
pub fn helper_read(input:&${v},index: ::core::primitive::u64)->Option<${t}>{let checked=${n('len')}(input);${n('get')}(input,index)}
pub fn pair_count(left:&${v},right:&${v})->::core::primitive::u64{let first_checked=${n('len')}(left);let second_checked=${n('len')}(right);${n('len')}(left)+${n('len')}(right)}
pub fn after_borrow(value:${t})->${v}{let values=seed(value);let count=helper_count(&values);let pair=pair_count(&values,&values);let first=helper_read(&values,0_u64);${n('push')}(values,value)}
pub fn temporary(value:${t})->::core::primitive::u64{helper_count(&seed(value))}
pub fn copied(value:${t})->Option<${t}>{let values=seed(value);helper_read(&values,0_u64)}
pub fn nested_reads(value:${t})->Option<${t}>{let values=seed(value);helper_read(&values,helper_count(&values))}
pub fn after_write(value:${t})->${v}{let mut values=seed(value);let count=helper_count(&values);values=${n('push')}(values,value);values}`;}
for(const [domain,minimum,maximum]of domains)test(domain+' actual ordinary shared Vec helper borrows remain live only during the call',limits,async()=>{
 const result=project(files(callers(domain)));for(const name of ['seed','helper_count','helper_read','pair_count','after_borrow','temporary','copied','nested_reads','after_write'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const value of [minimum,maximum]){assert.deepEqual(api.after_borrow(value),[value,value]);assert.deepEqual(api.after_write(value),[value,value]);assert.equal(api.temporary(value),1n);assert.deepEqual(api.copied(value),{$:'Some',field0:value});assert.deepEqual(api.nested_reads(value),{$:'None'});const input=Object.freeze([minimum,maximum]);assert.equal(api.helper_count(input),2n);assert.equal(api.pair_count(input,input),4n);assert.deepEqual(api.helper_read(input,1n),{$:'Some',field0:maximum});assert.throws(()=>api.helper_count([value]));assert.throws(()=>api.helper_count(Object.freeze(Array(4097).fill(value))));}},{childTimeoutMs:20000});
});
test('the full native call interval rejects later move or replacement even if availability is restored',limits,()=>{
 const n=op=>namespace+'vec_u8_'+op,v='::std::vec::Vec<::core::primitive::u8>',base=callers('u8'),header='pub fn bad(value: ::core::primitive::u8)->Option<::core::primitive::u8>{let mut values=seed(value);';
 for(const tail of [
  'helper_read(&values,{let moved='+n('push')+'(values,value);0_u64})',
  'helper_read(&values,{values='+n('push')+'(values,value);0_u64})',
  'helper_read(&values,{values='+n('new')+'();0_u64})',
  'helper_read(&values,{let moved='+n('push')+'(values,value);values='+n('new')+'();0_u64})',
  n('get')+'(&values,{values='+n('new')+'();0_u64})',
  n('get')+'(&values,{let moved='+n('push')+'(values,value);values='+n('new')+'();0_u64})',
 ])assert.equal(admitted(project(files(base+header+tail+'}')),'bad'),false);
 const escape=base+'pub fn bad(value: ::core::primitive::u8)->&'+v+'{let values=seed(value);&values}';assert.equal(admitted(project(files(escape)),'bad'),false);
 const alias=base+'pub fn bad(value: ::core::primitive::u8)->::core::primitive::u64{let values=seed(value);let alias=&values;helper_count(alias)}';assert.equal(admitted(project(files(alias)),'bad'),false);
 for(const borrow of ['&mut values','&&values'])assert.equal(admitted(project(files(base+'pub fn bad(value: ::core::primitive::u8)->::core::primitive::u64{let values=seed(value);helper_count('+borrow+')}')),'bad'),false);
 const missing=base.replace('let checked='+n('len')+'(input);'+n('len')+'(input)',n('len')+'(input)');assert.equal(admitted(project(files(missing)),'after_borrow'),false);
});
test('explicit borrow source and result adapters cannot issue outside their actual original checker frame',limits,()=>{const node={k:'routerTextReference',value:{k:'name',path:['values']},sourceBorrowToken:{value:'&',span:{start:0,end:1}},span:{start:0,end:7}},type={kind:'array',rustReference:{kind:'shared',pointee:{kind:'array'}}};assert.equal(checkRouterPrimitiveVectorSharedHelperBorrow({},node,new Map(),[],type),null);assert.equal(qualifyRouterPrimitiveVectorSharedHelperBorrow({},node,{...node,type},type,[]),null);assert.equal(hasOriginalRouterCoreJsonProjection({k:'routerHostCall',id:'router_vec_u8_len',args:[],compatibilityCore:{sourceProjectionKey:'counterfeit'}}),false);});
test('native shared helper borrowers still rejoin all current paired sources',limits,()=>{const text=callers('u8');assert.equal(admitted(project(files(text,native+'\n// changed implementation\n')),'after_borrow'),false);assert.equal(admitted(project(files(text,native,sequence+'\n// changed dependency\n')),'after_borrow'),false);});
test('four complete native helper borrow source equations keep complete originals both phases and exact inverses',limits,()=>{const plan=preparePrimitiveVectorNativeBorrowSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});

test('the original generic ownership qualifier still refuses marker-only array borrows',limits,()=>{const node={k:'routerTextReference',span:{start:0,end:1}},type={kind:'array',rustOwnership:{kind:'owned',source:'Vec'},element:{kind:'bool'},rustSourceType:true,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:{kind:'array',element:{kind:'bool'}}}};assert.throws(()=>OwnershipChecker.prototype.qualifyOwnershipResult.call({},node,{...node,type,verified:true},type,[]),/explicit ownership borrow/u);});
