// Independent qualified scalar carrier source cases. SOURCE ONLY; UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE,readFixedTypeCoreWrittenSourceRole} from '../fixed-type-core-source.mjs';
import {readPrimitiveCoreParameterSourceRole} from '../primitive-core-call-source.mjs';
import {readPrimitiveWrittenAliasDomain} from '../primitive-local-argument-source.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../owned-result-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {prepareFixedTypeCarrierSources} from '../prepare-fixed-type-carrier-sources.mjs';
const limits={timeout:60000},C='crate::translation_fixed_types_core::';
const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
import {proposeCorePrimitiveOptionMethodCorpus as ordinary0} from '../migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as bound0} from '../source-bound-owned-migrate-core-primitive-option-methods.mjs';
function files0(body=''){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_option_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE};}
import {proposeCorePrimitiveOptionCallbackMethodCorpus as ordinary1} from '../migrate-core-primitive-option-callback-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as bound1} from '../source-bound-owned-migrate-core-primitive-option-callback-methods.mjs';
function files1(caller=''){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_option_core;\npub mod translation_primitive_option_callbacks_core;\n'+caller,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE,'src/translation_primitive_option_callbacks_core.rs':PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE};}
import {proposeCorePrimitiveResultMethodCorpus as ordinary2} from '../migrate-core-primitive-result-methods.mjs';
import {proposeCorePrimitiveResultMethodCorpus as bound2} from '../source-bound-owned-migrate-core-primitive-result-methods.mjs';
function files2(caller=''){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_results_core;\n'+caller,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE};}
import {proposeCoreOwnedResultMethodCorpus as ordinary3} from '../migrate-core-owned-result-methods.mjs';
import {proposeCoreOwnedResultMethodCorpus as bound3} from '../source-bound-owned-migrate-core-owned-result-methods.mjs';
function files3(caller=''){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_results_core;\npub mod translation_owned_results_core;\n'+caller,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_results_core.rs':PRIMITIVE_RESULT_NATIVE_SOURCE,'src/translation_owned_results_core.rs':OWNED_RESULT_NATIVE_SOURCE};}
function inverse(result){for(const row of result.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let undone=row.after.source;for(const edit of [...row.mapping].reverse())if(edit.kind==='substitution'){assert.equal(undone.slice(...edit.after),edit.replacement);undone=undone.slice(0,edit.after[0])+edit.expected+undone.slice(edit.after[1]);}assert.equal(undone,row.before.source);assert.equal(row.executableAdmission,false);}}
const some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const families=[
{name:"primitive-option-method",apis:[ordinary0,bound0],files:files0,body:"pub fn fallback(value:Option<crate::translation_fixed_types_core::U64>)->crate::translation_fixed_types_core::U64{value.unwrap_or(9_u64)}\npub fn chosen(left:Option<crate::translation_fixed_types_core::Bool>,right:Option<crate::translation_fixed_types_core::Bool>)->Option<crate::translation_fixed_types_core::Bool>{left.and(right)}"},
{name:"primitive-option-callback-method",apis:[ordinary1,bound1],files:files1,body:"pub fn identity(value:Option<crate::translation_fixed_types_core::U64>)->Option<crate::translation_fixed_types_core::U64>{value.map(|item|item)}\npub fn bound(value:Option<crate::translation_fixed_types_core::I64>)->Option<crate::translation_fixed_types_core::I64>{value.and_then(|item|Some(item))}"},
{name:"primitive-result-method",apis:[ordinary2,bound2],files:files2,body:"pub fn fallback(value:Result<crate::translation_fixed_types_core::U64,String>)->crate::translation_fixed_types_core::U64{value.unwrap_or(0_u64)}\npub fn success(value:Result<crate::translation_fixed_types_core::Bool,String>)->crate::translation_fixed_types_core::Bool{value.is_ok()}"},
{name:"owned-result-method",apis:[ordinary3,bound3],files:files3,body:"pub fn changed(value:Result<String,String>,flag:crate::translation_fixed_types_core::Bool)->Result<crate::translation_fixed_types_core::Bool,String>{value.map(|item|flag)}\npub fn fallback(value:Result<crate::translation_fixed_types_core::Bool,String>)->crate::translation_fixed_types_core::Bool{value.unwrap_or(false)}"},

];
for(const family of families)for(const [index,propose]of family.apis.entries())test(family.name+' API '+index+' retains qualified scalar roles through complete actual method adoption and fresh JS/strict TS checking',limits,async()=>{
 const files=family.files(family.body);files['src/lib.rs']='pub mod translation_fixed_types_core;\n'+files['src/lib.rs'];files['src/translation_fixed_types_core.rs']=FIXED_TYPE_CORE_NATIVE_SOURCE;const proposal=propose({entry:'src/lib.rs',files,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE}),root=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(root.selections.length,2);assert.equal(proposal.after['src/translation_fixed_types_core.rs'],FIXED_TYPE_CORE_NATIVE_SOURCE);inverse(proposal);const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),compilationProfile:PRODUCTION_PROFILE});await verifyTypedTargets(result,api=>{
  if(family.name==='primitive-option-method'){assert.equal(api.fallback(none),9n);assert.equal(api.fallback(some(18446744073709551615n)),18446744073709551615n);assert.deepEqual(api.chosen(some(true),some(false)),some(false));assert.deepEqual(api.chosen(none,some(true)),none);}
  else if(family.name==='primitive-option-callback-method'){for(const value of [none,some(0n),some(18446744073709551615n)])assert.deepEqual(api.identity(value),value);for(const value of [none,some(-9223372036854775808n),some(9223372036854775807n)])assert.deepEqual(api.bound(value),value);}
  else if(family.name==='primitive-result-method'){assert.equal(api.fallback(err('oops')),0n);assert.equal(api.fallback(ok(18446744073709551615n)),18446744073709551615n);assert.equal(api.success(ok(false)),true);assert.equal(api.success(err('oops')),false);}
  else {assert.deepEqual(api.changed(ok('payload'),false),ok(false));assert.deepEqual(api.changed(err('oops'),true),err('oops'));assert.equal(api.fallback(ok(true)),true);assert.equal(api.fallback(err('oops')),false);}
 },{childTimeoutMs:20000});
});
test('all closed fixed carrier roles are recognized while extra paths and unsupported float carriers remain refused',limits,()=>{
 for(const [name,domain]of [['U8','u8'],['U16','u16'],['U32','u32'],['U64','u64'],['U128','u128'],['I8','i8'],['I16','i16'],['I32','i32'],['I64','i64'],['I128','i128'],['Bool','bool']]){assert.equal(readFixedTypeCoreWrittenSourceRole(C+name),domain);for(const wrapper of ['Option','::std::option::Option','core::option::Option','crate::translation_core::Maybe'])assert.equal(readPrimitiveCoreParameterSourceRole(rustTokens(wrapper+'<'+C+name+'>')),'option:'+domain);assert.equal(readPrimitiveCoreParameterSourceRole(rustTokens('Result<'+C+name+',String>')),'result:'+domain);if(domain!=='bool')assert.equal(readPrimitiveWrittenAliasDomain([{text:C+name}]),domain);}
 for(const source of [C+'Unknown',C+'U64::Other','other::U64','::'+C+'U64',C+'U64<u8>'])assert.equal(readFixedTypeCoreWrittenSourceRole(source),null);assert.equal(readPrimitiveCoreParameterSourceRole(rustTokens('Option<'+C+'F64>')),null);assert.equal(readPrimitiveCoreParameterSourceRole(rustTokens('Result<'+C+'F64,String>')),null);assert.equal(readPrimitiveCoreParameterSourceRole(rustTokens('Result<'+C+'U64,u64>')),null);
});
test('eight complete compiler source equations retain source owners two phases and full original inverses',limits,()=>{const plan=prepareFixedTypeCarrierSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
