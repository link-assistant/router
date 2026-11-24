// Independent stage-to-stage composition SOURCE. Entire file UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJsonFieldCallSource,readJsonFieldReferenceSourceRole} from '../json-field-call-source.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {prepareJsonFieldStageJoinSources} from '../prepare-json-field-stage-join-sources.mjs';
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
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},T='crate::translation_core::Json',F='crate::translation_json_fields_core::',tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
import {proposeCoreJsonFieldCorpus as ordinary} from '../migrate-core-json-fields.mjs';
import {proposeCoreJsonFieldCorpus as sourceBound} from '../source-bound-owned-migrate-core-json-fields.mjs';
import {prepareRustTryTokenSources} from '../prepare-rust-try-token-sources.mjs';
import {splitRustTryDotSourceTokens} from '../rust-try-token-source.mjs';
const bodies=`pub fn borrowed(value:&${T})->Option<&str>{Some(value.get("name")?.as_str()?.trim())}
pub fn owned(value:&${T})->Option<String>{Some(value.get("name")?.as_str()?.trim().to_owned())}
pub fn local(value:&${T})->Option<String>{let selected=value.get("name")?.as_str()?;Some(selected.trim().to_string())}`;
function input(body=bodies){const modules={translation_json_fields_core:JSON_FIELDS_NATIVE_SOURCE,translation_text_core:TEXT_NATIVE_SOURCE,translation_primitive_option_core:PRIMITIVE_OPTION_NATIVE_SOURCE,translation_primitive_option_callbacks_core:PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE,translation_integer_core:INTEGER_NATIVE_SOURCE},files={'src/lib.rs':'pub mod translation_core;\n'+Object.keys(modules).map(name=>'pub mod '+name+';').join('\n')+'\n// Ω😀 actual stage composition source\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};for(const [name,source]of Object.entries(modules))files['src/'+name+'.rs']=source;return {entry:'src/lib.rs',files,dependencyInputs:{...cargo},compilationProfile:PRODUCTION_PROFILE};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
test('actual shared lexer compound punctuation becomes a separate scoped source view without changing original tokens or CST',limits,()=>{
 const source='// Ω😀 UTF-16 offsets\npub fn caller(value: Option<&str>) -> Option<&str> { Some(value?.trim()) }',raw=tokens(source),snapshot=JSON.stringify(raw);assert.ok(raw.some(row=>row.text==='?.'));const view=splitRustTryDotSourceTokens(raw,source);assert.equal(JSON.stringify(raw),snapshot);assert.equal(view.some(row=>row.text==='?.'),false);const combined=raw.find(row=>row.text==='?.'),first=view.find(row=>row.start===combined.start),second=view.find(row=>row.start===combined.start+1);assert.equal(first.text,'?');assert.equal(second.text,'.');assert.equal(first.end,second.start);assert.equal(second.end,combined.end);assert.equal(source.slice(first.start,second.end),'?.');const concrete=transportConcreteSyntaxMeta(concreteSource(source,{language:'Rust'}).meta);assert.equal(concrete.source,source);
});
import {transportConcreteSyntaxSource as concreteSource} from '../concrete-syntax-meta.mjs';
test('already separated punctuation literal contents and unrelated native tokens keep their exact original source positions',limits,()=>{
 for(const source of ['value ? . trim()', 'r#"?."#', '"?."', 'value?']){const raw=tokens(source),view=splitRustTryDotSourceTokens(raw,source);assert.strictEqual(view,raw);assert.deepEqual(view,raw);}const source='😀?.',row={type:'punct',text:'?.',start:2,end:4};assert.deepEqual(splitRustTryDotSourceTokens([row],source).map(row=>[row.text,row.start,row.end]),[['?',2,3],['.',3,4]]);for(const invalid of [{...row,start:1},{...row,end:5},{...row,type:'string'}])assert.throws(()=>splitRustTryDotSourceTokens([invalid],source),/Exact original/u);assert.throws(()=>splitRustTryDotSourceTokens([row],'😀..'),/Exact original/u);
});
for(const [label,propose]of [['ordinary',ordinary],['source-bound',sourceBound]])test(label+' matches physically joined Try/dot source and preserves all original inverses and the final Try',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,3);assert.ok(row.selections.every(row=>row.optionTryChain.retainedOuterTry));assert.ok(row.after.source.includes(F+'json_str_field(value, "name")?.trim()'));for(const selection of row.selections){assert.equal(selection.executableAdmission,false);assert.equal(selection.optionTryChain.originalFromResidualProved,false);}
});
test('actual field and text stages lower physically joined Try chains into independent JS and strict TypeScript without lexer changes',limits,async()=>{
 const request=input(),first=await proposeSourceBoundOwnedCoreStage('json-fields',request);assert.equal(rejoin(first,request.files['src/lib.rs']).edits.length,3);const next={...request,files:first.after},second=await proposeSourceBoundOwnedCoreStage('text-methods',next);assert.equal(rejoin(second,next.files['src/lib.rs']).edits.length,3);const files=second.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['borrowed','owned','local'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const name of ['borrowed','owned','local']){assert.deepEqual(api[name](object([['name',text(' é😀 ')]])),{$:'Some',field0:'é😀'});assert.deepEqual(api[name](nil()),{$:'None'});assert.deepEqual(api[name](object([['name',text('')]])),{$:'Some',field0:''});}},{childTimeoutMs:20000});
});
test('all four complete source equations retain the original actual lexer and two compiler CST sequences',limits,()=>{
 const plan=prepareRustTryTokenSources();assert.equal(plan.files.length,4);assert.equal(plan.files.some(row=>row.path.endsWith('/vendor/formal-ai/lexer.mjs')||row.path.endsWith('/rust-structure.mjs')),false);assert.equal(plan.receivingExecuted,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
});
