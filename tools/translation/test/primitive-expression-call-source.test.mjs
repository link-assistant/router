// Independent numeric expression/call composition SOURCE. All UNRUN.
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
import {preparePrimitiveExpressionCallSources} from '../prepare-primitive-expression-call-sources.mjs';
import {PRIMITIVE_RESULT_NATIVE_SOURCE} from '../primitive-result-native-source.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../owned-result-native-source.mjs';
import {proposeCorePrimitiveResultMethodCorpus as ordinaryResult} from '../migrate-core-primitive-result-methods.mjs';
import {proposeCorePrimitiveResultMethodCorpus as boundResult} from '../source-bound-owned-migrate-core-primitive-result-methods.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const numericBodies=`pub fn sum_local(value:&str,delta:u64)->u64{let count=crate::translation_text_core::len_utf8(value)+delta;count.saturating_add(2)}
pub fn sum_group(value:&str,delta:u64)->u64{(crate::translation_text_core::len_utf8(value)+delta).saturating_add(2)}
pub fn sum_argument(value:u64,delta:u64)->u64{value.saturating_add(crate::translation_primitive_option_core::u64_unwrap_or(Some(delta),0_u64)+2)}
`;
const callbackBodies=`pub fn mapped(value:Option<u64>)->Option<u64>{value.map(|item|item+2_u64)}
pub fn related(value:Option<u64>,threshold:u64)->Option<bool>{value.map(|item|item+1_u64>=threshold)}
pub fn chained(value:Option<u64>)->Option<u64>{value.and_then(|item|Some(item+2_u64))}
pub fn mapped_local(value:Option<u64>,threshold:u64)->Option<bool>{value.map(|item|{let next=item+2_u64;let selected=next>=threshold;selected})}
`;
const resultBodies=`pub fn result_mapped(value:Result<u64,String>)->Result<u64,String>{value.map(|item|item+2_u64)}
pub fn result_related(value:Result<u64,String>,threshold:u64)->Result<bool,String>{value.map(|item|item+1_u64>=threshold)}
`;
const bodies=numericBodies+callbackBodies+resultBodies;
test('one qualified call prefix preserves actual expression boundaries and every original complete-call limit',limits,()=>{
 const rows=tokens('delta + crate::translation_text_core::len_utf8(value) * 2_u64'),part=readQualifiedSourceCallPrefixTokens(rows,2);assert.ok(part);assert.equal(part.start,2);assert.equal(rows[part.end].text,'*');assert.deepEqual(part.call.path,['crate','translation_text_core','len_utf8']);assert.equal(part.sourceAuthority,false);assert.equal(part.semanticAuthority,false);for(const source of ['crate::a::b(value,)','crate::a::b(,value)','crate::a::b(value]','crate::a::b::<u64>(value)','plain(value)','crate::a::b('+Array(18).fill('value').join(',')+')'])assert.equal(readQualifiedSourceCallPrefixTokens(tokens(source)),null,source);for(const at of [-1,0.5,Infinity,100])assert.equal(readQualifiedSourceCallPrefixTokens(rows,at),null);
});
test('fixed-width scalar call atoms compose through actual arithmetic precedence without evaluating inputs',limits,()=>{
 const bindings=new Map([['value','str'],['delta','u64'],['other','i64']]);for(const source of ['crate::translation_text_core::len_utf8(value)+delta*2_u64','(crate::translation_text_core::len_utf8(value)+delta)<<1_u64','crate::translation_primitive_option_core::u64_unwrap_or(Some(delta),0_u64)+2_u64']){const result=readPrimitiveLocalExpression(tokens(source),bindings,{readAtom:readPrimitiveAliasOperand});assert.equal(result.kind,'u64',source);}for(const source of ['crate::translation_text_core::len_utf8(value)+other','crate::translation_text_core::len_utf8(unknown())+delta','crate::unknown_core::len_utf8(value)+delta','delta as i64','delta+effect()'])assert.equal(readPrimitiveLocalExpression(tokens(source),bindings,{readAtom:readPrimitiveAliasOperand}),null,source);
});
test('numeric comparisons infer one matching native domain and retain unknown widths calls and chained relations',limits,()=>{
 const bindings=new Map([['value','str'],['delta','u64'],['other','i64']]);for(const operator of ['==','!=','<','<=','>','>=']){const result=readPrimitiveLocalComparisonSource(tokens('crate::translation_text_core::len_utf8(value)+delta '+operator+' 8'),bindings,{readAtom:readPrimitiveAliasOperand});assert.equal(result.kind,'bool');assert.equal(result.numericDomain,'u64');assert.equal(result.operator,operator);assert.equal(result.semanticAuthority,false);}for(const source of ['1<2','delta<other','delta<2_u64<3_u64','delta<effect()','delta && true'])assert.equal(readPrimitiveLocalComparisonSource(tokens(source),bindings,{readAtom:readPrimitiveAliasOperand}),null,source);
 const scope=new Map([['count',{kind:'payload',domain:'u64'}],['threshold',{kind:'payload',domain:'u64'}]]);assert.equal(readPrimitiveRoleExpressionSource(tokens('count+2>=threshold'),scope).domain,'bool');const encoded=new Map([['count','payload:u64'],['threshold','payload:u64']]);assert.deepEqual(readCarrierAliasOperand(tokens('Some(count+2_u64)'),encoded).kind,'option');assert.equal(readCarrierAliasOperand(tokens('count+2_u64>=threshold'),encoded).domain,'bool');
});
for(const [label,propose,body,count]of [['ordinary integer',ordinaryInteger,numericBodies,3],['source-bound integer',boundInteger,numericBodies,3],['ordinary Option',ordinaryCallback,callbackBodies,4],['source-bound Option',boundCallback,callbackBodies,4],['ordinary Result',ordinaryResult,resultBodies,2],['source-bound Result',boundResult,resultBodies,2]])test(label+' joins complete original numeric body source without manual annotations',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);assert.ok(row.selections.every(row=>row.executableAdmission===false));
});
test('all9 actual caller bodies emit JavaScript and strict TypeScript after complete stage composition',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['integer-methods','primitive-option-callback-methods','primitive-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{assert.equal(api.sum_local('é😀',3n),11n);assert.equal(api.sum_group('é😀',3n),11n);assert.equal(api.sum_argument(5n,3n),10n);for(const name of ['mapped','chained']){assert.deepEqual(api[name](some(3n)),some(5n));assert.deepEqual(api[name](none),none);}assert.deepEqual(api.related(some(3n),4n),some(true));assert.deepEqual(api.related(some(3n),5n),some(false));assert.deepEqual(api.related(none,0n),none);assert.deepEqual(api.mapped_local(some(3n),5n),some(true));assert.deepEqual(api.mapped_local(some(3n),6n),some(false));assert.deepEqual(api.result_mapped(ok(3n)),ok(5n));assert.deepEqual(api.result_related(ok(3n),4n),ok(true));assert.deepEqual(api.result_mapped(err('kept')),err('kept'));assert.deepEqual(api.result_related(err('kept'),0n),err('kept'));},{childTimeoutMs:20000});
});
test('ten complete compiler source equations retain both phases unchanged originals and inverse transport',limits,()=>{
 const plan=preparePrimitiveExpressionCallSources();assert.equal(plan.files.length,10);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
