// Independent conditional callback source inference SOURCE. All UNRUN.
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
import {prepareCarrierConditionalSources} from '../prepare-carrier-conditional-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),some=field0=>({$:'Some',field0}),none={$:'None'},ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0});
const optionBodies=`pub fn option_mapped(value:Option<u64>,threshold:u64)->Option<u64>{value.map(|item|if item>=threshold{item+1_u64}else{0_u64})}
pub fn option_chained(value:Option<u64>,threshold:u64)->Option<u64>{value.and_then(|item|if item>=threshold{Some(item)}else{None})}
pub fn option_ladder(value:Option<u64>)->Option<bool>{value.map(|item|if item<2_u64{false}else if item<5_u64{true}else{false})}
pub fn option_owned(value:Option<String>)->Option<String>{value.map(|item|if item.is_empty(){"empty".to_owned()}else{item})}
`;
const resultBodies=`pub fn result_mapped(value:Result<u64,String>,threshold:u64)->Result<u64,String>{value.map(|item|if item>=threshold{item+1_u64}else{0_u64})}
pub fn result_chained(value:Result<u64,String>,threshold:u64)->Result<u64,String>{value.and_then(|item|if item>=threshold{Ok(item)}else{Err("small".to_owned())})}
`;
const ownedBodies=`pub fn owned_mapped(value:Result<String,String>)->Result<String,String>{value.map(|item|if item.is_empty(){"empty".to_owned()}else{item})}
pub fn owned_error(value:Result<String,String>)->Result<String,String>{value.map_err(|error|if error.is_empty(){"empty".to_owned()}else{error})}
`;
const bodies=optionBodies+resultBodies+ownedBodies;
function inferConditional(source,wanted={kind:'payload',domain:'u64'}){
 const scope=new Map([['flag',{kind:'payload',domain:'bool'}],['count',{kind:'payload',domain:'u64'}],['other',{kind:'payload',domain:'u64'}]]),encoded=new Map([...scope].map(([name,role])=>[name,role.kind+':'+role.domain]));function infer(part,expected,depth=0){if(depth>32)return null;return readCarrierConditionalSource(part,scope,expected,{readExpression:(rows,output)=>infer(rows,output,depth+1)})??readCarrierAliasOperand(part,encoded,expected);}return readCarrierConditionalSource(tokens(source),scope,wanted,{readExpression:(rows,output)=>infer(rows,output)});
}
test('complete conditionals retain matching branch roles nested alternatives comments and actual generic carrier shape',limits,()=>{
 for(const source of ['if flag {count}else{other}','if count>=2_u64 {count+1_u64}else{0_u64}','if !flag {0}else if count<2_u64 {1}else{count}','if /* Ω😀 condition */ flag { /* then */ count } else { /* else */ other }']){const result=inferConditional(source);assert.equal(result.kind,'payload',source);assert.equal(result.domain,'u64');assert.equal(result.conditionUnevaluated,true);assert.equal(result.branchesUnevaluated,true);assert.equal(result.semanticAuthority,false);assert.equal(result.executableAdmission,false);}const option=inferConditional('if flag {Some(count)}else{None}',{kind:'option',domain:'u64'});assert.equal(option.kind,'option');assert.equal(option.domain,'u64');
});
test('incomplete mismatched effectful and declaration-bearing conditional shapes remain refused',limits,()=>{
 for(const source of ['if flag {count}','if count {count}else{other}','if flag {count}else{true}','if flag {count}else{effect()}','if flag {let value=count;value}else{other}','if flag {return count;}else{other}','if let Some(value)=unknown {value}else{count}','if flag {}else{count}','if flag {count};else{other}','if flag {count}else{other} extra'])assert.equal(inferConditional(source),null,source);assert.equal(inferConditional('if flag {true}else{false}'),null);assert.equal(readCarrierConditionalSource(tokens('if true {1_u64}else{2_u64}'),new Map(),null,{}),null);assert.equal(readCarrierConditionalSource(tokens('if true {1_u64}else{2_u64}'),new Map(),null,{readExpression:()=>({})}),null);
});
for(const [label,propose,body,count]of [['ordinary Option',ordinaryCallback,optionBodies,4],['source-bound Option',boundCallback,optionBodies,4],['ordinary primitive Result',ordinaryResult,resultBodies,2],['source-bound primitive Result',boundResult,resultBodies,2],['ordinary owned Result',ordinaryOwned,ownedBodies,2],['source-bound owned Result',boundOwned,ownedBodies,2]])test(label+' joins complete original conditional callback bodies and source inverses',limits,()=>{
 const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,count);assert.ok(row.selections.every(row=>row.executableAdmission===false));
});
test('all8 original conditional callers emit JavaScript and strict TypeScript with actual branch and owned text behavior',limits,async()=>{
 const request=input();let files=request.files;for(const stage of ['primitive-option-callback-methods','primitive-result-methods','owned-result-methods'])files=(await proposeSourceBoundOwnedCoreStage(stage,{...request,files})).after;const result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const [value,threshold,wanted]of [[3n,3n,4n],[3n,4n,0n],[0n,0n,1n]]){assert.deepEqual(api.option_mapped(some(value),threshold),some(wanted));assert.deepEqual(api.result_mapped(ok(value),threshold),ok(wanted));}assert.deepEqual(api.option_mapped(none,0n),none);assert.deepEqual(api.option_chained(some(3n),3n),some(3n));assert.deepEqual(api.option_chained(some(3n),4n),none);assert.deepEqual(api.option_chained(none,0n),none);for(const [value,wanted]of [[0n,false],[2n,true],[4n,true],[5n,false]])assert.deepEqual(api.option_ladder(some(value)),some(wanted));assert.deepEqual(api.result_chained(ok(3n),3n),ok(3n));assert.deepEqual(api.result_chained(ok(3n),4n),err('small'));for(const name of ['result_mapped','result_chained'])assert.deepEqual(api[name](err('kept'),0n),err('kept'));for(const [value,wanted]of [['','empty'],['Ω😀','Ω😀']]){assert.deepEqual(api.option_owned(some(value)),some(wanted));assert.deepEqual(api.owned_mapped(ok(value)),ok(wanted));assert.deepEqual(api.owned_error(err(value)),err(wanted));}assert.deepEqual(api.option_owned(none),none);assert.deepEqual(api.owned_mapped(err('kept')),err('kept'));assert.deepEqual(api.owned_error(ok('kept')),ok('kept'));},{childTimeoutMs:20000});
});
test('five complete compiler equations retain all original source ownership phases and inverses',limits,()=>{
 const plan=prepareCarrierConditionalSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(row=>row.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
