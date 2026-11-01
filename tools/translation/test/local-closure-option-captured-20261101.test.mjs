// Independent source expectations only; all parser/checker/runtime work UNRUN.
import test from 'node:test';
import {performance} from 'node:perf_hooks';
import {receiveJsonScalarReadersProfile} from './json-scalar-readers-20261101-receiving.mjs';
import {DYNAMIC_OUTPUT_FACADE_SOURCE,DYNAMIC_OUTPUT_LEAF_SOURCE} from '../dynamic-primitive-output-20261101-source.mjs';
import {LITERAL_ARGUMENTS_LEAF_SOURCE} from '../literal-arguments-core-20261101-source.mjs';
import {OUTPUT_LITERAL_LEAF_SOURCE} from '../output-literal-core-20261101-source.mjs';
import {PERSISTENT_OUTPUT_LEAF_SOURCE} from '../persistent-output-backend-20261101-source.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';

import assert from 'node:assert/strict';
import {openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {sourceItems} from '../rust-structure.mjs';
import {selectLocalClosureCandidates,selectLazyOptionCandidates} from '../local-closure-option-captured-20261101-syntax.mjs';
import {proposeLocalClosureOptionCandidates} from '../local-closure-option-captured-20261101.mjs';
import {visitCapturedOptionSourceHistory} from '../local-closure-option-captured-20261101-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {assertTokenReportTranslationEdgeCases} from './token-report-translation-edges-20261101-cases.mjs';
const limits={timeout:60000};
const fn=source=>sourceItems(source).find(row=>row.term==='fn');
function apply(source,edits){let current=source;for(const row of [...edits].reverse()){assert.equal(source.slice(...row.span),row.expected);current=current.slice(0,row.span[0])+row.replacement+current.slice(row.span[1]);}return current;}
function sourceFile(path){const fd=openSync(new URL('../../../'+path,import.meta.url),'r');let failed=false;try{const stat=fstatSync(fd);assert.ok(stat.isFile()&&stat.size<=2097152);const bytes=Buffer.alloc(stat.size+1);let size=0,count;while((count=readSync(fd,bytes,size,bytes.length-size,size))>0){size+=count;assert.ok(size<=stat.size);}assert.equal(size,stat.size);return new TextDecoder('utf8',{fatal:true}).decode(bytes.subarray(0,size));}catch(error){failed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!failed)throw error;}}}
test('captured used/max source and both complete callback comments/named formats remain literal source',limits,()=>{
 const source='pub fn render(value:Option<u64>,used:u64)->String{value.map_or_else(/* default */ ||crate::translation_core::format!("{used}/-"), /* mapper */ |max|crate::translation_core::format!("{used}/{max}"))}',plan=selectLazyOptionCandidates(source,fn(source)),after=apply(source,plan.edits);assert.equal(plan.selections.length,1);assert.equal(plan.residuals.length,0);assert.ok(after.includes('/* default */ ||crate::translation_core::format!("{used}/-")'));assert.ok(after.includes('/* mapper */ |max|crate::translation_core::format!("{used}/{max}")'));assert.deepEqual(plan.selections[0].lexicalCaptures.map(row=>row.name),['used']);assert.equal(plan.selections[0].typedOriginalCaptureAuthority,false);assert.equal(plan.selections[0].originalClosureConstructionOrderProved,false);
});
test('balanced original receiver block/call is present exactly once, with immutable local binding provenance DATA',limits,()=>{
 for(const receiver of ['produce(value)','{ let key = value; produce(key) }']){const source='pub fn render(value:u64)->String{let used=7_u64;'+receiver+'.map_or_else(||crate::translation_core::format!("{used}/-"),|max|crate::translation_core::format!("{used}/{max}"))}',plan=selectLazyOptionCandidates(source,fn(source)),after=apply(source,plan.edits);assert.equal(plan.selections.length,1);assert.equal(after.split(receiver).length-1,1);const capture=plan.selections[0].lexicalCaptures.find(row=>row.name==='used');assert.equal(capture.kind,'local');assert.equal(source.slice(...capture.declarationSpan),'let used=7_u64;');assert.equal(plan.selections[0].actualSourceIntervals,true);}
});
test('known non-Option source role and unknown lexical capture/pattern scope remain residual',limits,()=>{
 for(const source of ['pub fn bad(value:u64)->String{value.map_or_else(||crate::translation_core::format!("NONE"),|v|crate::translation_core::format!("{v}"))}','pub fn bad(value:Option<u64>)->String{value.map_or_else(||crate::translation_core::format!("{unknown}"),|v|crate::translation_core::format!("{v}"))}','pub fn bad(value:Option<u64>,other:Option<u64>)->String{if let Some(used)=other{value.map_or_else(||crate::translation_core::format!("{used}"),|v|crate::translation_core::format!("{v}"))}else{crate::translation_core::format!("NONE")}}']){const plan=selectLazyOptionCandidates(source,fn(source));assert.equal(plan.edits.length,0);assert.ok(plan.residuals.length);}
});
test('receiver nested inside an unissued callback cannot borrow an outer same-name capture binding',limits,()=>{
 const source='pub fn bad(value:Option<u64>,used:u64)->String{invoke(|x,used|value.map_or_else(||crate::translation_core::format!("{used}"),|v|crate::translation_core::format!("{v}")))}',plan=selectLazyOptionCandidates(source,fn(source));assert.equal(plan.edits.length,0);assert.ok(plan.residuals.some(row=>row.reason.includes('unissued callback scope')));
});
test('actual whole row first expands its original local graph then drafts all three original two-arm sites',limits,()=>{
 const before=sourceFile('rust/src/token_report.rs'),row=sourceItems(before).find(item=>item.term==='fn'&&item.name==='row'),first=selectLocalClosureCandidates(before,row),expanded=apply(before,first.edits),next=sourceItems(expanded).find(item=>item.term==='fn'&&item.name==='row'),second=selectLazyOptionCandidates(expanded,next),after=apply(expanded,second.edits);assert.equal(first.selections.length,3);assert.equal(second.selections.length,3);assert.equal(second.residuals.length,0);assert.equal(after.includes('.map_or_else('),false);for(const original of ['pub fn print_table','const HEADERS:','mod tests;','if let crate::translation_core::Maybe::Some','.filter(|scope| !scope.is_empty())','v.to_string()'])assert.ok(after.includes(original));assert.ok(after.includes('"{used}/-"'));assert.ok(after.includes('"{used}/{max}"'));assert.equal(second.selections.every(item=>item.executableAdmission===false),true);assert.equal(typeof assertTokenReportTranslationEdgeCases,'function');
 // The independent nine-vector helper is deliberately NOT called with a
 // handwritten/partial row. Actual emitted whole-owner receiving is still OPEN.
});
test('both real complete-project checks and every full CST inverse remain distinct from candidate selection',limits,()=>{
 const source='pub fn render(value:Option<u64>,used:u64)->String{value.map_or_else(||crate::translation_core::format!("{used}/-"),|max|crate::translation_core::format!("{used}/{max}"))}',input={entry:'src/lib.rs',files:[{path:'src/lib.rs',source}],manifest:'[package]\nname="fixture"\nversion="0.1.0"\nedition="2021"\n',lock:'version=4\n'};let count=0;const result=proposeLocalClosureOptionCandidates(input,event=>{assert.equal(event.history.inverse,event.history.before);assert.equal(transportConcreteSyntaxMeta(event.history.afterMeta).source,event.history.after);count++;return {consumed:true};});assert.equal(count,2);assert.equal(result.originalTypedCaptureIssuerImplemented,false);assert.equal(result.oldClosureEquivalenceProved,false);assert.equal(result.oldClosureConstructionOrderProved,false);assert.equal(result.executableAdmission,false);assert.equal(result.semanticInverseImplemented,false);for(const checked of [result.originalCheck,result.candidateCheck])assert.ok(['whole-project-meta','whole-project-hard-refusal'].includes(checked.status));
});
test('complete copied parent/successor source history keeps actual full source images, both phases and inverses',limits,()=>{let count=0;const result=visitCapturedOptionSourceHistory(event=>{assert.equal(event.history.inverse,event.before);assert.equal(event.history.before,event.before);assert.equal(event.history.after,event.after);assert.equal(transportConcreteSyntaxMeta(event.history.beforeMeta).source,event.before);assert.deepEqual(event.history.trace.map(row=>row.phase),['language','repository']);assert.ok(Object.isFrozen(event));count++;return {consumed:true};});assert.equal(count,3);assert.equal(result.sourceCopyOnly,true);assert.equal(result.semanticAuthority,false);assert.equal(result.sourceRows.length,3);});
test('source history closes on every ordinary falsy/frozen callback primary and rejects async/proxy before invocation',limits,()=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('exact frozen callback primary'))]){let failed=false,observed;try{visitCapturedOptionSourceHistory(()=>{throw primary;});}catch(error){failed=true;observed=error;}assert.equal(failed,true);assert.equal(observed,primary);}
 let invoked=0;for(const callback of [async()=>{invoked++;},new Proxy(()=>{invoked++;},{apply(){invoked++;}})])assert.throws(()=>visitCapturedOptionSourceHistory(callback));assert.equal(invoked,0);
});
// Future independent native/JS/strictTS receiving expectations (not executed):
// Some(4),used7 => "7/4"; None,used7 => "7/-"; u64MAX remains exact;
// None never enters a dividing-by-zero mapper; Some never enters a panicking
// fallback; selected branch once after receiver once; unknown custom receiver
// fails the genuine Option carrier check. Coordinator native overlay/scheduling
// and lockfile TypeScript5.9.3 receiving are required before qualification.

function fixture(body){return {entry:'src/lib.rs',manifest:sourceFile('Cargo.toml'),lock:sourceFile('Cargo.lock'),files:[{path:'src/lib.rs',source:'pub mod translation_core;pub mod translation_text_core;pub mod translation_primitive_option_core;pub mod translation_primitive_option_callbacks_core;'+body},{path:'src/translation_text_core.rs',source:TEXT_NATIVE_SOURCE},{path:'src/translation_primitive_option_core.rs',source:PRIMITIVE_OPTION_NATIVE_SOURCE},{path:'src/translation_primitive_option_callbacks_core.rs',source:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE},{path:'src/translation_core.rs',source:DYNAMIC_OUTPUT_FACADE_SOURCE},{path:'src/translation_core/dynamic_primitive_output_20261101.rs',source:DYNAMIC_OUTPUT_LEAF_SOURCE},{path:'src/translation_core/literal_arguments_core_20261101.rs',source:LITERAL_ARGUMENTS_LEAF_SOURCE},{path:'src/translation_core/output_literal_core_20261101.rs',source:OUTPUT_LITERAL_LEAF_SOURCE},{path:'src/translation_core/persistent_output_backend_20261101.rs',source:PERSISTENT_OUTPUT_LEAF_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},{path:'src/translation_core/ranges.rs',source:ROUTER_CORE_RANGES_SOURCE},{path:'src/translation_core/json_collections.rs',source:ROUTER_CORE_JSON_COLLECTIONS_SOURCE},{path:'src/translation_core/base64.rs',source:ROUTER_CORE_BASE64_SOURCE}]};}
const primitiveBodies=`
pub fn captured(present:bool,count:u64,used:u64)->crate::translation_core::Text{{if present{crate::translation_primitive_option_core::u64_some(count)}else{crate::translation_primitive_option_core::u64_none()}}.map_or_else(||crate::translation_core::format!("{used}/-"),|max|crate::translation_core::format!("{used}/{max}"))}
pub fn lazy_mapper(present:bool,count:u64,divisor:u64)->crate::translation_core::Text{{if present{crate::translation_primitive_option_core::u64_some(count)}else{crate::translation_primitive_option_core::u64_none()}}.map_or_else(||crate::translation_core::format!("NONE"),|value|crate::translation_core::format!("{}",value/divisor))}
pub fn lazy_fallback(present:bool,count:u64,divisor:u64)->crate::translation_core::Text{{if present{crate::translation_primitive_option_core::u64_some(count)}else{crate::translation_primitive_option_core::u64_none()}}.map_or_else(||crate::translation_core::format!("{}",1_u64/divisor),|value|crate::translation_core::format!("{value}"))}
`;
test('fresh scalar170 receiving drafts real JS and strictTS5.9.3 branch/capture/panic expectations',limits,t=>{
 const proposal=proposeLocalClosureOptionCandidates(fixture(primitiveBodies));assert.equal(proposal.executableAdmission,false);assert.equal(proposal.originalTypedCaptureIssuerImplemented,false);
 const received=receiveJsonScalarReadersProfile(t,{operation:'runtime',request:proposal.changedRequest,runtimeSource:`({assert,api})=>{assert.equal(api.captured(true,4n,7n),'7/4');assert.equal(api.captured(false,4n,7n),'7/-');assert.equal(api.captured(true,18446744073709551615n,9007199254740993n),'9007199254740993/18446744073709551615');assert.equal(api.lazy_mapper(false,7n,0n),'NONE');assert.throws(()=>api.lazy_mapper(true,7n,0n),/zero/);assert.equal(api.lazy_fallback(true,7n,0n),'7');assert.throws(()=>api.lazy_fallback(false,7n,0n),/zero/);}`},{startedAt:performance.now()});assert.equal(received.result.ok,true,JSON.stringify(received.result.error));assert.ok(received.result.reports.some(row=>row.stage==='compiler-version'&&row.version==='5.9.3'));
});
