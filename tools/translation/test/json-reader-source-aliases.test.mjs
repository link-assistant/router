// Independent lexical alias regression SOURCE. All new cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeCoreJsonReadersCorpus,iterateCoreJsonReadersCorpusPackets} from '../migrate-core-json-readers.mjs';
import {prepareJsonReaderAliasSources} from '../prepare-json-reader-alias-sources.mjs';
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
const options=source=>({files:files(source),dependencyInputs,compilationProfile:PRODUCTION_PROFILE}),propose=source=>proposeCoreJsonReadersCorpus(options(source)),selected=result=>result.proposals.flatMap(row=>row.selections);
function inverse(row){for(const key of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[key].meta).source,row[key].source);for(const stage of [...row.stages,row]){let source=stage.after.source;for(const part of [...stage.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}assert.equal(source,stage.before.source);}assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);}
function json(source){const row=serde_json_from_str(source);assert.equal(row.$,'Ok');return row.field0;}
const some=field0=>({$:'Some',field0}),none={$:'None'};
const source="pub fn alias<'a>(value:&'a "+T+")->"+M+"<&'a str>{let child=value.get(\"v\");child.and_then("+T+'::as_str)}'+
 "pub fn shadow<'a>(value:&'a "+T+")->"+M+"<&'a str>{let value=value.get(\"v\");value.and_then("+T+'::as_str)}'+
 "pub fn typed<'a>(value:&'a "+T+")->"+M+"<&'a str>{let child:"+M+"<&'a "+T+"> = value.get(\"v\");child.and_then("+T+'::as_str)}'+
 "pub fn key<'a>(value:&'a "+T+")->"+M+"<&'a str>{let key=\"v\";let child=value.get(key);child.and_then("+T+'::as_str)}'+
 "pub fn array<'a>(value:&'a "+T+")->"+M+"<&'a str>{let array=value.as_array()?;let index:usize=0;array.get(index).and_then("+T+'::as_str)}'+
 "pub fn object<'a>(value:&'a "+T+")->"+M+"<&'a str>{let map=value.as_object()?;map.get(\"v\").and_then("+T+'::as_str)}'+
 'pub fn defaulted(value:&'+T+')->&str{let child=value.get("v");child.and_then('+T+'::as_str).unwrap_or_default()}';
test('immutable reader aliases ordinary same-name shadow typed aliases keys and shared collection loans select with original source chains',limits,()=>{
 const result=propose('// Ω😀\r\n'+source);assert.deepEqual(selected(result).map(row=>row.function),['alias','shadow','typed','key','array','object','defaulted']);for(const row of result.proposals)inverse(row);for(const row of selected(result)){assert.ok(row.sourceAliasOrigins.length>0,row.function);for(const origin of row.sourceAliasOrigins){assert.equal(result.before['src/lib.rs'].slice(...origin.span),origin.source);assert.equal(origin.sourceRoleOnly,true);}assert.equal(row.executableAdmission,false);}assert.ok(result.after['src/lib.rs'].includes('// Ω😀\r\n'));assert.equal(selected(result).find(row=>row.function==='defaulted').fallback.defaultSource,'""');
});
test('real emitted JavaScript and separately strict compiled TypeScript preserve aliases absent values and borrowed collection roots',limits,async()=>{
 const proposed=propose(source),result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposed.after),readSource:path=>proposed.after[path],cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs),deriveDependencies:loadDeriveDependencyProof(dependencyInputs),compilationProfile:PRODUCTION_PROFILE});for(const name of ['alias','shadow','typed','key','array','object','defaulted'])assert.ok(result.meta.executable.some(row=>row.name===name),name+JSON.stringify(result.meta.refused));const wire=JSON.stringify(result.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await verifyTypedTargets(result,api=>{for(const text of ['','猫😀\0\r\n']){const value=json(JSON.stringify({v:text})),before=structuredClone(value);for(const name of ['alias','shadow','typed','key','object'])assert.deepEqual(api[name](value),some(text),name);assert.equal(api.defaulted(value),text);assert.deepEqual(api.array(json(JSON.stringify([text]))),some(text));assert.deepEqual(value,before);}for(const text of ['null','{}','{"v":null}','{"v":false}']){const value=json(text);for(const name of ['alias','shadow','typed','key','object'])assert.deepEqual(api[name](value),none,name);assert.equal(api.defaulted(value),'');}assert.deepEqual(api.array(json('[]')),none);assert.deepEqual(api.array(json('[null]')),none);},{childTimeoutMs:20000});
});
test('nested lexical scopes restore outer source aliases and never admit an unknown inner replacement',limits,()=>{
 const source="pub fn scopes<'a>(value:&'a "+T+",other:&'a "+T+",inner:bool)->"+M+"<&'a str>{let child=value.get(\"v\");if inner{let child=other.get(\"v\");child.and_then("+T+'::as_str)}else{child.and_then('+T+'::as_str)}}',result=propose(source),rows=selected(result);assert.equal(rows.length,2);assert.deepEqual(rows.map(row=>row.receiver.formal.formalSourceName),['other','value']);assert.equal(rows[0].sourceAliasOrigins.length,1);assert.equal(rows[1].sourceAliasOrigins.length,1);inverse(result.proposals[0]);
 const unknown=propose('pub fn scopes(value:&'+T+')->'+M+'<&str>{let child=value.get("v");{let child=custom();child.and_then('+T+'::as_str);}child.and_then('+T+'::as_str)}');assert.equal(selected(unknown).length,1);assert.ok(unknown.after['src/lib.rs'].includes('let child=custom();child.and_then('+T+'::as_str)'));
});
test('mutable destructured conditional callback match and unknown aliases cannot reuse an outer source role',limits,()=>{
 for(const body of [
  'let mut child=value.get("v");child.and_then('+T+'::as_str)',
  'let child=value.get("v");let child=custom();child.and_then('+T+'::as_str)',
  'let value=custom();value.and_then('+T+'::as_str)',
  'let child=value.get("v");if let Some(child)=custom(){child.and_then('+T+'::as_str)}else{None}',
  'let child=value.get("v");unknown(|child|child.and_then('+T+'::as_str))',
  'let child=value.get("v");match custom(){child=>child.and_then('+T+'::as_str)}',
  'let child=value.get("v");let (child,_)=custom();child.and_then('+T+'::as_str)',
  'let child:Custom=value.get("v");child.and_then('+T+'::as_str)',
 ]){const result=propose('pub fn pending(value:&'+T+')->'+M+'<&str>{'+body+'}');assert.equal(selected(result).length,0,body);assert.deepEqual(result.before,result.after,body);}
 let body='let child0=value.get("v");';for(let at=1;at<=33;at++)body+='let child'+at+'=child'+(at-1)+';';body+='child33.and_then('+T+'::as_str)';assert.equal(selected(propose('pub fn pending(value:&'+T+')->'+M+'<&str>{'+body+'}')).length,0);
});
test('contextual and written usize indices remain distinct from signed and custom aliases',limits,()=>{
 const direct=propose('pub fn direct(value:&'+T+')->'+M+'<&str>{value.get(0_usize).and_then('+T+'::as_str)}');assert.equal(selected(direct).length,1);assert.ok(direct.after['src/lib.rs'].includes('value.get(0_usize)'));
 for(const declared of ['i64','u64','Custom']){const result=propose('pub fn pending(value:&'+T+')->'+M+'<&str>{let index:'+declared+'=0;value.get(index).and_then('+T+'::as_str)}');assert.equal(selected(result).length,0,declared);}
});
test('detached packets use the same alias scope and three complete source equations keep original phases and inverses',limits,()=>{
 const source="pub fn alias<'a>(value:&'a "+T+")->"+M+"<&'a str>{let child=value.get(\"v\");child.and_then("+T+'::as_str)}',stream=iterateCoreJsonReadersCorpusPackets(options(source));let next;do{next=stream.next();}while(!next.done);stream.verify();assert.equal(next.value.summary.selections,1);assert.deepEqual(next.value.after,propose(source).after);
 const plan=prepareJsonReaderAliasSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
