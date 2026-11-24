// Independent whole-source character pattern SOURCE. Every new case is UNRUN.
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
import {prepareTextCharacterPatternAdoptionSources} from '../prepare-text-character-pattern-adoption-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const source=String.raw`
pub fn brackets(value:&str)->bool{value.starts_with('[')&&value.ends_with(']')}
pub fn quote(value:&str)->Option<&str>{value.strip_prefix('\'')}
pub fn slash(value:&str)->Option<&str>{value.strip_suffix('\\')}
pub fn nul(value:&str)->bool{value.contains('\0')}
pub fn replacement(value:&str)->String{value.replace('😀',"$&")}
pub fn first(value:&str)->String{value.replacen('\n',"|",1)}
pub fn occurrences(value:&str)->u64{value.matches('\u{1_f600}').count() as u64}
pub fn leading(value:&str)->Option<&str>{value.split_once('=').map(|(left,_)|left)}
pub fn trailing(value:&str)->Option<&str>{value.rsplit_once('-').map(|(_,right)|right)}
pub fn escape(value:&str)->bool{value.contains('\x7f')}
pub fn local(value:&str)->bool{let upper=value.to_ascii_uppercase();upper.contains('H')}
`;
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE};}
const propose=body=>proposeCoreTextMethodCorpus({entry:'src/lib.rs',files:files(body),dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
test('ten native pattern method shapes retain language then repository substitutions and complete source inverses',limits,async()=>{
 const proposal=propose(source),selections=proposal.proposals.flatMap(row=>row.selections);for(const name of ['brackets','quote','slash','nul','replacement','first','occurrences','leading','trailing','escape','local'])assert.ok(selections.some(row=>row.function===name),name);const selected=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.ok(selected.languageEdits.length>=12);assert.deepEqual(selected.trace.map(row=>row.phase),['language','repository']);assert.ok(selected.trace[0].rules[0].edits.length>0);assert.ok(selected.trace[1].rules[0].edits.length>0);assert.equal(selected.languageSourceHistory.inverse,selected.before.source);assert.ok(selected.languageSourceHistory.after.includes(String.raw`value.contains("\u{0}")`));for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const choice of row.selections){assert.equal(choice.oldTraitDispatchProved,false);assert.equal(choice.oldDropTimingProved,false);assert.equal(choice.executableAdmission,false);}}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of ['brackets','quote','slash','nul','replacement','first','occurrences','leading','trailing','escape','local'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{assert.equal(api.brackets('[😀]'),true);assert.equal(api.brackets('[]x'),false);assert.deepEqual(api.quote("'é"),{$:'Some',field0:'é'});assert.deepEqual(api.quote('é'),{$:'None'});assert.deepEqual(api.slash('é\\'),{$:'Some',field0:'é'});assert.equal(api.nul('a\0b'),true);assert.equal(api.nul(''),false);assert.equal(api.replacement('😀é😀'),'$&é$&');assert.equal(api.first('a\nb\nc'),'a|b\nc');assert.equal(api.occurrences('😀é😀'),2n);assert.deepEqual(api.leading('a=b=c'),{$:'Some',field0:'a'});assert.deepEqual(api.trailing('a-b-c'),{$:'Some',field0:'c'});assert.deepEqual(api.leading('a'),{$:'None'});assert.equal(api.escape('a\u007fb'),true);assert.equal(api.escape('é'),false);assert.equal(api.local('header'),true);},{childTimeoutMs:20000});assert.equal(proposal.executableAdmission,false);
});
test('characters are patterns only and never invent string receiver or replacement behavior',limits,()=>{
 for(const expression of [String.raw`value.contains(b'a')`,String.raw`value.contains(['a','b'])`,String.raw`value.contains('a'.trim())`,String.raw`value.contains('a'.to_ascii_uppercase())`,String.raw`value.eq_ignore_ascii_case('a')`,String.raw`value.replace('a','b')`,String.raw`value.contains(dynamic())`,String.raw`value.split_once(':').map(|(left,_)|left.trim())`]){const proposal=propose('pub fn wrong(value:&str)->bool{'+expression+'}');assert.equal(proposal.proposals.flatMap(row=>row.selections).length,0,expression);}for(const body of [String.raw`pub fn wrong(value:&mut str)->bool{value.contains('a')}`,String.raw`pub fn wrong(value:&str)->bool{let value=other();value.contains('a')}`,String.raw`type str=Custom;pub fn wrong(value:&str)->bool{value.contains('a')}`])assert.equal(propose(body).proposals.flatMap(row=>row.selections).length,0,body);
});
test('malformed scalar patterns cannot become string candidates',limits,()=>{
 for(const raw of [String.raw`'\u{d800}'`,String.raw`'\u{110000}'`,String.raw`'\x80'`])assert.throws(()=>propose('pub fn wrong(value:&str)->bool{value.contains('+raw+')}'),/Unicode scalar character literal|literal|syntax/u);
});
test('three complete compiler equations preserve native owners both phases and whole originals',limits,()=>{
 const plan=prepareTextCharacterPatternAdoptionSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
