// Pure ESM module linking by fresh native symbol bindings, before semantic IR.
// Original module CSTs remain separate from the checked flattened program.
import {posix} from 'node:path';
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
function relativeModule(from,specifier,rows){
 if(typeof specifier!=='string'||!specifier.startsWith('.'))fail('only source-bound relative ESM dependencies are supported');const base=posix.normalize(posix.join(posix.dirname(from),specifier));if(base==='..'||base.startsWith('../')||base.startsWith('/'))fail('module dependency escapes the source universe');
 const candidates=[base,...(!posix.extname(base)?['.mjs','.js','.mts','.ts'].map(extension=>base+extension):[]),...(/\.js$/u.test(base)?[base.slice(0,-3)+'.ts']:[]),...(/\.mjs$/u.test(base)?[base.slice(0,-4)+'.mts']:[])].filter(name=>rows.has(name));const unique=[...new Set(candidates)];if(unique.length!==1)fail('one exact module dependency is required: '+specifier);return unique[0];
}
function nativeProject(input){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');const compilerOptions={target:ts.ScriptTarget.Latest,module:ts.ModuleKind.ESNext,moduleDetection:ts.ModuleDetectionKind.Force,noLib:true,allowJs:true,checkJs:true,noEmit:true},files=new Map(),edges=new Map(),allNames=new Set();
 for(const row of input.rows.values()){
  const file=ts.createSourceFile(PREFIX+row.path,row.source,{languageVersion:ts.ScriptTarget.Latest,impliedNodeFormat:ts.ModuleKind.ESNext,setExternalModuleIndicator:ts.getSetExternalModuleIndicator(compilerOptions)},true,input.language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native module grammar differs: '+row.path);files.set(PREFIX+row.path,file);const targets=[];
  for(const node of file.statements){
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){if(!ts.isStringLiteral(node.moduleSpecifier))fail('literal source module edge required');targets.push(relativeModule(row.path,node.moduleSpecifier.text,input.rows));}
   else if(ts.isFunctionDeclaration(node)){if(!node.name||node.modifiers?.some(modifier=>![ts.SyntaxKind.ExportKeyword].includes(modifier.kind)))fail('ordinary named module function required');}
   else if(ts.isVariableStatement(node)){if(!(node.declarationList.flags&ts.NodeFlags.Const)||node.declarationList.declarations.some(declaration=>!ts.isIdentifier(declaration.name)))fail('ordinary immutable module declarations required');}
   else if(input.language==='TypeScript'&&ts.isTypeAliasDeclaration(node)){}
   else if(ts.isEmptyStatement(node)||ts.isExpressionStatement(node)&&ts.isStringLiteral(node.expression)&&node.expression.text==='use strict'){}
   else if(!ts.isImportDeclaration(node)&&!ts.isExportDeclaration(node))fail('unsupported module evaluation or declaration');
   if(row.path===input.entry&&ts.isExportDeclaration(node))fail('entry reexports require a distinct public-export mapping');
  }
  function visit(node){if(ts.isIdentifier(node))allNames.add(node.text);if(ts.isMetaProperty(node)||node.kind===ts.SyntaxKind.ThisKeyword||node.kind===ts.SyntaxKind.SuperKeyword||ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)fail('dynamic module identity, receiver or import requires a separate contract');ts.forEachChild(node,visit);}visit(file);edges.set(row.path,targets);
 }
 const ordered=[],active=new Set(),done=new Set();function visit(name){if(active.has(name))fail('cyclic module initialization requires live-binding lowering');if(done.has(name))return;active.add(name);for(const target of edges.get(name))visit(target);active.delete(name);done.add(name);ordered.push(name);}visit(input.entry);if(done.size!==input.rows.size)fail('unreachable supplied modules are not silently excluded');
 const host={getSourceFile:name=>files.get(name),getDefaultLibFileName:()=>PREFIX+'lib.d.ts',writeFile:()=>fail('native project cannot emit files'),getCurrentDirectory:()=>PREFIX,getDirectories:()=>[],fileExists:name=>files.has(name),readFile:name=>files.get(name)?.text,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=>'\n',resolveModuleNames:(names,containing)=>names.map(specifier=>{const target=relativeModule(containing.slice(PREFIX.length),specifier,input.rows);return {resolvedFileName:PREFIX+target,extension:/\.(mts|ts)$/u.test(target)?target.endsWith('.mts')?ts.Extension.Mts:ts.Extension.Ts:target.endsWith('.mjs')?ts.Extension.Mjs:ts.Extension.Js,isExternalLibraryImport:false};})};
 const program=ts.createProgram({rootNames:[PREFIX+input.entry],options:compilerOptions,host}),checker=program.getTypeChecker();return {ts,files,ordered,checker,allNames};
}
function linkedSource(input){
 const native=nativeProject(input),{ts,files,ordered,checker,allNames}=native,symbols=new Map(),declarations=new Map(),modules=new Map();let serial=0;
 for(const name of ordered){
  const file=files.get(PREFIX+name),rows=[];for(const statement of file.statements){if(ts.isFunctionDeclaration(statement)||ts.isTypeAliasDeclaration(statement))rows.push(statement);if(ts.isVariableStatement(statement))rows.push(...statement.declarationList.declarations);}
  for(const declaration of rows){if(!declaration.name||!ts.isIdentifier(declaration.name))fail('named source declaration required');let replacement=declaration.name.text;if(name!==input.entry){do{replacement='routerModuleValue'+serial++;}while(allNames.has(replacement));allNames.add(replacement);}const symbol=checker.getSymbolAtLocation(declaration.name);if(!symbol||symbols.has(symbol))fail('one genuine original declaration symbol required');symbols.set(symbol,replacement);declarations.set(declaration,replacement);}
 }
 function binding(symbol){if(!symbol)return null;if(symbol.flags&ts.SymbolFlags.Alias)symbol=checker.getAliasedSymbol(symbol);if(symbols.has(symbol))return symbols.get(symbol);const names=[...new Set((symbol.declarations??[]).map(node=>declarations.get(node)).filter(Boolean))];return names.length===1?names[0]:null;}
 function callableUse(node){
  if(!checker.getTypeAtLocation(node).getCallSignatures().length)return;const parent=node.parent;
  if(ts.isCallExpression(parent)&&parent.expression===node||ts.isTypeOfExpression(parent)&&parent.expression===node)return;
  if((ts.isFunctionDeclaration(parent)||ts.isVariableDeclaration(parent)||ts.isParameter(parent))&&parent.name===node)return;
  fail('module callables must remain direct calls rather than escaping values');
 }
 for(const name of ordered){
  const file=files.get(PREFIX+name),source=input.rows.get(name).source,edits=source.startsWith('#!')?[{span:[0,2],expected:'#!',replacement:'//',kind:'module-hashbang-trivia'}]:[];
  for(const node of file.statements){if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node)||ts.isEmptyStatement(node)||ts.isExpressionStatement(node)&&ts.isStringLiteral(node.expression)&&node.expression.text==='use strict')edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement:''});else if(name!==input.entry)for(const modifier of node.modifiers??[])if(modifier.kind===ts.SyntaxKind.ExportKeyword)edits.push({span:[modifier.getStart(file),modifier.end],expected:modifier.getText(file),replacement:''});}
  function replace(node,replacement){const expected=node.getText(file);if(expected!==replacement)edits.push({span:[node.getStart(file),node.end],expected,replacement});}
  function visit(node){
   if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))return;
   if(ts.isShorthandPropertyAssignment(node)){if(node.objectAssignmentInitializer)fail('shorthand defaults require separate source lowering');const symbol=checker.getShorthandAssignmentValueSymbol(node);if(symbol?.declarations?.some(ts.isNamespaceImport))fail('namespace object escapes direct source member access');const replacement=binding(symbol);if(replacement){callableUse(node.name);if(replacement!==node.name.text)replace(node,node.name.text+': '+replacement);}return;}
   if(ts.isPropertyAccessExpression(node)){
    const type=checker.getTypeAtLocation(node.expression);if(['name','length','toString','caller','arguments','prototype'].includes(node.name.text)&&(type.getCallSignatures().length||type.flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown)))fail('callable or unresolved reflection observes module alpha-renaming');
    if(ts.isIdentifier(node.expression)){const owner=checker.getSymbolAtLocation(node.expression);if(owner?.declarations?.some(ts.isNamespaceImport)){const replacement=binding(checker.getSymbolAtLocation(node.name));if(!replacement)fail('namespace access is not a complete source declaration');callableUse(node);replace(node,replacement);return;}}
   }
   if(ts.isElementAccessExpression(node)){const type=checker.getTypeAtLocation(node.expression);if(type.getCallSignatures().length)fail('dynamic callable reflection observes module alpha-renaming');}
   if(ts.isIdentifier(node)){const symbol=checker.getSymbolAtLocation(node),replacement=binding(symbol);if(replacement){callableUse(node);replace(node,replacement);}if(symbol?.declarations?.some(ts.isNamespaceImport)&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.expression===node))fail('namespace object escapes direct source member access');}
   ts.forEachChild(node,visit);
  }visit(file);
  let after=source,last=source.length+1;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>=last||source.slice(...row.span)!==row.expected)fail('native selected source edits overlap');after=after.slice(0,row.span[0])+row.replacement+after.slice(row.span[1]);last=row.span[0];}
  modules.set(name,{path:name,before:source,after,nativeSelections:edits,concreteSyntax:input.rows.get(name).concreteSyntax});
 }
 const equations=transportConcreteSourceEquations([...modules.values()].map(row=>({before:row.before,after:row.after,language:input.language})));[...modules.values()].forEach((row,index)=>{if(equations[index].inverse!==row.before)fail('complete module inverse differs');row.equation=equations[index];});
 const source=ordered.map((name,index)=>'\n// Source module '+index+'\n'+modules.get(name).after).join('\n');if(source.length>LIMIT)fail('complete linked source exceeds existing concrete source bound');return {source,modules:[...modules.values()],order:ordered};
}
export function translatePortableModuleProject(data){
 const input=sourceInputs(data);let linked;
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'esm:bind-all-native-source-symbols-and-link-pure-module-initialization',apply:()=>{linked=linkedSource(input);return linked.source;}},{id:'meta:check-complete-linked-javascript-or-typescript-program',apply:source=>input.language==='TypeScript'?translateTypeScript(source,{sourcePath:input.entry}):translateJavaScript(source,{sourcePath:input.entry})}]},
  {phase:'repository',rules:[{id:'router:retain-complete-module-CST-inverses-and-target-mappings',apply:result=>({...result,javascript:result.javascript??linked.source,moduleSourceHistory:{entry:input.entry,language:input.language,order:linked.order,modules:linked.modules,sourceAuthority:false,semanticAuthority:false},runtimeParity:false,wholeRouterSynchronization:false})}]},
 ]).run(null);return {...run.value,moduleRuleTrace:run.trace};
}
