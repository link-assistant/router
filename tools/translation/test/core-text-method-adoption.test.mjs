// Independent method adoption SOURCE. Unrun until every requirement is drafted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {proposeCoreTextMethodCorpus} from '../migrate-core-text-methods.mjs';
import {proposeCoreAdoptionSequence} from '../propose-text-method-adoption-corpus.mjs';
import {planCheckedTextMethodAdoption,applyCheckedTextMethodAdoption} from '../checked-text-method-adoption.mjs';
import {prepareTextMethodAdoption} from '../prepare-text-method-adoption.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`pub fn basic(value:&str)->bool{value.trim().starts_with("é")}
pub fn local(value:&str)->bool{let cleaned=value.trim();cleaned.ends_with("終")}
pub fn either(value:&str)->bool{value.contains("é") || !value.is_empty()}
pub fn size(value:&str)->u64{value.len() as u64}
pub fn scalars(value:&str)->u64{value.chars().count() as u64}
pub fn occurrences(value:&str)->u64{value.matches("😀").count() as u64}
pub fn substituted(value:&str)->String{value.replace("😀","$&")}
pub fn once(value:&str)->String{value.replacen("😀","$&",1)}
pub fn repeated(value:&str)->String{value.repeat(2)}
pub fn removed(value:&str)->Option<&str>{value.strip_suffix("終")}
pub fn lifetime<'a>(value:&'a str)->&'a str{value.trim_end()}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE};}
const propose=input=>proposeCoreTextMethodCorpus({entry:'src/lib.rs',files:input,dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
function physical(t){const root=mkdtempSync(join(tmpdir(),'router-text-methods-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};for(const [path,value]of Object.entries(files()))write(path,value);write('Cargo.toml',dependencies.manifest);write('Cargo.lock',dependencies.lock);const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:20000});git(['init','--quiet']);git(['add','.']);git(['commit','--quiet','-m','Original text method callers']);return {root,write};}
test('common immutable text chains locals counts and closed replacement operands retain complete source inverses',limits,async()=>{
 const proposal=propose(files()),selections=proposal.proposals.flatMap(row=>row.selections);assert.equal(selections.length,13);assert.equal(selections.find(row=>row.function==='basic').operations.length,2);assert.equal(proposal.executableAdmission,false);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const choice of row.selections){assert.equal(choice.oldTraitDispatchProved,false);assert.equal(choice.executableAdmission,false);}}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['basic','local','either','size','scalars','occurrences','substituted','once','repeated','removed','lifetime'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.basic(' é😀 '),true);assert.equal(api.local(' 😀終 '),true);assert.equal(api.either(''),false);assert.equal(api.size('a😀é'),7n);assert.equal(api.scalars('a😀é'),3n);assert.equal(api.occurrences('😀é😀'),2n);assert.equal(api.substituted('😀😀'),'$&$&');assert.equal(api.once('😀😀'),'$&😀');assert.equal(api.repeated('é😀'),'é😀é😀');assert.deepEqual(api.removed('a終'),{$:'Some',field0:'a'});assert.equal(api.lifetime('\u0085x\u3000'),'\u0085x');},{childTimeoutMs:20000});
});
test('shadowing mutable inputs traits local producers closures and nonclosed arguments remain untouched',limits,()=>{
 for(const caller of ['type str=Custom;\npub fn wrong(value:&str)->bool{value.is_empty()}','pub fn wrong(mut value:&str)->bool{value.is_empty()}','pub fn wrong(value:&str)->bool{let value=custom();value.is_empty()}','pub fn wrong<T>(value:T)->bool{value.is_empty()}','pub fn wrong(value:&str)->bool{value.contains(effect())}','pub fn wrong(value:&str)->bool{let check=||false;value.is_empty()}','trait Custom {}\n'+source,'pub fn wrong(value:&mut str)->bool{value.is_empty()}','pub fn wrong(value:&str)->bool{unknown!(value);value.is_empty()}'])assert.equal(propose(files(caller)).proposals.flatMap(row=>row.selections).length,0);const changed=files();changed['src/translation_text_core.rs']+='\n// changed\n';assert.throws(()=>propose(changed));
});
test('bounded compressed packets preserve all originals and selected installation freshly rechecks complete functions',limits,async t=>{
 const api=physical(t),output=join(api.root,'..','text-packets-'+api.root.split('/').at(-1));t.after(()=>rmSync(output,{recursive:true,force:true}));const receipt=await proposeCoreAdoptionSequence({root:api.root,output},'text-methods','gzip');assert.equal(receipt.sequence,'text-methods');const index=JSON.parse(readFileSync(join(output,'index.json'),'utf8'));assert.equal(index.stages[0].name,'text-methods');assert.equal(index.semanticAdmission,false);
 const options={root:api.root,functions:[{path:'src/lib.rs',name:'basic'}]},proposal=planCheckedTextMethodAdoption(options),changed=proposal.outputs.find(row=>row.kind==='adopted-source');assert.equal(proposal.functions.length,1);assert.ok(changed.after.includes('crate::translation_text_core::starts_with(crate::translation_text_core::trim(value), "é")'));assert.ok(changed.after.includes('value.repeat(2)'));const forged=structuredClone(proposal);forged.outputs.find(row=>row.kind==='adopted-source').after+='\n// forged\n';assert.throws(()=>applyCheckedTextMethodAdoption(JSON.stringify(forged),options),/fresh source translation/u);applyCheckedTextMethodAdoption(JSON.stringify(proposal),options);assert.equal(readFileSync(join(api.root,'src/lib.rs'),'utf8'),changed.after);
});
test('all six original source copies preserve native-selected language and repository inverses',limits,()=>{const plan=prepareTextMethodAdoption();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
