// Paired type-only DATA never supplies source, value or ownership authority.
// Every retained original and the complete new target re-enter actual checking.
import {posix} from 'node:path';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {translateHttpResourceCallerTypeScript} from './js-to-rust/http-resource-callers.mjs';
import {sameRustSourceSyntax} from './rust-syntax-cells.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Resource unit original aliases: '+message);};
export function retainHttpResourceUnitTypeAliases(source,{unit,current,options,expectedRust}={}){
 const previous=current.TypeScript;if(previous===null||previous===undefined)return {source,history:null};
 if(typeof source!=='string'||typeof previous!=='string'||typeof expectedRust!=='string')fail('complete original and proposed target sources required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const parse=text=>{const file=ts.createSourceFile(unit.paths.TypeScript,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('complete original native target grammar required');return file;},original=parse(previous),aliases=original.statements.filter(ts.isTypeAliasDeclaration);
 if(!aliases.length)return {source,history:null};
 const typedOptions=text=>({...options,sourcePath:unit.paths.TypeScript,runtimeRoot:unit.runtimes.TypeScript,declarationRoot:unit.runtimes.TypeScript,files:options.files.filter(row=>row.path!==unit.paths.TypeScript).concat([{path:unit.paths.TypeScript,source:text}])});
 // This is a fresh whole original check, not a remembered alias/type verdict.
 translateHttpResourceCallerTypeScript(previous,typedOptions(previous));
 const target=parse(source),used=new Set(),originalImports=new Map(),targetImports=[],queryEdits=[],extraImports=[];let cells=0,sequence=0;
 const visit=(node,callback,depth=0)=>{if(++cells>400000||depth>256)fail('complete bounded original native identifier census required');callback(node);ts.forEachChild(node,child=>visit(child,callback,depth+1));};
 visit(target,node=>{if(ts.isIdentifier(node))used.add(node.text);});for(const alias of aliases)used.add(alias.name.text);
 if(target.statements.some(ts.isTypeAliasDeclaration))fail('the generated target must retain aliases through one complete original lane');
 const imports=(file,receive)=>{for(const item of file.statements){if(!ts.isImportDeclaration(item))continue;if(!ts.isStringLiteral(item.moduleSpecifier)||!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('actual ordinary named operation imports required');const path=posix.normalize(posix.join(posix.dirname(unit.paths.TypeScript),item.moduleSpecifier.text));for(const element of item.importClause.namedBindings.elements)receive({local:element.name.text,imported:element.propertyName?.text??element.name.text,path});}};
 imports(original,row=>{if(originalImports.has(row.local))fail('unique original operation binding required');originalImports.set(row.local,row);});imports(target,row=>targetImports.push(row));
 const mapped=new Map();
 function operation(local){
  if(mapped.has(local))return mapped.get(local);const row=originalImports.get(local);if(!row||!row.path.startsWith(unit.runtimes.TypeScript+'/'))fail('actual original alias query operation required');
  const existing=targetImports.find(item=>item.path===row.path&&item.imported===row.imported);let selected=existing?.local;
  if(selected===undefined){do{selected='retained_alias_operation_'+sequence++;}while(used.has(selected));used.add(selected);const relative=posix.relative(posix.dirname(unit.paths.TypeScript),row.path),specifier=relative.startsWith('.')?relative:'./'+relative;extraImports.push('import { '+row.imported+' as '+selected+' } from '+JSON.stringify(specifier)+';');targetImports.push({...row,local:selected});}
  mapped.set(local,selected);return selected;
 }
 const retained=[];
 for(const alias of aliases){
  const begin=alias.getFullStart(),end=alias.end,edits=[];visit(alias,node=>{if(!ts.isTypeQueryNode(node))return;if(!ts.isIdentifier(node.exprName))fail('actual original operation query identifier required');const start=node.exprName.getStart(original),replacement=operation(node.exprName.text);if(replacement!==node.exprName.text)edits.push({span:[start,node.exprName.end],expected:node.exprName.text,replacement});});
  let text=previous.slice(begin,end),last=end;for(const edit of edits.sort((left,right)=>right.span[0]-left.span[0])){if(edit.span[0]<begin||edit.span[1]>last||previous.slice(...edit.span)!==edit.expected)fail('disjoint complete original alias query spans required');text=text.slice(0,edit.span[0]-begin)+edit.replacement+text.slice(edit.span[1]-begin);last=edit.span[0];}retained.push({span:[begin,end],original:previous.slice(begin,end),source:text});queryEdits.push(...edits);
 }
 const proposed=extraImports.join('\n')+(extraImports.length?'\n':'')+retained.map(row=>row.source).join('\n')+'\n'+source;
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'http-resource-unit:retain-complete-original-alias-declarations-and-real-operation-bindings',apply:value=>{if(value!==source)fail('complete generated source join differs');const checked=translateHttpResourceCallerTypeScript(proposed,typedOptions(proposed));if(!sameRustSourceSyntax(checked.rust,expectedRust))fail('the complete retained target must reproduce the authoritative native behavior');return {source:proposed,checkedMeta:checked.meta};}}]},
  {phase:'repository',rules:[{id:'router:retain-original-paired-types-and-both-complete-CST-source-inverses',apply:value=>({...value,equations:transportConcreteSourceEquations([{before:source,after:value.source,language:'TypeScript'},{before:previous,after:value.source,language:'TypeScript'}])})}]},
 ]).run(source);
 return {source:run.value.source,history:{original:{path:unit.paths.TypeScript,source:previous},generated:source,retained,queryEdits,extraImports,checkedMeta:run.value.checkedMeta,equations:run.value.equations,trace:run.trace,sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false}};
}
