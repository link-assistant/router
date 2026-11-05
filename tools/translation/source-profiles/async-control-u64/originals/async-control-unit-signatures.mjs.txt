// Paired types propose missing annotations; only fresh complete caller checking
// can accept the resulting JS. No signature data supplies a resource permit.
import {posix} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {translateAsyncControlCallerTypeScript} from './js-to-rust/async-control-callers.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Async unit signatures: '+message);};
export function projectAsyncControlUnitJavaScript(source,{unit,current,options}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');const file=ts.createSourceFile(unit.paths.JavaScript,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original JS grammar required');
 const functions=file.statements.filter(ts.isFunctionDeclaration),missing=functions.filter(fn=>fn.parameters.some(parameter=>!ts.getJSDocType(parameter)));if(!missing.length)return {source,history:null};if(typeof current.TypeScript!=='string')fail('missing JS input domains require a current checked TypeScript pair');
 const typed=translateAsyncControlCallerTypeScript(current.TypeScript,{...options,sourcePath:unit.paths.TypeScript,runtimePath:unit.runtimes.TypeScript+'/async-control-runtime.mjs'}),rows=JSON.parse(typed.meta).functions,used=new Set(),imports=new Map(),edits=[];let cells=0,sequence=0;
 const visit=(node,depth=0)=>{if(++cells>200000||depth>256)fail('complete original identifier census bound');if(ts.isIdentifier(node))used.add(node.text);ts.forEachChild(node,child=>visit(child,depth+1));};visit(file);
 const operation=name=>{if(!imports.has(name)){let local;do{local='paired_control_input_'+sequence++;}while(used.has(local));used.add(local);imports.set(name,local);}return imports.get(name);};
 const type=domain=>{if(domain==='str')return 'string';if(domain==='bool')return 'boolean';const row={'cancel-ref':['router_cancel_is_set',0],'sender-ref':['router_async_send',0],'receiver-mut':['router_async_receive',0]}[domain];if(!row)fail('paired public domain needs an independent input rule');return 'Parameters<typeof '+operation(row[0])+'>['+row[1]+']';};
 for(const fn of missing){
  const matches=rows.filter(row=>row.name===fn.name?.text);if(matches.length!==1||matches[0].parameters.length!==fn.parameters.length)fail('actual paired function identity/arity differs');const docs=[];
  fn.parameters.forEach((parameter,index)=>{if(!ts.isIdentifier(parameter.name)||parameter.name.text!==matches[0].parameters[index].name)fail('actual paired parameter identity differs');if(!ts.getJSDocType(parameter))docs.push(' * @param {'+type(matches[0].parameters[index].type)+'} '+parameter.name.text);});
  const start=fn.getStart(file);edits.push({span:[start,start],expected:'',replacement:'/**\n'+docs.join('\n')+'\n */\n'});
 }
 if(imports.size){const target=posix.relative(posix.dirname(unit.paths.JavaScript),unit.runtimes.JavaScript+'/async-control-runtime.mjs'),specifier=target.startsWith('.')?target:'./'+target;edits.push({span:[0,0],expected:'',replacement:'import { '+[...imports].map(([name,local])=>name+' as '+local).join(', ')+' } from '+JSON.stringify(specifier)+';\n'});}
 let projected=source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0]))projected=projected.slice(0,edit.span[0])+edit.replacement+projected.slice(edit.span[1]);
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'async-control-unit:propose-native-selected-checked-paired-input-domains',apply:value=>{if(value!==source)fail('complete original JS source join');return projected;}}]},
  {phase:'repository',rules:[{id:'router:retain-original-JS-and-current-checked-TS-signature-inverses',apply:value=>({source:value,equation:transportConcreteSourceEquations([{before:source,after:value,language:'JavaScript'}])[0]})}]},
 ]).run(source);
 return {source:run.value.source,history:{original:source,pairedTypeScript:{path:unit.paths.TypeScript,source:current.TypeScript},edits,equation:run.value.equation,trace:run.trace,sourceAuthority:false,semanticAuthority:false}};
}
