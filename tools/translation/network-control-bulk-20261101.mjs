// Additive complete transparent-module HTTP caller expansion. SOURCE DRAFT/UNRUN.
// Resolution proposes source; original private caller checks issue all admission.
import {posix} from 'node:path';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
import {ownedPlainData,ownedSourcePath,createOwnedCoreSourceContext,ownedCoreSourceData,requireOwnedCoreSourceCurrent} from './js-to-rust/owned-cancellation-source.mjs';
import {httpResourceCallerContract} from './js-to-rust/http-resource-caller-contracts.mjs';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from './js-to-rust/http-resource-callers.mjs';
import {captureHttpResourceCallerInputs} from './js-to-rust/http-resource-caller-source.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {translateHttpResourceCallerRust} from './js-to-rust/http-resource-rust.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {sameRustSourceSyntax} from './rust-syntax-cells.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountCompleteData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Network control transparent modules: '+message);};
const edge=(from,to)=>{const relative=posix.relative(posix.dirname(from),to);return relative.startsWith('.')?relative:'./'+relative;};
function concrete(source,language){const value=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(value.meta).source!==source)fail('complete original CST inverse differs');return value;}
function resolveSource(source,{sourcePath,runtimeRoot,files},language){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3'||!ownershipCompilerRuntimeNativeCurrent(ts))fail('original lockfile native TypeScript 5.9.3 required');
 const table=new Map(files.map(row=>[row.path,row.source])),original=concrete(source,language),modules=new Map(),visiting=new Set(),terminals=[],edits=[],names=new Set();let cells=0,selection=0,retainedDependencies=0;
 const tick=()=>{if(++cells>100000)fail('complete native source selection bound');};
 function file(path,text,kind){const result=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,kind);if(result.parseDiagnostics.length)fail('whole original native module grammar required');return result;}
 const caller=file(sourcePath,source,language==='JavaScript'?ts.ScriptKind.JS:ts.ScriptKind.TS);
 function collect(node,depth=0){tick();if(depth>512)fail('complete caller identifier depth bound');if(ts.isIdentifier(node))names.add(node.text);ts.forEachChild(node,child=>collect(child,depth+1));}collect(caller);
 function target(owner,node){if(!ts.isStringLiteral(node)||!node.text.startsWith('.')||!node.text.endsWith('.mjs')||/[?#\\\0]/u.test(node.text))fail('relative ordinary .mjs module edge required');return ownedSourcePath(posix.normalize(posix.join(posix.dirname(owner),node.text)));}
 function terminal(path,name){
  const operation=httpResourceCallerContract(name),expected=name==='deferFilesystemFlow'?runtimeRoot+'/extensions/filesystem-effects-runtime.mjs':operation?runtimeRoot+'/'+operation.runtimeModule:null;
  if(path!==expected||!table.has(path))fail('actual registered complete runtime export owner required');return {path,name};
 }
 function appendDependencies(target,rows){retainedDependencies+=rows.length;if(rows.length>4096||target.length+rows.length>4096||retainedDependencies>16384)fail('complete forwarding dependency bound');target.push(...rows);}
 function visit(path,depth=0){
  tick();if(depth>32||visiting.has(path))fail('transparent module depth/cycle refusal');if(modules.has(path))return modules.get(path);
  if(modules.size>=128||path.startsWith(runtimeRoot+'/'))fail('bounded separate transparent application modules required');
  const text=table.get(path);if(typeof text!=='string')fail('complete actual transparent module source missing');
  const cst=concrete(text,'JavaScript'),parsed=file(path,text,ts.ScriptKind.JS),exports=new Map(),dependencies=[];
  if(!parsed.statements.length||parsed.statements.length>4096)fail('complete nonempty bounded transparent module required');visiting.add(path);
  for(const statement of parsed.statements){tick();
   if(!ts.isExportDeclaration(statement)||statement.isTypeOnly||statement.modifiers?.length||statement.attributes||!statement.moduleSpecifier||!statement.exportClause||!ts.isNamedExports(statement.exportClause)||!statement.exportClause.elements.length)fail('transparent modules require only complete named value reexports');
   const destination=target(path,statement.moduleSpecifier),direct=destination.startsWith(runtimeRoot+'/'),child=direct?null:visit(destination,depth+1);
   for(const item of statement.exportClause.elements){tick();if(item.isTypeOnly||!ts.isIdentifier(item.name)||item.name.text==='default'||item.propertyName&&!ts.isIdentifier(item.propertyName)||exports.has(item.name.text))fail('unique ordinary transparent value export required');
    const imported=item.propertyName?.text??item.name.text,resolved=direct?terminal(destination,imported):child.exports.get(imported);if(!resolved)fail('actual complete forwarded export is unresolved');exports.set(item.name.text,resolved);
    if(direct)appendDependencies(dependencies,[resolved]);
   }
   if(child)appendDependencies(dependencies,child.dependencies);
  }
  visiting.delete(path);if(modules.size>=128)fail('complete transparent module count bound');const result={path,source:text,concreteSyntax:cst.meta,exports,dependencies};modules.set(path,result);return result;
 }
 function freshName(){let name;do{name='network_forwarded_dependency_'+selection++;}while(names.has(name));names.add(name);return name;}
 for(const item of caller.statements){
  if(!ts.isImportDeclaration(item))continue;
  const destination=target(sourcePath,item.moduleSpecifier);if(destination.startsWith(runtimeRoot+'/'))continue;
  if(item.modifiers?.length||item.attributes||item.importClause?.isTypeOnly||item.importClause?.name||!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings)||!item.importClause.namedBindings.elements.length)fail('only ordinary named caller imports can forward');
  const module=visit(destination),replacement=[],loaded=new Set();
  // Preserve each erased barrel's full depth-first dependency loading sequence,
  // including unselected reexports. Checked unused named imports retain those
  // loads without a new side-effect import exception in the original checker.
  for(const dependency of module.dependencies){if(loaded.has(dependency.path))continue;loaded.add(dependency.path);terminals.push(dependency);replacement.push('import { '+dependency.name+' as '+freshName()+' } from '+JSON.stringify(edge(sourcePath,dependency.path))+';');}
  for(const specifier of item.importClause.namedBindings.elements){if(specifier.isTypeOnly||!ts.isIdentifier(specifier.name)||specifier.propertyName&&!ts.isIdentifier(specifier.propertyName))fail('ordinary actual caller binding required');const imported=specifier.propertyName?.text??specifier.name.text,resolved=module.exports.get(imported);if(!resolved)fail('original caller imported a missing transparent export');replacement.push('import { '+resolved.name+' as '+specifier.name.text+' } from '+JSON.stringify(edge(sourcePath,resolved.path))+';');}
  edits.push({span:[item.getStart(caller),item.end],before:source.slice(item.getStart(caller),item.end),after:replacement.join('\n')});
 }
 if(!edits.length)fail('at least one actual transparent HTTP/control import required');
 let canonical=source;for(const edit of [...edits].reverse())canonical=canonical.slice(0,edit.span[0])+edit.after+canonical.slice(edit.span[1]);
 if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native syntax runtime changed');
 const result={original:source,canonical,originalConcreteSyntax:original.meta,canonicalConcreteSyntax:concrete(canonical,language).meta,edits,modules:[...modules.values()].map(row=>({path:row.path,source:row.source,concreteSyntax:row.concreteSyntax,exports:[...row.exports],dependencies:row.dependencies})),terminals};
 accountCompleteData(result);return result;
}
function sameProjection(before,after){
 const pair=(a,b)=>a.path===b.path&&a.name===b.name;
 const rows=(a,b,compare)=>a.length===b.length&&a.every((value,index)=>compare(value,b[index]));
 return before.original===after.original&&before.canonical===after.canonical&&before.originalConcreteSyntax===after.originalConcreteSyntax&&before.canonicalConcreteSyntax===after.canonicalConcreteSyntax&&
 rows(before.edits,after.edits,(a,b)=>a.span[0]===b.span[0]&&a.span[1]===b.span[1]&&a.before===b.before&&a.after===b.after)&&
 rows(before.modules,after.modules,(a,b)=>a.path===b.path&&a.source===b.source&&a.concreteSyntax===b.concreteSyntax&&rows(a.exports,b.exports,(x,y)=>x[0]===y[0]&&pair(x[1],y[1]))&&rows(a.dependencies,b.dependencies,pair))&&rows(before.terminals,after.terminals,pair);
}
function translate(source,input,language){return withSourceFailureOperation(()=>withSourceInputValidation(()=>{
 const data=ownedPlainData(input),keys=['sourcePath','rustPath','runtimeRoot','declarationRoot','files'];if(Object.keys(data).sort().join('\0')!==keys.sort().join('\0'))fail('complete closed caller/source input required');
 const sourcePath=ownedSourcePath(data.sourcePath),rustPath=ownedSourcePath(data.rustPath),javascriptPath=sourcePath.replace(/\.(?:mjs|mts|js|ts)$/u,'.mjs'),typescriptPath=javascriptPath.replace(/\.mjs$/u,'.mts');if(!/\.(?:mjs|mts|js|ts)$/u.test(sourcePath)||!rustPath.endsWith('.rs')||rustPath===sourcePath)fail('complete distinct caller/native paths required');
 const context=createOwnedCoreSourceContext({runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot,files:data.files}),snapshot=ownedCoreSourceData(context);
 const originalInputs=captureHttpResourceCallerInputs({sourcePath,runtimeRoot:snapshot.runtimeRoot,declarationRoot:snapshot.declarationRoot,files:snapshot.files});
 return withCompleteSourceClosingFence(()=>{
 if(snapshot.files.filter(row=>row.path===sourcePath&&row.source===source).length!==1)fail('complete original caller snapshot differs');
 const inputAt=(path,text,extra=[])=>({sourcePath:path,runtimeRoot:snapshot.runtimeRoot,declarationRoot:snapshot.declarationRoot,files:snapshot.files.filter(row=>row.path!==path&&!extra.some(add=>add.path===row.path)).concat([{path,source:text}],extra)});
 const invoke=(text,path,kind)=>kind==='JavaScript'?translateHttpResourceCallerJavaScript(text,inputAt(path,text)):translateHttpResourceCallerTypeScript(text,inputAt(path,text));
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'language:resolve-whole-transparent-value-export-closure-from-native-CST',apply:()=>resolveSource(source,{...snapshot,sourcePath},language)},
   {id:'language:reparse-whole-source-equation-and-enter-original-private-HTTP-caller-checker',apply:projection=>({projection,equation:transportConcreteSourceEquations([{before:source,after:projection.canonical,language}])[0],checked:invoke(projection.canonical,sourcePath,language)})},
   {id:'language:reissue-original-meta-paired-targets-and-complete-native-inverse',apply:value=>{
    const result=value.checked;readHttpResourceCallerMeta(result.meta,value.projection.canonical,inputAt(sourcePath,value.projection.canonical),{language});
    const pairedJS=invoke(result.javascript,javascriptPath,'JavaScript'),pairedTS=invoke(result.typescript,typescriptPath,'TypeScript');
    const reverse=translateHttpResourceCallerRust(result.rust,{sourcePath:rustPath,javascriptPath,runtimeRoot:snapshot.runtimeRoot,declarationRoot:snapshot.declarationRoot,files:inputAt(javascriptPath,result.javascript,[{path:rustPath,source:result.rust}]).files});
    if(![pairedJS,pairedTS,reverse].every(row=>sameRustSourceSyntax(result.rust,row.rust)))fail('complete paired/native caller inverse differs');
    requireOwnedCoreSourceCurrent(context);const fresh=resolveSource(source,{...ownedCoreSourceData(context),sourcePath},language);if(!sameProjection(fresh,value.projection))fail('fresh whole forwarding closure differs');
    return {...value,pairedJS,pairedTS,reverse};
   }},
  ]},
  {phase:'repository',rules:[{id:'repository:retain-complete-original-forwarded-caller-and-canonical-source-inverses',apply:value=>({
   schema:'router-network-control-bulk-20261101-v1',...value,
   sources:{original:source,JavaScript:value.checked.javascript,TypeScript:value.checked.typescript,Rust:value.checked.rust},
   paths:{original:sourcePath,JavaScript:javascriptPath,TypeScript:typescriptPath,Rust:rustPath},
   sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeParity:false,receivingExecuted:false,rustExecuted:false,crossInvocationCache:false,wholeRouterSynchronization:false,
  })}]},
 ]).run(null);requireOwnedCoreSourceCurrent(context);
 const output={...run.value,trace:run.trace};accountCompleteData(output);return output;
 },[()=>withSourceInputValidation(()=>originalInputs.current()),()=>withSourceInputValidation(()=>requireOwnedCoreSourceCurrent(context))]);
}));}
export const translateNetworkControlBulkJavaScript=(source,input)=>translate(source,input,'JavaScript');
export const translateNetworkControlBulkTypeScript=(source,input)=>translate(source,input,'TypeScript');
