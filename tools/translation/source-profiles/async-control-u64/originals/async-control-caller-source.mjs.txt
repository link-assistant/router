// Fresh actual source joins and native JS/TS syntax. Interface metadata alone
// cannot select an imported operation, a resource domain or a caller body.
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {types} from 'node:util';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {requireOwnedCancellationSources} from './owned-cancellation-contracts.mjs';
import {ASYNC_CONTROL_NATIVE_SOURCE,ASYNC_CONTROL_RUNTIME_SOURCE,ASYNC_CONTROL_DECLARATIONS_SOURCE} from '../async-control-native-source.mjs';
import {asyncControlCallerContract,asyncControlCallerName,checkAsyncControlCallerFlow} from './async-control-caller-flow.mjs';
const RUNTIME=new URL('../async-control-runtime.mjs',import.meta.url),DECLARATIONS=new URL('../async-control-runtime.d.mts',import.meta.url),FLOW=new URL('../extensions/filesystem-effects-runtime.mjs',import.meta.url);
const fail=message=>{throw new TypeError('Async control caller source: '+message);};
export function captureAsyncControlCallerInputs(input){
 if(!input||typeof input!=='object'||types.isProxy(input)||Object.getPrototypeOf(input)!==Object.prototype)fail('ordinary complete source input required');
 const fields=Object.getOwnPropertyDescriptors(input),allowed=['sourcePath','runtimePath','runtimeSource','nativeRootSource','nativeSource'];for(const key of Reflect.ownKeys(fields))if(typeof key!=='string'||!allowed.includes(key)||!Object.hasOwn(fields[key],'value'))fail('unknown or accessor source input');
 const own=key=>{if(!fields[key]||!Object.hasOwn(fields[key],'value'))fail('complete own source input required: '+key);return fields[key].value;};
 const path=value=>{if(typeof value!=='string'||!value||/[\\\0:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative source path required');return value;};
 const sourcePath=path(own('sourcePath')),runtimePath=path(own('runtimePath'));if(!/\.(?:mjs|js|mts|ts)$/u.test(sourcePath)||!runtimePath.endsWith('/async-control-runtime.mjs'))fail('actual caller and named runtime paths required');
 const runtimeSource=own('runtimeSource'),nativeRootSource=own('nativeRootSource'),nativeSource=own('nativeSource'),runtimeRoot=posix.dirname(runtimePath),declarationRoot=runtimeRoot,flowRuntimePath=runtimeRoot+'/extensions/filesystem-effects-runtime.mjs',flowSource=readFileSync(FLOW,'utf8');
 if([runtimePath,flowRuntimePath,declarationRoot+'/async-control-runtime.d.mts'].includes(sourcePath))fail('caller cannot replace an actual runtime/declaration input');
 if(flowSource!==readFileSync(new URL('../source-profiles/async-control-callers/originals/filesystem-effects-runtime.mjs.txt',import.meta.url),'utf8'))fail('complete original cold-flow implementation differs');
 if(runtimeSource!==readFileSync(RUNTIME,'utf8')||runtimeSource!==ASYNC_CONTROL_RUNTIME_SOURCE||nativeSource!==ASYNC_CONTROL_NATIVE_SOURCE||readFileSync(DECLARATIONS,'utf8')!==ASYNC_CONTROL_DECLARATIONS_SOURCE)fail('complete actual runtime/native/declaration sources differ');
 const nativeInputs=requireOwnedCancellationSources(new Map([['src/lib.rs',nativeRootSource],['src/translation_async_control_core.rs',nativeSource],[runtimePath,runtimeSource],[declarationRoot+'/async-control-runtime.d.mts',ASYNC_CONTROL_DECLARATIONS_SOURCE]]),{runtimeRoot,declarationRoot});
 const current=()=>{if(readFileSync(RUNTIME,'utf8')!==runtimeSource||readFileSync(DECLARATIONS,'utf8')!==ASYNC_CONTROL_DECLARATIONS_SOURCE||readFileSync(FLOW,'utf8')!==flowSource)fail('complete current runtime/declaration/flow sources changed');requireOwnedCancellationSources(new Map([['src/lib.rs',nativeRootSource],['src/translation_async_control_core.rs',nativeSource],[runtimePath,runtimeSource],[declarationRoot+'/async-control-runtime.d.mts',ASYNC_CONTROL_DECLARATIONS_SOURCE]]),{runtimeRoot,declarationRoot});};
 return {sourcePath,runtimePath,runtimeSource,nativeRootSource,nativeSource,flowRuntimePath,flowSource,nativeInputs,current};
}

export function analyzeAsyncControlCallerSource(stage,input){
 const context=captureAsyncControlCallerInputs(input),source=stage.source,language=stage.concreteSyntax.language,ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const file=ts.createSourceFile(context.sourcePath,source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native caller grammar required');
 const imports=new Map(),locals=new Set(),functions=[],erase=[],annotate=[];
 const name=asyncControlCallerName;
 for(const item of file.statements){
  if(ts.isImportDeclaration(item)){
   if(item.modifiers?.length||item.attributes||!ts.isStringLiteral(item.moduleSpecifier)||!item.moduleSpecifier.text.startsWith('.')||item.importClause?.isTypeOnly||item.importClause?.name||!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('transparent relative named runtime import required');
   const target=posix.normalize(posix.join(posix.dirname(context.sourcePath),item.moduleSpecifier.text));if(![context.runtimePath,context.flowRuntimePath].includes(target))fail('actual control or deferred-flow runtime import required');
   for(const element of item.importClause.namedBindings.elements){const local=name(element.name.text),imported=element.propertyName?.text??local;if(element.isTypeOnly||locals.has(local))fail('competing or type-only runtime binding');if(target===context.runtimePath?!asyncControlCallerContract(imported):imported!=='deferFilesystemFlow')fail('unregistered actual runtime operation');locals.add(local);imports.set(local,imported);}
  }else{
   if(!ts.isFunctionDeclaration(item)||!item.name||!item.body||item.asteriskToken||item.typeParameters?.length||item.type||item.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary synchronous cold wrapper with inferred return required');const local=name(item.name.text);if(locals.has(local))fail('competing caller/module binding');locals.add(local);functions.push(item);
  }
 }
 if(!functions.length||functions.length>4096)fail('complete bounded nonempty caller module required');
 const type=written=>{
  if(written?.kind===ts.SyntaxKind.StringKeyword)return 'str';if(written?.kind===ts.SyntaxKind.BooleanKeyword)return 'bool';
  // Bare bigint does not prove a u64 range. Counts initially come from closed
  // exact u64 literals; public numeric domains need a separate checked guard.
  if(ts.isIndexedAccessTypeNode(written)&&ts.isLiteralTypeNode(written.indexType)&&/^\d+$/u.test(written.indexType.literal.text??'')&&ts.isTypeReferenceNode(written.objectType)&&ts.isIdentifier(written.objectType.typeName)&&written.objectType.typeName.text==='Parameters'&&written.objectType.typeArguments?.length===1){
   const query=written.objectType.typeArguments[0];if(!ts.isTypeQueryNode(query)||!ts.isIdentifier(query.exprName)||!imports.has(query.exprName.text))fail('resource type query requires its actual imported operation');const operation=asyncControlCallerContract(imports.get(query.exprName.text)),index=Number(written.indexType.literal.text),domain=operation?.args[index];if(['cancel-ref','sender-ref','receiver-mut'].includes(domain))return domain;
  }
  fail('written original primitive or operation-derived resource input required');
 };
 const rows=functions.map(item=>{
  const parameters=item.parameters.map(parameter=>{
   if(!ts.isIdentifier(parameter.name)||parameter.questionToken||parameter.dotDotDotToken||parameter.initializer||parameter.modifiers?.length)fail('ordinary required caller parameter');const local=name(parameter.name.text);if(locals.has(local))fail('parameter shadows an actual runtime or module binding');
   const written=language==='TypeScript'?parameter.type:ts.getJSDocType(parameter);if(!written)fail('explicit native written input required');const domain=type(written),text=written.getText(file);
   if(language==='TypeScript')erase.push({span:[parameter.name.end,written.end],replacement:''});else annotate.push({span:[parameter.name.end,parameter.name.end],replacement:': '+text});return {name:local,type:domain};
  });
  if(parameters.length>64||new Set(parameters.map(row=>row.name)).size!==parameters.length)fail('unique bounded actual caller parameters required');let statements=item.body.statements,lazy=false,allowColdTail=false;
  if(statements.length===1&&ts.isReturnStatement(statements[0])&&ts.isCallExpression(statements[0].expression)&&ts.isIdentifier(statements[0].expression.expression)){
   const call=statements[0].expression,imported=imports.get(call.expression.text);
   if(imported==='deferFilesystemFlow'){
    const callback=call.arguments[0];if(call.arguments.length!==1||call.typeArguments?.length||!ts.isArrowFunction(callback)||callback.parameters.length||callback.type||callback.typeParameters?.length||callback.modifiers?.length!==1||callback.modifiers[0].kind!==ts.SyntaxKind.AsyncKeyword||!ts.isBlock(callback.body))fail('one closed original deferred async body required');statements=callback.body.statements;lazy=true;
   }else if(asyncControlCallerContract(imported)?.async){lazy=true;allowColdTail=true;}
  }
  const flow=checkAsyncControlCallerFlow(ts,statements,parameters,imports,{lazy,allowColdTail,moduleNames:locals});return {kind:'async-control-caller-function',name:item.name.text,exported:item.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)??false,parameters,lazy,flow,returns:flow.type,span:{start:item.getStart(file),end:item.end}};
 });
 context.current();return {rows,source,context,language,erase,annotate,concreteSyntax:stage.concreteSyntax};
}
