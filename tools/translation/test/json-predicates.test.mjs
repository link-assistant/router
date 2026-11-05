// Independent JSON predicate regression SOURCE. All new cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSON_VALUE_PREDICATES,canonicalJsonPredicateMember} from '../json-value-predicates.mjs';
import {expandCanonicalJsonOptionPredicate} from '../canonical-json-option-terminal-normalization.mjs';
import {proposeCoreJsonReadersCorpus} from '../migrate-core-json-readers.mjs';
import {prepareJsonPredicateSources} from '../prepare-json-predicate-sources.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},C='crate::translation_core::',T=C+'Json';
const members=['is_null','is_boolean','is_number','is_string','is_array','is_object','is_u64','is_i64','is_f64'];
const inputs=[['null',['is_null']],['false',['is_boolean']],['"猫😀"',['is_string']],['[]',['is_array']],['{}',['is_object']],['0',['is_number','is_u64','is_i64']],['-1',['is_number','is_i64']],['18446744073709551615',['is_number','is_u64']],['-9223372036854775808',['is_number','is_i64']],['1.0',['is_number','is_f64']],['-0.0',['is_number','is_f64']],['1.5',['is_number','is_f64']]];
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const files=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE}),propose=source=>proposeCoreJsonReadersCorpus({files:files(source),dependencyInputs,compilationProfile:PRODUCTION_PROFILE}),selected=value=>value.proposals.flatMap(row=>row.selections);
function json(source){const result=serde_json_from_str(source);assert.equal(result.$,'Ok');return result.field0;}
function inverse(row){for(const name of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[name].meta).source,row[name].source);for(const stage of [...row.stages,row]){let source=stage.after.source;for(const part of [...stage.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}assert.equal(source,stage.before.source);}assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);}
test('nine exact predicate names and both optional defaults retain fixed generated paths without coercion',limits,()=>{
 assert.deepEqual(JSON_VALUE_PREDICATES,members);assert.ok(Object.isFrozen(JSON_VALUE_PREDICATES));
 for(const member of members)for(const method of ['is_some_and','is_none_or'])for(const negated of [false,true]){assert.equal(canonicalJsonPredicateMember(member),true);const receiver='get("::serde_json::Value::'+member+' Ω😀")',row=expandCanonicalJsonOptionPredicate(receiver,method,member,negated,'__router_json_reader_0','__router_json_reader_1');assert.equal(row.paths.length,2);assert.ok(row.source.includes('{ '+(negated?'!':'')+'::serde_json::Value::'+member+'(__router_json_reader_1) }'));assert.ok(row.source.endsWith('else { '+(method==='is_none_or'?'true':'false')+' } }'));assert.ok(row.repository.includes('"::serde_json::Value::'+member+' Ω😀"'));for(const path of row.paths)assert.equal(row.source.slice(...path.span),path.expected);assert.equal(row.executableAdmission,false);}
 let calls=0;const object={toString(){calls++;return 'is_object';}};assert.equal(canonicalJsonPredicateMember(object),false);assert.throws(()=>expandCanonicalJsonOptionPredicate('value','is_some_and',object,false,'__router_json_reader_0','__router_json_reader_1'));assert.throws(()=>expandCanonicalJsonOptionPredicate('value','is_some_and','is_object',object,'__router_json_reader_0','__router_json_reader_1'));assert.equal(calls,0);assert.equal(canonicalJsonPredicateMember('is_bool'),false);
});
const source=members.map(member=>'pub fn some_'+member+'(value:&'+T+')->bool{value.get("field").is_some_and('+T+'::'+member+')}'+
 'pub fn none_'+member+'(value:&'+T+')->bool{value.get("field").is_none_or(|child|{child.'+member+'()})}').join('')+
 'pub fn negated(value:&'+T+')->bool{value.get("field").is_some_and(|child|!child.is_object())}';
test('all closed predicate forms retain original receivers terminal metadata staged CSTs and complete inverses',limits,()=>{
 const result=propose('// Ω😀\r\n'+source);assert.equal(selected(result).length,19);for(const row of selected(result)){assert.equal(row.executableAdmission,false);assert.equal(row.terminal.evaluationOrder[1],'Some-predicate-once');assert.equal(row.terminal.negated,row.function==='negated');}for(const row of result.proposals)inverse(row);assert.equal(result.after['src/lib.rs'].includes('.is_some_and('),false);assert.equal(result.after['src/lib.rs'].includes('.is_none_or('),false);
 const imported=propose('use serde_json::Value as V;pub fn selected(value:&V)->bool{value.get("field").is_some_and(V::is_object)}');assert.equal(selected(imported).length,1);assert.ok(selected(imported)[0].owner.import);
});
test('real emitted JS and independently strict TS preserve absent kinds and all numeric representation boundaries',limits,async()=>{
 const proposed=propose(source),result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposed.after),readSource:path=>proposed.after[path],cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs),deriveDependencies:loadDeriveDependencyProof(dependencyInputs),compilationProfile:PRODUCTION_PROFILE});for(const member of members)for(const prefix of ['some_','none_'])assert.ok(result.meta.executable.some(row=>row.name===prefix+member),prefix+member+JSON.stringify(result.meta.refused));assert.ok(result.meta.executable.some(row=>row.name==='negated'),JSON.stringify(result.meta.refused));const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await verifyTypedTargets(result,api=>{for(const member of members){assert.equal(api['some_'+member](json('{}')),false);assert.equal(api['none_'+member](json('{}')),true);}assert.equal(api.negated(json('{}')),false);for(const [text,wanted]of inputs){const value=json('{"field":'+text+'}');for(const member of members){assert.equal(api['some_'+member](value),wanted.includes(member),text+' '+member);assert.equal(api['none_'+member](value),wanted.includes(member),text+' '+member);}assert.equal(api.negated(value),text!=='{}');}},{childTimeoutMs:20000});
});
test('unknown methods captured expressions malformed callbacks and removed comments remain unselected',limits,()=>{
 for(const argument of [T+'::is_bool','Custom::is_object','|child|child.custom()','|child|child.is_object()&&ready','|child|!child.is_object(extra)','|child|{let result=child.is_object();result}','|value|value.is_object()','|child|child/*keep*/.is_object()']){const result=propose('pub fn pending(value:&'+T+')->bool{value.get("field").is_some_and('+argument+')}');assert.equal(selected(result).length,0,argument);assert.deepEqual(result.before,result.after);}
});
test('five whole compiler equations retain original sources ordered phases and complete inverses',limits,()=>{
 const plan=prepareJsonPredicateSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
