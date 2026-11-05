// Independent regression SOURCE. All new cases are UNRUN in the bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandCanonicalJsonClone} from '../canonical-json-clone-normalization.mjs';
import {proposeCoreJsonCopiesCorpus} from '../migrate-core-json-copies.mjs';
import {proposeCoreJsonIndicesCorpus} from '../migrate-core-json-indices.mjs';
import {prepareJsonCloneChainSources} from '../prepare-json-clone-chain-sources.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serde_json_from_str,serde_json_to_string} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const limits={timeout:60000},C='crate::translation_core::',T=C+'Json',M=C+'Maybe';
const dependencyInputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const files=source=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE});
const proposal=source=>proposeCoreJsonCopiesCorpus({files:files(source),dependencyInputs,compilationProfile:PRODUCTION_PROFILE});
const selections=value=>value.proposals.flatMap(row=>row.selections);
function inverse(row){
 for(const key of ['before','intermediate','after'])assert.equal(transportConcreteSyntaxMeta(row[key].meta).source,row[key].source);
 let restored=row.after.source;for(const part of [...row.mapping].reverse())if(part.kind==='substitution'){assert.equal(restored.slice(...part.after),part.replacement);restored=restored.slice(0,part.after[0])+part.expected+restored.slice(part.after[1]);}assert.equal(restored,row.before.source);
 assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);assert.equal(row.executableAdmission,false);
}
function json(value){const parsed=serde_json_from_str(JSON.stringify(value));assert.equal(parsed.$,'Ok');return parsed.field0;}
function native(value){const parsed=serde_json_to_string(value);assert.equal(parsed.$,'Ok');return JSON.parse(parsed.field0);}
const some=field0=>({$:'Some',field0}),none={$:'None'};
test('language Option clone equation keeps receiver bytes and repository changes only its four generated paths',limits,()=>{
 const receiver='value.get("::core::clone::Clone::clone ::core::option::Option::Some Ω😀")',input='__router_json_clone_0',payload='__router_json_clone_1';
 const row=expandCanonicalJsonClone(receiver,input,payload);
 assert.equal(row.source,'{ let '+input+' = '+receiver+'; if let ::core::option::Option::Some('+payload+') = '+input+' { ::core::option::Option::Some(::core::clone::Clone::clone('+payload+')) } else { ::core::option::Option::None } }');
 assert.equal(row.repository,'{ let '+input+' = '+receiver+'; if let '+C+'Maybe::Some('+payload+') = '+input+' { '+C+'Maybe::Some('+C+'json_copy('+payload+')) } else { '+C+'Maybe::None } }');
 assert.equal(row.paths.length,4);let changed=row.source;for(const path of [...row.paths].reverse()){assert.equal(changed.slice(...path.span),path.expected);changed=changed.slice(0,path.span[0])+path.replacement+changed.slice(path.span[1]);}assert.equal(changed,row.repository);
 let touched=0;const hook={toString(){touched++;return receiver;}};assert.throws(()=>expandCanonicalJsonClone(hook,input,payload));assert.throws(()=>expandCanonicalJsonClone(receiver,hook,payload));assert.equal(touched,0);
 for(const names of [[input,input],['user',payload],[input,''],['__router_json_clone_'+'1'.repeat(65),payload]])assert.throws(()=>expandCanonicalJsonClone(receiver,...names));
 assert.throws(()=>expandCanonicalJsonClone('x'.repeat(2000001),input,payload));
});
test('reader suffixes optional aliases and try chains keep full source CST inverse and separate actual phases',limits,()=>{
 const source='// Ω😀\r\npub fn direct(value:&'+T+')->'+T+'{value.clone()}\r\n'+
 'pub fn optional(value:'+M+'<&'+T+'>)->'+M+'<'+T+'>{value.cloned()}\n'+
 'pub fn child(value:&'+T+')->'+M+'<'+T+'>{value.get("child").cloned()}\n'+
 'pub fn tried(value:&'+T+')->'+M+'<'+T+'>{Some(value.get("child")?.clone())}\n'+
 'pub fn nested(value:&'+T+')->'+M+'<'+T+'>{value.get("child")?.get("leaf").cloned()}\n'+
 'pub fn alias(value:&'+T+')->'+M+'<'+T+'>{let selected=value.get("child");selected.cloned()}';
 const result=proposal(source);assert.deepEqual(selections(result).map(row=>row.function),['direct','optional','child','tried','nested','alias']);
 const row=result.proposals[0];inverse(row);assert.ok(row.after.source.startsWith('pub mod translation_core;\n// Ω😀\r\n'));assert.ok(row.after.source.includes(C+'json_copy(value.get("child")?)'));assert.ok(row.intermediate.source.includes('::core::clone::Clone::clone'));
 assert.ok(row.after.source.includes('value.get("child")?.get("leaf")'));assert.equal(row.after.source.includes('::core::clone::Clone::clone'),false);
 for(const selected of selections(result)){assert.equal(selected.oldTraitDispatchProved,false);assert.equal(selected.executableAdmission,false);assert.ok(selected.receiverSource.length>0);if(selected.operation==='optional-json-copy')assert.deepEqual(selected.evaluationOrder,['receiver-once','Some-copy-once','None-without-copy']);}
});
test('optional copy is independently translated to JS and strict TS with absent null empty Unicode and nested payloads',limits,async()=>{
 const result=proposal('pub fn copied(value:'+M+'<&'+T+'>)->'+M+'<'+T+'>{value.cloned()}'),after=translateProject({entry:'src/lib.rs',paths:Object.keys(result.after),readSource:path=>result.after[path],cargoManifest:dependencyInputs.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(dependencyInputs),deriveDependencies:loadDeriveDependencyProof(dependencyInputs),compilationProfile:PRODUCTION_PROFILE});
 assert.ok(after.meta.executable.some(row=>row.name==='copied'),JSON.stringify(after.meta.refused));const wire=JSON.stringify(after.meta.targetSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 await verifyTypedTargets(after,api=>{assert.deepEqual(api.copied(none),none);for(const value of [null,false,0,'',[],{},'猫😀\0',[{nested:[null,false,'Ω']}],JSON.parse('{"__proto__":{"safe":true}}')]){const input=json(value),before=structuredClone(input),output=api.copied(some(input));assert.equal(output.$,'Some');assert.deepEqual(native(output.field0),value);assert.deepEqual(input,before);if(input.$!=='Null')assert.notStrictEqual(output.field0,input);}}, {childTimeoutMs:20000});
});
test('generated names avoid every actual file spelling and multiple equations rebase around direct copies',limits,()=>{
 const result=proposal('pub fn copied(value:'+M+'<&'+T+'>,__router_json_clone_0:bool,__router_json_clone_1:bool)->'+M+'<'+T+'>{value.cloned()}pub fn direct(value:&'+T+')->'+T+'{value.clone()}pub fn later(value:'+M+'<&'+T+'>)->'+M+'<'+T+'>{value.cloned()}');
 assert.equal(selections(result).length,3);const names=selections(result).flatMap(row=>row.locals??[]);assert.equal(new Set(names).size,4);assert.ok(names.every(name=>!['__router_json_clone_0','__router_json_clone_1'].includes(name)));inverse(result.proposals[0]);assert.ok(result.after['src/lib.rs'].includes(C+'json_copy(value)'));
});
test('unsupported owners effects mutable aliases argument clones and optional clone keep original source',limits,()=>{
 for(const source of [
  'pub fn no(value:&'+T+')->'+M+'<'+T+'>{value.get("x").clone()}',
  'pub fn no(value:&'+T+')->'+M+'<'+T+'>{value.get(custom()).cloned()}',
  'pub fn no(value:&'+T+')->'+M+'<'+T+'>{value.get("x").cloned(custom())}',
  'pub fn no(value:&'+T+')->'+M+'<'+T+'>{value.get("x").map(custom).cloned()}',
  'pub fn no(value:&'+T+')->'+M+'<'+T+'>{let mut item=value.get("x");item.cloned()}',
  'pub fn no(value:'+M+'<&'+T+'>)->'+M+'<'+T+'>{let value=custom();value.cloned()}',
  'pub fn no(value:Custom)->'+M+'<'+T+'>{value.get("x").cloned()}',
  'pub fn no(value:&'+T+')->'+M+'<'+T+'>{value.get("x")/* retained */.cloned()}',
  'pub fn no(value:&'+T+')->'+M+'<'+T+'>{unknown(||value.get("x").cloned())}',
 ]){const result=proposal(source);assert.equal(selections(result).length,0,source);assert.deepEqual(result.before,result.after,source);}
});
test('index mode retains its original rule identity and four whole compiler copies retain exact originals',limits,()=>{
 const index=proposeCoreJsonIndicesCorpus({files:files('pub fn index(value:&'+T+')->'+T+'{'+C+'json!(value["x"])}'),dependencyInputs});assert.equal(index.proposals[0].trace[1].id,'router-core:adopt-fixed-shared-json-index-operation');inverse(index.proposals[0]);
 const plan=prepareJsonCloneChainSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
