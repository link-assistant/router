// Independent public/bulk receiving regression SOURCE. Every new case is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeCoreJsonReadersCorpus,iterateCoreJsonReadersCorpusPackets} from '../migrate-core-json-readers.mjs';
import {proposeCoreJsonReadersCorpus as sourceBound} from '../source-bound-owned-migrate-core-json-readers.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {prepareSharedJsonSelectorSources} from '../prepare-shared-json-selector-sources.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const limits={timeout:60000},C='crate::translation_core::',T=C+'Json';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const files=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE}),options=source=>({files:files(source),dependencyInputs,compilationProfile:PRODUCTION_PROFILE}),selected=value=>value.proposals.flatMap(row=>row.selections);
function inverse(row){for(const name of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[name].meta).source,row[name].source);for(const stage of [...row.stages,row]){let source=stage.after.source;for(const part of [...stage.mapping].reverse())if(part.kind==='substitution'){assert.equal(source.slice(...part.after),part.replacement);source=source.slice(0,part.after[0])+part.expected+source.slice(part.after[1]);}assert.equal(source,stage.before.source);}assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);}
const source="pub fn nested<'a>(value:&'a "+T+")->Option<&'a str>{value.get(\"parent\").and_then(|child|child.get(\"name\")).and_then("+T+'::as_str)}'+
 'pub fn fallback(value:&'+T+',default:f64)->f64{value.get("v").and_then('+T+'::as_f64).unwrap_or(default)}'+
 'pub fn predicate(value:&'+T+')->bool{value.get("v").is_none_or(|child|!child.is_object())}'+
 "pub fn alias<'a>(value:&'a "+T+")->Option<&'a str>{let child=value.as_object().and_then(|object|object.get(\"v\"));child.and_then("+T+'::as_str)}'+
 'pub fn filtered(value:&'+T+')->bool{value.get("v").filter(|child|child.is_object()).is_some()}';
test('ordinary, detached, source-bound and actual bulk stage paths use the same current selector without merging proof contexts',limits,async()=>{
 const request=options('// Ω😀\r\n'+source),ordinary=proposeCoreJsonReadersCorpus(request),bound=sourceBound(request),bulk=await proposeSourceBoundOwnedCoreStage('json-readers',request);assert.equal(selected(ordinary).length,6);for(const result of [ordinary,bound,bulk]){assert.equal(selected(result).length,6);assert.deepEqual(result.after,ordinary.after);assert.equal(result.executableAdmission,false);assert.equal(result.migrationSemantics.includes('fresh semantic checks required'),true);for(const row of result.proposals)inverse(row);}
 assert.deepEqual(selected(bound).map(row=>[row.function,row.span,row.member]),selected(ordinary).map(row=>[row.function,row.span,row.member]));assert.deepEqual(selected(bulk).map(row=>[row.function,row.span,row.member]),selected(ordinary).map(row=>[row.function,row.span,row.member]));
 const stream=iterateCoreJsonReadersCorpusPackets(request);let next;do{next=stream.next();}while(!next.done);stream.verify();assert.deepEqual(next.value.after,ordinary.after);assert.equal(next.value.summary.selections,6);
});
test('both outer guard domains still refuse competing canonical bindings custom receivers and callback capture shapes',limits,()=>{
 for(const source of ['struct Value;pub fn pending(value:&Value)->bool{value.get("v").is_some()}','pub fn pending(value:Custom)->bool{value.get("v").is_some()}','pub fn pending(value:&'+T+')->bool{value.get("v").is_some_and(|child|child.is_object()&&ready)}','pub fn pending(value:&'+T+')->bool{value.get("v").filter(|value|value.is_object()).is_some()}'])for(const propose of [proposeCoreJsonReadersCorpus,sourceBound]){const result=propose(options(source));assert.equal(selected(result).length,0,source);assert.deepEqual(result.before,result.after);assert.equal(result.executableAdmission,false);}
});
test('ordinary and bulk original own-data guards refuse source accessors without executing them',limits,async()=>{
 let reads=0;const request=options('pub fn selected(value:&'+T+')->bool{value.get("v").is_some()}');Object.defineProperty(request.files,'src/hidden.rs',{enumerable:true,get(){reads++;throw Error('source getter executed');}});assert.throws(()=>proposeCoreJsonReadersCorpus(request),/own data|accessor/u);assert.throws(()=>sourceBound(request),/own data|accessor/u);await assert.rejects(()=>proposeSourceBoundOwnedCoreStage('json-readers',request),/own data|accessor/u);assert.equal(reads,0);
});
test('public synchronization facade exposes source proposal DATA without installing or admitting the result',limits,async()=>{
 const facade=await import('../source-synchronization.mjs'),result=facade.proposeCoreJsonReadersCorpus(options('pub fn present(value:&'+T+')->bool{value.get("v").is_some()}'));assert.equal(selected(result).length,1);assert.equal(result.executableAdmission,false);assert.deepEqual(facade.JSON_VALUE_PREDICATES,['is_null','is_boolean','is_number','is_string','is_array','is_object','is_u64','is_i64','is_f64']);const source=facade.expandCanonicalJsonOptionFilter('value','is_object',false,'__router_json_reader_0','__router_json_reader_1');assert.equal(source.executableAdmission,false);assert.equal(source.paths.length,5);
});
test('five whole source equations retain complete copied implementation owners phases and full inverses',limits,()=>{
 const plan=prepareSharedJsonSelectorSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
