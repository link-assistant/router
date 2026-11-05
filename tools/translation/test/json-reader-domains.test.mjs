// Independent regression SOURCE, UNRUN during the complete bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandCanonicalJsonReader,canonicalJsonReaderMember} from '../core-json-reader-normalization.mjs';
import {proposeCoreJsonReadersCorpus,iterateCoreJsonReadersCorpusPackets} from '../migrate-core-json-readers.mjs';
import {prepareJsonReaderDomainSources} from '../prepare-json-reader-domain-sources.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},C='crate::translation_core::',T=C+'Json',M=C+'Maybe';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const files=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE});
const options=source=>({files:files(source),dependencyInputs,compilationProfile:PRODUCTION_PROFILE});
const propose=source=>proposeCoreJsonReadersCorpus(options(source));
const selected=value=>value.proposals.flatMap(row=>row.selections),some=field0=>({$:'Some',field0}),none={$:'None'};
function json(source){const row=serde_json_from_str(source);assert.equal(row.$,'Ok');return row.field0;}
function inverse(row){
 for(const name of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[name].meta).source,row[name].source);
 for(const stage of [...row.stages,row]){let source=stage.after.source;for(const part of [...stage.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}assert.equal(source,stage.before.source);}
 assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);
}
function project(after){return translateProject({entry:'src/lib.rs',paths:Object.keys(after),readSource:path=>after[path],cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs),deriveDependencies:loadDeriveDependencyProof(dependencyInputs),compilationProfile:PRODUCTION_PROFILE});}
test('all nine existing registered readers use exact generic equations and reject coercion without calling it',limits,()=>{
 for(const name of ['as_str','as_bool','as_u64','as_i64','as_null','as_f64','as_number','as_array','as_object']){
  assert.equal(canonicalJsonReaderMember(name),true);const row=expandCanonicalJsonReader('value.get("::serde_json::Value::'+name+'")',name,'__router_json_reader_0','__router_json_reader_1');assert.equal(row.paths.length,3);assert.ok(row.source.includes('::serde_json::Value::'+name+'(__router_json_reader_1)'));assert.ok(row.repository.includes(C+'Json::'+name+'(__router_json_reader_1)'));assert.ok(row.repository.includes('"::serde_json::Value::'+name+'"'));
 }
 for(const name of ['as_array_mut','as_object_mut','as_unregistered'])assert.equal(canonicalJsonReaderMember(name),false);
 let reads=0;const hook={toString(){reads++;return '__router_json_reader_0';}};assert.throws(()=>expandCanonicalJsonReader('value','as_str',hook,'__router_json_reader_1'));assert.equal(reads,0);assert.throws(()=>expandCanonicalJsonReader('x'.repeat(2000001),'as_str','__router_json_reader_0','__router_json_reader_1'));
});
test('written lifetimes standard carriers borrowed scalar keys and real canonical imports select without widening generic bounds',limits,()=>{
 const source='use serde_json::Value as V;\n'+
 "pub fn borrowed<'a>(value:Option<&'a V>,key:&str)->Option<&'a str>{value.and_then(V::as_str)}\n"+
 "pub fn field<'a,'b>(value:&'a "+T+",key:&'b str)->Option<&'a str>{value.get(key).and_then("+T+'::as_str)}\n'+
 "pub fn standard<'a>(value: ::core::option::Option<&'a "+T+">)->Option<&'a str>{value.and_then("+T+'::as_str)}\n'+
 "pub fn qualified<'a>(value: ::std::option::Option<&'a ::serde_json::Value>)->Option<&'a str>{value.and_then(::serde_json::Value::as_str)}";
 const result=propose(source);assert.deepEqual(selected(result).map(row=>row.function),['borrowed','field','standard','qualified']);for(const row of result.proposals)inverse(row);assert.ok(selected(result)[0].owner.import);assert.ok(result.after['src/lib.rs'].includes("pub fn field<'a,'b>"));assert.equal(selected(propose(result.after['src/lib.rs'].replace('pub mod translation_core;\n',''))).length,0);
});
test('collection number and float reads execute real emitted JS and separately strict compiled TS',limits,async()=>{
 const source="pub fn text<'a>(value:Option<&'a "+T+">)->Option<&'a str>{value.and_then("+T+'::as_str)}'+
 'pub fn array(value:'+M+'<&'+T+'>)->'+M+'<&Vec<'+T+'>>{value.and_then('+T+'::as_array)}'+
 'pub fn object(value:'+M+'<&'+T+'>)->'+M+'<&serde_json::Map<String,'+T+'>>{value.and_then('+T+'::as_object)}'+
 'pub fn number(value:'+M+'<&'+T+'>)->'+M+'<&serde_json::Number>{value.and_then('+T+'::as_number)}'+
 'pub fn decimal(value:'+M+'<&'+T+'>)->'+M+'<f64>{value.and_then('+T+'::as_f64)}';
 const proposed=propose(source),result=project(proposed.after);assert.equal(selected(proposed).length,5);for(const name of ['text','array','object','number','decimal'])assert.ok(result.meta.executable.some(row=>row.name===name),name+JSON.stringify(result.meta.refused));const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await verifyTypedTargets(result,api=>{
  for(const name of ['text','array','object','number','decimal'])assert.deepEqual(api[name](none),none);
  for(const [source,kind]of [['null','Null'],['false','Bool'],['""','String'],['"猫😀\\u0000"','String'],['[]','Array'],['[false,null,{"Ω":1}]','Array'],['{}','Object'],['{"__proto__":"safe"}','Object'],['0','Number'],['-1','Number'],['1.5','Number']]){
   const value=json(source),before=structuredClone(value);for(const [name,wanted]of [['text','String'],['array','Array'],['object','Object'],['number','Number']]){const result=api[name](some(value));assert.deepEqual(result,kind===wanted?some(value.field0):none,source+' '+name);if(kind===wanted&&name!=='text')assert.strictEqual(result.field0,value.field0);}
   assert.deepEqual(api.decimal(some(value)),kind==='Number'?some(Number(source)):none);assert.deepEqual(value,before);
  }
 },{childTimeoutMs:20000});
});
test('one full proposal composes object array try and scalar reads with nested generated path inverses',limits,async()=>{
 const source="pub fn object_text<'a>(value:&'a "+T+",key:&str)->Option<&'a str>{value.get(\"child\").and_then("+T+'::as_object)?.get(key).and_then('+T+'::as_str)}'+
 "pub fn array_text<'a>(value:&'a "+T+",index:usize)->Option<&'a str>{value.get(\"child\").and_then("+T+'::as_array)?.get(index).and_then('+T+'::as_str)}';
 const proposed=propose(source);assert.equal(selected(proposed).length,2);for(const row of selected(proposed)){assert.deepEqual(row.readers.map(reader=>reader.member),[row.function==='object_text'?'as_object':'as_array','as_str']);assert.equal(row.locals.length,4);}for(const row of proposed.proposals)inverse(row);const result=project(proposed.after);for(const name of ['object_text','array_text'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{assert.deepEqual(api.object_text(json('{"child":{"猫":"Ω😀"}}'),'猫'),some('Ω😀'));assert.deepEqual(api.object_text(json('{"child":{}}'),'猫'),none);assert.deepEqual(api.array_text(json('{"child":["猫😀"]}'),0n),some('猫😀'));assert.deepEqual(api.array_text(json('{"child":[]}'),0n),none);for(const value of ['null','{}','{"child":null}','{"child":false}']){assert.deepEqual(api.object_text(json(value),'x'),none);assert.deepEqual(api.array_text(json(value),0n),none);}},{childTimeoutMs:20000});
});
test('source proposals never turn incompatible returns or unknown type and lifetime producers into executable code',limits,()=>{
 const incompatible='pub fn wrong(value:&'+T+')->'+M+'<&str>{value.get("v").and_then('+T+'::as_f64)}',candidate=propose(incompatible);assert.equal(selected(candidate).length,1);assert.equal(project(candidate.after).meta.executable.some(row=>row.name==='wrong'),false);
 for(const source of [
  "pub fn pending<'a,T>(value:&'a "+T+")->Option<&'a str>{value.get(\"v\").and_then("+T+'::as_str)}',
  "pub fn pending<'a:'b,'b>(value:&'a "+T+")->Option<&'a str>{value.get(\"v\").and_then("+T+'::as_str)}',
  "pub fn pending<'a>(value:&'a mut "+T+")->Option<&'a str>{value.get(\"v\").and_then("+T+'::as_str)}',
  'pub fn pending(value:Custom)->Option<&str>{value.get("v").and_then('+T+'::as_str)}',
  'pub fn pending(value:&'+T+',index:i64)->Option<&str>{value.get(index).and_then('+T+'::as_str)}',
  'pub fn pending(value:&'+T+',key:&str)->Option<&str>{let key=unknown();value.get(key).and_then('+T+'::as_str)}',
  'pub fn pending(value:&'+T+')->Option<&str>{value'+'.get("x")?'.repeat(33)+'.and_then('+T+'::as_str)}',
 ]){const result=propose(source);assert.equal(selected(result).length,0,source);assert.deepEqual(result.before,result.after);}
});
test('both entry points retain the same shared selector and three complete compiler equations keep full originals',limits,()=>{
 const source="pub fn field<'a>(value:&'a "+T+",key:&str)->Option<&'a str>{value.get(key).and_then("+T+'::as_str)}',stream=iterateCoreJsonReadersCorpusPackets(options(source));let next;do{next=stream.next();}while(!next.done);stream.verify();assert.equal(next.value.summary.selections,1);const materialized=propose(source);assert.deepEqual(next.value.after,materialized.after);
 const plan=prepareJsonReaderDomainSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
