// Independent ordinary-for alias boundary regression SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {censusLocalAliasBindings,localAliasForBinding} from '../local-alias-binding-source.mjs';
import {createBase64LocalArgumentSource} from '../base64-local-argument-source.mjs';
import {createPrimitiveLocalArgumentSource} from '../primitive-local-argument-source.mjs';
import {createTextLocalArgumentSource} from '../text-local-argument-source.mjs';
import {createPrimitiveCarrierLocalSource} from '../primitive-carrier-local-source.mjs';
import {createJsonFieldLocalSource} from '../json-field-local-source.mjs';
import {createJsonSliceLocalSource} from '../json-slice-local-source.mjs';
import {createOwnedJsonLocalSource} from '../owned-json-local-source.mjs';
import {proposeCoreIntegerMethodCorpus as ordinaryInteger} from '../migrate-core-integer-methods.mjs';
import {proposeCoreTextMethodCorpus as ordinaryText} from '../migrate-core-text-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus as ordinaryOption} from '../migrate-core-primitive-option-methods.mjs';
import {proposeSourceBoundOwnedCoreStage} from '../source-bound-owned-core-bulk.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {prepareForAliasScopeSources} from '../prepare-for-alias-scope-sources.mjs';
const limits={timeout:60000},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
test('ordinary original for binders have no inferred domain and share all original no-shadow namespace and count boundaries',limits,()=>{
 assert.deepEqual(censusLocalAliasBindings(tokens('let alias=value;for item in input{let inner=alias;}'),new Set(['value','input'])),{reason:null,count:3});assert.deepEqual(censusLocalAliasBindings(tokens('for _ in input{}'),new Set(['input'])),{reason:null,count:0});assert.equal(localAliasForBinding(tokens('for item in input{}'),0).name,'item');for(const source of ['for (first,second) in input{}','for ref item in input{}','for mut item in input{}','for Some(item) in input{}'])assert.equal(localAliasForBinding(tokens(source),0),null,source);for(const source of ['for value in input{}','let alias=value;for alias in input{}','for item in input{}for item in input{}','for std in input{}','let alias=value;match input{}'])assert.ok(censusLocalAliasBindings(tokens(source),new Set(['value','input']),{protectedNames:['std']}).reason,source);
});
const factories=[
 ['base64',createBase64LocalArgumentSource,'text'],['integer',createPrimitiveLocalArgumentSource,'u64'],['text',createTextLocalArgumentSource,'str'],
 ['carrier',(rows,parameters)=>createPrimitiveCarrierLocalSource(rows,parameters,new Set(parameters.keys()),{readWrittenRole:()=>null}),{kind:'option',domain:'u64'}],
 ['JSON field',(rows,parameters)=>createJsonFieldLocalSource(rows,parameters,new Set(parameters.keys())),'json-reference'],
 ['JSON slice',(rows,parameters)=>createJsonSliceLocalSource(rows,parameters,new Set(parameters.keys())),'json-slice'],
 ['owned JSON',(rows,parameters)=>createOwnedJsonLocalSource(rows,parameters,new Set(parameters.keys())),{kind:'result',borrowed:false}],
];
for(const [name,make,kind]of factories)test(name+' independent aliases survive an ordinary loop while iterator and body-local values remain unknown outside their actual scope',limits,()=>{
 const source='let alias=value;for item in input{let inner=alias;probe(inner);probe(item);}probe(alias);probe(inner);',rows=tokens(source),provider=make(rows,new Map([['value',kind]])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);assert.ok(provider);for(const [at,probe]of probes.entries()){assert.deepEqual(provider.at(probe.position).get(probe.name),[kind,undefined,kind,undefined][at]);const evidence=provider.evidence(probe.name);if(evidence){assert.equal(evidence.sourceAuthority,false);assert.equal(evidence.semanticAuthority,false);}else assert.ok(at===1||at===3);}assert.throws(()=>provider.at(0),/monotonic/u);
 const noLocal='for item in input{probe(value);probe(item);}',plain=tokens(noLocal),fresh=make(plain,new Map([['value',kind]])),calls=plain.filter(row=>row.text==='probe');assert.ok(fresh);assert.deepEqual(fresh.at(calls[0].start).get('value'),kind);assert.equal(fresh.at(calls[1].start).get('item'),undefined);
});
const body=[
 'pub fn numeric(value:u64,count:u64)->u64{let alias=value;let mut total=0_u64;for index in 0_u64..count{if alias.saturating_add(1)>0{total+=1;}}total}',
 'pub fn textual(value:&str,count:u64)->u64{let alias=value;let mut total=0_u64;for index in 0_u64..count{if !alias.is_empty(){total+=1;}}total}',
 'pub fn optional(value:Option<u64>,count:u64)->u64{let alias=value;let mut total=0_u64;for index in 0_u64..count{if alias.unwrap_or(0)>0{total+=1;}}total}',
 'pub fn direct(value:&str)->bool{for index in 0_u64..0_u64{}value.is_empty()}',
].join('\n');
function input(source=body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_integer_core;\npub mod translation_text_core;\npub mod translation_primitive_option_core;\n// Ω😀 loop coordinates\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_integer_core.rs':INTEGER_NATIVE_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE}};}
function rejoin(proposal,source){const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,source);assert.deepEqual(row.trace.map(part=>part.phase),['language','repository']);assert.equal(proposal.executableAdmission,false);return row;}
for(const [name,propose,wanted]of [['integer',ordinaryInteger,1],['text',ordinaryText,2],['Option',ordinaryOption,1]])test(name+' actual ordinary proposer retains original loops mutation and alias call source',limits,()=>{
 const request=input(),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,wanted);assert.ok(row.after.source.includes('for index in 0_u64..count'));assert.ok(row.after.source.includes('total+=1;'));for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.executableAdmission,false);}
});
for(const propose of [ordinaryInteger,ordinaryText,ordinaryOption])test(propose.name+' shadowed destructured and iterator-derived receiver facts stay unproved',limits,()=>{
 const method=propose===ordinaryInteger?'saturating_add(1)':propose===ordinaryText?'is_empty()':'unwrap_or(0)',type=propose===ordinaryInteger?'u64':propose===ordinaryText?'&str':'Option<u64>';for(const pattern of ['alias','(first,second)','mut item']){const request=input('pub fn f(value:'+type+')->u64{let alias=value;for '+pattern+' in unknown(){alias.'+method+';}0}'),row=rejoin(propose(request),request.files['src/lib.rs']);assert.equal(row.edits.length,0);}
});
test('three fixed bulk stages carry original loop callers into fresh JS and strict TS with independent zero and ordered-count cases',limits,async()=>{
 let request=input();for(const [stage,wanted]of [['integer-methods',1],['text-methods',2],['primitive-option-methods',1]]){const proposal=await proposeSourceBoundOwnedCoreStage(stage,request),row=rejoin(proposal,request.files['src/lib.rs']);assert.equal(row.edits.length,wanted,stage);request={...request,files:proposal.after};}const {files}=request,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['numeric','textual','optional','direct'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const count of [0n,1n,3n]){assert.equal(api.numeric(0n,count),count);assert.equal(api.numeric(18446744073709551615n,count),count);assert.equal(api.textual('é😀',count),count);assert.equal(api.textual('',count),0n);assert.equal(api.optional({$:'Some',field0:1n},count),count);assert.equal(api.optional({$:'Some',field0:0n},count),0n);assert.equal(api.optional({$:'None'},count),0n);}assert.equal(api.direct(''),true);assert.equal(api.direct('é😀'),false);},{childTimeoutMs:20000});
});
test('eighteen complete source equations retain complete original owners both phases and inverses',limits,()=>{
 const plan=prepareForAliasScopeSources();assert.equal(plan.files.length,18);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
