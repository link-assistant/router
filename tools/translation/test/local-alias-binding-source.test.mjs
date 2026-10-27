// Independent immutable/opaque-mutable declaration regression SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {censusLocalAliasBindings,localAliasDeclaration} from '../local-alias-binding-source.mjs';
import {createBase64LocalArgumentSource} from '../base64-local-argument-source.mjs';
import {createPrimitiveLocalArgumentSource} from '../primitive-local-argument-source.mjs';
import {createTextLocalArgumentSource} from '../text-local-argument-source.mjs';
import {createPrimitiveCarrierLocalSource} from '../primitive-carrier-local-source.mjs';
import {createJsonFieldLocalSource} from '../json-field-local-source.mjs';
import {createJsonSliceLocalSource} from '../json-slice-local-source.mjs';
import {createOwnedJsonLocalSource} from '../owned-json-local-source.mjs';
import {proposeCoreTextMethodCorpus} from '../migrate-core-text-methods.mjs';
import {proposeCorePrimitiveOptionMethodCorpus} from '../migrate-core-primitive-option-methods.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {prepareLocalAliasBindingSources} from '../prepare-local-alias-binding-sources.mjs';
const limits={timeout:60000},tokens=source=>rustTokens(source).filter(row=>row.type!=='comment'),root=new URL('../../../',import.meta.url),cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')};
test('ordinary mutable declarations have bounded names while patterns shadowing namespaces and duplicate binders still refuse',limits,()=>{
 assert.deepEqual(censusLocalAliasBindings(tokens('let alias=value;let mut scratch=0_u64;'),new Set(['value'])),{reason:null,count:2});assert.deepEqual(censusLocalAliasBindings(tokens('probe(value);'),new Set(['value'])),{reason:null,count:0});for(const body of ['let mut value=0;','let alias=value;let mut alias=0;','let mut std=0;','let (first,second)=pair;','let ref alias=value;','let mut value;'])assert.ok(censusLocalAliasBindings(tokens(body),new Set(['value']),{protectedNames:['std']}).reason,body);const declaration=localAliasDeclaration(tokens('let mut scratch:u64=0;'),0);assert.equal(declaration.name,'scratch');assert.equal(declaration.mutable,true);assert.equal(declaration.initializerStart,null);assert.equal(localAliasDeclaration(tokens('let alias=value;'),0).mutable,false);
});
const factories=[
 ['base64',createBase64LocalArgumentSource,'text'],
 ['primitive',createPrimitiveLocalArgumentSource,'u64'],
 ['text',createTextLocalArgumentSource,'str'],
 ['carrier',(rows,parameters)=>createPrimitiveCarrierLocalSource(rows,parameters,new Set(parameters.keys()),{readWrittenRole:()=>null}),{kind:'option',domain:'u64'}],
 ['JSON field',(rows,parameters)=>createJsonFieldLocalSource(rows,parameters,new Set(parameters.keys())),'json-reference'],
 ['JSON slice',(rows,parameters)=>createJsonSliceLocalSource(rows,parameters,new Set(parameters.keys())),'json-slice'],
 ['owned JSON',(rows,parameters)=>createOwnedJsonLocalSource(rows,parameters,new Set(parameters.keys())),{kind:'result',borrowed:false}],
];
for(const [name,make,kind]of factories)test(name+' immutable facts survive unrelated mutable locals while mutable and derived values remain unknown',limits,()=>{
 const source='let alias=value;let mut scratch=value;probe(alias);probe(scratch);let derived=scratch;probe(derived);',rows=tokens(source),provider=make(rows,new Map([['value',kind]])),probes=rows.flatMap((row,at)=>row.text==='probe'?[{position:row.start,name:rows[at+2].text}]:[]);assert.ok(provider);for(const [at,probe]of probes.entries()){assert.deepEqual(provider.at(probe.position).get(probe.name),at===0?kind:undefined);if(at>0)assert.equal(provider.evidence(probe.name),null);}assert.equal(provider.evidence('alias').sourceAuthority,false);assert.equal(provider.evidence('alias').semanticAuthority,false);
});
test('a selected source call cannot promote the result of a mutable initializer',limits,()=>{
 const source='let mut encoded=base64::Engine::encode(engine,value);probe(encoded);',rows=tokens(source),provider=createBase64LocalArgumentSource(rows,new Map([['value','text']])),start=rows.find(row=>row.text==='base64'),semicolon=rows.find(row=>row.text===';'),probe=rows.find(row=>row.text==='probe');provider.at(start.start);provider.selectedCall({span:[start.start,semicolon.start],terminator:semicolon,method:'encode',operation:'base64_standard_encode_text'});assert.equal(provider.at(probe.start).has('encoded'),false);assert.equal(provider.evidence('encoded'),null);
});
function input(body){return {entry:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE,dependencyInputs:{...cargo},files:{'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_primitive_option_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE}};}
test('actual original text and Option callers retain opaque scalar mutation and qualify complete target bodies independently',limits,async()=>{
 const request=input('pub fn text(value:&str)->bool{let alias=value;let mut scratch=0_u64;scratch+=1;alias.is_empty()}\npub fn optional(value:Option<u64>)->u64{let alias=value;let mut scratch=0_u64;scratch+=1;alias.unwrap_or(9)}'),first=proposeCoreTextMethodCorpus(request),second=proposeCorePrimitiveOptionMethodCorpus({...request,files:first.after});assert.equal(first.proposals.find(row=>row.file==='src/lib.rs').edits.length,1);assert.equal(second.proposals.find(row=>row.file==='src/lib.rs').edits.length,1);for(const proposal of [first,second]){assert.equal(proposal.executableAdmission,false);const row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.ok(row.after.source.includes('let mut scratch=0_u64;scratch+=1;'));let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);}
 const files=second.after,result=translateProject({entry:request.entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,deriveDependencies:loadDeriveDependencyProof(cargo)});for(const name of ['text','optional'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.text(''),true);assert.equal(api.text('é😀'),false);assert.equal(api.optional({$:'Some',field0:0n}),0n);assert.equal(api.optional({$:'Some',field0:18446744073709551615n}),18446744073709551615n);assert.equal(api.optional({$:'None'}),9n);},{childTimeoutMs:20000});
});
test('fourteen complete source equations retain all original implementations owners phases and inverses',limits,()=>{
 const plan=prepareLocalAliasBindingSources();assert.equal(plan.files.length,14);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
