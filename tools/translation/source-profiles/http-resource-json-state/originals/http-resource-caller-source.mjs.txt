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
import {httpDeadlineResultRuntimeSources as httpDeadlineRuntimeSources} from '../http-deadline-result-runtime-sources.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE,ASYNC_CONTROL_RUNTIME_SOURCE,ASYNC_CONTROL_DECLARATIONS_SOURCE} from '../async-control-native-source.mjs';
import {httpResourceCallerContract,httpResourceCallerName,checkHttpResourceCallerFlow} from './http-resource-caller-flow.mjs';
import {selectAsyncControlCallerBody} from './async-control-u64-guards.mjs';
import {orderHttpResourceLocalFunctions,httpResourceLocalContracts} from './http-resource-local-functions.mjs';
import {captureHttpResourceRecursiveSignature,httpResourceRecursivePrototype} from './http-resource-recursive-signatures.mjs';
const RUNTIME=new URL('../async-control-runtime.mjs',import.meta.url),DECLARATIONS=new URL('../async-control-runtime.d.mts',import.meta.url),FLOW=new URL('../extensions/filesystem-effects-runtime.mjs',import.meta.url);
const fail=message=>{throw new TypeError('Async control caller source: '+message);};
export function captureHttpResourceCallerInputs(input){
 const data=ownedPlainData(input),keys=['sourcePath','files','runtimeRoot','declarationRoot'];if(Object.keys(data).sort().join('\0')!==keys.sort().join('\0'))fail('complete closed HTTP source input required');
 const sourcePath=ownedSourcePath(data.sourcePath);if(!/\.(?:mjs|js|mts|ts)$/u.test(sourcePath))fail('actual JS/TS caller path required');
 const privateContext=createOwnedCoreSourceContext({files:data.files,runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot}),captured=ownedCoreSourceData(privateContext),files=new Map(captured.files.map(row=>[row.path,row.source])),runtimeRoot=captured.runtimeRoot,declarationRoot=captured.declarationRoot;
 const runtimePath=runtimeRoot+'/async-control-runtime.mjs',flowRuntimePath=runtimeRoot+'/extensions/filesystem-effects-runtime.mjs',flowSource=files.get(flowRuntimePath),callerSource=files.get(sourcePath);
 if(typeof callerSource!=='string'||sourcePath.startsWith(runtimeRoot+'/')||sourcePath.startsWith(declarationRoot+'/'))fail('complete actual caller must be separate from library inputs');
 if(flowSource!==readFileSync(FLOW,'utf8')||flowSource!==readFileSync(new URL('../source-profiles/async-control-callers/originals/filesystem-effects-runtime.mjs.txt',import.meta.url),'utf8'))fail('complete original cold-flow library differs');
 const nativeInputs=observeHttpDeadlineSources(files,{runtimeRoot,declarationRoot}).records.concat(requireOwnedIntegerSources(files,{runtimeRoot,declarationRoot}),requireOwnedPrimitiveOptionSources(files,{runtimeRoot,declarationRoot})),expected=httpDeadlineRuntimeSources(runtimeRoot,declarationRoot);
 for(const row of expected)if(files.get(row.path)!==row.source)fail('complete actual HTTP runtime/declaration closure differs: '+row.path);
 const current=()=>{requireOwnedCoreSourceCurrent(privateContext);for(const row of httpDeadlineRuntimeSources(runtimeRoot,declarationRoot))if(files.get(row.path)!==row.source)fail('current HTTP runtime/declaration source changed');if(readFileSync(FLOW,'utf8')!==flowSource)fail('current complete cold-flow source changed');observeHttpDeadlineSources(files,{runtimeRoot,declarationRoot});requireOwnedIntegerSources(files,{runtimeRoot,declarationRoot});requireOwnedPrimitiveOptionSources(files,{runtimeRoot,declarationRoot});};
 current();return {sourcePath,callerSource,runtimePath,runtimeRoot,declarationRoot,flowRuntimePath,flowSource,nativeInputs,current};
}

export function analyzeHttpResourceCallerSource(stage,input){
 const context=captureHttpResourceCallerInputs(input),source=stage.source,language=stage.concreteSyntax.language,ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const file=ts.createSourceFile(context.sourcePath,source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native caller grammar required');if(source!==context.callerSource)fail('complete actual caller source snapshot differs');
 const imports=new Map(),locals=new Set(),functions=[],erase=[],annotate=[];
 const name=httpResourceCallerName;
 for(const item of file.statements){
  if(ts.isImportDeclaration(item)){
   if(item.modifiers?.length||item.attributes||!ts.isStringLiteral(item.moduleSpecifier)||!item.moduleSpecifier.text.startsWith('.')||item.importClause?.isTypeOnly||item.importClause?.name||!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('transparent relative named runtime import required');
   const target=posix.normalize(posix.join(posix.dirname(context.sourcePath),item.moduleSpecifier.text));if(!target.startsWith(context.runtimeRoot+'/'))fail('actual registered runtime path required');
   for(const element of item.importClause.namedBindings.elements){const local=name(element.name.text),imported=element.propertyName?.text??local;if(element.isTypeOnly||locals.has(local))fail('competing or type-only runtime binding');const operation=httpResourceCallerContract(imported);if(target===context.flowRuntimePath?imported!=='deferFilesystemFlow':!operation||target!==context.runtimeRoot+'/'+operation.runtimeModule)fail('actual operation import owner differs');locals.add(local);imports.set(local,imported);}
  }else{
   if(!ts.isFunctionDeclaration(item)||!item.name||!item.body||item.asteriskToken||item.typeParameters?.length||item.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary synchronous cold wrapper with inferred return required');const local=name(item.name.text);if(locals.has(local))fail('competing caller/module binding');locals.add(local);functions.push(item);
  }
 }
 if(!functions.length||functions.length>4096)fail('complete bounded nonempty caller module required');
 const type=(written,guarded=false)=>{
  if(written?.kind===ts.SyntaxKind.StringKeyword)return 'str';if(written?.kind===ts.SyntaxKind.BooleanKeyword)return 'bool';if(written?.kind===ts.SyntaxKind.BigIntKeyword){if(!guarded)fail('bare bigint does not prove a u64 range');return 'u64';}
  // Numeric domains require their actual dominating original entry guard.
  // A bare annotation or operation-derived query cannot supply that proof.
  if(ts.isIndexedAccessTypeNode(written)&&ts.isLiteralTypeNode(written.indexType)&&/^\d+$/u.test(written.indexType.literal.text??'')&&ts.isTypeReferenceNode(written.objectType)&&ts.isIdentifier(written.objectType.typeName)&&written.objectType.typeName.text==='Parameters'&&written.objectType.typeArguments?.length===1){
   const query=written.objectType.typeArguments[0];if(!ts.isTypeQueryNode(query)||!ts.isIdentifier(query.exprName)||!imports.has(query.exprName.text))fail('resource type query requires its actual imported operation');const operation=httpResourceCallerContract(imports.get(query.exprName.text)),index=Number(written.indexType.literal.text),domain=operation?.args[index];if(['cancel-ref','sender-ref','receiver-mut','http-client-ref','http-client-mut','http-stream-ref','http-stream-mut','json-ref'].includes(domain)||domain==='u64'&&guarded)return domain;
  }
  fail('written original primitive or operation-derived resource input required');
 };
 const rowsByName=new Map(),localFunctions=new Map(),callBindings=new Map(imports),lookup=id=>typeof id==='string'&&id.startsWith('local:')?localFunctions.get(id.slice(6)):httpResourceCallerContract(id);
 for(const group of orderHttpResourceLocalFunctions(ts,functions,{groups:true})){
  const plans=group.items.map(item=>{
   if(!group.recursive&&item.type)fail('explicit return syntax outside recursive signature scope needs its own rule');
   const bodyPlan=selectAsyncControlCallerBody(ts,item,callBindings,file,lookup),guarded=new Set(bodyPlan.inputGuards.map(row=>row.name));
  const parameters=item.parameters.map(parameter=>{
   if(!ts.isIdentifier(parameter.name)||parameter.questionToken||parameter.dotDotDotToken||parameter.initializer||parameter.modifiers?.length)fail('ordinary required caller parameter');const local=name(parameter.name.text);if(locals.has(local))fail('parameter shadows an actual runtime or module binding');
   const written=language==='TypeScript'?parameter.type:ts.getJSDocType(parameter);if(!written)fail('explicit native written input required');const domain=type(written,guarded.has(local)),text=written.getText(file);
   if(language==='TypeScript')erase.push({span:[parameter.name.end,written.end],replacement:''});else annotate.push({span:[parameter.name.end,parameter.name.end],replacement:': '+text});return {name:local,type:domain};
  });
  if(parameters.length>64||new Set(parameters.map(row=>row.name)).size!==parameters.length)fail('unique bounded actual caller parameters required');if(bodyPlan.inputGuards.some(guard=>!parameters.some(parameter=>parameter.name===guard.name&&parameter.type==='u64')))fail('entry guards must bind actual checked u64 parameters');const {statements,lazy,allowColdTail}=bodyPlan;
   const signature=group.recursive?captureHttpResourceRecursiveSignature(ts,item,file,language):null;if(signature?.erase)erase.push(signature.erase);if(signature?.javascriptAnnotation)erase.push(signature.javascriptAnnotation);if(signature?.annotate)annotate.push(signature.annotate);return {item,parameters,signature,bodyPlan,statements,lazy,allowColdTail};
  });
  if(group.recursive)for(const plan of plans){localFunctions.set(plan.item.name.text,httpResourceRecursivePrototype(plan));callBindings.set(plan.item.name.text,'local:'+plan.item.name.text);}
  const checked=plans.map(plan=>{
   const {item,parameters,signature,bodyPlan,statements,lazy,allowColdTail}=plan,flow=checkHttpResourceCallerFlow(ts,statements,parameters,imports,{lazy,allowColdTail,moduleNames:locals,localFunctions});if(signature&&(flow.type!==signature.domain||flow.returnRoots.length||flow.lazy))fail('every actual recursive body must satisfy its complete synchronous owned/scalar signature');
   return {kind:'http-resource-caller-function',name:item.name.text,exported:item.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)??false,parameters,inputGuards:bodyPlan.inputGuards,lazy,flow,returns:flow.type,recursiveSignature:signature,span:{start:item.getStart(file),end:item.end}};
  });
  for(const row of checked){rowsByName.set(row.name,row);localFunctions.set(row.name,httpResourceLocalContracts([row]).get(row.name));callBindings.set(row.name,'local:'+row.name);}
 }const rows=functions.map(item=>rowsByName.get(item.name.text));
 context.current();return {rows,source,context,language,erase,annotate,concreteSyntax:stage.concreteSyntax};
}
