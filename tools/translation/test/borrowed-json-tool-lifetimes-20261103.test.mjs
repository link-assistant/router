// Full original source expansion and Rust→JS/TS→Rust→JS/TS receiving SOURCE.
// No test, parser, translator or Rust compilation has been executed to draft it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {withBorrowedJsonToolProject} from '../borrowed-json-tool-20261103-project.mjs';
import {withActualPolicySourceUniverse,policyOriginalEntry,policyOriginalPaths,policyOriginalSource,policyOriginalCargo} from '../policy-nominal-producer-20261101-corpus.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {actualJsonCapabilityProfile} from '../json-capabilities.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import * as coreSource from '../js-to-rust/owned-core-source.mjs';
import * as core from '../js-to-rust/owned-core-operations.mjs';
import * as vectorSource from '../js-to-rust/owned-vector-candidate-source.mjs';
import * as vector from '../js-to-rust/owned-vector-candidate-operations.mjs';
import {borrowedJsonToolReverseRuntimeSources} from '../borrowed-json-tool-20261103-reverse-calls.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const NAME='json_lifetime_probe_20261103';
const native=(binders,reference,body='crate::borrowed_json_tool_predicate_20261103::borrowed_json_tool_is_translatable(tool)')=>
 'use serde_json::Value;\npub fn probe'+binders+'(tool: '+reference+') -> bool { '+body+' }\n';
function withProduction(run){
 return withActualPolicySourceUniverse({},context=>{
  const entry=policyOriginalEntry(context),prefix=entry.slice(0,-'lib.rs'.length),paths=policyOriginalPaths(context),cargo=policyOriginalCargo(context),dependencies={manifest:cargo.manifest,lock:cargo.lock};
  const original=new Map(paths.map(path=>[path,policyOriginalSource(context,path)]));
  const options={entry,paths,readSource:path=>original.get(path),cargoManifest:cargo.manifest,cargoManifestPath:cargo.manifestPath,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),jsonParserProfile:actualJsonCapabilityProfile({...dependencies,compilationProfile:PRODUCTION_PROFILE}),compilationProfile:PRODUCTION_PROFILE};
  return run({entry,prefix,paths,cargo,original,options});
 });
}
function expanded(state,leaf,name=NAME){
 const path=state.prefix+name+'.rs',files=new Map(state.original),before=files.get(state.entry),after=before+'\nmod '+name+';\n';files.set(state.entry,after);files.set(path,leaf);
 const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];assert.equal(history.inverse,before);assert.equal(transportConcreteSyntaxMeta(history.afterMeta).source,after);
 return {files,options:{...state.options,paths:[...state.paths,path],readSource:source=>files.get(source)},history};
}
function receiving(state,files,api,candidate,definition){
 const inputs=new Map([...files].filter(([path])=>path.startsWith(state.prefix)).map(([path,source])=>['src/'+path.slice(state.prefix.length),source]));
 inputs.set('Cargo.toml',state.cargo.manifest);inputs.set('Cargo.lock',state.cargo.lock);
 for(const row of [...api.ownedCoreRuntimeSources('app/runtime','typed/runtime'),...borrowedJsonToolReverseRuntimeSources('app/runtime','typed/runtime')])inputs.set(row.path,row.source);
 inputs.set(definition.javascriptPath,definition.javascript.after.source);inputs.set(definition.typescriptPath,definition.typescript.after.source);
 return api.createOwnedCoreSourceContext({runtimeRoot:'app/runtime',declarationRoot:'typed/runtime',...(candidate?{vectorBindings:[]}:{}),files:[...inputs].map(([path,source])=>({path,source}))});
}
for(const [binders,reference]of [["<'input>","&'input Value"],["<'left, 'right>","&'right Value"],['',"&'static Value"],['','&Value']]){
 test('complete original parser and body check retain input lifetime '+reference,{timeout:900000},()=>withProduction(state=>{
  const expandedSource=expanded(state,native(binders,reference));
  withBorrowedJsonToolProject(expandedSource.options,result=>{
   const declaration=result.executableDeclarations.find(row=>row.qualifiedName===NAME+'.probe');assert.ok(declaration,JSON.stringify(result.meta.refused.filter(row=>row.name===NAME+'.probe')));
   const input=declaration.lower().own.params[0].type;assert.deepEqual(input.rustReference.tokens.map(token=>token.value),reference==="&'static Value"?['&',"'",'static','Value']:reference==='&Value'?['&','Value']:['&',"'",reference.includes('right')?'right':'input','Value']);
   const definition=result.ownedDefinitions.definitions.find(row=>row.name===NAME+'.probe');assert.ok(definition,JSON.stringify(result.ownedDefinitions.unsupported.filter(row=>row.name===NAME+'.probe')));
   assert.equal(definition.semanticAuthority,false);assert.equal(definition.moduleStartupEquivalent,false);assert.match(definition.javascript.after.source,/ml_borrowed_json_tool_input/u);assert.match(definition.typescript.after.source,/unknown/u);
  },'owned-definitions');
 }));
}
test('undeclared, duplicate, mutable and outlives lifetime source remains refused',{timeout:900000},()=>withProduction(state=>{
 for(const [binders,reference]of [['',"&'missing Value"],["<'same, 'same>","&'same Value"],["<'a>","&'a mut Value"],["<'a: 'b, 'b>","&'a Value"]]){
  const source=expanded(state,native(binders,reference));
  withBorrowedJsonToolProject(source.options,result=>assert.equal(result.meta.executable.some(row=>row.name===NAME+'.probe'),false));
 }
}));
for(const [api,operations,candidate]of [[coreSource,core,false],[vectorSource,vector,true]])for(const language of ['JavaScript','TypeScript']){
 test((candidate?'vector':'core')+' '+language+' receives complete actual emitted source and retranslates its emitted Rust',{timeout:900000},async()=>{
  const staged=withProduction(state=>{
   const first=expanded(state,native("<'input>","&'input Value"));
   return withBorrowedJsonToolProject(first.options,result=>{
    const definition=result.ownedDefinitions.definitions.find(row=>row.name===NAME+'.probe');assert.ok(definition);
    const context=receiving(state,first.files,api,candidate,definition),path=language==='JavaScript'?definition.javascriptPath:definition.typescriptPath;
    const analyzed=operations.analyzeOwnedCoreModule(context,path);assert.equal(analyzed.program.length,1,JSON.stringify(analyzed.diagnostics));
    const checked=operations.checkOwnedCoreProgram(analyzed.program,context),rust=operations.emitOwnedCoreProgram(checked,'rust');assert.match(rust,/&'a ::serde_json::Value/u);
    const back=expanded(state,rust,'json_reverse_probe_20261103');
    return withBorrowedJsonToolProject(back.options,again=>{
     const expected='json_reverse_probe_20261103.'+checked[0].name,retranslated=again.ownedDefinitions.definitions.find(row=>row.name===expected);assert.ok(retranslated,JSON.stringify(again.ownedDefinitions.unsupported.filter(row=>row.name===expected)));
     const received=receiving(state,back.files,api,candidate,retranslated),target=language==='JavaScript'?retranslated.javascriptPath:retranslated.typescriptPath,rebuilt=operations.analyzeOwnedCoreModule(received,target);assert.equal(rebuilt.program.length,1,JSON.stringify(rebuilt.diagnostics));
     return {original:checked,rebuilt:operations.checkOwnedCoreProgram(rebuilt.program,received)};
    },'owned-definitions');
   },'owned-definitions');
  });
  const first=await operations.prepareOwnedCoreRuntime(staged.original),second=await operations.prepareOwnedCoreRuntime(staged.rebuilt);
  const object=fields=>({$:'Object',field0:{$:'Map',entries:Object.entries(fields).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>({$:'MapEntry',key,value}))}}),string=field0=>({$:'String',field0});
  for(const [value,expected]of [[{$:'Null'},false],[object({}),false],[object({name:string('λ')}),true],[object({type:string('web_search')}),true],[object({name:string('fallback'),function:{$:'Null'}}),false]]){
   assert.equal(operations.evaluateOwnedCoreProgram(staged.original,staged.original[0].name,[value],first),expected);
   assert.equal(operations.evaluateOwnedCoreProgram(staged.rebuilt,staged.rebuilt[0].name,[value],second),expected);
  }
 });
}
