// Independent paired fallback and actual method SOURCE; every new case UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as runtime from '../text-runtime.mjs';
import {textContract,TEXT_CONTRACTS,emitTextDeclarations} from '../text-contracts.mjs';
import {TEXT_NATIVE_SOURCE,TEXT_DECLARATIONS_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {proposeCoreTextMethodCorpus} from '../migrate-core-text-methods.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {prepareTextOptionFallbackSources} from '../prepare-text-option-fallback-sources.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},vectors=JSON.parse(readFileSync(new URL('./fixtures/text-option-fallback-vectors.json',import.meta.url),'utf8')).vectors,dependencies={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const families=['strip_prefix','strip_suffix','split_once_left','split_once_right','rsplit_once_left','rsplit_once_right'],names=families.flatMap(name=>[name+'_or_self',name+'_or_empty']);
const source=families.flatMap(name=>['self','empty'].map(fallback=>{const split=name.includes('split_once'),method=split?(name.startsWith('r')?'rsplit_once':'split_once'):name,side=name.endsWith('_left')?'left':'right',expression=split?'value.'+method+'(pattern).map(|(left,right)|'+side+')':'value.'+method+'(pattern)';return "pub fn "+name+'_or_'+fallback+"<'a>(value:&'a str,pattern:&str)->&'a str{"+expression+(fallback==='self'?'.unwrap_or(value)':'.unwrap_or_default()')+'}\n';})).join('');
function files(body=source){return {'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\n'+body,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE};}
const propose=body=>proposeCoreTextMethodCorpus({entry:'src/lib.rs',files:files(body),dependencyInputs:dependencies,compilationProfile:PRODUCTION_PROFILE});
test('all twelve paired total fallbacks preserve Some-empty None overlap Unicode and NUL distinctions',limits,()=>{
 for(const row of vectors)assert.equal(runtime['router_text_'+row.operation](...row.arguments),row.expected,JSON.stringify(row));assert.equal(new Set(vectors.map(row=>row.operation)).size,12);for(const name of names){const contract=textContract(name);assert.equal(contract.returns,'str');assert.equal(contract.root,0);assert.deepEqual(contract.parameters,['str','str']);}assert.equal(TEXT_CONTRACTS.length,45);assert.equal(emitTextDeclarations(),TEXT_DECLARATIONS_SOURCE);assert.equal(TEXT_NATIVE_SOURCE,readFileSync(new URL('../../../rust/src/translation_text_core.rs',import.meta.url),'utf8'));
});
test('all arguments retain primitive scalar bounds and reject coercion without evaluating hooks',limits,()=>{
 let touched=false;const fake={toString(){touched=true;return 'value';}};for(const name of names){const operation=runtime['router_text_'+name];for(const bad of [fake,'\ud800','x\udfff']){assert.throws(()=>operation(bad,'pattern'));assert.throws(()=>operation('value',bad));}assert.throws(()=>operation('x'.repeat(1048577),'pattern'),/input bound/u);assert.throws(()=>operation('value','x'.repeat(1048577)),/input bound/u);}assert.equal(touched,false);
});
test('every actual fallback method body retains complete source inverses and independent JS strict TS behavior',limits,async()=>{
 const proposal=propose(source),selections=proposal.proposals.flatMap(row=>row.selections);for(const name of names)assert.ok(selections.some(row=>row.function===name&&row.operation===name),name);for(const row of proposal.proposals){assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);let inverse=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,row.before.source);for(const selected of row.selections){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.oldDropTimingProved,false);assert.equal(selected.executableAdmission,false);}}
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(proposal.after),readSource:path=>proposal.after[path],jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),deriveDependencies:loadDeriveDependencyProof(dependencies),cargoManifest:dependencies.manifest,compilationProfile:PRODUCTION_PROFILE});for(const name of names)assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{for(const row of vectors)assert.equal(api[row.operation](...row.arguments),row.expected);},{childTimeoutMs:20000});assert.equal(proposal.executableAdmission,false);assert.equal(result.meta.runtimeParity,false);
});
test('different fallback owners effectful eager fallbacks transformed receivers and arbitrary callbacks are not fused',limits,()=>{
 for(const expression of ['value.strip_prefix(pattern).unwrap_or(other)','value.strip_prefix(pattern).unwrap_or(effect())','value.trim().strip_prefix(pattern).unwrap_or(value)','value.strip_prefix(pattern).unwrap_or_else(||other)','value.split_once(pattern).map(|pair|pair.0).unwrap_or(value)']){const body="pub fn pending<'a>(value:&'a str,pattern:&str,other:&'a str)->&'a str{"+expression+'}',proposal=propose(body);assert.ok(proposal.proposals.flatMap(row=>row.selections).every(row=>!row.operation.endsWith('_or_self')&&!row.operation.endsWith('_or_empty')),expression);if(expression.includes('unwrap_or(effect())'))assert.ok(proposal.after['src/lib.rs'].includes('.unwrap_or(effect())'));}
});
test('eleven complete compiler equations and adjacent native histories preserve both phases and whole inverses',limits,()=>{
 const plan=prepareTextOptionFallbackSources();assert.equal(plan.files.length,11);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.nativeSourcePlan.current,plan.nativeSourcePlan.after);assert.equal(plan.nativeSourcePlan.inverse,plan.nativeSourcePlan.before);assert.equal(plan.nativeSourcePlan.rustExecuted,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
