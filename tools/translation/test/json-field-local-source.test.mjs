// Independent shared JSON/key/index alias regression SOURCE. All cases UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {createJsonFieldLocalSource} from '../json-field-local-source.mjs';
import {proposeCoreJsonFieldCorpus} from '../migrate-core-json-fields.mjs';
import {proposeCoreJsonFieldCorpus as proposeSourceBoundFields} from '../source-bound-owned-migrate-core-json-fields.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../json-fields-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as boolean,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
import {prepareJsonFieldLocalSources} from '../prepare-json-field-local-sources.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},T='crate::translation_core::Json',M='crate::translation_core::Maybe',tokens=source=>rustTokens(source).filter(row=>row.type!=='comment');
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_json_fields_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_json_fields_core.rs':JSON_FIELDS_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(row);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
test('shared receiver text and usize aliases retain independent source spans and lexical scope',limits,()=>{
 const source='let receiver=value;let lookup=key;probe(receiver);{let hidden=receiver;probe(hidden);}probe(hidden);let amount=index;probe(amount);',rows=tokens(source),provider=createJsonFieldLocalSource(rows,new Map([['value','json-reference'],['key','str'],['index','usize-count']]),new Set(['value','key','index'])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);for(const [at,probe]of probes.entries()){assert.equal(provider.at(probe.position).get(probe.name),['json-reference','json-reference',undefined,'usize-count'][at]);const fact=provider.evidence(probe.name);if(fact){assert.equal(fact.semanticAuthority,false);assert.equal(fact.sourceAuthority,false);assert.ok(source.slice(...fact.span).startsWith('let '));}}assert.ok(provider.names.has('lookup'));assert.throws(()=>provider.at(0),/monotonic/u);
});
const source=[
 `pub fn aliases<'a>(value:&'a ${T},key:&str)->${M}<&'a ${T}>{let receiver=value;let lookup=key;receiver.get(lookup)}`,
 `pub fn literal<'a>(value:&'a ${T})->${M}<&'a ${T}>{let lookup="label";value.get(lookup)}`,
 `pub fn owned<'a>(value:&'a ${T},key:String)->${M}<&'a ${T}>{let lookup=key.as_str();value.get(lookup)}`,
 `pub fn direct<'a>(value:&'a ${T},key:String)->${M}<&'a ${T}>{value.get(key.as_str())}`,
 `pub fn indexed(value:&${T},index:usize)->${M}<&${T}>{value.get(index)}`,
 `pub fn local_index(value:&${T})->${M}<&${T}>{let index=1_usize;let receiver=value;receiver.get(index)}`,
 `pub fn scalar<'a>(value:&'a ${T},key:&str)->${M}<&'a str>{let receiver=value;let lookup=key;receiver.get(lookup).and_then(|item|item.as_str())}`,
].join('\n');
for(const [name,propose]of [['ordinary',proposeCoreJsonFieldCorpus],['source-bound',proposeSourceBoundFields]])test(name+' actual local and direct view/index readers preserve complete source and both real phases',limits,()=>{
 const request=input(source),proposal=propose(request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,7);assert.deepEqual(row.selections.map(part=>part.operation),['json_field','json_field','json_field','json_field','json_index','json_index','json_str_field']);assert.ok(row.after.source.includes('json_index(value, (index as u64))'));assert.ok(row.after.source.includes('json_field(value, key.as_str())'));for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.executableAdmission,false);if(selected.localReceiverSource)assert.equal(selected.localReceiverSource.semanticAuthority,false);if(selected.localKeySource)assert.equal(selected.localKeySource.sourceAuthority,false);}assert.equal(proposal.after['src/translation_json_fields_core.rs'],JSON_FIELDS_NATIVE_SOURCE);
});
for(const [name,propose]of [['ordinary',proposeCoreJsonFieldCorpus],['source-bound',proposeSourceBoundFields]])test(name+' callback shadowing unknown/future/mismatched/ended locals and invalid key domains stay unproved',limits,()=>{
 for(const body of [
  `pub fn f(value:&${T})->${M}<&${T}>{let receiver=unknown();receiver.get("label")}`,
  `pub fn f(value:&${T})->${M}<&${T}>{let output=later.get("label");let later=value;output}`,
  `pub fn f(value:&${T})->${M}<&${T}>{{let hidden=value;}hidden.get("label")}`,
  `pub fn f(value:&${T})->${M}<&${T}>{let receiver:&str=value;receiver.get("label")}`,
  `pub fn f(value:&${T})->${M}<&${T}>{let receiver=value;unknown(|receiver|receiver.get("label"))}`,
  `pub fn f(value:&${T},index:u64)->${M}<&${T}>{value.get(index)}`,
  `pub fn f(value:&${T},key:String)->${M}<&${T}>{value.get(key)}`,
 ]){const request=input(body),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0,body);}
});
test('fixed JSON field stage receives null false empty Unicode missing and index boundaries in JS and strict TS',limits,async()=>{
 const request=input(source),proposal=await proposeSourceBoundOwnedCoreStage('json-fields',request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,7);const files=proposal.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['aliases','literal','owned','direct','indexed','local_index','scalar'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{const label=text('é😀'),value=object([['label',label],['null',nil()],['false',boolean(false)],['empty',text('')],['__proto__',text('literal')]]),some=field0=>({$:'Some',field0});assert.equal(api.aliases(value,'label').field0,label);for(const name of ['aliases','owned','direct']){assert.deepEqual(api[name](value,'null'),some(nil()));assert.deepEqual(api[name](value,'false'),some(boolean(false)));assert.deepEqual(api[name](value,'absent'),{$:'None'});assert.deepEqual(api[name](value,'__proto__'),some(text('literal')));}assert.deepEqual(api.literal(value),some(label));assert.deepEqual(api.scalar(value,'label'),some('é😀'));assert.deepEqual(api.scalar(value,'empty'),some(''));assert.deepEqual(api.scalar(value,'null'),{$:'None'});const values=array([nil(),boolean(false)]);assert.deepEqual(api.indexed(values,0n),some(nil()));assert.deepEqual(api.indexed(values,2n),{$:'None'});assert.deepEqual(api.local_index(values),some(boolean(false)));},{childTimeoutMs:20000});
});
test('five complete source equations retain native owners originals both rule phases and every inverse',limits,()=>{
 const plan=prepareJsonFieldLocalSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
