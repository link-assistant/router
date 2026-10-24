// Independent complete method-adoption SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCorePrimitiveOptionMethodCorpus} from '../migrate-core-primitive-option-methods.mjs';
import {proposeCoreAdoptionSequence} from '../propose-primitive-option-method-adoption-corpus.mjs';
import {planCheckedPrimitiveOptionMethodAdoption,applyCheckedPrimitiveOptionMethodAdoption} from '../checked-primitive-option-method-adoption.mjs';
import {preparePrimitiveOptionMethodAdoption} from '../prepare-primitive-option-method-adoption.mjs';
import {PRIMITIVE_OPTION_NATIVE_SOURCE} from '../primitive-option-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
import {json_macro_null as nil,json_macro_u64 as uint} from '../json-macro-runtime.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn fallback(value:Option<u64>)->u64{value.unwrap_or(9)}
pub fn signed(value:Option<i64>)->i64{value.unwrap()}
pub fn chosen(left:Option<bool>,right:Option<bool>)->Option<bool>{left.and(right)}
pub fn chained(left:Option<u64>,right:Option<u64>)->u64{left.or(right).unwrap_or(0)}
pub fn owned(value:Option<&str>)->String{value.unwrap_or("").to_owned()}
pub fn expected(value:Option<&str>)->String{value.expect("missing").to_string()}
pub fn present(value:Option<&str>)->bool{value.is_some()}
pub fn local(value:Option<u64>)->u64{let selected=value;selected.unwrap_or(0)}
pub fn reader(value:&crate::translation_core::Json)->u64{value.as_u64().unwrap_or(7)}
pub fn local_reader(value:&crate::translation_core::Json)->u64{let selected=value.as_u64();selected.unwrap_or(7)}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_primitive_option_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_primitive_option_core.rs':PRIMITIVE_OPTION_NATIVE_SOURCE};}
const propose=input=>proposeCorePrimitiveOptionMethodCorpus({entry:'src/lib.rs',files:input,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
function physical(t){const root=mkdtempSync(join(tmpdir(),'router-option-methods-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};for(const [path,value]of Object.entries(files()))write(path,value);write('Cargo.toml',dependencies.manifest);write('Cargo.lock',dependencies.lock);const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:20000});git(['init','--quiet']);git(['add','.']);git(['commit','--quiet','-m','Original primitive Option callers']);return {root,write};}
test('written primitive Option inputs immutable locals chains and scalar-reader results retain source inverses',limits,async()=>{
 const proposal=propose(files()),selections=proposal.proposals.flatMap(row=>row.selections);assert.equal(selections.length,10);assert.equal(selections.find(row=>row.function==='chained').operations.length,2);assert.equal(proposal.executableAdmission,false);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['fallback','signed','chosen','chained','owned','expected','present','local','reader','local_reader'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.fallback({$:'Some',field0:0n}),0n);assert.equal(api.fallback({$:'None'}),9n);assert.equal(api.signed({$:'Some',field0:-9223372036854775808n}),-9223372036854775808n);assert.deepEqual(api.chosen({$:'Some',field0:false},{$:'Some',field0:true}),{$:'Some',field0:true});assert.equal(api.chained({$:'None'},{$:'Some',field0:0n}),0n);assert.equal(api.owned({$:'Some',field0:''}),'');assert.equal(api.owned({$:'None'}),'');assert.equal(api.expected({$:'Some',field0:'é😀'}),'é😀');assert.throws(()=>api.expected({$:'None'}),RangeError);assert.equal(api.present({$:'Some',field0:''}),true);assert.equal(api.local({$:'None'}),0n);assert.equal(api.reader(nil()),7n);assert.equal(api.reader(uint(0n)),0n);assert.equal(api.local_reader(uint(18446744073709551615n)),18446744073709551615n);},{childTimeoutMs:20000});
});
test('unknown owners mutable or shadowed bindings effects and unqualified callbacks remain preserved',limits,()=>{
 for(const caller of ['type Option<T>=Custom<T>;\npub fn wrong(value:Option<u64>)->u64{value.unwrap_or(0)}','type bool=Custom;\npub fn wrong(value:Option<bool>)->bool{value.unwrap_or(false)}','pub fn wrong(mut value:Option<u64>)->u64{value.unwrap_or(0)}','pub fn wrong(value:Option<u64>)->u64{let value=custom();value.unwrap_or(0)}','pub fn wrong<T>(value:Option<T>)->T{value.unwrap()}','pub fn wrong(value:Option<u64>)->u64{value.unwrap_or(effect())}','pub fn wrong(value:Option<u64>)->u64{value.unwrap_or_else(||0)}','pub fn wrong(value:Option<&str>)->&str{value.unwrap_or("")}','trait Custom {}\n'+source])assert.equal(propose(files(caller)).proposals.flatMap(row=>row.selections).length,0);const altered=files();altered['src/translation_primitive_option_core.rs']+='\n// changed\n';assert.throws(()=>propose(altered));
});
test('compressed complete packets and selected fresh installation preserve unrelated native callers',limits,async t=>{
 const api=physical(t),output=join(api.root,'..','option-packets-'+api.root.split('/').at(-1));t.after(()=>rmSync(output,{recursive:true,force:true}));const receipt=await proposeCoreAdoptionSequence({root:api.root,output},'primitive-option-methods','gzip');assert.equal(receipt.sequence,'primitive-option-methods');const index=JSON.parse(readFileSync(join(output,'index.json'),'utf8'));assert.equal(index.stages[0].name,'primitive-option-methods');assert.equal(index.semanticAdmission,false);
 const options={root:api.root,functions:[{path:'src/lib.rs',name:'chained'}]},proposal=planCheckedPrimitiveOptionMethodAdoption(options),changed=proposal.outputs.find(row=>row.kind==='adopted-source');assert.equal(proposal.functions.length,1);assert.ok(changed.after.includes('crate::translation_primitive_option_core::u64_unwrap_or(crate::translation_primitive_option_core::u64_or(left, right), 0_u64)'));assert.ok(changed.after.includes('value.unwrap_or(9)'));const forged=structuredClone(proposal);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>applyCheckedPrimitiveOptionMethodAdoption(JSON.stringify(forged),options),/fresh source translation/u);applyCheckedPrimitiveOptionMethodAdoption(JSON.stringify(proposal),options);assert.equal(readFileSync(join(api.root,'src/lib.rs'),'utf8'),changed.after);
});
test('all three complete original corpus packet and installer implementations retain both ordered histories',limits,()=>{const plan=preparePrimitiveOptionMethodAdoption();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
