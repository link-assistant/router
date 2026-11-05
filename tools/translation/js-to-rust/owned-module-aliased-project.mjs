// Pure ESM module linking by fresh native symbol bindings, before semantic IR.
// Original module CSTs remain separate from the checked flattened program.
import {posix} from 'node:path';
import {portableModuleOrder} from './module-order.mjs';
import {moduleDeclarationPublicEdits,packageOwnedModuleAPI} from './owned-module-public-api.mjs';
import {bindOwnedModuleInputs,ownedRuntimeImportSource,translateOwnedLinkedProject} from './owned-module-aliased-runtime-links.mjs';
import {types} from 'node:util';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {prepareReverseConcreteSource} from './concrete-source.mjs';
import {translateJavaScript} from './translator.mjs';
import {translateTypeScript} from './typed-portable.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';

const PREFIX='/__router_module_project/',LIMIT=2097152,FILES=128;
const fail=message=>{throw new TypeError('Portable module project: '+message);};
function path(value){if(typeof value!=='string'||!value||value.length>240||value.startsWith('/')||value.includes('\\')||/[\0\r\n:]/u.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..')||! /\.(mjs|js|mts|ts)$/u.test(value))fail('ordinary relative module path required');return value;}
function field(value,name){if(!value||typeof value!=='object'||types.isProxy(value))fail('ordinary source data required');const row=Object.getOwnPropertyDescriptor(value,name);if(!row||!Object.hasOwn(row,'value'))fail('own source data field required');return row.value;}
function sourceInputs(input){
 const entry=path(field(input,'entry')),language=field(input,'language'),modules=field(input,'modules');if(!['JavaScript','TypeScript'].includes(language)||types.isProxy(modules)||!Array.isArray(modules)||Object.getPrototypeOf(modules)!==Array.prototype)fail('explicit source language and ordinary module array required');
 const count=Object.getOwnPropertyDescriptor(modules,'length')?.value;if(!Number.isSafeInteger(count)||!count||count>FILES||Reflect.ownKeys(modules).length!==count+1)fail('bounded dense module census required');const rows=new Map();let units=0;
 for(let at=0;at<count;at++){const data=field(modules,String(at)),name=path(field(data,'path')),source=field(data,'source');if(rows.has(name)||typeof source!=='string'||(units+=source.length)>LIMIT||language==='JavaScript'&&/\.(mts|ts)$/u.test(name))fail('unique bounded same-language module sources required');rows.set(name,{path:name,source,concreteSyntax:prepareReverseConcreteSource(source,language).concreteSyntax});}
 if(!rows.has(entry))fail('complete entry source is missing');return {entry,language,rows};
}
function relativeModule(from,specifier,rows,runtimeRows=new Map()){
 if(typeof specifier!=='string'||!specifier.startsWith('.'))fail('only source-bound relative ESM dependencies are supported');const base=posix.normalize(posix.join(posix.dirname(from),specifier));if(base==='..'||base.startsWith('../')||base.startsWith('/'))fail('module dependency escapes the source universe');
 const candidates=[base,...(!posix.extname(base)?['.mjs','.js','.mts','.ts'].map(extension=>base+extension):[]),...(/\.js$/u.test(base)?[base.slice(0,-3)+'.ts']:[]),...(/\.mjs$/u.test(base)?[base.slice(0,-4)+'.mts']:[])].filter(name=>rows.has(name)||runtimeRows.has(name));const unique=[...new Set(candidates)];if(unique.length!==1)fail('one exact module dependency is required: '+specifier);return unique[0];
}
function nativeProject(input){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');const compilerOptions={target:ts.ScriptTarget.Latest,module:ts.ModuleKind.ESNext,moduleDetection:ts.ModuleDetectionKind.Force,noLib:true,allowJs:true,checkJs:true,noEmit:true},files=new Map(),edges=new Map(),allNames=new Set();
 for(const row of input.rows.values()){
  const file=ts.createSourceFile(PREFIX+row.path,row.source,{languageVersion:ts.ScriptTarget.Latest,impliedNodeFormat:ts.ModuleKind.ESNext,setExternalModuleIndicator:ts.getSetExternalModuleIndicator(compilerOptions)},true,input.language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native module grammar differs: '+row.path);files.set(PREFIX+row.path,file);const targets=[];
  for(const node of file.statements){
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){if(!ts.isStringLiteral(node.moduleSpecifier))fail('literal source module edge required');const target=relativeModule(row.path,node.moduleSpecifier.text,input.rows,input.runtimeRows);if(input.rows.has(target))targets.push(target);}
   else if(ts.isFunctionDeclaration(node)){if(!node.name||node.modifiers?.some(modifier=>![ts.SyntaxKind.ExportKeyword].includes(modifier.kind)))fail('ordinary named module function required');}
   else if(ts.isVariableStatement(node))fail('owned project module constants require a separately checked constant profile');
   else if(input.language==='TypeScript'&&ts.isTypeAliasDeclaration(node)){if(node.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary original type alias modifiers required');}
   else if(ts.isEmptyStatement(node)||ts.isExpressionStatement(node)&&ts.isStringLiteral(node.expression)&&node.expression.text==='use strict'){}
   else if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))fail('unsupported module evaluation or declaration');

  }
  let cells=0;function visit(node,depth=0){if(++cells>2000000||depth>160)fail('complete original module node/depth bound exceeded');if(ts.isIdentifier(node))allNames.add(node.text);if(ts.isMetaProperty(node)||node.kind===ts.SyntaxKind.ThisKeyword||node.kind===ts.SyntaxKind.SuperKeyword||ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)fail('dynamic module identity, receiver or import requires a separate contract');ts.forEachChild(node,child=>visit(child,depth+1));}visit(file);edges.set(row.path,targets);
 }
 const initialization=portableModuleOrder({entry:input.entry,nodes:[...input.rows.keys()].map(name=>({path:name,targets:edges.get(name),hasRuntimeInitializers:files.get(PREFIX+name).statements.some(ts.isVariableStatement)}))}),ordered=initialization.order;
 for(const row of input.runtimeRows.values())if(!files.has(PREFIX+row.path)){const file=ts.createSourceFile(PREFIX+row.path,row.source,ts.ScriptTarget.Latest,true,/\.(mts|ts)$/u.test(row.path)?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete actual runtime grammar differs');files.set(PREFIX+row.path,file);}
 const host={getSourceFile:name=>files.get(name),getDefaultLibFileName:()=>PREFIX+'lib.d.ts',writeFile:()=>fail('native project cannot emit files'),getCurrentDirectory:()=>PREFIX,getDirectories:()=>[],fileExists:name=>files.has(name),readFile:name=>files.get(name)?.text,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=>'\n',resolveModuleNames:(names,containing)=>names.map(specifier=>{if(!specifier.startsWith('.'))return undefined;const actual=relativeModule(containing.slice(PREFIX.length),specifier,input.rows,input.runtimeRows),declaration=actual.endsWith('.mjs')&&input.runtimeRows.has(actual)?input.declarationRoot+'/'+posix.basename(actual).replace(/\.mjs$/u,'.d.mts'):null,target=declaration&&input.runtimeRows.has(declaration)?declaration:actual;return {resolvedFileName:PREFIX+target,extension:/\.(mts|ts)$/u.test(target)?target.endsWith('.mts')?ts.Extension.Mts:ts.Extension.Ts:target.endsWith('.mjs')?ts.Extension.Mjs:ts.Extension.Js,isExternalLibraryImport:false};})};
 const program=ts.createProgram({rootNames:[PREFIX+input.entry],options:compilerOptions,host}),checker=program.getTypeChecker();return {ts,files,ordered,checker,allNames,initialization,program};
}
function linkedSource(input){
 const native=nativeProject(input),{ts,files,ordered,checker,allNames}=native,symbols=new Map(),declarations=new Map(),modules=new Map();let serial=0;
 input.checker=checker;
 for(const name of ordered){
  const file=files.get(PREFIX+name),rows=[];for(const statement of file.statements){if(ts.isFunctionDeclaration(statement)||ts.isTypeAliasDeclaration(statement))rows.push(statement);if(ts.isVariableStatement(statement))rows.push(...statement.declarationList.declarations);}
  for(const statement of file.statements)if(ts.isImportDeclaration(statement)){
   const target=relativeModule(name,statement.moduleSpecifier.text,input.rows,input.runtimeRows);if(input.rows.has(target))continue;
   if(!statement.importClause?.namedBindings||!ts.isNamedImports(statement.importClause.namedBindings)||statement.importClause.name)fail('named actual runtime import required');
   for(const binding of statement.importClause.namedBindings.elements){let replacement;do{replacement='routerModuleRuntime'+serial++;}while(allNames.has(replacement));allNames.add(replacement);const symbol=checker.getSymbolAtLocation(binding.name);if(!symbol||symbols.has(symbol))fail('unique original runtime binding required');symbols.set(symbol,replacement);}
  }
  for(const declaration of rows){if(!declaration.name||!ts.isIdentifier(declaration.name))fail('named source declaration required');let replacement=declaration.name.text;if(name!==input.entry){do{replacement='routerModuleValue'+serial++;}while(allNames.has(replacement));allNames.add(replacement);}const symbol=checker.getSymbolAtLocation(declaration.name);if(!symbol||symbols.has(symbol))fail('one genuine original declaration symbol required');symbols.set(symbol,replacement);declarations.set(declaration,replacement);}
 }
 function binding(symbol){if(!symbol)return null;if(symbols.has(symbol))return symbols.get(symbol);if(symbol.flags&ts.SymbolFlags.Alias)symbol=checker.getAliasedSymbol(symbol);if(symbols.has(symbol))return symbols.get(symbol);const names=[...new Set((symbol.declarations??[]).map(node=>declarations.get(node)).filter(Boolean))];return names.length===1?names[0]:null;}
 const entryFile=files.get(PREFIX+input.entry),entrySymbol=checker.getSymbolAtLocation(entryFile),publicExports=[],publicDeclarations=new Set();if(!entrySymbol)fail('actual native entry module symbol is missing');
 for(const name of ordered){
  const file=files.get(PREFIX+name);
  const edges=file.statements.filter(node=>ts.isImportDeclaration(node)||ts.isExportDeclaration(node));
  for(const diagnostic of native.program.getSemanticDiagnostics(file))if(diagnostic.category===ts.DiagnosticCategory.Error&&diagnostic.start!==undefined&&edges.some(node=>diagnostic.start>=node.getStart(file)&&diagnostic.start<node.end))fail('native import/export binding diagnostic: '+ts.flattenDiagnosticMessageText(diagnostic.messageText,' '));
 }
 for(const exported of checker.getExportsOfModule(entrySymbol)){
  const actual=exported.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(exported):exported,owners=(actual.declarations??[]).filter(node=>declarations.has(node));
  if(owners.length!==1)fail('public export has no unique original source declaration');const declaration=owners[0],kind=ts.isTypeAliasDeclaration(declaration)?'type':'value',internalName=declarations.get(declaration);
  if(kind==='value'&&!ts.isFunctionDeclaration(declaration)&&!ts.isVariableDeclaration(declaration))fail('public value needs a checked function or immutable constant');
  publicExports.push({publicName:exported.name,internalName,kind,source:declaration.getSourceFile().fileName.slice(PREFIX.length),span:[declaration.getStart(declaration.getSourceFile()),declaration.end],sourceAuthority:false,semanticAuthority:false});if(kind==='value')publicDeclarations.add(declaration);
 }
 if(publicExports.length>4096)fail('bounded complete entry export table required');
 function callableUse(node){
  if(!checker.getTypeAtLocation(node).getCallSignatures().length)return;const parent=node.parent;
  if(ts.isCallExpression(parent)&&parent.expression===node||ts.isTypeOfExpression(parent)&&parent.expression===node||ts.isTypeQueryNode(parent)&&parent.exprName===node)return;
  if((ts.isFunctionDeclaration(parent)||ts.isVariableDeclaration(parent)||ts.isParameter(parent))&&parent.name===node)return;
  fail('module callables must remain direct calls rather than escaping values');
 }
 for(const name of ordered){
  const file=files.get(PREFIX+name),source=input.rows.get(name).source,edits=source.startsWith('#!')?[{span:[0,2],expected:'#!',replacement:'//',kind:'module-hashbang-trivia'}]:[];
  const declarationsEdits=moduleDeclarationPublicEdits(ts,file,source,publicDeclarations);
  for(const statement of file.statements)if(ts.isImportDeclaration(statement)){
   const target=relativeModule(name,statement.moduleSpecifier.text,input.rows,input.runtimeRows);if(input.rows.has(target))continue;const selected=declarationsEdits.find(row=>row.span[0]===statement.getStart(file)&&row.span[1]===statement.end);if(!selected)fail('complete runtime import selection differs');selected.replacement=ownedRuntimeImportSource(ts,statement,file,input,binding);selected.kind='actual-runtime-import-relocation';
  }
  edits.push(...declarationsEdits);const visitedNodes=new WeakSet();let visitedCells=0;

  function replace(node,replacement){const expected=node.getText(file);if(expected!==replacement)edits.push({span:[node.getStart(file),node.end],expected,replacement});}
  function visit(node,depth=0){
   if(visitedNodes.has(node))return;visitedNodes.add(node);if(++visitedCells>2000000||depth>160)fail('complete original linking node/depth bound exceeded');
   if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))return;
   if(ts.isShorthandPropertyAssignment(node)){if(node.objectAssignmentInitializer)fail('shorthand defaults require separate source lowering');const symbol=checker.getShorthandAssignmentValueSymbol(node);if(symbol?.declarations?.some(ts.isNamespaceImport))fail('namespace object escapes direct source member access');const replacement=binding(symbol);if(replacement){callableUse(node.name);if(replacement!==node.name.text)replace(node,node.name.text+': '+replacement);}return;}
   if(ts.isPropertyAccessExpression(node)){
    const type=checker.getTypeAtLocation(node.expression);if(['name','length','toString','caller','arguments','prototype'].includes(node.name.text)&&(type.getCallSignatures().length||type.flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown)))fail('callable or unresolved reflection observes module alpha-renaming');
    if(ts.isIdentifier(node.expression)){const owner=checker.getSymbolAtLocation(node.expression);if(owner?.declarations?.some(ts.isNamespaceImport)){const replacement=binding(checker.getSymbolAtLocation(node.name));if(!replacement)fail('namespace access is not a complete source declaration');callableUse(node);replace(node,replacement);return;}}
   }
   if(ts.isElementAccessExpression(node)){const type=checker.getTypeAtLocation(node.expression);if(type.getCallSignatures().length)fail('dynamic callable reflection observes module alpha-renaming');}
   if(ts.isImportTypeNode(node)&&ts.isLiteralTypeNode(node.argument)&&ts.isStringLiteral(node.argument.literal)){
    const target=relativeModule(name,node.argument.literal.text,input.rows,input.runtimeRows);if(!input.runtimeRows.has(target))fail('owned application import types require their actual runtime source');const edge=posix.relative(posix.dirname(input.bundlePath),target);replace(node.argument.literal,JSON.stringify(edge.startsWith('.')?edge:'./'+edge));
   }
   if(ts.isFunctionDeclaration(node)){for(const parameter of node.parameters){const written=ts.getJSDocType(parameter);if(written)visit(written);}const returned=ts.getJSDocReturnType(node);if(returned)visit(returned);}
   if(ts.isIdentifier(node)){const symbol=checker.getSymbolAtLocation(node),replacement=binding(symbol);if(replacement){callableUse(node);replace(node,replacement);}if(symbol?.declarations?.some(ts.isNamespaceImport)&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.expression===node))fail('namespace object escapes direct source member access');}
   ts.forEachChild(node,child=>visit(child,depth+1));
  }visit(file);
  let after=source,last=source.length+1;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>last||source.slice(...row.span)!==row.expected)fail('native selected source edits overlap');after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);last=row.span[0];}
  modules.set(name,{path:name,before:source,after,nativeSelections:edits,concreteSyntax:input.rows.get(name).concreteSyntax});
 }
 const equations=transportConcreteSourceEquations([...modules.values()].map(row=>({before:row.before,after:row.after,language:input.language})));[...modules.values()].forEach((row,index)=>{if(equations[index].inverse!==row.before)fail('complete module inverse differs');row.equation=equations[index];});
 const source=ordered.map((name,index)=>'\n// Source module '+index+'\n'+modules.get(name).after).join('\n');if(source.length>LIMIT)fail('complete linked source exceeds existing concrete source bound');return {source,modules:[...modules.values()],order:ordered,initialization:native.initialization,publicExports};
}
export function translateOwnedModuleProject(data,{context,bundlePath}={}){
 const input=bindOwnedModuleInputs(sourceInputs(data),context,{bundlePath});let linked;
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'esm:bind-all-native-source-symbols-and-link-pure-module-initialization',apply:()=>{linked=linkedSource(input);return linked.source;}},{id:'meta:check-complete-linked-javascript-or-typescript-program',apply:source=>translateOwnedLinkedProject(input,linked)}]},
  {phase:'repository',rules:[{id:'router:retain-complete-module-CST-inverses-and-target-mappings',apply:result=>{const packaged=packageOwnedModuleAPI({...result,javascript:result.javascript??linked.source},{publicExports:linked.publicExports,linkedSource:linked.source,language:input.language});return {...packaged,moduleSourceHistory:{entry:input.entry,language:input.language,order:linked.order,modules:linked.modules,initialization:linked.initialization,publicExports:linked.publicExports,sourceAuthority:false,semanticAuthority:false},runtimeParity:false,wholeRouterSynchronization:false};}}]},
 ]).run(null);return {...run.value,moduleRuleTrace:run.trace};
}
