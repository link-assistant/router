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
import {preparePrimitiveVectorLiteralForwardSources} from '../prepare-primitive-vector-literal-forward-sources.mjs';
const limits={timeout:60000},namespace='crate::translation_primitive_vectors_core::',native=readFileSync(new URL('../../../rust/src/translation_primitive_vectors_core.rs',import.meta.url),'utf8'),sequence=readFileSync(new URL('../../../rust/src/translation_primitive_sequences_core.rs',import.meta.url),'utf8'),dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
// Deliberately independent extrema, never read from translation rule/catalog DATA.
const domains=[['bool',false,true],['u8',0n,255n],['i8',-128n,127n],['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n]];
function files(source,leaf=native,slice=sequence){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_sequences_core;\npub mod translation_primitive_vectors_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_sequences_core.rs':slice,'src/translation_primitive_vectors_core.rs':leaf};}
function project(input){return translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});}
const admitted=(result,name)=>result.meta.executable.some(row=>row.name===name);
// Independently written expectations. Runtime wrappers and shape DATA do not
// generate these function bodies, bounds or assertions. Execution remains UNRUN.
function caller(domain){const t='::core::primitive::'+domain,v='::std::vec::Vec<'+t+'>',n=op=>namespace+'vec_'+domain+'_'+op;return `
pub fn empty()->${v}{${n('from_slice')}(&[])}
pub fn one(value:${t})->${v}{${n('from_slice')}(&[value])}
pub fn pair(first:${t},second:${t})->${v}{${n('from_slice')}(&[first,second])}
pub fn nested(first:${t},second:${t})->${v}{${n('push')}(${n('from_slice')}(&[first]),second)}
pub fn count(first:${t},second:${t})->::core::primitive::u64{let values=${n('from_slice')}(&[first,second]);${n('len')}(&values)}
pub fn element(first:${t},second:${t},index: ::core::primitive::u64)->Option<${t}>{let values=${n('from_slice')}(&[first,second]);${n('get')}(&values,index)}
pub fn rebound(first:${t},second:${t})->${v}{let mut values=${n('from_slice')}(&[first]);values=${n('push')}(values,second);values}
pub fn helper(first:${t},second:${t})->${v}{pair(first,second)}
pub fn sixty_four(value:${t})->${v}{${n('from_slice')}(&[${Array(64).fill('value').join(',')}])}`;}
for(const [domain,minimum,maximum]of domains)test(domain+' literal caller complete native/private emission and strict targets',limits,async()=>{
 const result=project(files(caller(domain)));for(const name of ['empty','one','pair','nested','count','element','rebound','helper','sixty_four'])assert.equal(admitted(result,name),true,JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{const first=minimum,second=maximum;assert.deepEqual(api.empty(),[]);assert.notStrictEqual(api.empty(),api.empty());assert.deepEqual(api.one(first),[first]);for(const method of ['pair','nested','rebound','helper']){const value=api[method](first,second);assert.deepEqual(value,[first,second]);assert.equal(Object.isFrozen(value),true);}assert.equal(api.count(first,second),2n);assert.deepEqual(api.element(first,second,0n),{$:'Some',field0:first});assert.deepEqual(api.element(first,second,1n),{$:'Some',field0:second});assert.deepEqual(api.element(first,second,2n),{$:'None'});assert.deepEqual(api.sixty_four(first),Array(64).fill(first));if(domain!=='bool')assert.throws(()=>api.one(typeof maximum==='bigint'?maximum+1n:maximum+1));else assert.throws(()=>api.one(1));},{childTimeoutMs:20000});
});
test('literal call preserves source arity, domain and move refusals',limits,()=>{
 const n=op=>namespace+'vec_u8_'+op,v='::std::vec::Vec<::core::primitive::u8>';
 for(const source of [
  'pub fn bad(value: ::core::primitive::u8)->'+v+'{'+n('from_slice')+'(&['+Array(65).fill('value').join(',')+'])}',
  'pub fn bad(value: ::core::primitive::i8)->'+v+'{'+n('from_slice')+'(&[value])}',
  'pub fn bad(value: ::core::primitive::u8)->'+v+'{'+n('from_slice')+'(&mut [value])}',
  'pub fn bad(value: ::core::primitive::u8)->'+v+'{'+n('from_slice')+'([value])}',
  'pub fn bad(value: ::core::primitive::u8)->'+v+'{'+n('from_slice')+'(&[value;2])}',
  'pub fn bad(value: ::core::primitive::u8)->::core::primitive::u64{let values='+n('from_slice')+'(&[value]);let moved='+n('push')+'(values,value);'+n('len')+'(&values)}',
 ])assert.equal(admitted(project(files(source)),'bad'),false);
});
test('literal parent source joins and private projection cannot be counterfeited',limits,()=>{
 const source=caller('u8');assert.equal(admitted(project(files(source,native+'\n// changed source\n')),'pair'),false);assert.equal(admitted(project(files(source,native,sequence+'\n// changed source\n')),'pair'),false);
 const value={k:'routerHostCall',id:'router_vec_u8_literal',args:[],type:{kind:'array'},compatibilityCore:{id:'router-primitive-owned-vector-v1',sourceProjectionKey:'counterfeit',boundedProjection:true,runtimeParity:true}};assert.equal(hasOriginalRouterCoreJsonProjection(value),false);assert.throws(()=>requireOriginalJsonProjectionEmission({},value),/rechecked actual source function/u);
});
test('literal host assets include both actual paired sources',limits,()=>{const assets=hostRuntimeAssets();for(const name of ['primitive-vector-literal-runtime.mjs','primitive-vector-literal-runtime.d.mts','primitive-owned-vector-runtime.mjs','primitive-owned-vector-runtime.d.mts'])assert.equal(assets.get(name),readFileSync(new URL('../extensions/'+name,import.meta.url),'utf8'));});
test('five whole literal-forward source equations retain complete inverses and fixed phases',limits,()=>{const plan=preparePrimitiveVectorLiteralForwardSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
