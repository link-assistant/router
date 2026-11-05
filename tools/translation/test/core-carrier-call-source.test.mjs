// Independent qualified core-call composition SOURCE. Entire file UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rustTokens} from '../rust-structure.mjs';
import {proposeCoreTextMethodCorpus as ordinaryText} from '../migrate-core-text-methods.mjs';
import {proposeCoreTextMethodCorpus as boundText} from '../source-bound-owned-migrate-core-text-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as ordinaryOption} from '../migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as boundOption} from '../source-bound-owned-migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as ordinaryCallback} from '../migrate-core-primitive-option-callback-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as boundCallback} from '../source-bound-owned-migrate-core-primitive-option-callback-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../json-fields-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object,json_macro_u64 as unsigned,json_macro_i64 as signed} from '../json-macro-runtime.mjs';
import {readQualifiedSourceCallTokens} from '../qualified-source-call-tokens.mjs';
import {readCoreCarrierCallSource} from '../core-carrier-call-source.mjs';
import {prepareCoreCarrierCallSources} from '../prepare-core-carrier-call-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},T='crate::translation_core::Json',F='crate::translation_json_fields_core::',tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},bindings=new Map([['label',{kind:'payload',domain:'str'}],['owned',{kind:'payload',domain:'text-owned'}],['left',{kind:'option',domain:'u64'}],['right',{kind:'option',domain:'u64'}],['maybeText',{kind:'option',domain:'text-owned'}],['small',{kind:'payload',domain:'u8'}],['otherSmall',{kind:'payload',domain:'u8'}]]);
test('reusable language splitter retains nested arguments exact tokens and independent source-only status',limits,()=>{
 const input=tokens('crate::module::operation("λ,😀",nested(left,right),{[one,two]})'),result=readQualifiedSourceCallTokens(input);assert.deepEqual(result.path,['crate','module','operation']);assert.deepEqual(result.args.map(row=>row.map(token=>token.text).join('')),['"λ,😀"','nested(left,right)','{[one,two]}']);assert.strictEqual(result.args[0][0],input[result.open+1]);assert.equal(result.semanticAuthority,false);for(const source of ['value','crate::f(a,,b)','crate::f([a})','crate::f(a))','crate::f(a).next()','crate::f::<T>(a)'])assert.equal(readQualifiedSourceCallTokens(tokens(source)),null,source);
});
test('current integer text and Option calls derive exact roles with nested known calls constructors and explicit owned borrows',limits,()=>{
 const cases=[['crate::translation_text_core::to_owned(label)','payload','text-owned'],['crate::translation_text_core::trim(&owned)','payload','str'],['crate::translation_text_core::to_owned(crate::translation_text_core::trim(label))','payload','text-owned'],['crate::translation_text_core::strip_prefix(label,"é")','option','str'],['crate::translation_primitive_option_core::u64_or(left,right)','option','u64'],['crate::translation_primitive_option_core::text_owned_filter_nonempty(maybeText,true)','option','text-owned'],['crate::translation_primitive_option_core::text_owned_unwrap_or(maybeText,crate::translation_text_core::to_owned("fallback"))','payload','text-owned'],['crate::translation_primitive_option_core::text_owned_or(maybeText,Some(owned))','option','text-owned'],['crate::translation_primitive_option_core::u64_or(left,None)','option','u64'],['crate::translation_integer_core::u8_checked_add(crate::translation_integer_core::u8_saturating_add(small,otherSmall),1_u8)','option','u8']];for(const [source,kind,domain]of cases){const selected=readCoreCarrierCallSource(tokens(source),bindings);assert.equal(selected.kind,kind,source);assert.equal(selected.domain,domain,source);assert.equal(selected.executableAdmission,false);assert.equal(selected.semanticAuthority,false);}for(const source of ['crate::translation_text_core::to_owned(small)','crate::translation_text_core::trim(owned)','crate::translation_text_core::trim(effect())','crate::translation_text_core::to_owned(unknown)','other::translation_text_core::to_owned(label)','crate::translation_primitive_option_core::u64_or(left,maybeText)','crate::translation_primitive_option_core::text_owned_or(maybeText,Some(label))','crate::translation_integer_core::u8_checked_add(small,256)','crate::translation_integer_core::u8_checked_add(small,1_i8)','crate::translation_text_core::unknown(label)','crate::translation_text_core::to_owned(label,owned)'])assert.equal(readCoreCarrierCallSource(tokens(source),bindings),null,source);
});
const optionBodies=`pub fn joined(value:Option<u64>,other:Option<u64>)->u64{crate::translation_primitive_option_core::u64_or(value,other).unwrap_or(7)}
pub fn owning(value:Option<String>)->String{crate::translation_primitive_option_core::text_owned_filter_nonempty(value,true).unwrap_or_default()}
pub fn local_owning(value:Option<String>)->String{let selected=crate::translation_primitive_option_core::text_owned_filter_nonempty(value,false);selected.unwrap_or_default()}
pub fn stripped(value:&str)->String{crate::translation_text_core::strip_prefix(value,"é").unwrap_or(value).to_owned()}
pub fn nested(value:u8,other:u8)->u8{crate::translation_integer_core::u8_checked_add(crate::translation_integer_core::u8_saturating_add(value,other),1_u8).unwrap_or(7)}
`;
const textBodies=`pub fn copied(value:&str)->String{crate::translation_text_core::to_owned(value).trim().to_owned()}
pub fn local_copy(value:&str)->String{let selected=crate::translation_text_core::to_owned(value);selected.trim().to_owned()}
`;
const bodies=optionBodies+textBodies;
for(const [label,propose]of [['ordinary',ordinaryOption],['source-bound',boundOption],['ordinary callback',ordinaryCallback],['source-bound callback',boundCallback]])test(label+' composes all5 current helper result forms across original full source inverses',limits,()=>{
 const request=input(optionBodies),row=rejoin(propose(request),request.files['src/lib.rs']);for(const name of ['joined','owning','local_owning','stripped','nested'])assert.ok(row.selections.some(row=>row.function===name),name);assert.ok(row.selections.some(row=>row.localReceiverSource));for(const selection of row.selections){assert.equal(selection.executableAdmission,false);assert.equal(selection.oldTraitDispatchProved,false);}
});
for(const [label,propose]of [['ordinary',ordinaryText],['source-bound',boundText]])test(label+' text composes qualified owning calls and current immutable local results',limits,()=>{
 const request=input(textBodies),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,2);assert.ok(row.selections.some(row=>row.localReceiverSource));
});
test('actual consecutive Option and text stages emit all7 current source functions into independent JS and strict TS',limits,async()=>{
 const request=input(),first=await proposeSourceBoundOwnedCoreStage('primitive-option-methods',request),next={...request,files:first.after},second=await proposeSourceBoundOwnedCoreStage('text-methods',next),files=second.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.equal(api.joined(none,some(18446744073709551615n)),18446744073709551615n);assert.equal(api.joined(none,none),7n);assert.equal(api.owning(some('  ')),'');assert.equal(api.owning(some(' é😀 ')),' é😀 ');assert.equal(api.local_owning(some('  ')),'  ');assert.equal(api.stripped('é😀'),'😀');assert.equal(api.stripped('other'),'other');assert.equal(api.nested(255n,1n),7n);for(const name of ['copied','local_copy'])assert.equal(api[name](' é😀 '),'é😀');},{childTimeoutMs:20000});
});
test('eight complete source equations keep both extensible substitution phases and every original full inverse',limits,()=>{
 const plan=prepareCoreCarrierCallSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);assert.equal(transportConcreteSyntaxMeta(row.stages[0].afterMeta).source,row.language);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.semanticAuthority,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
