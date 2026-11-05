// Original-span reconciliation proposals. No file writes or native proof from
// syntax data: every composed source is independently rechecked before return.
import * as coreSource from './owned-core-source.mjs';
import * as vectorSource from './owned-vector-candidate-source.mjs';
import {ownedCoreContext} from './owned-vector-candidate-operations.mjs';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {translateOwnedCopyScalarHelperRust20261103} from './owned-copy-scalar-helper-rust-20261103.mjs';
import {translateOwnedCopyScalarHelperSource20261103} from './owned-copy-scalar-helper-profile-20261103.mjs';
import {withOwnedNativeProjectOperation} from './owned-native-project-operation.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {sameRustSourceSyntax} from '../rust-syntax-cells.mjs';
import {createConcreteSourceRuleRegistry} from '../concrete-source-rule-registry.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
const fail=message=>{throw TypeError('Scalar Rust source reconciliation: '+message);};
function signature(fn){return JSON.stringify([fn.name,fn.javascript,fn.exported,fn.returns,fn.params.map(param=>[param.name,param.rust,param.type])]);}
function bodies(source,path,program){
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,/\.(?:mts|ts)$/u.test(path)?ts.ScriptKind.TS:ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete source syntax differs');const result=new Map();
 for(const fn of program){
  const span=fn.pairedSource?.path===path?fn.pairedSource.span:fn.source.span;
  const selected=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.getStart(file)===span[0]&&node.end===span[1]&&node.name?.text===fn.javascript);
  if(selected.length!==1||!selected[0].body||result.has(fn.name))fail('actual declaration/body span differs');
  const body=selected[0].body;result.set(fn.name,{span:[body.getStart(file),body.end],text:source.slice(body.getStart(file),body.end)});
 }return result;
}
function rustFunctions(source,names){
 const result=new Map();for(const item of sourceItems(source))if(item.term==='fn'&&names.has(item.name)){
  if(result.has(item.name))fail('competing canonical Rust function');result.set(item.name,source.slice(item.start,item.end));
 }return result;
}
/** An adapter around the complete inverse, not an alternate semantic issuer. */
export function reconcileOwnedCopyScalarRustSource20261103(source,options){
 const data=coreSource.ownedPlainData(options);
 return coreSource.withOwnedCopyHelperSourceOperation(()=>withOwnedNativeProjectOperation(()=>{
  const inverse=translateOwnedCopyScalarHelperRust20261103(source,data);
  if(inverse.helperNetworkRestored)return {...inverse,minimalSourcePlan:null,unchangedSourceRestored:true};
  const previous=inverse.ownedRustRuleHistory.previousJavaScript;
  const deferred=reason=>({...inverse,minimalSourcePlan:null,unchangedSourceRestored:false,reconciliationRefusal:{reason,sourceAuthority:false,semanticAuthority:false}});
  if(previous===null)return deferred('no original JavaScript source to reconcile');
  if(inverse.ownedRustRuleHistory.projection.imports.length)return deferred('new runtime imports require a separate original binding/import rule');
  const old=translateOwnedCopyScalarHelperSource20261103(previous,{variant:data.variant,sourcePath:data.javascriptPath,input:data.input,...(Object.hasOwn(data,'typescriptOutputPath')?{typescriptOutputPath:data.typescriptOutputPath}:{})});
  if(old.program.length!==inverse.program.length)return deferred('added/deleted functions require an explicit module-interface rule');
  const originalByName=new Map(old.program.map(fn=>[fn.name,fn]));
  if(old.program.some((fn,at)=>fn.name!==inverse.program[at].name))return deferred('changed function order requires an explicit module-layout rule');
  if(inverse.program.some(fn=>!originalByName.has(fn.name)||signature(originalByName.get(fn.name))!==signature(fn)))return deferred('function names, parameter names/types, visibility or return types changed');
  const names=new Set(originalByName.keys()),beforeRust=rustFunctions(old.rust,names),afterRust=rustFunctions(source,names);
  if(beforeRust.size!==names.size||afterRust.size!==names.size)return deferred('complete original/current Rust function census differs');
  const changed=[...names].filter(name=>!sameRustSourceSyntax(beforeRust.get(name),afterRust.get(name)));
  if(!changed.length)return deferred('Rust changes are outside the retained function bodies');
  const projected=bodies(inverse.javascript,data.javascriptPath,inverse.program),sources=[{path:data.javascriptPath,language:'JavaScript',source:previous}],byPath=new Map();
  for(const fn of old.program)if(fn.pairedSource&&!byPath.has(fn.pairedSource.path))byPath.set(fn.pairedSource.path,{path:fn.pairedSource.path,language:'TypeScript',source:fn.pairedSource.source});
  sources.push(...byPath.values());const edits=new Map();
  for(const file of sources){
   const selected=old.program.filter(fn=>file.language==='JavaScript'||fn.pairedSource?.path===file.path),original=bodies(file.source,file.path,selected);
   const templates=changed.filter(name=>original.has(name)).map(name=>{const before=original.get(name),after=projected.get(name);if(!after)fail('complete projected function body missing');return {span:before.span,expected:before.text,parts:[after.text]};});edits.set(file.path,templates);
  }
  const pipeline=createRulePipeline([
   {phase:'language',rules:[{id:'language:compose-changed-function-bodies-over-original-source-spans',apply:()=>{
    const registry=createConcreteSourceRuleRegistry([
     {id:'language:retain-unchanged-functions-and-substitute-checked-body-proposals',phase:'language',plan:files=>files.map(file=>({path:file.path,templates:edits.get(file.path)}))},
     {id:'repository:retain-original-imports-signatures-comments-and-helper-modules',phase:'repository',requires:['language:retain-unchanged-functions-and-substitute-checked-body-proposals'],plan:files=>files.map(file=>({path:file.path,templates:[]}))},
    ]);return registry.plan(sources,['repository:retain-original-imports-signatures-comments-and-helper-modules']);
   }},{id:'language:freshly-check-all-composed-original-sources-and-semantic-meta',apply:plan=>{
    const projectedContext=ownedCoreContext(inverse.program[0]),inputs=vectorSource.ownedCoreSourceData(projectedContext),replacements=new Map(plan.files.map(file=>[file.path,file.after]));
    const files=inputs.files.filter(file=>!replacements.has(file.path)).concat(plan.files.map(file=>({path:file.path,source:file.after})));
    const candidateInput={...inputs,files},javascript=replacements.get(data.javascriptPath);
    const checked=translateOwnedCopyScalarHelperSource20261103(javascript,{variant:'vector',sourcePath:data.javascriptPath,input:candidateInput,...(Object.hasOwn(data,'typescriptOutputPath')?{typescriptOutputPath:data.typescriptOutputPath}:{})});
    return {plan,checked,javascript};
   }},{id:'language:reproduce-the-entire-authoritative-Rust-after-minimal-source-editing',apply:row=>{if(!sameRustSourceSyntax(source,row.checked.rust))fail('minimally changed sources do not reproduce the complete Rust input');return row;}}]},
   {phase:'repository',rules:[{id:'repository:retain-explicit-shared-helper-and-adoption-obligations',apply:row=>{const equation=transportConcreteSourceEquations([{before:source,after:row.checked.rust,language:'Rust'}])[0],sourceEquation=row.plan.files.find(file=>file.path===data.javascriptPath).history;return {...row.checked,javascript:row.javascript,originalRust:source,minimalSourcePlan:row.plan,unchangedSourceRestored:false,changedFunctions:changed,retainedFunctions:[...names].filter(name=>!changed.includes(name)),helperNetworkRestored:false,sourceConflicts:[{kind:'changed-caller-helper-reconciliation',path:data.javascriptPath,changedFunctions:changed,reason:'Unchanged function bodies and helper modules are preserved; edited callers still need helper decomposition/adoption reconciliation.',requiresReconciliation:true}],ownedRustRuleHistory:{...inverse.ownedRustRuleHistory,equation,sourceEquation,canonicalProjection:inverse.ownedRustRuleHistory.projection,projection:null},runtimeParity:false,rustExecuted:false,wholeRouterSynchronization:false};}}]},
  ]).run(null);
  return {...pipeline.value,sourceReconciliationTrace:pipeline.trace};
 }));
}
