// Independent six-domain regression SOURCE. All new cases remain UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandCanonicalJsonReaderDefault} from '../canonical-json-reader-default-normalization.mjs';
import {proposeCoreJsonReadersCorpus} from '../migrate-core-json-readers.mjs';
import {prepareJsonReaderDefaultSources} from '../prepare-json-reader-default-sources.mjs';
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
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const files=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE});
const propose=source=>proposeCoreJsonReadersCorpus({files:files(source),dependencyInputs,compilationProfile:PRODUCTION_PROFILE});
const selected=result=>result.proposals.flatMap(row=>row.selections);
function inverse(row){for(const name of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[name].meta).source,row[name].source);for(const stage of [...row.stages,row]){let source=stage.after.source;for(const part of [...stage.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}assert.equal(source,stage.before.source);}assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}
function json(source){const result=serde_json_from_str(source);assert.equal(result.$,'Ok');return result.field0;}
test('concrete defaults use explicit language branches and change only one generated repository constructor',limits,()=>{
 for(const [member,fallback]of [['as_str','""'],['as_bool','false'],['as_u64','0_u64'],['as_i64','0_i64'],['as_f64','0.0_f64'],['as_null','()']]){
  const receiver='value.get("::core::option::Option::Some Ω😀")',input='__router_json_reader_2',payload='__router_json_reader_3',result=expandCanonicalJsonReaderDefault(receiver,member,input,payload);
  assert.equal(result.source,'{ let '+input+' = '+receiver+'; if let ::core::option::Option::Some('+payload+') = '+input+' { '+payload+' } else { '+fallback+' } }');assert.equal(result.defaultSource,fallback);assert.equal(result.borrowedDefault,member==='as_str');assert.equal(result.paths.length,1);assert.ok(result.repository.includes('"::core::option::Option::Some Ω😀"'));assert.ok(result.repository.includes('if let '+C+'Maybe::Some'));const path=result.paths[0];assert.equal(result.source.slice(...path.span),path.expected);
 }
 for(const member of ['as_array','as_object','as_number','custom'])assert.throws(()=>expandCanonicalJsonReaderDefault('value',member,'__router_json_reader_0','__router_json_reader_1'));
 let calls=0;const hook={toString(){calls++;return 'value';}};assert.throws(()=>expandCanonicalJsonReaderDefault(hook,'as_str','__router_json_reader_0','__router_json_reader_1'));assert.throws(()=>expandCanonicalJsonReaderDefault('value','as_str',hook,'__router_json_reader_1'));assert.equal(calls,0);
});
const source='pub fn text(value:&'+T+')->&str{value.get("v").and_then('+T+'::as_str).unwrap_or_default()}'+
 'pub fn boolean(value:&'+T+')->bool{value.get("v").and_then('+T+'::as_bool).unwrap_or_default()}'+
 'pub fn unsigned(value:&'+T+')->u64{value.get("v").and_then('+T+'::as_u64).unwrap_or_default()}'+
 'pub fn signed(value:&'+T+')->i64{value.get("v").and_then('+T+'::as_i64).unwrap_or_default()}'+
 'pub fn decimal(value:&'+T+')->f64{value.get("v").and_then('+T+'::as_f64).unwrap_or_default()}'+
 'pub fn unit(value:&'+T+'){value.get("v").and_then('+T+'::as_null).unwrap_or_default()}';
test('six full reader/default proposals retain nested generated spans staged CSTs and whole inverses',limits,()=>{
 const result=propose('// Ω😀\r\n'+source);assert.equal(selected(result).length,6);assert.deepEqual(selected(result).map(row=>row.fallback.defaultSource),['""','false','0_u64','0_i64','0.0_f64','()']);for(const row of result.proposals)inverse(row);for(const row of selected(result)){assert.equal(row.fallback.method,'unwrap_or_default');assert.equal(row.locals.length,4);assert.equal(row.executableAdmission,false);}assert.equal(result.after['src/lib.rs'].includes('.unwrap_or_default()'),false);assert.equal(result.after['src/lib.rs'].includes('::core::option::Option::Some'),false);assert.ok(result.after['src/lib.rs'].includes('// Ω😀\r\n'));
});
test('actual JS and separately strict TS retain missing wrong kind empty integer extrema f64 and unit results',limits,async()=>{
 const proposed=propose(source),result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposed.after),readSource:path=>proposed.after[path],cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs),deriveDependencies:loadDeriveDependencyProof(dependencyInputs),compilationProfile:PRODUCTION_PROFILE});for(const name of ['text','boolean','unsigned','signed','decimal','unit'])assert.ok(result.meta.executable.some(row=>row.name===name),name+JSON.stringify(result.meta.refused));const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await verifyTypedTargets(result,api=>{
  for(const input of ['null','{}','{"v":null}','{"v":[]}','{"v":{}}']){const value=json(input);assert.equal(api.text(value),'');assert.equal(api.boolean(value),false);assert.equal(api.unsigned(value),0n);assert.equal(api.signed(value),0n);assert.ok(Object.is(api.decimal(value),0));assert.equal(api.unit(value),null);}
  for(const input of ['{"v":""}','{"v":"猫😀\\u0000\\r\\n"}']){const value=json(input),expected=JSON.parse(input).v;assert.equal(api.text(value),expected);}
  assert.equal(api.boolean(json('{"v":true}')),true);assert.equal(api.boolean(json('{"v":false}')),false);assert.equal(api.unsigned(json('{"v":18446744073709551615}')),18446744073709551615n);assert.equal(api.signed(json('{"v":-9223372036854775808}')),-9223372036854775808n);assert.equal(api.signed(json('{"v":18446744073709551615}')),0n);assert.equal(api.unsigned(json('{"v":-1}')),0n);assert.equal(api.decimal(json('{"v":1.5}')),1.5);assert.ok(Object.is(api.decimal(json('{"v":-0.0}')),-0));
 },{childTimeoutMs:20000});
});
test('collection owners custom defaults arguments and removed comments never select a concrete scalar default',limits,()=>{
 for(const suffix of ['.unwrap_or_default(custom())','.unwrap_or_else(custom)','.unwrap_or_default/*preserve*/()']){const result=propose('pub fn pending(value:&'+T+')->&str{value.get("v").and_then('+T+'::as_str)'+suffix+'}');assert.equal(selected(result).length,1);assert.equal(selected(result)[0].fallback,null);assert.ok(result.after['src/lib.rs'].includes(suffix));}
 const array=propose('pub fn pending(value:&'+T+')->&Vec<'+T+'>{value.get("v").and_then('+T+'::as_array).unwrap_or_default()}');assert.equal(selected(array)[0].fallback,null);assert.ok(array.after['src/lib.rs'].includes('.unwrap_or_default()'));assert.equal(selected(propose('pub fn pending(value:Custom)->bool{value.and_then(Custom::as_bool).unwrap_or_default()}')).length,0);
});
test('four whole source copies keep complete originals both rule phases and physical inverses',limits,()=>{
 const plan=prepareJsonReaderDefaultSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
