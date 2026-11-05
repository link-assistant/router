// Real complete project and original metadata readers. All case source UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {withBorrowedJsonToolProject} from '../borrowed-json-tool-20261103-project.mjs';
import {withActualPolicySourceUniverse,policyOriginalEntry,policyOriginalPaths,policyOriginalSource,policyOriginalCargo} from '../policy-nominal-producer-20261101-corpus.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from '../json-capabilities.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import * as regular from '../semantic-meta.mjs';
import * as flat from '../semantic-meta-flat.mjs';
import {requireBorrowedJsonToolType} from '../borrowed-json-tool-20261103-native-types.mjs';
const caller='openai_tools.is_translatable';
function withOptions(run){
 return withActualPolicySourceUniverse({},context=>{
  const cargo=policyOriginalCargo(context),dependencies={manifest:cargo.manifest,lock:cargo.lock};
  return run({entry:policyOriginalEntry(context),paths:policyOriginalPaths(context),readSource:path=>policyOriginalSource(context,path),cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE});
 });
}
for(const mode of ['regular','flat','flat-enclosing','owned-definitions','owned-core-readers']){
 test(mode+' actual project translates and lowers the complete private application caller within one live source operation',{timeout:900000},()=>withOptions(options=>{
  let lower,type,checkedText,flatText;
  const answer=withBorrowedJsonToolProject(options,result=>{
   assert.ok(result.meta.sources.length>500);assert.ok(result.meta.sources.some(row=>row.source.endsWith('/openai_tools.rs')));
   assert.ok(result.meta.executable.some(row=>row.name===caller),JSON.stringify(result.meta.refused.filter(row=>row.name===caller)));
   const declaration=result.executableDeclarations.find(row=>row.qualifiedName===caller);assert.ok(declaration);lower=declaration.lower;
   const lowered=lower({runtimeModule:'./runtime/effects.mjs'});type=lowered.own.params[0].type;
   requireBorrowedJsonToolType(type);assert.match(lowered.emitted.text,/ml_host_borrowedJsonToolIsTranslatable/u);
   checkedText=regular.serializeProgram(lowered.program);flatText=flat.serializeProgram(lowered.program);
   for(const program of [regular.parseProgram(checkedText),flat.parseProgram(flatText)]){
    const entry=[...program.declarations.values()].find(row=>row.k==='fn'&&row.params.some(parameter=>parameter.type.kind==='routerBorrowedJsonTool'));
    assert.ok(entry);requireBorrowedJsonToolType(entry.params[0].type);
   }
   const forged=JSON.parse(checkedText);const rows=forged.program.declarations.$map;
   const row=rows.find(([,entry])=>entry.k==='fn'&&entry.params.some(parameter=>parameter.type.kind==='routerBorrowedJsonTool'));
   assert.ok(row);row[1].body={k:'lit',type:{kind:'bool'},value:true};assert.throws(()=>regular.parseProgram(JSON.stringify(forged)));
   return {javascript:result.javascript,typescript:result.typescript};
  },mode);
  assert.match(answer.javascript,/borrowedJsonToolIsTranslatable/u);assert.match(answer.typescript,/unknown/u);
  assert.throws(()=>requireBorrowedJsonToolType(type));assert.throws(()=>lower());
  assert.throws(()=>regular.parseProgram(checkedText));assert.throws(()=>flat.parseProgram(flatText));
  // A fresh operation must reconstruct the original source, not revive old facts.
  withBorrowedJsonToolProject(options,result=>{
   const declaration=result.executableDeclarations.find(row=>row.qualifiedName===caller);assert.ok(declaration);
   requireBorrowedJsonToolType(declaration.lower().own.params[0].type);
  },mode);
 }));
}
test('project consumer validation runs before it observes any source options',()=>{
 let observations=0;const options=new Proxy({},{get(){observations++;throw Error('invalid consumer must not read options');}});
 for(const consume of [null,async()=>{},new Proxy(()=>{},{})])assert.throws(()=>withBorrowedJsonToolProject(options,consume));
 assert.throws(()=>withBorrowedJsonToolProject(options,()=>{},'invented-mode'));assert.equal(observations,0);
});
