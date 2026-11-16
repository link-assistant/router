// Independent source/caller/installation regression SOURCE. All execution deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCoreJsonFieldCorpus} from '../migrate-core-json-fields.mjs';
import {proposeCoreAdoptionSequence} from '../propose-json-field-adoption-corpus.mjs';
import {planCheckedJsonFieldAdoption,applyCheckedJsonFieldAdoption} from '../checked-json-field-adoption.mjs';
import {prepareJsonFieldAdoption} from '../prepare-json-field-adoption.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from '../json-fields-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object,json_macro_array as array,json_macro_u64 as unsigned,json_macro_i64 as signed} from '../json-macro-runtime.mjs';
const limits={timeout:60_000},C='crate::translation_core::',T=C+'Json',M=C+'Maybe';
const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn field<'a>(value:&'a ${T},key:&str)->${M}<&'a ${T}>{value.get(key)}
pub fn index(value:&${T})->${M}<&${T}>{value.get(0)}
pub fn text<'a>(value:&'a ${T},key:&str)->${M}<&'a str>{value.get(key).and_then(${T}::as_str)}
pub fn enabled(value:&${T})->${M}<bool>{value.get("enabled").and_then(|value|value.as_bool())}
pub fn count(value:&${T})->${M}<u64>{value.get("count").and_then(${T}::as_u64)}
pub fn signed(value:&${T})->${M}<i64>{value.get("negative").and_then(|field|{field.as_i64()})}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_json_fields_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_json_fields_core.rs':JSON_FIELDS_NATIVE_SOURCE};}
const propose=input=>proposeCoreJsonFieldCorpus({entry:'src/lib.rs',files:input,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
function physical(t,body=source){
 const root=mkdtempSync(join(tmpdir(),'router-json-field-adoption-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);};for(const [path,source]of Object.entries(files(body)))write(path,source);write('Cargo.toml',dependencies.manifest);write('Cargo.lock',dependencies.lock);
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'});git(['init','--quiet']);git(['add','.']);git(['commit','--quiet','-m','Original JSON field sources']);return {root,write,git};
}
test('six real source patterns retain source inverses before fresh whole-function JS and TS checks',limits,async()=>{
 const proposal=propose(files()),selected=proposal.proposals.flatMap(row=>row.selections);assert.deepEqual(selected.map(row=>row.operation).sort(),['json_bool_field','json_field','json_i64_field','json_index','json_str_field','json_u64_field']);assert.equal(proposal.executableAdmission,false);
 for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const selection of row.selections)assert.equal(selection.oldTraitDispatchProved,false);}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['field','index','text','enabled','count','signed'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{const value=object([['enabled',bool(false)],['count',unsigned(0n)],['negative',signed(-1n)],['text',text('λ😀')],['null',nil()]]),some=field0=>({$:'Some',field0});assert.deepEqual(api.field(value,'null'),some(nil()));assert.deepEqual(api.field(value,'absent'),{$:'None'});assert.deepEqual(api.index(array([nil()])),some(nil()));assert.deepEqual(api.text(value,'text'),some('λ😀'));assert.deepEqual(api.enabled(value),some(false));assert.deepEqual(api.count(value),some(0n));assert.deepEqual(api.signed(value),some(-1n));},{childTimeoutMs:20_000});
});
test('literal and named text keys preserve source while ambiguous owners and shadowed roots stay untouched',limits,()=>{
 for(const body of ['trait Unknown {}\n'+source,source.replace('value.get(key)','{let value=value;value.get(key)}')]){const proposal=propose(files(body));assert.ok(proposal.proposals.some(row=>row.preserved.length));}
 const changed=files();changed['src/translation_json_fields_core.rs']+='\n// changed native input\n';assert.throws(()=>propose(changed));
 const missing=files();missing['src/lib.rs']=missing['src/lib.rs'].replace('pub mod translation_json_fields_core;','');assert.throws(()=>propose(missing));
 let reads=0;assert.throws(()=>proposeCoreJsonFieldCorpus({get files(){reads++;throw Error('access');}}));assert.equal(reads,0);
});
test('complete field packets and separately fresh checked installation retain exact physical originals',limits,async t=>{
 const api=physical(t),output=join(api.root,'..','field-packets-'+api.root.split('/').at(-1));t.after(()=>rmSync(output,{recursive:true,force:true}));const receipt=await proposeCoreAdoptionSequence({root:api.root,output},'json-fields','gzip');assert.equal(receipt.sequence,'json-fields');const index=JSON.parse(readFileSync(join(output,'index.json'),'utf8'));assert.equal(index.stages[0].name,'json-fields');assert.equal(index.semanticAdmission,false);
 const options={root:api.root,functions:[{path:'src/lib.rs',name:'enabled'}]},proposal=planCheckedJsonFieldAdoption(options);assert.equal(proposal.functions.length,1);const changed=proposal.outputs.find(row=>row.kind==='adopted-source');assert.ok(changed.after.includes('json_bool_field(value, "enabled")'));assert.ok(changed.after.includes('value.get(key).and_then('+T+'::as_str)'));assert.equal(readFileSync(join(api.root,'src/lib.rs'),'utf8'),changed.before);
 const forged=structuredClone(proposal);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>applyCheckedJsonFieldAdoption(JSON.stringify(forged),options),/fresh source translation/);const installed=applyCheckedJsonFieldAdoption(JSON.stringify(proposal),options);assert.ok(installed.changed.includes('src/lib.rs'));assert.equal(readFileSync(join(api.root,'src/lib.rs'),'utf8'),changed.after);assert.equal(installed.rustExecuted,false);
});
test('all three complete original source producers and exact copy recipes remain inspectable',limits,()=>{
 const proposal=prepareJsonFieldAdoption();assert.equal(proposal.files.length,3);for(const row of proposal.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.semanticAuthority,false);
});
