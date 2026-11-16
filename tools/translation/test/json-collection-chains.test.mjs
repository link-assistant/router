// Independent shared collection-chain regression SOURCE. Every case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandCanonicalJsonOptionFilter} from '../canonical-json-option-terminal-normalization.mjs';
import {proposeCoreJsonReadersCorpus,iterateCoreJsonReadersCorpusPackets} from '../migrate-core-json-readers.mjs';
import {prepareJsonCollectionChainSources} from '../prepare-json-collection-chain-sources.mjs';
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
const files=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE}),options=source=>({files:files(source),dependencyInputs,compilationProfile:PRODUCTION_PROFILE}),propose=source=>proposeCoreJsonReadersCorpus(options(source)),selected=value=>value.proposals.flatMap(row=>row.selections);
function json(source){const result=serde_json_from_str(source);assert.equal(result.$,'Ok');return result.field0;}
function inverse(row){for(const name of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[name].meta).source,row[name].source);for(const stage of [...row.stages,row]){let source=stage.after.source;for(const part of [...stage.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}assert.equal(source,stage.before.source);}assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);}
test('filter builds all five exact constructor/callee paths without searching receiver source',limits,()=>{
 const receiver='get("::core::option::Option::Some ::serde_json::Value::is_object Ω😀")',row=expandCanonicalJsonOptionFilter(receiver,'is_object',false,'__router_json_reader_0','__router_json_reader_1');assert.equal(row.paths.length,5);assert.deepEqual(row.paths.map(path=>path.expected),['::core::option::Option::Some','::serde_json::Value::is_object','::core::option::Option::Some','::core::option::Option::None','::core::option::Option::None']);assert.ok(row.repository.includes('"::core::option::Option::Some ::serde_json::Value::is_object Ω😀"'));assert.ok(row.source.includes('if ::serde_json::Value::is_object(__router_json_reader_1) { ::core::option::Option::Some(__router_json_reader_1) }'));assert.deepEqual(row.evaluationOrder,['receiver-once','Some-predicate-once','preserve-matching-shared-payload','None-without-predicate']);for(const path of row.paths)assert.equal(row.source.slice(...path.span),path.expected);
 const negated=expandCanonicalJsonOptionFilter('value','is_null',true,'__router_json_reader_2','__router_json_reader_3');assert.ok(negated.source.includes('if !::serde_json::Value::is_null('));let calls=0;const object={toString(){calls++;return 'is_object';}};assert.throws(()=>expandCanonicalJsonOptionFilter('value',object,false,'__router_json_reader_0','__router_json_reader_1'));assert.equal(calls,0);
});
const source="pub fn object_text<'a>(value:&'a "+T+")->Option<&'a str>{value.as_object().and_then(|object|object.get(\"kind\")).and_then("+T+'::as_str)}'+
 "pub fn array_text<'a>(value:&'a "+T+",index:usize)->Option<&'a str>{value.as_array().and_then(|items|{items.get(index)}).and_then("+T+'::as_str)}'+
 "pub fn filtered<'a>(value:&'a "+T+")->Option<&'a "+T+'> {value.get("schema").filter(|child|child.is_object())}'+
 'pub fn nonnull(value:&'+T+')->bool{value.get("field").filter(|child|!child.is_null()).is_some()}'+
 "pub fn schema<'a>(value:&'a "+T+")->"+C+"Outcome<&'a "+T+',String>{value.get("schema").filter(|child|child.is_object()).ok_or_else(||'+C+'format!("{}","schema must be an object"))}'+
 "pub fn aliased<'a>(value:&'a "+T+")->Option<&'a str>{let field=value.as_object().and_then(|object|object.get(\"kind\"));field.and_then("+T+'::as_str)}';
test('direct collection reads, closed field callbacks, filters and delayed aliases compose in both selectors',limits,()=>{
 const result=propose('// Ω😀\r\n'+source);assert.equal(selected(result).length,7);assert.deepEqual(selected(result).filter(row=>row.function==='object_text')[0].readers.map(row=>row.member),['get','as_str']);assert.equal(selected(result).filter(row=>row.function==='filtered')[0].readers[0].member,'filter');const aliases=selected(result).filter(row=>row.function==='aliased');assert.equal(aliases.length,2);assert.equal(aliases[1].sourceAliasOrigins[0].name,'field');assert.equal(aliases[1].sourceAliasOrigins[0].sourceRoleOnly,true);assert.ok(result.after['src/lib.rs'].includes('.ok_or_else(||'));assert.equal(result.after['src/lib.rs'].includes('.filter('),false);for(const row of result.proposals)inverse(row);
 const stream=iterateCoreJsonReadersCorpusPackets(options('// Ω😀\r\n'+source));let next;do{next=stream.next();}while(!next.done);stream.verify();assert.deepEqual(next.value.after,result.after);assert.equal(next.value.summary.selections,7);
});
test('real emitted JS and strict TS retain borrowed field identity and reuse the original lazy error conversion',limits,async()=>{
 const proposed=propose(source),result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposed.after),readSource:path=>proposed.after[path],cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs),deriveDependencies:loadDeriveDependencyProof(dependencyInputs),compilationProfile:PRODUCTION_PROFILE});for(const name of ['object_text','array_text','filtered','nonnull','schema','aliased'])assert.ok(result.meta.executable.some(row=>row.name===name),name+JSON.stringify(result.meta.refused));const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await verifyTypedTargets(result,api=>{
  for(const text of ['null','false','[]','{}','{"kind":false}']){assert.deepEqual(api.object_text(json(text)),{$:'None'});assert.deepEqual(api.aliased(json(text)),{$:'None'});}for(const value of ['', '猫😀\0']){const row=json(JSON.stringify({kind:value}));assert.deepEqual(api.object_text(row),{$:'Some',field0:value});assert.deepEqual(api.aliased(row),{$:'Some',field0:value});}
  const array=json('["猫😀",false]');assert.deepEqual(api.array_text(array,0n),{$:'Some',field0:'猫😀'});assert.deepEqual(api.array_text(array,1n),{$:'None'});assert.deepEqual(api.array_text(array,2n),{$:'None'});
  for(const [text,valid]of [['{}',false],['{"schema":null}',false],['{"schema":[]}',false],['{"schema":{}}',true],['{"schema":{"type":"string"}}',true]]){const input=json(text),filtered=api.filtered(input),outcome=api.schema(input);assert.equal(filtered.$,valid?'Some':'None');assert.equal(outcome.$,valid?'Ok':'Err');if(valid){const expected=input.field0.entries.find(row=>row.key==='schema').value;assert.strictEqual(filtered.field0,expected);assert.strictEqual(outcome.field0,expected);}else assert.equal(outcome.field0,'schema must be an object');}
  for(const [text,wanted]of [['{}',false],['{"field":null}',false],['{"field":false}',true],['{"field":0}',true],['{"field":[]}',true]])assert.equal(api.nonnull(json(text)),wanted);
 },{childTimeoutMs:20000});
});
test('collection key domains and arbitrary filter callbacks stay explicit refusals',limits,()=>{
 for(const body of ['value.as_object().and_then(|object|object.get(0))','value.as_array().and_then(|items|items.get("x"))','value.get("schema").filter('+T+'::is_object)','value.get("schema").filter(|child|child.is_object()&&ready)','value.get("schema").filter(|child|{child.is_object();true})','value.get("schema").filter(|child|child.is_object(extra))','value.get("schema").filter(|child|child/*keep*/.is_object())']){const result=propose('pub fn pending(value:&'+T+')->Option<&'+T+'>{'+body+'}');assert.equal(selected(result).length,0,body);assert.deepEqual(result.before,result.after);}
});
test('four complete compiler equations retain originals native owners ordered phases and full inverses',limits,()=>{
 const plan=prepareJsonCollectionChainSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
