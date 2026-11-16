// Independent corpus/installation receiving SOURCE. Execute after full drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCoreOwnedCarrierCorpus} from '../migrate-core-owned-carriers.mjs';
import {proposeCoreAdoptionSequence} from '../propose-owned-carrier-adoption-corpus.mjs';
import {planCheckedOwnedCarrierAdoption,applyCheckedOwnedCarrierAdoption} from '../checked-owned-carrier-adoption.mjs';
import {prepareOwnedCarrierAdoption} from '../prepare-owned-carrier-adoption.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../owned-outcome-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text} from '../json-macro-runtime.mjs';
const limits={timeout:60_000},C='crate::translation_core::',T=C+'Json',O=C+'Maybe<'+T+'>',R=C+'Outcome<'+T+',::std::string::String>';
const dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn optional(value:${O},fallback:${T})->${T}{value.unwrap_or(fallback)}
pub fn recovered(value:${R},fallback:${T})->${T}{value.unwrap_or(fallback)}
pub fn maybe(value:${R})->${O}{value.ok()}
pub fn required(value:${O})->${R}{value.ok_or("missing".to_owned())}
pub fn lazy(value:${O})->${R}{value.ok_or_else(||"λ😀".to_owned())}
pub fn borrowed(value:&${R})->${O}{value.clone().ok()}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_carriers_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_carriers_core.rs':OWNED_OUTCOME_NATIVE_SOURCE};}
const propose=input=>proposeCoreOwnedCarrierCorpus({entry:'src/lib.rs',files:input,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
function physical(t){
 const root=mkdtempSync(join(tmpdir(),'router-owned-carrier-adoption-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};for(const [path,value]of Object.entries(files()))write(path,value);write('Cargo.toml',dependencies.manifest);write('Cargo.lock',dependencies.lock);const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'});git(['init','--quiet']);git(['add','.']);git(['commit','--quiet','-m','Original carrier sources']);return {root,write};
}
test('six real carrier method patterns retain complete inverses before fresh actual caller JS TS checking',limits,async()=>{
 const proposal=propose(files()),selections=proposal.proposals.flatMap(row=>row.selections);assert.equal(selections.length,6);assert.deepEqual(selections.map(row=>row.operation).sort(),['json_option_or','json_option_to_result','json_option_to_result','json_result_or','json_result_to_option','json_result_to_option']);assert.equal(proposal.executableAdmission,false);
 for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);}}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['optional','recovered','maybe','required','lazy','borrowed'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));
 await verifyTypedTargets(result,api=>{const some={$:'Some',field0:nil()},none={$:'None'},ok={$:'Ok',field0:text('value')},err={$:'Err',field0:'old'};assert.deepEqual(api.optional(some,bool(false)),nil());assert.deepEqual(api.optional(none,bool(false)),bool(false));assert.deepEqual(api.recovered(err,nil()),nil());assert.deepEqual(api.maybe(ok),{$:'Some',field0:text('value')});assert.deepEqual(api.required(none),{$:'Err',field0:'missing'});assert.deepEqual(api.required(some),{$:'Ok',field0:nil()});assert.deepEqual(api.lazy(none),{$:'Err',field0:'λ😀'});assert.deepEqual(api.borrowed(ok),{$:'Some',field0:text('value')});},{childTimeoutMs:20_000});
});
test('repeated inputs effectful defaults unknown standard identities and source producers stay untouched',limits,()=>{
 const bodies=[`pub fn wrong(value:${R})->${O}{let held=value;value.ok()}`,`pub fn wrong(value:${O})->${R}{value.ok_or_else(||unknown())}`,`pub fn wrong(value:&${R})->${O}{value.ok()}`,`pub fn wrong(value:Result<${T},::std::string::String>)->${O}{value.ok()}`,'trait Unknown {}\n'+source];for(const body of bodies){const result=propose(files(body));assert.equal(result.proposals.flatMap(row=>row.selections).length,0);}
 const altered=files();altered['src/translation_carriers_core.rs']+='\n// changed\n';assert.throws(()=>propose(altered));const missing=files();missing['src/lib.rs']=missing['src/lib.rs'].replace('pub mod translation_carriers_core;','');assert.throws(()=>propose(missing));let reads=0;assert.throws(()=>proposeCoreOwnedCarrierCorpus({get files(){reads++;throw Error('access');}}));assert.equal(reads,0);
});
test('bounded carrier packets and separately checked installation preserve every physical original',limits,async t=>{
 const api=physical(t),output=join(api.root,'..','carrier-packets-'+api.root.split('/').at(-1));t.after(()=>rmSync(output,{recursive:true,force:true}));const receipt=await proposeCoreAdoptionSequence({root:api.root,output},'owned-carriers','gzip');assert.equal(receipt.sequence,'owned-carriers');const index=JSON.parse(readFileSync(join(output,'index.json'),'utf8'));assert.equal(index.stages[0].name,'owned-carriers');assert.equal(index.semanticAdmission,false);
 const options={root:api.root,functions:[{path:'src/lib.rs',name:'lazy'}]},proposal=planCheckedOwnedCarrierAdoption(options);assert.equal(proposal.functions.length,1);const changed=proposal.outputs.find(row=>row.kind==='adopted-source');assert.ok(changed.after.includes('json_option_to_result(&value, "λ😀")'));assert.ok(changed.after.includes('value.unwrap_or(fallback)'));assert.equal(readFileSync(join(api.root,'src/lib.rs'),'utf8'),changed.before);const forged=structuredClone(proposal);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>applyCheckedOwnedCarrierAdoption(JSON.stringify(forged),options),/fresh source translation/u);const result=applyCheckedOwnedCarrierAdoption(JSON.stringify(proposal),options);assert.ok(result.changed.includes('src/lib.rs'));assert.equal(result.rustExecuted,false);
});
test('all three complete source copies retain original producers ordered sequences and full CST inverses',limits,()=>{
 const proposal=prepareOwnedCarrierAdoption();assert.equal(proposal.files.length,3);for(const row of proposal.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(proposal.semanticAuthority,false);
});
