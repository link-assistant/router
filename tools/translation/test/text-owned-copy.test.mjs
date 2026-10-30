// Independent owned text copy and caller SOURCE. Every new case remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {router_text_to_owned} from '../text-runtime.mjs';
import {TEXT_CONTRACTS,textContract,emitTextDeclarations} from '../text-contracts.mjs';
import {TEXT_NATIVE_SOURCE,TEXT_DECLARATIONS_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {proposeCoreTextMethodCorpus} from '../migrate-core-text-methods.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareTextOwnedCopySources} from '../prepare-text-owned-copy-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},vectors=['','ASCII','π😀é','a\0b','line\r\nend'],dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=String.raw`
pub fn copied(value:&str)->String{value.to_owned()}
pub fn display(value:&str)->String{value.to_string()}
pub fn cloned(value:String)->String{value.clone()}
pub fn owned_copy(value:String)->String{value.to_owned()}
pub fn owned_display(value:String)->String{value.to_string()}
pub fn literal()->String{"π😀\0".to_owned()}
pub fn raw_literal()->String{r#"raw "quote""#.to_string()}
pub fn clone_local(value:&str)->String{let owned=value.to_owned();owned.clone()}
pub fn chained(value:&str)->bool{value.to_string().contains('a')}
pub fn literal_test()->bool{" Bearer ".trim().starts_with("Bearer")}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE};}
const propose=body=>proposeCoreTextMethodCorpus({entry:'src/lib.rs',files:files(body),dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
test('the paired owned copy keeps primitive Unicode scalar and aggregate bound contracts',limits,()=>{
 for(const value of vectors)assert.equal(router_text_to_owned(value),value);const row=textContract('to_owned');assert.deepEqual(row.parameters,['str']);assert.equal(row.returns,'text-owned');assert.equal(row.root,null);assert.equal(TEXT_CONTRACTS.length,45);assert.equal(emitTextDeclarations(),TEXT_DECLARATIONS_SOURCE);assert.equal(TEXT_NATIVE_SOURCE,readFileSync(new URL('../../../rust/src/translation_text_core.rs',import.meta.url),'utf8'));let touched=false;assert.throws(()=>router_text_to_owned({toString(){touched=true;return 'value';}}));assert.equal(touched,false);assert.throws(()=>router_text_to_owned('\ud800'));assert.throws(()=>router_text_to_owned('\udfff'));assert.throws(()=>router_text_to_owned('x'.repeat(1048577)),/input bound/u);assert.equal(router_text_to_owned('x'.repeat(1048576)).length,1048576);
});
test('common copies owned clones and literal-only callers retain complete source inverses and independent JS strict TS behavior',limits,async()=>{
 const proposal=propose(source),names=['copied','display','cloned','owned_copy','owned_display','literal','raw_literal','clone_local','chained','literal_test'],selections=proposal.proposals.flatMap(row=>row.selections);for(const name of names)assert.ok(selections.some(row=>row.function===name),name);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of names)assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const value of vectors)for(const name of ['copied','display','cloned','owned_copy','owned_display','clone_local'])assert.equal(api[name](value),value);assert.equal(api.literal(),'π😀\0');assert.equal(api.raw_literal(),'raw "quote"');assert.equal(api.chained('a'),true);assert.equal(api.chained('π'),false);assert.equal(api.literal_test(),true);},{childTimeoutMs:20000});assert.equal(result.meta.runtimeParity,false);
});
test('borrowed clones character byte C-string numeric custom owners mutation and shadowed aliases retain their domains',limits,()=>{
 for(const body of ['pub fn pending(value:&str)->&str{value.clone()}','pub fn pending(value:u64)->String{value.to_string()}','pub fn pending(value:Custom)->String{value.to_string()}','pub fn pending(value:&mut str)->String{value.to_owned()}','pub fn pending()->String{\'a\'.to_string()}','pub fn pending()->String{b"bytes".to_owned()}','pub fn pending()->String{c"ffi".to_string()}','type String=Custom;pub fn pending(value:String)->String{value.clone()}','pub fn pending(value:String)->String{let value=custom();value.clone()}'])assert.equal(propose(body).proposals.flatMap(row=>row.selections).length,0,body);
});
test('twelve complete source equations and adjacent native stages retain originals both phases and complete inverses',limits,()=>{
 const plan=prepareTextOwnedCopySources();assert.equal(plan.files.length,12);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.nativeSourcePlan.current,plan.nativeSourcePlan.after);assert.equal(plan.nativeSourcePlan.inverse,plan.nativeSourcePlan.before);assert.equal(plan.nativeSourcePlan.rustExecuted,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
