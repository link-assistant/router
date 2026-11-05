// Independent source/adoption/behavior regression SOURCE; all execution deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {proposeCoreJsonIterationCorpus} from '../migrate-core-json-iterations.mjs';
import {proposeCoreAdoptionSequence,CORE_ADOPTION_PACKET_LIMITS} from '../propose-json-iteration-adoption-corpus.mjs';
import {prepareJsonIterationAdoption} from '../prepare-json-iteration-adoption.mjs';
import {JSON_ITERATION_NATIVE_SOURCE} from '../json-iteration-native-source.mjs';
import {JSON_STATE_NATIVE_SOURCE} from '../json-state-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array} from '../json-macro-runtime.mjs';
const limits={timeout:60_000},C='crate::translation_core::',T=C+'Json';
const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn any_null(values:&[${T}])->bool{values.iter().any(|value|value.is_null())}
pub fn all_present(values:&[${T}])->bool{values.iter().all(|value|{!value.is_null()})}
pub fn filtered(values:&[${T}])->Vec<${T}>{values.iter().filter(|value|!value.is_null()).cloned().collect::<Vec<_>>()}
pub fn found(values:&[${T}])->${C}Maybe<${T}>{values.iter().find(|value|value.is_null()).cloned()}
pub fn folded(values:&[${T}])->${T}{values.iter().fold(${C}json!([]),|accumulator,value|{crate::translation_state_core::json_append(accumulator,${C}json_copy(value))})}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_collections_core;\npub mod translation_state_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_collections_core.rs':JSON_ITERATION_NATIVE_SOURCE,'src/translation_state_core.rs':JSON_STATE_NATIVE_SOURCE};}
const propose=input=>proposeCoreJsonIterationCorpus({entry:'src/lib.rs',files:input,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
test('all five terminal families retain complete original CST inverses and require fresh actual caller checking',limits,async()=>{
 const before=files(),proposal=propose(before),selected=proposal.proposals.flatMap(row=>row.selections);assert.equal(selected.length,5);assert.deepEqual(selected.map(row=>row.operation).sort(),['json_all','json_any','json_filter','json_find','json_fold']);assert.equal(proposal.executableAdmission,false);
 for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const selection of row.selections)assert.equal(selection.oldTraitDispatchProved,false);}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});
 for(const name of ['any_null','all_present','filtered','found','folded'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{const values=Object.freeze([nil(),bool(false),text('λ😀')]);assert.equal(api.any_null(values),true);assert.equal(api.any_null(Object.freeze([])),false);assert.equal(api.all_present(Object.freeze([])),true);assert.equal(api.all_present(values),false);assert.deepEqual(api.filtered(values),[bool(false),text('λ😀')]);assert.deepEqual(api.found(values),{$:'Some',field0:nil()});assert.deepEqual(api.found(Object.freeze([bool(false)])),{$:'None'});assert.deepEqual(api.folded(values),array(values));},{childTimeoutMs:20_000});
});
test('generic collect and owned find suffixes remain explicit while unsupported sources stay intact',limits,()=>{
 for(const suffix of ['.collect()','.collect::<Vec<_>>()','.collect::<Vec<'+T+'>>()']){
  const body=`pub fn selected(values:&[${T}])->Vec<${T}>{values.iter().filter(|value|!value.is_null()).cloned()${suffix}}`,proposal=propose(files(body));assert.equal(proposal.proposals.flatMap(row=>row.selections).length,1);
 }
 for(const body of [source.replace('.find(|value|value.is_null()).cloned()', '.find(|value|value.is_null())').replace('pub fn found','pub fn unsupported'),source.replace('.filter(|value|!value.is_null()).cloned()', '.filter(move |value|!value.is_null()).cloned()')]){
  const proposal=propose(files(body));assert.ok(proposal.proposals.flatMap(row=>row.preserved).length>0);
 }
 const root=files('trait Unknown {}\n'+source),blocked=propose(root);assert.deepEqual(blocked.after,blocked.before);assert.equal(blocked.proposals.flatMap(row=>row.selections).length,0);
});
test('changed native leaf root edge accessor data and shadowed receivers cannot qualify proposals',limits,()=>{
 const changed=files();changed['src/translation_collections_core.rs']+='\n// changed\n';assert.throws(()=>propose(changed));const noEdge=files();noEdge['src/lib.rs']=noEdge['src/lib.rs'].replace('pub mod translation_collections_core;','');assert.throws(()=>propose(noEdge));
 const body=`pub fn selected(values:&[${T}])->bool{let values=values;values.iter().any(|value|value.is_null())}`,shadowed=propose(files(body));assert.deepEqual(shadowed.after,shadowed.before);
 let reads=0;assert.throws(()=>proposeCoreJsonIterationCorpus({get files(){reads++;throw Error('get');}}));assert.equal(reads,0);
});
test('the copied complete packet CLI includes all actual source Cargo and inverse data under original limits',limits,async t=>{
 const root=mkdtempSync(join(tmpdir(),'router-json-iteration-adoption-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const input=join(root,'input'),output=join(root,'output');mkdirSync(input);
 for(const [path,body]of Object.entries(files())){mkdirSync(dirname(join(input,path)),{recursive:true});writeFileSync(join(input,path),body);}writeFileSync(join(input,'Cargo.toml'),dependencies.manifest);writeFileSync(join(input,'Cargo.lock'),dependencies.lock);
 const receipt=await proposeCoreAdoptionSequence({root:input,output},'json-iterations','gzip'),index=JSON.parse(readFileSync(join(output,'index.json'),'utf8'));assert.equal(receipt.sequence,'json-iterations');assert.equal(index.stages.length,1);assert.equal(index.stages[0].name,'json-iterations');assert.deepEqual(index.limits,CORE_ADOPTION_PACKET_LIMITS);assert.equal(index.semanticAdmission,false);assert.equal(index.changes.length,1);assert.equal(index.dependencyInputs.length,2);
});
test('both complete original implementations and native-selected copy rules remain recoverable',limits,()=>{
 const proposal=prepareJsonIterationAdoption();assert.equal(proposal.files.length,2);for(const row of proposal.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.semanticAuthority,false);
});
