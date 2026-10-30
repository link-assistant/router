// Independent shared closed nonbinding match scope SOURCE. All cases UNRUN.
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
import {prepareClosedMatchLocalSources} from '../prepare-closed-match-local-sources.mjs';
import {collectClosedMatchPatternSource} from '../match-arm-source.mjs';
import {censusLocalAliasBindings} from '../local-alias-binding-source.mjs';
import {createTextLocalArgumentSource} from '../text-local-argument-source.mjs';
import {createPrimitiveLocalArgumentSource} from '../primitive-local-argument-source.mjs';
import {createPrimitiveCarrierLocalSource} from '../primitive-carrier-local-source.mjs';
import {createBase64LocalArgumentSource} from '../base64-local-argument-source.mjs';
import {createJsonFieldLocalSource} from '../json-field-local-source.mjs';
import {createJsonSliceLocalSource} from '../json-slice-local-source.mjs';
import {createOwnedJsonLocalSource} from '../owned-json-local-source.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
const bodies=`pub fn local(value:&str,flag:bool)->String{let saved=value;match flag{true|false=>saved.into()}}
pub fn blocks(value:&str,flag:bool)->String{match flag{true=>{let left=value;left.into()},false=>{let right="last";right.into()}}}
pub fn builder(value:&str,flag:bool)->Option<String>{let mut output=String::new();output.push_str(value);match flag{true|false=>Some(output)}}
pub fn logical(value:&str,first:bool,second:bool)->String{let mut output=String::new();output.push_str(if first||second{value}else{"no"});output}
`;
const numeric=`pub fn numeric(value:u64,flag:bool)->u64{let saved=value;match flag{true|false=>saved.wrapping_add(1_u64)}}
pub fn formatted(value:u64,flag:bool)->String{let saved=value;match flag{true|false=>crate::translation_core::format!("{}",saved.wrapping_add(1_u64))}}
`;
for(const [label,propose]of [['ordinary text',ordinaryText],['source-bound text',boundText]])test(label+' source scope census and pipe guards admit only complete nonbinding local-bearing matches',limits,()=>{
 const request=input(),row=propose(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,5);assert.equal(row.after.source.includes('.into('),false);assert.equal(row.after.source.includes('.push_str('),false);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,request.files['src/lib.rs']);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);for(const selection of row.selections)assert.equal(selection.executableAdmission,false);
});
for(const [label,propose]of [['ordinary integer',ordinaryInteger],['source-bound integer',boundInteger]])test(label+' same closed pattern inventory preserves numeric aliases inside original canonical formatting arguments',limits,()=>{
 const request=input(numeric),row=propose(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,2);assert.equal(row.after.source.includes('.wrapping_add('),false);assert.ok(row.after.source.includes('crate::translation_core::format!'));assert.ok(row.after.source.includes('crate::translation_integer_core::u64_wrapping_add'));for(const selection of row.selections){assert.equal(selection.oldTraitDispatchProved,false);assert.equal(selection.executableAdmission,false);}
});
test('actual text builder and integer local-bearing match callers retain independent complete JS strict TS behavior',limits,async()=>{
 for(const [family,body]of [['text-methods',bodies],['integer-methods',numeric]]){const request=input(body),proposal=await proposeSourceBoundOwnedCoreStage(family,request),files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});await verifyTypedTargets(result,api=>{if(family==='text-methods')for(const value of ['','é😀','a\0b'])for(const flag of [false,true]){assert.equal(api.local(value,flag),value);assert.equal(api.blocks(value,flag),flag?value:'last');assert.deepEqual(api.builder(value,flag),{$:'Some',field0:value});for(const second of [false,true])assert.equal(api.logical(value,flag,second),flag||second?value:'no');}else for(const value of [0n,1n,18446744073709551615n])for(const flag of [false,true]){const expected=value===18446744073709551615n?0n:value+1n;assert.equal(api.numeric(value,flag),expected);assert.equal(api.formatted(value,flag),String(expected));}},{childTimeoutMs:20000});}
});
const parameters=new Set(['value','flag','other']);
function localReaders(rows){return [
 ['text',createTextLocalArgumentSource(rows,new Map([['value','str']]),parameters),'str'],
 ['primitive',createPrimitiveLocalArgumentSource(rows,new Map([['value','u64']]),parameters),'u64'],
 ['carrier',createPrimitiveCarrierLocalSource(rows,new Map([['value',{kind:'payload',domain:'str'}]]),parameters,{readWrittenRole:()=>null}),{kind:'payload',domain:'str'}],
 ['base64',createBase64LocalArgumentSource(rows,new Map([['value','text']])),'text'],
 ['JSON field',createJsonFieldLocalSource(rows,new Map([['value','json-reference']]),parameters),'json-reference'],
 ['JSON slice',createJsonSliceLocalSource(rows,new Map([['value','json-slice']]),parameters),'json-slice'],
 ['owned JSON',createOwnedJsonLocalSource(rows,new Map([['value',{kind:'json',borrowed:false}]]),parameters),{kind:'json',borrowed:false}],
 ];}
function rows(source){return rustTokens(source).filter(row=>row.type!=='comment');}
test('all seven chronological readers preserve actual locals inside closed match scopes and reject unknown introduced bindings even without let',limits,()=>{
 const source='let saved=value;match flag{true|false=>saved}',tokens=rows(source),position=tokens.findLast(row=>row.text==='saved').start,census=censusLocalAliasBindings(tokens,parameters);assert.equal(census.reason,null);assert.equal(census.count,1);for(const [name,reader,expected]of localReaders(tokens)){assert.ok(reader,name);assert.deepEqual(reader.at(position).get('saved'),expected,name);assert.equal(reader.evidence('saved').sourceAuthority,false,name);}for(const source of ['match other{binding=>value}','match other{Some(binding)=>value,None=>value}','match flag{true if flag=>value,_=>value}']){const tokens=rows(source);assert.ok(censusLocalAliasBindings(tokens,parameters).reason,source);for(const [name,reader]of localReaders(tokens))assert.equal(reader,null,name+': '+source);}
});
test('fresh source inventory records exact pattern pipes but not closure pipes, and opaque callback matches keep their separate source scope',limits,()=>{
 const source='/* Ω😀 */let saved=value;call(|arg|{match other{binding=>binding}});match flag{true|false=>saved}',tokens=rows(source),whole=collectClosedMatchPatternSource(tokens);assert.equal(whole.refusals.length,1);const from=tokens.findIndex(row=>row.text==='|'),body=tokens.findIndex((row,index)=>index>from&&row.text==='{'),closing=tokens.findIndex((row,index)=>index>body&&row.text==='}'),opaqueRegions=[{start:tokens[from].start,end:tokens[closing+1].end}],selected=collectClosedMatchPatternSource(tokens,{opaqueRegions});assert.equal(selected.refusals.length,0);assert.equal(selected.matches.length,1);assert.equal(selected.positions.size,1);for(const position of selected.positions)assert.equal(source.slice(position,position+1),'|');assert.ok([...selected.positions].every(position=>position>source.indexOf(';match flag')));assert.equal(selected.callerScopeProved,false);assert.equal(selected.patternTypesProved,false);assert.equal(selected.executableAdmission,false);assert.equal(selected.crossInvocationCache,false);assert.equal(censusLocalAliasBindings(tokens,parameters,{opaqueRegions}).reason,null);const separate=collectClosedMatchPatternSource(rows('match flag{true=>value,false=>value}'));assert.equal(separate.positions.size,0);assert.equal(selected.positions.size,1);
});
test('unknown shadowing pattern and actual closure source still refuse the entire original text function',limits,()=>{
 for(const body of ['pub fn shadow(value:&str,other:String)->String{match other{value=>value.to_owned()}}','pub fn guarded(value:&str,flag:bool)->String{let saved=value;match flag{true if flag=>saved.into(),_=>"last".into()}}','pub fn closure(value:&str)->String{let f=||{value.to_owned()};value.to_owned()}']){const request=input(body),row=ordinaryText(request).proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.edits.length,0,body);assert.equal(row.after.source,request.files['src/lib.rs']);}
});
test('fifteen complete compiler equations retain immutable native source owners ordered phases and exact inverses',limits,()=>{
 const plan=prepareClosedMatchLocalSources();assert.equal(plan.files.length,15);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE,translation_primitive_results_core:PRIMITIVE_RESULT_NATIVE_SOURCE,translation_owned_results_core:OWNED_RESULT_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
