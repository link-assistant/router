// Real production-source adoption -> whole private compiler -> both reverse
// source readers. SOURCE ONLY: every runtime/receiving invocation is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createConcreteSourceRuleRegistry,applyConcreteSourceRulePlan} from '../concrete-source-rule-registry.mjs';
import {withActualPolicySourceUniverse,policyOriginalEntry,policyOriginalPaths,policyOriginalSource,policyOriginalCargo} from '../policy-nominal-producer-20261101-corpus.mjs';
import {withBorrowedJsonToolProject} from '../borrowed-json-tool-20261103-project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from '../json-capabilities.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import * as coreSource from '../js-to-rust/owned-core-source.mjs';
import * as core from '../js-to-rust/owned-core-operations.mjs';
import * as vectorSource from '../js-to-rust/owned-vector-candidate-source.mjs';
import * as vector from '../js-to-rust/owned-vector-candidate-operations.mjs';
const nativeCall='crate::borrowed_json_tool_predicate_20261103::borrowed_json_tool_is_translatable(tool)';
function sourceRules(path){return createConcreteSourceRuleRegistry([
 {id:'repository:preserve-input-comment',phase:'repository',requires:['language:bool-local'],discover:sources=>sources.some(row=>row.path===path&&row.source.includes('fn is_translatable(tool: &Value) -> bool {')),plan:sources=>{
  const source=sources[0].source,call=source.indexOf(nativeCall);assert.equal(source.indexOf(nativeCall,call+1),-1);const argument=call+nativeCall.lastIndexOf('tool)');
  return [{path,templates:[{span:[argument,argument+4],expected:'tool',parts:['/* original shared input */ tool']}]}];
 }},
 {id:'language:bool-local',phase:'language',plan:sources=>{
  const source=sources[0].source,start=source.indexOf('fn is_translatable(tool: &Value) -> bool {');assert.ok(start>=0);const open=source.indexOf('{',start),call=source.indexOf(nativeCall,open),end=source.indexOf('}',call)+1;assert.ok(call>open&&end>call);
  return [{path,templates:[{span:[open,end],expected:source.slice(open,end),parts:['{\n    let portable = ',{sourceSpan:[call,call+nativeCall.length]},';\n    portable\n}']}]}];
 }},
]);}
for(const [api,operations,candidate]of [[coreSource,core,false],[vectorSource,vector,true]]){
 test((candidate?'vector':'core')+' registered nested source rules retain original evidence through actual Rust/JS/TS receiving',{timeout:900000},async()=>{
  const staged=withActualPolicySourceUniverse({},context=>{
   const entry=policyOriginalEntry(context),prefix=entry.slice(0,-'lib.rs'.length),paths=policyOriginalPaths(context),path=prefix+'openai_tools.rs',before=policyOriginalSource(context,path),cargo=policyOriginalCargo(context),dependencies={manifest:cargo.manifest,lock:cargo.lock};
   const input=[{path,language:'Rust',source:before}],plan=sourceRules(path).planDiscovered(input);assert.equal(plan.discovery.sourceDiscovered,true);assert.deepEqual(plan.discovery.roots,['repository:preserve-input-comment']);assert.equal(plan.files[0].composition.nestedEdits,1);assert.equal(plan.semanticAuthority,false);assert.equal(plan.files[0].inverse,before);
   assert.deepEqual(plan.stages.map(row=>row.phase),['language','repository']);assert.match(plan.stages[0].files[0].after,/let portable/u);assert.doesNotMatch(plan.stages[0].files[0].after,/original shared input/u);assert.match(plan.stages[1].files[0].after,/original shared input/u);assert.equal(plan.stages[1].files[0].before,plan.stages[0].files[0].after);
   const replay=applyConcreteSourceRulePlan(input,JSON.parse(JSON.stringify(plan))),after=replay.files[0].source;assert.match(after,/let portable = crate::borrowed_json_tool_predicate_20261103::borrowed_json_tool_is_translatable\(\/\* original shared input \*\/ tool\);/u);
   const again=applyConcreteSourceRulePlan([{path,language:'Rust',source:after}],plan);assert.equal(again.applied,false);assert.equal(again.files[0].planOriginalInverse,before);
   const readSource=name=>name===path?after:policyOriginalSource(context,name),options={entry,paths,readSource,cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE};
   return withBorrowedJsonToolProject(options,result=>{
    const definition=result.ownedDefinitions.definitions.find(row=>row.name==='openai_tools.is_translatable');assert.ok(definition,JSON.stringify(result.ownedDefinitions.unsupported.filter(row=>row.name==='openai_tools.is_translatable')));assert.match(definition.javascript.after.source,/portable/u);
    const files=new Map(paths.filter(name=>name.startsWith(prefix)).map(name=>['src/'+name.slice(prefix.length),readSource(name)]));files.set('Cargo.toml',cargo.manifest);files.set('Cargo.lock',cargo.lock);
    for(const row of api.ownedCoreRuntimeSources('app/runtime','typed/runtime'))files.set(row.path,row.source);
    files.set(definition.javascriptPath,definition.javascript.after.source);files.set(definition.typescriptPath,definition.typescript.after.source);
    const receiving=api.createOwnedCoreSourceContext({runtimeRoot:'app/runtime',declarationRoot:'typed/runtime',...(candidate?{vectorBindings:[]}:{}),files:[...files].map(([path,source])=>({path,source}))});
    const programs=[];for(const target of [definition.javascriptPath,definition.typescriptPath]){
     const analyzed=operations.analyzeOwnedCoreModule(receiving,target);assert.equal(analyzed.program.length,1,JSON.stringify(analyzed.diagnostics));const checked=operations.checkOwnedCoreProgram(analyzed.program,receiving),rust=operations.emitOwnedCoreProgram(checked,'rust');
     assert.equal(rust.split('crate::borrowed_json_tool_predicate_20261103::borrowed_json_tool_is_translatable').length-1,1);programs.push(checked);
    }return programs;
   },'owned-definitions');
  });
  const object=fields=>({$:'Object',field0:{$:'Map',entries:Object.entries(fields).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>({$:'MapEntry',key,value}))}}),text=field0=>({$:'String',field0});
  for(const program of staged){const runtime=await operations.prepareOwnedCoreRuntime(program);for(const [input,expected]of [[{$:'Null'},false],[object({name:text('λ')}),true],[object({name:text('')}),false],[object({name:text('fallback'),function:{$:'Null'}}),false],[object({type:text('web_fetch')}),true]])assert.equal(operations.evaluateOwnedCoreProgram(program,program[0].name,[input],runtime),expected);}
 });
}
