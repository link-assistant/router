// Independent shared callback temporary source parameter cases. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJsonFieldCallSource,readJsonFieldReferenceSourceRole} from '../json-field-call-source.mjs';
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
import {proposeCoreIntegerMethodCorpus as ordinaryInteger} from '../migrate-core-integer-methods.mjs';
import {proposeCoreIntegerMethodCorpus as boundInteger} from '../source-bound-owned-migrate-core-integer-methods.mjs';
import {readPrimitiveCoreCallSource,readPrimitiveCoreParameterSourceRole} from '../primitive-core-call-source.mjs';
import {collectSourceBoundOwnedCoreFixedPoint} from '../source-bound-owned-core-fixed-point.mjs';
import {readQualifiedSourceCallPrefixTokens} from '../qualified-source-call-tokens.mjs';
import {readPrimitiveLocalExpression} from '../primitive-local-expression-source.mjs';
import {readPrimitiveLocalComparisonSource} from '../primitive-local-comparison-source.mjs';
import {readPrimitiveAliasOperand} from '../primitive-local-argument-source.mjs';
import {readPrimitiveRoleExpressionSource} from '../primitive-carrier-expression-source.mjs';
import {readCarrierAliasOperand} from '../primitive-carrier-local-source.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../owned-result-native-source.mjs';
import {proposeCorePrimitiveResultMethodCorpus as ordinaryResult} from '../migrate-core-primitive-result-methods.mjs';
import {proposeCorePrimitiveResultMethodCorpus as boundResult} from '../source-bound-owned-migrate-core-primitive-result-methods.mjs';
import {readPrimitiveLocalBooleanSource} from '../primitive-local-boolean-source.mjs';
import {proposeCoreOwnedResultMethodCorpus as ordinaryOwned} from '../migrate-core-owned-result-methods.mjs';
import {proposeCoreOwnedResultMethodCorpus as boundOwned} from '../source-bound-owned-migrate-core-owned-result-methods.mjs';
import {readCarrierConditionalSource} from '../carrier-conditional-source.mjs';
import {readCarrierBranchLocalSource} from '../carrier-branch-local-source.mjs';
import * as callback from '../primitive-option-callback-runtime.mjs';
import {PRIMITIVE_OPTION_CALLBACK_CONTRACTS,emitPrimitiveOptionCallbackDeclarations} from '../primitive-option-callback-contracts.mjs';
import {readQualifiedSourceMacroTokens} from '../qualified-source-call-tokens.mjs';
import {readCoreFormattingMacroSource} from '../core-formatting-macro-source.mjs';
import {readPrimitiveOptionCallbackCallSource} from '../primitive-option-callback-call-source.mjs';
import {readCoreCarrierContractSourceRole} from '../core-carrier-call-source.mjs';
import {callbackSourceParameterDeclarations} from '../callback-source-parameters.mjs';
import {proposeCallbackTextBodySource} from '../callback-text-body-source.mjs';
import {proposeCallbackIntegerBodySource} from '../callback-integer-body-source.mjs';
import {proposeCallbackCoreBodySource} from '../callback-core-body-source.mjs';
import {readPrimitiveCoreRoleSource} from '../primitive-core-call-source.mjs';
import {prepareCallbackSourceParameters} from '../prepare-callback-source-parameters.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),O='crate::translation_primitive_option_core::';
const optionBody='pub fn option(value:Option<bool>,pending:Option<&str>)->Option<u64>{value.and_then(|_flag|{let chosen=pending?;Some((chosen.trim().len() as u64).saturating_add(2))})}';
const resultBody=`pub fn result(value:Result<u64,String>,pending:Option<&str>)->Result<u64,String>{value.and_then(|number|{let chosen=${O}str_ok_or_text(pending,"missing")?;Ok((chosen.trim().len() as u64).saturating_add(number))})}`;
const ownedBody=`pub fn owned(value:Result<String,String>,pending:Option<&str>)->Result<u64,String>{value.and_then(|_original|{let chosen=${O}str_ok_or_text(pending,"missing")?;Ok((chosen.trim().len() as u64).saturating_add(2))})}`;
const bodies=[optionBody,resultBody,ownedBody].join('
');
function restore(child){let source=child.after.source;for(const row of [...child.mapping].reverse())if(row.kind==='substitution')source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);assert.equal(source,child.before.source);assert.equal(transportConcreteSyntaxMeta(child.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(child.after.meta).source,child.after.source);assert.equal(child.wrapper.functionOwnerProved,false);assert.equal(child.wrapper.temporaryTypesAreSourceData,true);assert.equal(child.sourceAuthority,false);assert.equal(child.semanticAuthority,false);assert.equal(child.executableAdmission,false);return child;}
test('closed temporary wrapper source declarations share scalar carrier and JSON candidates without executable authority',limits,()=>{
 const scope=new Map([['text',{kind:'payload',domain:'text-owned'}],['borrowed',{kind:'option',domain:'str'}],['pending',{kind:'option',domain:'u64'}],['result',{kind:'result',domain:'text'}],['json',{kind:'json',domain:'json'}],['unknown',{kind:'payload',domain:'unknown'}]]);assert.deepEqual(callbackSourceParameterDeclarations(scope),['text:String','borrowed:Option<&str>','pending:Option<u64>','result:Result<String,String>','json:&crate::translation_core::Json']);for(const domain of ['u8','i8','u16','i16','u32','i32','u64','i64','u128','i128'])assert.deepEqual(callbackSourceParameterDeclarations(new Map([['value',{kind:'payload',domain}]])),['value:'+domain]);for(const domain of ['constructor','toString','__proto__','unknown'])assert.deepEqual(callbackSourceParameterDeclarations(new Map([['value',{kind:'payload',domain}]])),[]);assert.equal(callbackSourceParameterDeclarations(new Map([['not a binding',{kind:'payload',domain:'u64'}]])),null);assert.equal(callbackSourceParameterDeclarations({}),null);assert.equal(callbackSourceParameterDeclarations(new Map([['v'.repeat(4097),{kind:'payload',domain:'u64'}]])),null);assert.equal(callbackSourceParameterDeclarations(new Map(Array.from({length:64},(_,at)=>['v'+at+'x'.repeat(2000),{kind:'payload',domain:'u64'}]))),null);assert.equal(callbackSourceParameterDeclarations(new Map(Array.from({length:65},(_,at)=>['value'+at,{kind:'payload',domain:'u64'}]))),null);
});
test('text and integer wrapper source retains actual carrier-capture prerequisites and complete child inverses',limits,()=>{
 const scope=new Map([['pending',{kind:'option',domain:'str'}],['number',{kind:'payload',domain:'u64'}]]),body='{let chosen=pending?;Some((chosen.trim().len() as u64).saturating_add(number))}',text=restore(proposeCallbackTextBodySource(body,scope));assert.ok(text.wrapper.source.includes('pending:Option<&str>'));const integer=restore(proposeCallbackIntegerBodySource(text.after.source,scope));assert.ok(integer.after.source.includes('crate::translation_integer_core::u64_saturating_add'));const complete=restore(proposeCallbackCoreBodySource(body,scope));assert.deepEqual(complete.bodySourceHistories.map(row=>row.name),['text','integer']);for(const row of complete.bodySourceHistories)restore(row.proposal);assert.equal(complete.sourceStagesComplete,false);
});
test('scalar engine chronological DATA retains nonnumeric source roles needed by actual numeric core operands',limits,()=>{
 const bindings=new Map([['pending','option:str'],['number','u64'],['text','str']]);assert.equal(readPrimitiveCoreRoleSource(tokens('pending?'),bindings).kind,'str');assert.equal(readPrimitiveCoreRoleSource(tokens('text'),bindings).kind,'str');assert.equal(readPrimitiveCoreRoleSource(tokens('pending'),bindings).kind,'option:str');assert.equal(readPrimitiveCoreRoleSource(tokens('true'),bindings).kind,'bool');assert.equal(readPrimitiveCoreRoleSource(tokens('unknown'),bindings),null);const row=readPrimitiveCoreRoleSource(tokens('crate::translation_text_core::len_utf8(text)'),bindings);assert.equal(row.kind,'u64');assert.equal(row.semanticAuthority,false);assert.equal(row.executableAdmission,false);
});
for(const [label,propose,body]of [['ordinary Option callback',ordinaryCallback,optionBody],['source-bound Option callback',boundCallback,optionBody],['ordinary Result',ordinaryResult,resultBody],['source-bound Result',boundResult,resultBody],['ordinary owning Result',ordinaryOwned,ownedBody],['source-bound owning Result',boundOwned,ownedBody]])test(label+' lowers complete borrowed-carrier captures through shared text and numeric body rules',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,1);assert.ok(row.after.source.includes('crate::translation_text_core::'));assert.ok(row.after.source.includes('crate::translation_integer_core::'));for(const selected of row.selections){assert.equal(selected.executableAdmission,false);for(const child of selected.callbackTextSourceHistories){restore(child);for(const stage of child.bodySourceHistories)restore(stage.proposal);}}
});
test('all three actual borrowed carrier capture callers receive independent JavaScript and strict TypeScript',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.deepEqual(api.option(some(false),some(' é😀 ')),some(8n));assert.deepEqual(api.option(some(true),none),none);assert.deepEqual(api.option(none,some(' é😀 ')),none);assert.deepEqual(api.result(ok(3n),some(' é😀 ')),ok(9n));assert.deepEqual(api.result(ok(3n),none),err('missing'));assert.deepEqual(api.result(err('Ω😀'),none),err('Ω😀'));assert.deepEqual(api.owned(ok('unused'),some(' é😀 ')),ok(8n));assert.deepEqual(api.owned(ok('unused'),none),err('missing'));assert.deepEqual(api.owned(err('Ω😀'),none),err('Ω😀'));},{childTimeoutMs:20000});
});
test('temporary wrapper carrier role candidates do not admit an incompatible actual captured payload',limits,async()=>{
 const request=input('pub fn bad(value:Option<bool>,pending:Option<u64>)->Option<u64>{value.and_then(|_flag|{let chosen=pending?;Some((chosen.trim().len() as u64).saturating_add(2))})}'),proposal=await proposeSourceBoundOwnedCoreStage('primitive-option-callback-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});assert.equal(result.meta.executable.some(row=>row.name==='bad'),false);
});
test('six complete source equations retain full original native owners phases and CST inverses',limits,()=>{
 const plan=prepareCallbackSourceParameters();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
