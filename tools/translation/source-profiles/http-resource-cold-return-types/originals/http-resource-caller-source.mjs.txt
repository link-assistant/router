// Fresh actual source joins and native JS/TS syntax. Interface metadata alone
// cannot select an imported operation, a resource domain or a caller body.
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {types} from 'node:util';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {createOwnedCoreSourceContext,ownedPlainData,ownedSourcePath,ownedCoreSourceData,requireOwnedCoreSourceCurrent} from './owned-cancellation-source.mjs';
import {observeHttpDeadlineResultSources as observeHttpDeadlineSources} from '../http-deadline-result-native-inputs.mjs';
import {requireOwnedIntegerSources} from './owned-integer-contracts.mjs';
import {requireOwnedPrimitiveOptionSources} from './owned-primitive-option-contracts.mjs';
import {requireOwnedStateSources} from './owned-state-contracts.mjs';
import {requireOwnedResultSources} from './owned-result-source-contracts.mjs';
import {requireOwnedPrimitiveOptionCallbackSources} from './owned-primitive-option-callback-contracts.mjs';
import {httpDeadlineResultRuntimeSources as httpDeadlineRuntimeSources} from '../http-deadline-result-runtime-sources.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE,ASYNC_CONTROL_RUNTIME_SOURCE,ASYNC_CONTROL_DECLARATIONS_SOURCE} from '../async-control-native-source.mjs';
import {httpResourceCallerContract,httpResourceCallerName,checkHttpResourceCallerFlow} from './http-resource-caller-flow.mjs';
import {selectAsyncControlCallerBody} from './async-control-u64-guards.mjs';
import {orderHttpResourceLocalFunctions,httpResourceLocalContracts} from './http-resource-local-functions.mjs';
import {captureHttpResourceRecursiveSignature,httpResourceRecursivePrototype} from './http-resource-recursive-signatures.mjs';
import {captureHttpResourceFunctionReturnAnnotation} from './http-resource-function-returns.mjs';
import {createHttpResourceWrittenAnnotationReader} from './http-resource-callback-annotations.mjs';
import {httpResourcePublicInputDomain} from './http-resource-public-domains.mjs';
import {expandHttpResourceTypeAliasSource} from './http-resource-type-aliases.mjs';
import {validateHttpResourceTypeAliasTemplates} from './http-resource-type-alias-templates.mjs';
import {requireHttpResourceFilesystemSources} from './http-resource-filesystem-source.mjs';
import {captureHttpResourceTypeScriptParameterDoc,finishHttpResourceTypeScriptDocs} from './http-resource-typescript-docs.mjs';
const RUNTIME=new URL('../async-control-runtime.mjs',import.meta.url),DECLARATIONS=new URL('../async-control-runtime.d.mts',import.meta.url),FLOW=new URL('../extensions/filesystem-effects-runtime.mjs',import.meta.url);
const fail=message=>{throw new TypeError('Async control caller source: '+message);};
export function captureHttpResourceCallerInputs(input){
 const data=ownedPlainData(input),keys=['sourcePath','files','runtimeRoot','declarationRoot'];if(Object.keys(data).sort().join('\0')!==keys.sort().join('\0'))fail('complete closed HTTP source input required');
 const sourcePath=ownedSourcePath(data.sourcePath);if(!/\.(?:mjs|js|mts|ts)$/u.test(sourcePath))fail('actual JS/TS caller path required');
 const privateContext=createOwnedCoreSourceContext({files:data.files,runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot}),captured=ownedCoreSourceData(privateContext),files=new Map(captured.files.map(row=>[row.path,row.source])),runtimeRoot=captured.runtimeRoot,declarationRoot=captured.declarationRoot;
 const runtimePath=runtimeRoot+'/async-control-runtime.mjs',flowRuntimePath=runtimeRoot+'/extensions/filesystem-effects-runtime.mjs',flowSource=files.get(flowRuntimePath),callerSource=files.get(sourcePath);
 if(typeof callerSource!=='string'||sourcePath.startsWith(runtimeRoot+'/')||sourcePath.startsWith(declarationRoot+'/'))fail('complete actual caller must be separate from library inputs');
 if(flowSource!==readFileSync(FLOW,'utf8')||flowSource!==readFileSync(new URL('../source-profiles/async-control-callers/originals/filesystem-effects-runtime.mjs.txt',import.meta.url),'utf8'))fail('complete original cold-flow library differs');
 const nativeInputs=observeHttpDeadlineSources(files,{runtimeRoot,declarationRoot}).records.concat(requireOwnedIntegerSources(files,{runtimeRoot,declarationRoot}),requireOwnedPrimitiveOptionSources(files,{runtimeRoot,declarationRoot}),requireOwnedStateSources(files),requireOwnedResultSources(files,{runtimeRoot,declarationRoot})),expected=httpDeadlineRuntimeSources(runtimeRoot,declarationRoot);
 for(const row of expected)if(files.get(row.path)!==row.source)fail('complete actual HTTP runtime/declaration closure differs: '+row.path);
 let optionCallbacksSelected=false;
 const requireOptionCallbackSources=()=>{const records=requireOwnedPrimitiveOptionCallbackSources(files,{runtimeRoot,declarationRoot});if(!optionCallbacksSelected)nativeInputs.push(...records);optionCallbacksSelected=true;};
 const current=()=>{if(optionCallbacksSelected)requireOwnedPrimitiveOptionCallbackSources(files,{runtimeRoot,declarationRoot});requireOwnedCoreSourceCurrent(privateContext);for(const row of httpDeadlineRuntimeSources(runtimeRoot,declarationRoot))if(files.get(row.path)!==row.source)fail('current HTTP runtime/declaration source changed');if(readFileSync(FLOW,'utf8')!==flowSource)fail('current complete cold-flow source changed');observeHttpDeadlineSources(files,{runtimeRoot,declarationRoot});requireOwnedIntegerSources(files,{runtimeRoot,declarationRoot});requireOwnedPrimitiveOptionSources(files,{runtimeRoot,declarationRoot});requireOwnedStateSources(files);requireOwnedResultSources(files,{runtimeRoot,declarationRoot});};
 current();return {sourcePath,callerSource,runtimePath,runtimeRoot,declarationRoot,flowRuntimePath,flowSource,filesystemDeclarationSource:files.get(declarationRoot+'/extensions/filesystem-effects-runtime.d.mts'),nativeInputs,requireOptionCallbackSources,current};
}

export function analyzeHttpResourceCallerSource(stage,input){
 const context=captureHttpResourceCallerInputs(input),source=stage.source,language=stage.concreteSyntax.language,ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const file=ts.createSourceFile(context.sourcePath,source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native caller grammar required');if(source!==context.callerSource)fail('complete actual caller source snapshot differs');
 const imports=new Map(),aliases=new Map(),locals=new Set(),functions=[],erase=[],annotate=[],typeDocsPrinter=language==='TypeScript'?ts.createPrinter({removeComments:true}):null;
 const name=httpResourceCallerName;
 for(const item of file.statements){
  if(ts.isTypeAliasDeclaration(item)){if(language!=='TypeScript'||item.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('original type-only alias with checked template slots required');const id=name(item.name.text);if(aliases.has(id)||aliases.size>=4096)fail('complete unique bounded original type aliases required');aliases.set(id,item);erase.push({span:[item.getStart(file),item.end],replacement:''});continue;}
  if(ts.isImportDeclaration(item)){
   if(item.modifiers?.length||item.attributes||!ts.isStringLiteral(item.moduleSpecifier)||!item.moduleSpecifier.text.startsWith('.')||item.importClause?.isTypeOnly||item.importClause?.name||!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('transparent relative named runtime import required');
   const target=posix.normalize(posix.join(posix.dirname(context.sourcePath),item.moduleSpecifier.text));if(!target.startsWith(context.runtimeRoot+'/'))fail('actual registered runtime path required');
   for(const element of item.importClause.namedBindings.elements){const local=name(element.name.text),imported=element.propertyName?.text??local;if(element.isTypeOnly||locals.has(local))fail('competing or type-only runtime binding');const operation=httpResourceCallerContract(imported);if(imported==='deferFilesystemFlow'?target!==context.flowRuntimePath:!operation||target!==context.runtimeRoot+'/'+operation.runtimeModule)fail('actual operation import owner differs');locals.add(local);imports.set(local,imported);}
  }else{
   if(!ts.isFunctionDeclaration(item)||!item.name||!item.body||item.asteriskToken||item.typeParameters?.length||item.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary synchronous cold wrapper with inferred return required');const local=name(item.name.text);if(locals.has(local))fail('competing caller/module binding');locals.add(local);functions.push(item);
  }
 }
 if([...aliases.keys()].some(id=>imports.has(id)))fail('a type-only alias cannot compete with an actual imported operation binding');
 if([...imports.values()].some(id=>httpResourceCallerContract(id)?.family==='option-callback'))context.requireOptionCallbackSources();
 requireHttpResourceFilesystemSources(imports,context);
 if(!functions.length||functions.length>4096)fail('complete bounded nonempty caller module required');
 let annotationCells=0;const describeInput=createHttpResourceWrittenAnnotationReader(ts,imports,()=>{if(++annotationCells>100000)fail('complete public signature source-cell bound');},{aliases});validateHttpResourceTypeAliasTemplates(ts,aliases,imports,{name,tick:()=>{if(++annotationCells>100000)fail('complete original alias template bound');}});for(const alias of aliases.values())if(!alias.typeParameters?.length)describeInput(alias.type);
 const type=(written,guarded=false)=>{const actual=describeInput(written);if(actual.kind!=='domain'||!httpResourcePublicInputDomain(actual.type,{guarded}))fail('written actual shared or owned input domain and original u64 entry guard required');return actual.type;};
 const rowsByName=new Map(),localFunctions=new Map(),callBindings=new Map(imports),lookup=id=>typeof id==='string'&&id.startsWith('local:')?localFunctions.get(id.slice(6)):httpResourceCallerContract(id);
 for(const group of orderHttpResourceLocalFunctions(ts,functions,{groups:true})){
  const plans=group.items.map(item=>{
   const bodyPlan=selectAsyncControlCallerBody(ts,item,callBindings,file,lookup),guarded=new Set(bodyPlan.inputGuards.map(row=>row.name));
  const javascriptDocs={parameters:[],needed:false,printer:typeDocsPrinter,expandType:aliases.size?written=>expandHttpResourceTypeAliasSource(ts,written,{file,aliases}):null},parameters=item.parameters.map(parameter=>{
   if(!ts.isIdentifier(parameter.name)||parameter.questionToken||parameter.dotDotDotToken||parameter.initializer||parameter.modifiers?.length)fail('ordinary required caller parameter');const local=name(parameter.name.text);if(locals.has(local))fail('parameter shadows an actual runtime or module binding');
   const written=language==='TypeScript'?parameter.type:ts.getJSDocType(parameter);if(!written)fail('explicit native written input required');const domain=type(written,guarded.has(local)),text=written.getText(file);
   if(language==='TypeScript')captureHttpResourceTypeScriptParameterDoc(ts,parameter,written,{file,erase,docs:javascriptDocs});else annotate.push({span:[parameter.name.end,parameter.name.end],replacement:': '+text});return {name:local,type:domain};
  });
  if(parameters.length>64||new Set(parameters.map(row=>row.name)).size!==parameters.length)fail('unique bounded actual caller parameters required');if(bodyPlan.inputGuards.some(guard=>!parameters.some(parameter=>parameter.name===guard.name&&parameter.type==='u64')))fail('entry guards must bind actual checked u64 parameters');const {statements,lazy,allowColdTail}=bodyPlan;
   const signature=group.recursive?captureHttpResourceRecursiveSignature(ts,item,file,language,imports,aliases):null;if(signature?.erase)erase.push(signature.erase);if(signature?.annotate)annotate.push(signature.annotate);return {item,parameters,signature,bodyPlan,statements,lazy,allowColdTail,javascriptDocs};
  });
  if(group.recursive)for(const plan of plans){localFunctions.set(plan.item.name.text,httpResourceRecursivePrototype(plan));callBindings.set(plan.item.name.text,'local:'+plan.item.name.text);}
  const checked=plans.map(plan=>{
   const {item,parameters,signature,bodyPlan,statements,lazy,allowColdTail,javascriptDocs}=plan,flow=checkHttpResourceCallerFlow(ts,statements,parameters,imports,{lazy,allowColdTail,moduleNames:locals,localFunctions,sourceAnnotations:{language,file,erase,aliases}});if(signature&&(flow.type!==signature.domain||flow.returnRoots.length||flow.lazy))fail('every actual recursive body must satisfy its complete synchronous owned/scalar signature');if(!signature)captureHttpResourceFunctionReturnAnnotation(ts,item,{language,file,imports,aliases,flow,lazy,erase});finishHttpResourceTypeScriptDocs(ts,item,{language,file,erase,docs:javascriptDocs});
   return {kind:'http-resource-caller-function',name:item.name.text,exported:item.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)??false,parameters,inputGuards:bodyPlan.inputGuards,lazy,flow,returns:flow.type,recursiveSignature:signature,span:{start:item.getStart(file),end:item.end}};
  });
  for(const row of checked){rowsByName.set(row.name,row);localFunctions.set(row.name,httpResourceLocalContracts([row]).get(row.name));callBindings.set(row.name,'local:'+row.name);}
 }const rows=functions.map(item=>rowsByName.get(item.name.text));
 context.current();return {rows,source,context,language,erase,annotate,concreteSyntax:stage.concreteSyntax};
}
