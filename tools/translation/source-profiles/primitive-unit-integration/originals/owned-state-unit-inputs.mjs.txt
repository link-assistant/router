// Paired signatures are proposals only. The complete edited JavaScript is
// freshly checked after native-selected, non-executable annotation additions.
import {posix} from 'node:path';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {createOwnedStateContext,translateOwnedStateTypeScript} from './owned-state.mjs';
import {ownedCoreSourceData,requireOwnedCoreSourceCurrent} from './owned-state-source.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Owned state signature proposals: '+message);};
export function projectOwnedStateUnitJavaScript(source,{context,sourcePath,pairedTypeScriptPath}={}){
 const data=ownedCoreSourceData(context);if(data.files.find(row=>row.path===sourcePath)?.source!==source)fail('complete original JavaScript/path differs');
 const ts=ownershipCompiler(),file=ts.createSourceFile(sourcePath,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native syntax differs');
 const functions=file.statements.filter(ts.isFunctionDeclaration),missing=functions.filter(node=>node.parameters.some(parameter=>!ts.getJSDocType(parameter))),edits=[],imports=new Map();
 if(!missing.length)return {source,context,history:null};
 const previous=data.files.find(row=>row.path===pairedTypeScriptPath)?.source;if(typeof previous!=='string')fail('missing written JavaScript inputs require a complete actual TypeScript signature proposal');
 const previousContext=createOwnedStateContext({...data,files:data.files.filter(row=>row.path!==sourcePath)});
 const checked=translateOwnedStateTypeScript(previous,{context:previousContext,sourcePath:pairedTypeScriptPath});
 const relative=family=>{const path=posix.relative(posix.dirname(sourcePath),data.runtimeRoot+'/'+family+'-runtime.mjs');return path.startsWith('.')?path:'./'+path;};
 function operation(name,family,index){const key=family+':'+name;if(!imports.has(key))imports.set(key,{name,family,local:'paired_input_'+name});return 'Parameters<typeof '+imports.get(key).local+'>['+index+']';}
 function type(domain){
  const json='import('+JSON.stringify(relative('json-macro'))+').JsonValue';
  if(domain==='json-ref')return json;if(domain==='json-list-ref')return 'readonly '+json+'[]';if(domain==='str')return 'string';if(domain==='bool')return 'boolean';
  if(domain==='i64')return operation('json_macro_i64','json-macro',0);
  if(domain==='u64')return operation('router_state_json_with_index','json-state',1);if(domain==='usize')return operation('router_core_json_index_usize','json-update',1);if(domain==='map-ref')return operation('router_core_json_map_index','json-update',0);
  fail('paired public input needs its own source-bound signature rule: '+domain);
 }
 for(const declaration of missing){
  const candidates=checked.program.filter(item=>item.javascript===declaration.name?.text);if(candidates.length!==1)fail('unique actual paired function signature required');const item=candidates[0];
  if(item.params.length!==declaration.parameters.length)fail('paired parameter count differs');const docs=[];
  declaration.parameters.forEach((parameter,index)=>{if(!ts.isIdentifier(parameter.name)||parameter.name.text!==item.params[index].name)fail('paired parameter identity differs');if(!ts.getJSDocType(parameter))docs.push(' * @param {'+type(item.params[index].type)+'} '+parameter.name.text);});
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
