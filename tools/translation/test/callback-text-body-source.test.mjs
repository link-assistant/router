// Independent callback body text lowering SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import * as option from '../primitive-option-runtime.mjs';
import {PRIMITIVE_OPTION_CONTRACTS,emitPrimitiveOptionDeclarations} from '../primitive-option-contracts.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as ordinary} from '../migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as sourceBound} from '../source-bound-owned-migrate-core-primitive-option-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as ordinaryCallback} from '../migrate-core-primitive-option-callback-methods.mjs';
import {proposeCorePrimitiveOptionCallbackMethodCorpus as sourceCallback} from '../source-bound-owned-migrate-core-primitive-option-callback-methods.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {rustTokens} from '../rust-structure.mjs';
import * as callback from '../primitive-option-callback-runtime.mjs';
import {PRIMITIVE_OPTION_CALLBACK_CONTRACTS,emitPrimitiveOptionCallbackDeclarations} from '../primitive-option-callback-contracts.mjs';
import {proposeCallbackTextBodySource} from '../callback-text-body-source.mjs';
import {prepareCallbackTextBodySources} from '../prepare-callback-text-body-sources.mjs';
import {readCoreCarrierCallSource} from '../core-carrier-call-source.mjs';
import {readParenthesizedSourceOperandTokens} from '../qualified-source-call-tokens.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},some=field0=>({$:'Some',field0}),none={$:'None'},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),scope=new Map([['item',{kind:'payload',domain:'text-owned'}],['label',{kind:'payload',domain:'str'}]]);
function restored(proposal){let source=proposal.after.source;for(const row of [...proposal.mapping].reverse())if(row.kind==='substitution')source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);assert.equal(source,proposal.before.source);assert.equal(transportConcreteSyntaxMeta(proposal.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(proposal.after.meta).source,proposal.after.source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);assert.equal(proposal.wrapper.functionOwnerProved,false);assert.equal(proposal.wrapper.temporaryTypesAreSourceData,true);assert.equal(proposal.executableAdmission,false);return proposal;}
test('complete original Unicode callback expressions blocks locals and char patterns reuse the original text engine and preserve exact inverses',limits,()=>{
 for(const body of ['item.trim().to_owned()','item.is_empty()','item.trim().len() as u64',"item.contains('é')",'{/* Ω😀 exact comment */ let cleaned=item.trim().to_owned();Some(cleaned)}','{let cleaned=item.trim().to_owned();return Some(cleaned);}','label.trim().to_owned()']){const proposal=restored(proposeCallbackTextBodySource(body,scope));assert.ok(proposal.edits.length);assert.ok(proposal.after.source.includes('crate::translation_text_core::'));for(const row of proposal.edits){assert.equal(body.slice(...row.span),row.expected);assert.equal(row.span[1]<=body.length,true);}if(body.includes('Ω😀'))assert.ok(proposal.after.source.includes('/* Ω😀 exact comment */'));}assert.equal(proposeCallbackTextBodySource('unknown.trim()',scope),null);assert.equal(proposeCallbackTextBodySource('item.custom()',scope),null);assert.equal(proposeCallbackTextBodySource('0',scope),null);assert.equal(proposeCallbackTextBodySource('item.trim()',new Map()),null);assert.equal(proposeCallbackTextBodySource('x'.repeat(65537),scope),null);
});
test('grouped source operands keep exact native roles and refuse mutable references mismatches and extra suffixes',limits,()=>{
 assert.equal(readCoreCarrierCallSource(tokens('crate::translation_text_core::is_empty(&(item))'),scope).domain,'bool');assert.equal(readCoreCarrierCallSource(tokens('crate::translation_text_core::to_owned(crate::translation_text_core::trim(&(item)))'),scope).domain,'text-owned');assert.deepEqual(readParenthesizedSourceOperandTokens(tokens('(item)')).map(row=>row.text),['item']);for(const source of ['(item)+(other)','()','(item]'])assert.equal(readParenthesizedSourceOperandTokens(tokens(source)),null);for(const source of ['crate::translation_text_core::trim(&mut item)','crate::translation_text_core::trim(&(missing))','crate::translation_text_core::trim(&(true))','crate::translation_text_core::trim(&(item)+other)'])assert.equal(readCoreCarrierCallSource(tokens(source),scope),null);
});
const bodies=`pub fn cleaned(value:Option<String>)->Option<String>{value.map(|item|item.trim().to_owned())}
pub fn present(value:Option<String>)->Option<bool>{value.map(|item|item.is_empty())}
pub fn length(value:Option<String>)->Option<u64>{value.map(|item|item.trim().len() as u64)}
pub fn contains(value:Option<String>)->Option<bool>{value.map(|item|item.contains('é'))}
pub fn local(value:Option<String>)->Option<String>{value.and_then(|item|{let cleaned=item.trim().to_owned();Some(cleaned)})}
pub fn returned(value:Option<String>)->Option<String>{value.and_then(|item|{let cleaned=item.trim().to_owned();return Some(cleaned);})}
pub fn defaulted(value:Option<String>)->String{value.map(|item|item.trim().to_owned()).unwrap_or_default()}
pub fn recovered(value:Option<String>,label:&str)->String{value.unwrap_or_else(||label.trim().to_owned())}
pub fn alternative(value:Option<String>,label:&str)->Option<String>{value.or_else(||Some(label.trim().to_owned()))}
`;
for(const [label,propose]of [['ordinary callback',ordinaryCallback],['source-bound callback',sourceCallback]])test(label+' lowers all9 original callback methods and retains child and whole-parent source inverses',limits,()=>{
 const request=input(bodies,true),proposal=propose(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,9);for(const selection of row.selections){assert.equal(selection.executableAdmission,false);assert.equal(selection.oldTraitDispatchProved,false);assert.ok(selection.callbackTextSourceHistories.length);for(const child of selection.callbackTextSourceHistories)restored(child);}assert.ok(row.after.source.includes('crate::translation_text_core::'));assert.equal(row.trace[0].phase,'language');assert.equal(row.trace[1].phase,'repository');
});
test('actual callback bulk emits original unqualified text bodies and locals into independent JS and strict TS',limits,async()=>{
 const request=input(bodies,true),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const name of ['cleaned','local','returned']){assert.deepEqual(api[name](some(' é😀 ')),some('é😀'));assert.deepEqual(api[name](none),none);}assert.deepEqual(api.present(some('')),some(true));assert.deepEqual(api.length(some(' é😀 ')),some(6n));assert.deepEqual(api.contains(some('é😀')),some(true));assert.equal(api.defaulted(none),'');assert.equal(api.defaulted(some(' é😀 ')),'é😀');assert.equal(api.recovered(none,' é😀 '),'é😀');assert.equal(api.recovered(some(''),'unselected'),'');assert.deepEqual(api.alternative(none,' é😀 '),some('é😀'));assert.deepEqual(api.alternative(some(''),'unselected'),some(''));},{childTimeoutMs:20000});
});
test('seven complete compiler equations guard all four copied original helpers without semantic owner authority',limits,()=>{
 const plan=prepareCallbackTextBodySources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}const module=plan.files.find(row=>row.path==='tools/translation/callback-text-body-source.mjs');assert.deepEqual(module.sourceDependencies.map(row=>[row.owner.kind,row.owner.name]),[['function','close'],['function','split'],['variable','ident'],['variable','text']]);for(const dependency of module.sourceDependencies){assert.equal(dependency.semanticAuthority,false);assert.equal(dependency.sourceEquation.inverse,dependency.source);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies,callbacks=false){const modules={translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,...(callbacks?{translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE}:{})},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual additional Option source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
