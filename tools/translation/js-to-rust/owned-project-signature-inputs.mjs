// Paired signatures are proposals only. The complete edited JavaScript is
// freshly checked after native-selected, non-executable annotation additions.
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {createOwnedStateContext,translateOwnedStateTypeScript} from './owned-outcome.mjs';
import {translateOwnedModuleProject} from './owned-module-scalar-project.mjs';
import {ownedProjectMayExportTypes} from './owned-project-type-exports.mjs';
import {ownedModuleOriginalDeclarations} from './owned-module-distribution.mjs';
import {ownedCoreSourceData,requireOwnedCoreSourceCurrent} from './owned-outcome-source.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Owned state signature proposals: '+message);};
export function projectOwnedStateUnitJavaScript(source,{context,sourcePath,pairedTypeScriptPath}={}){
 const data=ownedCoreSourceData(context);if(data.files.find(row=>row.path===sourcePath)?.source!==source)fail('complete original JavaScript/path differs');
 const ts=ownershipCompiler(),file=ts.createSourceFile(sourcePath,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native syntax differs');
 let cells=0;const needsReturnDomain=declaration=>{let needed=false;const visit=(node,depth=0)=>{if(++cells>100000||depth>160)fail('whole original constructor/return census bound exceeded');if(node!==declaration&&ts.isFunctionLike(node))return;if(ts.isObjectLiteralExpression(node)&&node.properties[0]?.name?.text==='$'&&node.properties[0].initializer&&ts.isStringLiteral(node.properties[0].initializer)&&['Ok','Err','Some','None'].includes(node.properties[0].initializer.text))needed=true;ts.forEachChild(node,child=>visit(child,depth+1));};visit(declaration);return needed&&!ts.getJSDocReturnType(declaration);};
 const functions=file.statements.filter(ts.isFunctionDeclaration),missing=functions.filter(node=>node.parameters.some(parameter=>!ts.getJSDocType(parameter))||needsReturnDomain(node)),edits=[],imports=new Map(),allNames=new Set();let nativeCells=0;const census=(node,depth=0)=>{if(++nativeCells>2000000||depth>160)fail('complete native signature hygiene bound exceeded');if(ts.isIdentifier(node))allNames.add(node.text);ts.forEachChild(node,child=>census(child,depth+1));};census(file);
 if(!missing.length)return {source,context,history:null};
 const previous=data.files.find(row=>row.path===pairedTypeScriptPath)?.source;if(typeof previous!=='string')fail('missing written JavaScript inputs require a complete actual TypeScript signature proposal');
 const previousContext=context,batch=signatureProjectBatches.get(context);if(!batch)fail('actual invocation-local paired project source check required');
 const checked=batch.forSource(sourcePath);
 const relative=family=>{const path=posix.relative(posix.dirname(sourcePath),data.runtimeRoot+'/'+family+'-runtime.mjs');return path.startsWith('.')?path:'./'+path;};
 function operation(name,family,index){const key=family+':'+name;if(!imports.has(key)){let local='paired_input_'+name,serial=0;while(allNames.has(local))local='paired_input_'+name+'_'+serial++;allNames.add(local);imports.set(key,{name,family,local});}return 'Parameters<typeof '+imports.get(key).local+'>['+index+']';}
 function type(domain){
  const json='import('+JSON.stringify(relative('json-macro'))+').JsonValue';
  if(domain==='json-ref'||domain==='json')return json;if(domain==='json-list-ref'||domain==='json-list-owned')return 'readonly '+json+'[]';if(domain==='str'||domain==='text-owned')return 'string';if(domain==='bool')return 'boolean';if(domain==='bytes-ref')return 'readonly bigint[]';if(domain==='base64-error-ref')return operation('base64ErrorText','base64',0);
  if(domain==='json-text-result')return operation('router_carrier_json_result_copy','owned-outcome',0);
  if(domain==='json-owned-option')return operation('router_carrier_json_option_or','owned-outcome',0);
  if(domain==='i64')return operation('json_macro_i64','json-macro',0);
  if(domain==='u64')return operation('router_state_json_with_index','json-state',1);if(domain==='usize')return operation('router_core_json_index_usize','json-update',1);if(domain==='map-ref')return operation('router_core_json_map_index','json-update',0);
  fail('paired public input needs its own source-bound signature rule: '+domain);
 }
 function returnType(domain){
  const operations={'json-text-result':['router_carrier_json_ok','owned-outcome'],'json-owned-option':['router_carrier_json_some','owned-outcome'],'json-option-ref':['serde_json_value_get_string','json'],'str-option-ref':['serde_json_value_as_str','json'],'bool-option':['serde_json_value_as_bool','json'],'u64-option':['serde_json_value_as_u64','json'],'i64-option':['serde_json_value_as_i64','json']},row=operations[domain];if(!row)fail('constructor return requires its actual registered carrier domain');operation(row[0],row[1],0);return 'ReturnType<typeof '+imports.get(row[1]+':'+row[0]).local+'>';
 }
 for(const declaration of missing){
  const candidates=checked.program.filter(item=>item.javascript===declaration.name?.text);if(candidates.length!==1)fail('unique actual paired function signature required');const item=candidates[0];
  if(item.params.length!==declaration.parameters.length)fail('paired parameter count differs');const docs=[];
  declaration.parameters.forEach((parameter,index)=>{if(!ts.isIdentifier(parameter.name)||parameter.name.text!==item.params[index].name)fail('paired parameter identity differs');if(!ts.getJSDocType(parameter))docs.push(' * @param {'+type(item.params[index].type)+'} '+parameter.name.text);});
  if(needsReturnDomain(declaration))docs.push(' * @returns {'+returnType(item.returns)+'}');
  const start=declaration.getStart(file);edits.push({span:[start,start],expected:'',replacement:'/**\n'+docs.join('\n')+'\n */\n',functionSpan:[start,declaration.end]});
 }
 if(imports.size)edits.push({span:[0,0],expected:'',replacement:[...imports.values()].map(row=>'import { '+row.name+' as '+row.local+' } from '+JSON.stringify(relative(row.family))+';').join('\n')+'\n',moduleStart:true});
 let projected=source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0]))projected=projected.slice(0,edit.span[0])+edit.replacement+projected.slice(edit.span[1]);
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:propose-actual-paired-input-domains-at-original-native-function-spans',apply:value=>{if(value!==source)fail('complete original join differs');return projected;}}]},
  {phase:'repository',rules:[{id:'router:retain-full-JavaScript-signature-proposal-and-original-TypeScript-inverse',apply:value=>({source:value,equation:transportConcreteSourceEquations([{before:source,after:value,language:'JavaScript'}])[0]})}]},
 ]).run(source);
 const files=data.files.filter(row=>row.path!==sourcePath&&row.path!==pairedTypeScriptPath).concat([{path:sourcePath,source:run.value.source}]),derived=createOwnedStateContext({...data,files});
 requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(previousContext);return {source:run.value.source,context:derived,history:{original:source,pairedTypeScript:{path:pairedTypeScriptPath,source:previous},edits,equation:run.value.equation,trace:run.trace,sourceAuthority:false,semanticAuthority:false}};
}

export {projectOwnedStateUnitJavaScript as projectOwnedOutcomeUnitJavaScript};

// Invocation membership only; entries are deleted before returning. There is
// no across-invocation source, checked-result, owner or verdict cache.
const signatureProjectBatches=new WeakMap();
export function projectOwnedModuleJavaScript(project,{context,pairedPaths}={}){
 if(project?.language!=='JavaScript'||!Array.isArray(project.modules)||!project.modules.length||project.modules.length>128||!(pairedPaths instanceof Map)||pairedPaths.size!==project.modules.length)fail('complete JavaScript project and paired path bijection required');
 const data=ownedCoreSourceData(context),originals=new Map(data.files.map(row=>[row.path,row.source])),jsPaths=new Set(project.modules.map(row=>row.path));if(jsPaths.size!==project.modules.length||!jsPaths.has(project.entry)||new Set(pairedPaths.values()).size!==pairedPaths.size)fail('unique actual complete source modules required');for(const row of project.modules)if(originals.get(row.path)!==row.source||!pairedPaths.has(row.path))fail('complete actual source module differs');
 const receiving=createOwnedStateContext(data),histories=[];let derived=receiving,qualified=null;
 function checkedFor(path){
  if(!qualified){
   const modules=project.modules.map(row=>{const paired=pairedPaths.get(row.path),source=originals.get(paired);if(typeof source!=='string')fail('complete actual paired TypeScript project is missing');return {path:paired,source};}),typedContext=createOwnedStateContext({...data,files:data.files.filter(row=>!jsPaths.has(row.path))}),result=translateOwnedModuleProject({entry:pairedPaths.get(project.entry),language:'TypeScript',modules},{context:typedContext}),declarations=ownedModuleOriginalDeclarations(result);
   qualified={result,declarations,typedContext};
  }
  const paired=pairedPaths.get(path),program=qualified.declarations.filter(row=>row.path===paired).map(row=>{const items=qualified.result.program.filter(item=>item.name===row.native&&item.javascript===row.linked);if(items.length!==1)fail('complete freshly checked paired declaration differs');return {...items[0],javascript:row.name};});return {program};
 }
 const batch={forSource:checkedFor};signatureProjectBatches.set(receiving,batch);
 try{
  const modules=[];for(const row of project.modules){
   // The same private batch travels only through contexts created here.
   signatureProjectBatches.set(derived,batch);const result=projectOwnedStateUnitJavaScript(row.source,{context:derived,sourcePath:row.path,pairedTypeScriptPath:pairedPaths.get(row.path)});if(result.context!==derived){signatureProjectBatches.delete(derived);derived=result.context;signatureProjectBatches.set(derived,batch);}modules.push({path:row.path,source:result.source});if(result.history)histories.push({path:row.path,...result.history});
  }
  const typedEntry=pairedPaths.get(project.entry);if(typeof originals.get(typedEntry)==='string'){const candidate={entry:typedEntry,language:'TypeScript',modules:project.modules.map(row=>({path:pairedPaths.get(row.path),source:originals.get(pairedPaths.get(row.path))}))};if(ownedProjectMayExportTypes(candidate,{context:receiving}))checkedFor(project.entry);}
  requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(receiving);requireOwnedCoreSourceCurrent(derived);if(qualified)requireOwnedCoreSourceCurrent(qualified.typedContext);
  return {project:{entry:project.entry,language:'JavaScript',modules},context:derived,pairedRootRustSource:qualified?.result.rust??null,history:{schema:'router-owned-project-signature-proposals-v1',modules:histories,pairedModuleHistory:qualified?.result.moduleSourceHistory??null,pairedSemanticMeta:qualified?.result.meta??null,pairedAliasHistory:qualified?.result.ownedTypeAliasSourceHistory??null,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false}};
 }finally{signatureProjectBatches.delete(receiving);signatureProjectBatches.delete(derived);}
}
