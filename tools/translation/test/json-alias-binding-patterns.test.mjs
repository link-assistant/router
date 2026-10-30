// Independent binding/type separation regression SOURCE. All cases are UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeCoreJsonReadersCorpus} from '../migrate-core-json-readers.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareJsonAliasBindingPatternSources} from '../prepare-json-alias-binding-pattern-sources.mjs';
const limits={timeout:60000},C='crate::translation_core::',T=C+'Json';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
function propose(source){return proposeCoreJsonReadersCorpus({files:{'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE},dependencyInputs});}
const selected=result=>result.proposals.flatMap(row=>row.selections);
test('qualified owned and standard Option annotations describe an alias type without binding their path words',limits,()=>{
 for(const annotation of [C+'Maybe<&'+T+'>','::core::option::Option<&'+T+'>','::std::option::Option<&'+T+'>']){
  const source='pub fn typed(value:&'+T+')->Option<&str>{let child:'+annotation+' = value.get("v");child.and_then('+T+'::as_str)}',result=propose(source);assert.equal(selected(result).length,1,annotation);assert.equal(selected(result)[0].sourceAliasOrigins[0].name,'child');assert.ok(selected(result)[0].sourceAliasOrigins[0].source.includes(annotation));const row=result.proposals[0];assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);
 }
});
test('genuine renamed canonical types remain source-bound in annotations and actual owner bindings still refuse',limits,()=>{
 const source='use serde_json::Value as V;pub fn typed(value:&V)->Option<&str>{let child:Option<&V> = value.get("v");child.and_then(V::as_str)}',result=propose(source);assert.equal(selected(result).length,1);assert.ok(selected(result)[0].owner.import);
 for(const body of ['let V=value.get("v");V.and_then(V::as_str)','let serde_json=value.get("v");serde_json.and_then(V::as_str)','let child:Custom = value.get("v");child.and_then(V::as_str)','let mut child:Option<&V> = value.get("v");child.and_then(V::as_str)','let Some(child):Option<&V> = value.get("v")else{return None;};child.and_then(V::as_str)']){const value=propose('use serde_json::Value as V;pub fn pending(value:&V)->Option<&str>{'+body+'}');assert.equal(selected(value).length,0,body);assert.deepEqual(value.before,value.after);}
});
test('two complete copied compiler sources retain original owner bodies ordered phases and physical inverses',limits,()=>{
 const plan=prepareJsonAliasBindingPatternSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
