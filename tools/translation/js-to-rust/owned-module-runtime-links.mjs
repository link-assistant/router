// Source projection plumbing only. Every linked body enters a fresh issuer.
import {posix} from 'node:path';
import {ownedCoreSourceData,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent} from './owned-outcome-source.mjs';
import {translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript} from './owned-outcome.mjs';
import {ownedCoreContext} from './owned-outcome-operations.mjs';
const fail=message=>{throw new TypeError('Owned module source projection: '+message);};
const safe=value=>typeof value==='string'&&value.length>0&&!value.startsWith('/')&&!value.includes('\\')&&!/[\0\r\n:]/u.test(value)&&!value.split('/').some(part=>!part||part==='.'||part==='..');
export function bindOwnedModuleInputs(input,context,{bundlePath}={}){
 const data=ownedCoreSourceData(context),files=new Map(data.files.map(row=>[row.path,row.source]));for(const row of input.rows.values())if(files.get(row.path)!==row.source)fail('complete actual original project module differs: '+row.path);
 const prefix=input.language==='TypeScript'?posix.dirname(data.declarationRoot):posix.dirname(data.runtimeRoot),selected=bundlePath??posix.join(prefix,'.translation','router-project-bundle.'+(input.language==='TypeScript'?'ts':'mjs'));if(!safe(selected)||!(input.language==='TypeScript'?/\.(mts|ts)$/u.test(selected):selected.endsWith('.mjs'))||input.rows.has(selected))fail('separate ordinary linked source path required');
 const runtimeRows=new Map(data.files.filter(row=>[data.runtimeRoot,data.declarationRoot].some(root=>row.path.startsWith(root+'/'))&&/\.(mjs|mts|ts)$/u.test(row.path)).map(row=>[row.path,row]));return {...input,context,data,bundlePath:selected,runtimeRows,runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot};
}
export function ownedRuntimeImportSource(ts,node,file,input,binding){
 if(!node.importClause?.namedBindings||!ts.isNamedImports(node.importClause.namedBindings)||node.importClause.name||node.attributes)fail('transparent named runtime source import required');const target=node.moduleSpecifier.text,absolute=posix.normalize(posix.join(posix.dirname(file.fileName.slice('/__router_module_project/'.length)),target)),edge=posix.relative(posix.dirname(input.bundlePath),absolute),specifier=edge.startsWith('.')?edge:'./'+edge;
 return 'import '+(node.importClause.isTypeOnly?'type ':'')+'{ '+node.importClause.namedBindings.elements.map(row=>{const local=binding(input.checker.getSymbolAtLocation(row.name));if(!local)fail('actual runtime import binding is missing');return (row.isTypeOnly?'type ':'')+(row.propertyName??row.name).text+' as '+local;}).join(', ')+' } from '+JSON.stringify(specifier)+';';
}
export function translateOwnedLinkedProject(input,linked){
 requireOwnedCoreSourceCurrent(input.context);const counterpart=input.language==='TypeScript'?posix.join(posix.dirname(input.data.runtimeRoot),'.translation','router-project-bundle.mjs'):posix.join(posix.dirname(input.data.declarationRoot),'.translation','router-project-bundle.ts'),files=input.data.files.filter(row=>row.path!==input.bundlePath&&row.path!==counterpart).concat([{path:input.bundlePath,source:linked.source}]),context=createOwnedCoreSourceContext({...input.data,files}),typedPath=posix.join(posix.dirname(input.data.declarationRoot),'.translation','router-project-bundle.ts');
 const result=input.language==='TypeScript'?translateOwnedOutcomeTypeScript(linked.source,{context,sourcePath:input.bundlePath,typescriptOutputPath:typedPath}):translateOwnedOutcomeJavaScript(linked.source,{context,sourcePath:input.bundlePath,typescriptOutputPath:typedPath}),receiving=result.program.length?ownedCoreContext(result.program[0]):context;requireOwnedCoreSourceCurrent(input.context);requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(receiving);return {...result,ownedProjectReceivingContext:receiving,ownedProjectBundlePath:input.bundlePath,ownedProjectTypeScriptBundlePath:typedPath};
}
