// Independent owned receiver SOURCE; every new case remains UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeCoreTextMethodCorpus} from '../migrate-core-text-methods.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareTextOwnedReceiverAdoptionSources} from '../prepare-text-owned-receiver-adoption-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=String.raw`
pub fn named(value:String)->bool{value.contains("header")}
pub fn ascii(value:String)->bool{value.to_ascii_lowercase().starts_with("header")}
pub fn bridged(value:String)->bool{value.as_str().ends_with('=')}
pub fn pattern(value:&str,other:String)->bool{value.contains(other.as_str())}
pub fn rewritten(value:String,pattern:String,replacement:&str)->String{value.replace(pattern.as_str(),replacement)}
pub fn local(value:String)->bool{let other=value;other.as_str().trim().is_empty()}
pub fn temporary(value:&str)->bool{value.to_ascii_lowercase().as_str().contains('h')}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE};}
const propose=body=>proposeCoreTextMethodCorpus({entry:'src/lib.rs',files:files(body),dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
test('owned parameters locals explicit as_str arguments and temporary receivers preserve complete source equations',limits,async()=>{
 const proposal=propose(source),names=['named','ascii','bridged','pattern','rewritten','local','temporary'],selections=proposal.proposals.flatMap(row=>row.selections);for(const name of names)assert.ok(selections.some(row=>row.function===name),name);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of names)assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.named('header'),true);assert.equal(api.named('HEADER'),false);assert.equal(api.ascii('HEADER π'),true);assert.equal(api.ascii('πheader'),false);assert.equal(api.bridged('key='),true);assert.equal(api.bridged('key'),false);assert.equal(api.pattern('a😀b','😀'),true);assert.equal(api.pattern('a😀b','é'),false);assert.equal(api.rewritten('a😀b😀','😀','$&'),'a$&b$&');assert.equal(api.rewritten('ab','','!'),'!a!b!');assert.equal(api.local(' \t\n'),true);assert.equal(api.local('é'),false);assert.equal(api.temporary('HEADER'),true);assert.equal(api.temporary('é'),false);},{childTimeoutMs:20000});assert.equal(proposal.executableAdmission,false);
});
test('arbitrary owners shadowed String types mutation unknown producers and nonexplicit owned pattern arguments remain unchanged',limits,()=>{
 for(const body of ['pub fn wrong(value:Custom)->bool{value.as_str().contains("x")}','type String=Custom;pub fn wrong(value:String)->bool{value.contains("x")}','pub fn wrong(mut value:String)->bool{value.contains("x")}','pub fn wrong(value:String)->bool{let mut other=value;other.contains("x")}','pub fn wrong(value:String)->bool{let value=custom();value.contains("x")}','pub fn wrong(value:&str,pattern:String)->bool{value.contains(pattern)}','pub fn wrong(value:String)->bool{unknown!();value.contains("x")}','pub fn wrong(value:String)->bool{value.as_str("unexpected").contains("x")}'])assert.equal(propose(body).proposals.flatMap(row=>row.selections).length,0,body);const standalone=propose("pub fn unchanged<'a>(value:&'a String)->&'a str{value.as_str()}");assert.equal(standalone.proposals.flatMap(row=>row.selections).length,0);
});
test('both complete compiler source equations retain original selector body native owners phases and inverses',limits,()=>{
 const plan=prepareTextOwnedReceiverAdoptionSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
