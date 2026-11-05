// Independent closed match-arm owning text target SOURCE. All cases UNRUN.
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
import {proposeCallbackIntegerBodySource} from '../callback-integer-body-source.mjs';
import {proposeCallbackCoreBodySource} from '../callback-core-body-source.mjs';
import {prepareMatchTextTargetSources} from '../prepare-match-text-target-sources.mjs';
import {readClosedMatchArmSourceBounds} from '../match-arm-source.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const bodies=`pub fn plain(value:&str,flag:bool)->String{match flag{true=>value.into(),false=>"é😀".into(),}}
pub fn numbers(value:&str,number:u64)->String{match number{0=>"zero".into(),1=>"one".into(),_=>value.into(),}}
pub fn blocks(value:&str,flag:bool)->String{match flag{true=>{let selected=value;selected.into()}false=>{"é😀".into()}}}
pub fn nested(value:&str,first:bool,second:bool)->String{match first{true=>if second{value.into()}else{"second".into()},false=>"last".into(),}}
pub fn typed(value:&str,flag:bool)->String{let selected:String=match flag{true=>value.into(),false=>"typed".into(),};selected}
pub fn combined(value:&str,flag:bool)->String{match flag{true|false=>value.into(),}}
`;
for(const [label,propose]of [['ordinary text',ordinaryText],['source-bound text',boundText]])test(label+' retains explicit owning String context through complete nonbinding match arm tails',limits,()=>{
 const request=input(),row=propose(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,13);assert.equal(row.after.source.includes('.into('),false);assert.ok(row.after.source.includes('match flag'));let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,request.files['src/lib.rs']);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const selection of row.selections){assert.equal(selection.oldTraitDispatchProved,false);assert.equal(selection.oldDropTimingProved,false);assert.equal(selection.executableAdmission,false);}
});
test('six complete match callers retain independent JS strict TS branch literal numeric and lexical behavior',limits,async()=>{
 const request=input(),proposal=await proposeSourceBoundOwnedCoreStage('text-methods',request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{for(const value of ['','é😀','a\0b']){for(const flag of [false,true]){assert.equal(api.plain(value,flag),flag?value:'é😀');assert.equal(api.blocks(value,flag),flag?value:'é😀');assert.equal(api.typed(value,flag),flag?value:'typed');assert.equal(api.combined(value,flag),value);for(const second of [false,true])assert.equal(api.nested(value,flag,second),flag?(second?value:'second'):'last');}for(const number of [0n,1n,2n,18446744073709551615n])assert.equal(api.numbers(value,number),number===0n?'zero':number===1n?'one':value);}},{childTimeoutMs:20000});
});
function armBounds(source){const tokens=rustTokens(source).filter(row=>row.type!=='comment'),close=(rows,start)=>{const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<rows.length;at++){if(rows[at].type!=='punct')continue;const word=rows[at].text;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;};return {tokens,result:readClosedMatchArmSourceBounds(tokens,0,tokens.length,{close})};}
test('literal wildcard qualified unit and or-pattern source spans never prove pattern types exhaustiveness or source binding',limits,()=>{
 for(const source of ['match code{crate::Code::A=>value.into(),crate::Code::B=>"B".into(),}','match number{-1=>"negative".into(),0|1=>"small".into(),_=>value.into(),}','match flag{true=>{value.into()}false=>{"é😀".into()}}']){const {tokens,result}=armBounds(source);assert.ok(result);assert.equal(result.patternTypesProved,false);assert.equal(result.exhaustivenessProved,false);assert.equal(result.sourceAuthority,false);assert.equal(result.executableAdmission,false);for(const arm of result.arms){assert.ok(arm.patternStart<arm.patternEnd);assert.ok(arm.expressionStart<arm.expressionEnd);assert.ok(tokens[arm.expressionStart].start<tokens[arm.expressionEnd-1].end);assert.equal(arm.sourceAuthority,false);}}
 for(const source of ['match flag{binding=>value.into()}','match flag{true if guard=>value.into(),_=>"no".into()}','match input{Some(value)=>value.into(),None=>"no".into()}','match input{binding@Some(_)=>value.into()}','match flag{true=>value.into() false=>"no".into()}','match value{crate::Code::=>value.into()}'])assert.equal(armBounds(source).result,null,source);
});
test('binding guarded constructor-pattern and inferred-output matches retain whole original functions without guessed target types',limits,()=>{
 for(const body of ['pub fn binding(value:&str,flag:bool)->String{match flag{bound=>value.into()}}','pub fn guarded(value:&str,flag:bool)->String{match flag{true if flag=>value.into(),_=>"no".into()}}','pub fn inferred(value:&str,flag:bool){let selected=match flag{true=>value.into(),false=>"no".into(),};}']){const request=input(body),row=ordinaryText(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0,body);assert.equal(row.after.source,request.files['src/lib.rs']);}
});
test('four complete source equations retain immutable original owners phases and exact inverses',limits,()=>{
 const plan=prepareMatchTextTargetSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
