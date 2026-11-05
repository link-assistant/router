// Paired types propose missing annotations; only fresh complete caller checking
// can accept the resulting JS. No signature data supplies a resource permit.
import {posix} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {translateHttpResourceCallerTypeScript} from './js-to-rust/http-resource-callers.mjs';
import {httpResourceCallerContract} from './js-to-rust/http-resource-caller-contracts.mjs';
import {httpResourcePublicInputType} from './js-to-rust/http-resource-public-domains.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Async unit signatures: '+message);};
export function projectHttpResourceUnitJavaScript(source,{unit,current,options}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');const file=ts.createSourceFile(unit.paths.JavaScript,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original JS grammar required');
 const functions=file.statements.filter(ts.isFunctionDeclaration),missing=functions.filter(fn=>fn.parameters.some(parameter=>!ts.getJSDocType(parameter)));if(!missing.length)return {source,history:null};if(typeof current.TypeScript!=='string')fail('missing JS input domains require a current checked TypeScript pair');
 const typed=translateHttpResourceCallerTypeScript(current.TypeScript,{...options,sourcePath:unit.paths.TypeScript,runtimeRoot:unit.runtimes.TypeScript,declarationRoot:unit.runtimes.TypeScript}),rows=JSON.parse(typed.meta).functions,used=new Set(),imports=new Map(),edits=[];let cells=0,sequence=0;
 const visit=(node,depth=0)=>{if(++cells>200000||depth>256)fail('complete original identifier census bound');if(ts.isIdentifier(node))used.add(node.text);ts.forEachChild(node,child=>visit(child,depth+1));};visit(file);
 const operation=name=>{if(!imports.has(name)){const row=httpResourceCallerContract(name);if(!row)fail('actual paired input operation required');let local;do{local='paired_http_input_'+sequence++;}while(used.has(local));used.add(local);imports.set(name,{local,module:row.runtimeModule});}return imports.get(name).local;};
 const type=domain=>httpResourcePublicInputType(domain,operation);
 for(const fn of missing){
  const matches=rows.filter(row=>row.name===fn.name?.text);if(matches.length!==1||matches[0].parameters.length!==fn.parameters.length)fail('actual paired function identity/arity differs');const docs=[];
  if(matches[0].genericIdentity){const actual=matches[0].genericIdentity,parameter=fn.parameters[0];if(fn.parameters.length!==1||!ts.isIdentifier(parameter.name)||parameter.name.text!==actual.parameter)fail('actual paired generic input identity differs');const written=actual.carrier==='option'?'ReturnType<typeof '+operation('router_option_identity')+'<'+actual.typeParameter+'>>':actual.typeParameter,start=fn.getStart(file);edits.push({span:[start,start],expected:'',replacement:'/**\n * @template '+actual.typeParameter+'\n * @param {'+written+'} '+actual.parameter+'\n * @returns {'+written+'}\n */\n'});continue;}
  fn.parameters.forEach((parameter,index)=>{if(!ts.isIdentifier(parameter.name)||parameter.name.text!==matches[0].parameters[index].name)fail('actual paired parameter identity differs');if(!ts.getJSDocType(parameter))docs.push(' * @param {'+type(matches[0].parameters[index].type)+'} '+parameter.name.text);});
  const start=fn.getStart(file);edits.push({span:[start,start],expected:'',replacement:'/**\n'+docs.join('\n')+'\n */\n'});
 }
 if(imports.size){const modules=new Map();for(const [name,row]of imports){if(!modules.has(row.module))modules.set(row.module,[]);modules.get(row.module).push(name+' as '+row.local);}const replacement=[...modules].map(([module,names])=>{const target=posix.relative(posix.dirname(unit.paths.JavaScript),unit.runtimes.JavaScript+'/'+module),specifier=target.startsWith('.')?target:'./'+target;return 'import { '+names.join(', ')+' } from '+JSON.stringify(specifier)+';';}).join('\n')+'\n';edits.push({span:[0,0],expected:'',replacement});}
 let projected=source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0]))projected=projected.slice(0,edit.span[0])+edit.replacement+projected.slice(edit.span[1]);
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'http-resource-unit:propose-native-selected-fresh-checked-paired-input-domains',apply:value=>{if(value!==source)fail('complete original JS source join');return projected;}}]},
  {phase:'repository',rules:[{id:'router:retain-original-JS-and-current-checked-TS-signature-inverses',apply:value=>({source:value,equation:transportConcreteSourceEquations([{before:source,after:value,language:'JavaScript'}])[0]})}]},
 ]).run(source);
 return {source:run.value.source,history:{original:source,pairedTypeScript:{path:unit.paths.TypeScript,source:current.TypeScript},edits,equation:run.value.equation,trace:run.trace,sourceAuthority:false,semanticAuthority:false}};
}
