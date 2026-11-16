// Independent whole-source adoption SOURCE. Every case is UNRUN.
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
import {prepareTextAsciiAdoptionSources} from '../prepare-text-ascii-adoption-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=`
pub fn lowercase(value:&str)->String{value.to_ascii_lowercase()}
pub fn uppercase(value:&str)->String{value.to_ascii_uppercase()}
pub fn ascii(value:&str)->bool{value.is_ascii()}
pub fn equal(value:&str,other:&str)->bool{value.eq_ignore_ascii_case(other)}
pub fn trimmed(value:&str)->&str{value.trim_ascii()}
pub fn start(value:&str)->&str{value.trim_ascii_start()}
pub fn end(value:&str)->&str{value.trim_ascii_end()}
pub fn first_left<'a>(value:&'a str,pattern:&str)->Option<&'a str>{value.split_once(pattern).map(|(left,_)|left)}
pub fn first_right<'a>(value:&'a str,pattern:&str)->Option<&'a str>{value.split_once(pattern).map(|(_,right)|right)}
pub fn last_left<'a>(value:&'a str,pattern:&str)->Option<&'a str>{value.rsplit_once(pattern).map(|(left,right)|left)}
pub fn last_right<'a>(value:&'a str,pattern:&str)->Option<&'a str>{value.rsplit_once(pattern).map(|(left,right)|right)}
pub fn temporary(value:&str)->bool{value.to_ascii_lowercase().contains("header")}
pub fn local(value:&str)->bool{let lowered=value.to_ascii_lowercase();lowered.contains("header")}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE};}
const propose=body=>proposeCoreTextMethodCorpus({entry:'src/lib.rs',files:files(body),dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
test('all eleven actual method shapes and temporary or local owned receivers retain whole CST source inverses',limits,async()=>{
 const proposal=propose(source),selections=proposal.proposals.flatMap(row=>row.selections);for(const name of ['lowercase','uppercase','ascii','equal','trimmed','start','end','first_left','first_right','last_left','last_right','temporary','local'])assert.ok(selections.some(row=>row.function===name),name);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});await verifyTypedTargets(result,api=>{assert.equal(api.lowercase('πABC'),'πabc');assert.equal(api.uppercase('πabc'),'πABC');assert.equal(api.ascii('\u007f'),true);assert.equal(api.ascii('é'),false);assert.equal(api.equal('HeAdEr','header'),true);assert.equal(api.equal('É','é'),false);assert.equal(api.trimmed(' \u000bx '),'\u000bx');assert.equal(api.start('\tx\t'),'x\t');assert.equal(api.end('\tx\t'),'\tx');assert.deepEqual(api.first_left('a:b:c',':'),{$:'Some',field0:'a'});assert.deepEqual(api.first_right('a:b:c',':'),{$:'Some',field0:'b:c'});assert.deepEqual(api.last_left('a:b:c',':'),{$:'Some',field0:'a:b'});assert.deepEqual(api.last_right('a:b:c',':'),{$:'Some',field0:'c'});assert.deepEqual(api.first_left('a','!'),{$:'None'});assert.equal(api.temporary('HEADER'),true);assert.equal(api.local('HeAdEr'),true);},{childTimeoutMs:20000});assert.equal(proposal.executableAdmission,false);
});
test('effectful arbitrary shadowed malformed and non-string split closures remain untouched',limits,()=>{
 for(const expression of ['value.split_once(":").map(|pair|pair.0)','value.split_once(":").map(|(left,_)|left.trim())','value.split_once(":").map(|(left,_)|outside)','value.split_once(":").map(move |(left,_)|left)','value.split_once(":").map(|(both,both)|both)','value.split_once(":").map(|(_,_)|_)','value.split_once(":").map(|(left,_)|{effect();left})',"value.split_once(b':').map(|(left,_)|left)"]){const proposal=propose("pub fn wrong(value:&str)->Option<&str>{"+expression+'}');assert.equal(proposal.proposals.flatMap(row=>row.selections).length,0,expression);}
 for(const body of ['pub fn wrong(value:&str)->bool{let value=custom();value.is_ascii()}','pub fn wrong(value:&mut str)->bool{value.is_ascii()}','type str=Custom;pub fn wrong(value:&str)->bool{value.is_ascii()}','pub fn wrong(value:&str)->bool{unknown!();value.is_ascii()}'])assert.equal(propose(body).proposals.flatMap(row=>row.selections).length,0);
});
test('both complete source equations retain native-selected owners ordered phases and full originals',limits,()=>{
 const plan=prepareTextAsciiAdoptionSources();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
