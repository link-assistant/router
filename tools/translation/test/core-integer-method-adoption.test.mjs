// Independent whole-source adoption SOURCE. Run only after full bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCoreIntegerMethodCorpus} from '../migrate-core-integer-methods.mjs';
import {proposeCoreAdoptionSequence} from '../propose-integer-method-adoption-corpus.mjs';
import {planCheckedIntegerMethodAdoption,applyCheckedIntegerMethodAdoption} from '../checked-integer-method-adoption.mjs';
import {prepareIntegerMethodAdoption} from '../prepare-integer-method-adoption.mjs';
import {INTEGER_NATIVE_SOURCE} from '../integer-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn increment(value:u64)->u64{value.saturating_add(1)}
pub fn subtract(value:u64,other:u64)->u64{value.wrapping_sub(other)}
pub fn product(value:i64,other:i64)->Option<i64>{value.checked_mul(other)}
pub fn quotient(value:i64,other:i64)->Option<i64>{value.checked_div(other)}
pub fn remainder(value:i64,other:i64)->Option<i64>{value.checked_rem(other)}
pub fn absolute(value:i64)->Option<i64>{value.checked_abs()}
pub fn clamped(value:u64)->u64{value.clamp(1_u64,u64::MAX)}
pub fn repeated(value:u64)->u64{let first=value.saturating_add(1_u64);let second=value.saturating_add(2_u64);first.saturating_add(second)}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_integer_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_integer_core.rs':INTEGER_NATIVE_SOURCE};}
const propose=input=>proposeCoreIntegerMethodCorpus({entry:'src/lib.rs',files:input,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
function physical(t){const root=mkdtempSync(join(tmpdir(),'router-integer-methods-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};for(const [path,value]of Object.entries(files()))write(path,value);write('Cargo.toml',dependencies.manifest);write('Cargo.lock',dependencies.lock);const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:20000});git(['init','--quiet']);git(['add','.']);git(['commit','--quiet','-m','Primitive method original sources']);return {root,write};}
test('source-selected standard methods retain full CST inverses and actual widths before checking whole targets',limits,async()=>{
 const proposal=propose(files()),selections=proposal.proposals.flatMap(row=>row.selections);assert.equal(selections.length,10);assert.equal(proposal.executableAdmission,false);assert.equal(selections.filter(row=>row.function==='repeated').length,3);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.executableAdmission,false);}}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['increment','subtract','product','quotient','remainder','absolute','clamped'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.increment(18446744073709551615n),18446744073709551615n);assert.equal(api.subtract(0n,1n),18446744073709551615n);assert.deepEqual(api.product(-9223372036854775808n,-1n),{$:'None'});assert.deepEqual(api.quotient(-7n,3n),{$:'Some',field0:-2n});assert.deepEqual(api.remainder(-7n,3n),{$:'Some',field0:-1n});assert.deepEqual(api.absolute(-9223372036854775808n),{$:'None'});assert.equal(api.clamped(0n),1n);},{childTimeoutMs:20000});
});
test('shadowed primitives local bindings effects unknown methods and source producers remain untouched',limits,()=>{
 const invalid=['type u64=Custom;\npub fn wrong(value:u64)->u64{value.saturating_add(1)}','pub fn wrong(value:u64)->u64{let value=custom();value.saturating_add(1)}','pub fn wrong(value:u64)->u64{value.saturating_add(effect())}','pub fn wrong(value:u64)->u64{value.unknown(1)}','pub fn wrong<T>(value:T)->T{value.saturating_add(1)}','trait Custom {}\n'+source,'pub fn wrong(value:&u64)->u64{value.saturating_add(1)}','pub fn wrong(value:u64)->u64{for value in unknown(){return value.saturating_add(1);}value}'];for(const caller of invalid)assert.equal(propose(files(caller)).proposals.flatMap(row=>row.selections).length,0);
 const altered=files();altered['src/translation_integer_core.rs']+='\n// changed\n';assert.throws(()=>propose(altered));const missing=files();missing['src/lib.rs']=missing['src/lib.rs'].replace('pub mod translation_integer_core;','');assert.throws(()=>propose(missing));
});
test('bounded method packets and fresh selected installation preserve unrelated callers and reject forged plans',limits,async t=>{
 const api=physical(t),output=join(api.root,'..','integer-packets-'+api.root.split('/').at(-1));t.after(()=>rmSync(output,{recursive:true,force:true}));const receipt=await proposeCoreAdoptionSequence({root:api.root,output},'integer-methods','gzip');assert.equal(receipt.sequence,'integer-methods');const index=JSON.parse(readFileSync(join(output,'index.json'),'utf8'));assert.equal(index.stages[0].name,'integer-methods');assert.equal(index.semanticAdmission,false);
 const options={root:api.root,functions:[{path:'src/lib.rs',name:'quotient'}]},proposal=planCheckedIntegerMethodAdoption(options),changed=proposal.outputs.find(row=>row.kind==='adopted-source');assert.equal(proposal.functions.length,1);assert.ok(changed.after.includes('crate::translation_integer_core::i64_checked_div(value, other)'));assert.ok(changed.after.includes('value.saturating_add(1)'));assert.equal(readFileSync(join(api.root,'src/lib.rs'),'utf8'),changed.before);const forged=structuredClone(proposal);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>applyCheckedIntegerMethodAdoption(JSON.stringify(forged),options),/fresh source translation/u);const applied=applyCheckedIntegerMethodAdoption(JSON.stringify(proposal),options);assert.ok(applied.changed.includes('src/lib.rs'));assert.equal(applied.rustExecuted,false);
});
test('all three complete original adopters retain native source selections and two full CST inverse sequences',limits,()=>{
 const plan=prepareIntegerMethodAdoption();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
