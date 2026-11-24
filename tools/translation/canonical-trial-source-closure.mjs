// Source inventory only. Native spans and original module text explain which
// test-side inputs augment the complete existing compiler input contracts.
import {readFileSync} from 'node:fs';
import {resolve,relative,posix,join} from 'node:path';
import {URL as SourceURL,fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {rustPackageSourcePath,repositoryRustLayout} from './repository-layout.mjs';
const LAYOUT='tools/translation/repository-layout.mjs';
const fail=message=>{throw TypeError('Original derive source closure: '+message);};
const hash=source=>createHash('sha256').update(source).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** Compiler families are already retained in full; this adds the actual test
 * import/helper/resource closure, without treating every other test as input. */
export function originalDeriveAdditionalSourceClosure({ts,root,entry,inventory,retained,trackedRustPaths,head,readSource}={}){
 if(ts?.version!=='5.9.3'||!Array.isArray(inventory)||!Array.isArray(trackedRustPaths)||typeof readSource!=='function')fail('actual compiler and complete original source inventory required');
 root=resolve(root);const available=new Set(inventory),base=new Set(retained),selected=new Set(),modules=new Map(),edges=[],reads=[],processInputs=[],compilerBoundaries=[];let nodes=0,bytes=0;
 function name(path){const absolute=resolve(root,path),local=relative(root,absolute).split('\\').join('/');if(!local||local.startsWith('../')||posix.isAbsolute(local)||!available.has(local))fail('unknown original dependency path: '+path);return local;}
 function select(path,reason){path=name(path);selected.add(path);if(selected.size>8192)fail('additional input count exceeded');return {path,reason};}
 function bound(from,specifier,node){
  if(specifier.startsWith('node:')){if(!['node:test','node:assert/strict','node:fs','node:child_process','node:url','node:path','node:crypto'].includes(specifier))fail('unproved native test-side dependency: '+specifier);return {kind:'native-module',specifier};}
  if(!specifier.startsWith('.'))fail('unknown bare module dependency: '+specifier);
  const path=name(posix.join(posix.dirname(from),specifier)),record={from,to:path,span:[node.getStart(),node.end],source:node.getText()};edges.push(record);
  if(base.has(path)){compilerBoundaries.push({...record,kind:'complete-existing-compiler-source-contract'});return {kind:'source-module',path};}
  visit(path);return {kind:'source-module',path};
 }
 function load(path){
  if(modules.has(path))return modules.get(path);const source=readSource(path);bytes+=Buffer.byteLength(source);if(source.length>32*1024*1024||bytes>64*1024*1024||modules.size>=8192)fail('test-side native source analysis bound');
  const absolute=resolve(root,path),file=ts.createSourceFile(absolute,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete imported helper grammar differs');
  const host={getSourceFile:fileName=>fileName===absolute?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>root,getDirectories:()=>[],fileExists:fileName=>fileName===absolute,readFile:fileName=>fileName===absolute?source:undefined,getCanonicalFileName:fileName=>fileName,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
  const program=ts.createProgram([absolute],{allowJs:true,noLib:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host),row={path,source,file,checker:program.getTypeChecker(),imports:new Map(),stableSymbols:new Set(),scanned:false};modules.set(path,row);
  for(const statement of file.statements)if(ts.isImportDeclaration(statement)){
   if(!ts.isStringLiteral(statement.moduleSpecifier))fail('nonliteral original import');const specifier=statement.moduleSpecifier.text,clause=statement.importClause;
   const add=(local,exported)=>{if(specifier==='node:fs'&&!['readFileSync','readFile','openSync','createReadStream','mkdirSync','writeFileSync'].includes(exported)||specifier==='node:child_process'&&exported!=='execFileSync')fail('unproved native input import shape');row.imports.set(row.checker.getSymbolAtLocation(local),{specifier,exported,node:statement.moduleSpecifier});};
   if(clause?.name)add(clause.name,'default');if(clause?.namedBindings){if(ts.isNamespaceImport(clause.namedBindings))add(clause.namedBindings.name,'*');else for(const item of clause.namedBindings.elements)add(item.name,(item.propertyName??item.name).text);}
  }
  return row;
 }
 function imported(row,node){
  if(ts.isIdentifier(node))return row.imports.get(row.checker.getSymbolAtLocation(node));
  if(ts.isPropertyAccessExpression(node)&&ts.isIdentifier(node.expression)){const owner=row.imports.get(row.checker.getSymbolAtLocation(node.expression));if(owner&&['*','default'].includes(owner.exported))return {...owner,exported:node.name.text};}
  return null;
 }
 function declarations(row,node){return row.checker.getSymbolAtLocation(node)?.declarations??[];}
 function stable(row,node){const symbol=row.checker.getSymbolAtLocation(node);if(row.stableSymbols.has(symbol))return;function scan(value){if(++nodes>200000)fail('native closure node bound');if(ts.isIdentifier(value)&&row.checker.getSymbolAtLocation(value)===symbol){const parent=value.parent;if(ts.isBinaryExpression(parent)&&parent.left===value&&parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment||(ts.isPrefixUnaryExpression(parent)||ts.isPostfixUnaryExpression(parent))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(parent.operator))fail('original input path binding is mutated');}ts.forEachChild(value,scan);}scan(row.file);row.stableSymbols.add(symbol);}
 function parameter(row,node,environment,depth){
  const fn=node.parent,parameterIndex=fn.parameters.indexOf(node),owner=ts.isArrowFunction(fn)||ts.isFunctionExpression(fn)?fn.parent:null,nameNode=owner&&ts.isVariableDeclaration(owner)?owner.name:ts.isFunctionDeclaration(fn)?fn.name:null;if(!nameNode||!ts.isIdentifier(nameNode))fail('unresolved dynamic path parameter');const symbol=row.checker.getSymbolAtLocation(nameNode),calls=[];
  function scan(value){if(++nodes>200000)fail('native closure node bound');if(ts.isIdentifier(value)&&row.checker.getSymbolAtLocation(value)===symbol&&value!==nameNode){if(!ts.isCallExpression(value.parent)||value.parent.expression!==value)fail('dynamic path function escapes its original direct calls');calls.push(value.parent);}ts.forEachChild(value,scan);}scan(row.file);
  if(!calls.length)fail('dynamic path parameter has no closed original calls');return {alternatives:calls.map(call=>evaluate(row,call.arguments[parameterIndex],environment,depth+1))};
 }
 function alternatives(value){return value&&typeof value==='object'&&Object.hasOwn(value,'alternatives')?value.alternatives.flatMap(alternatives):[value];}
 function scalar(value){const all=alternatives(value);if(all.length!==1)fail('ambiguous scalar source expression');return all[0];}
 function gitOptions(row,node,environment=new Map(),depth=0){const options=node.arguments[2];if(!options||!ts.isObjectLiteralExpression(options)||options.properties.some(value=>!ts.isPropertyAssignment(value)||!['cwd','encoding','timeout','maxBuffer'].includes(value.name.getText(row.file))))fail('unproved original Git options');const cwd=options.properties.find(value=>value.name.getText(row.file)==='cwd');if(!cwd||resolve(scalar(evaluate(row,cwd.initializer,environment,depth+1)))!==root)fail('original Git input cwd differs');}
 function evaluate(row,node,environment=new Map(),depth=0){
  if(!node||depth>64||++nodes>200000)fail('unresolved or oversized dynamic input expression');
  if(ts.isParenthesizedExpression(node))return evaluate(row,node.expression,environment,depth+1);
  if(ts.isStringLiteralLike(node))return node.text;
  if(ts.isNumericLiteral(node))return Number(node.text);
  if(node.kind===ts.SyntaxKind.TrueKeyword)return true;if(node.kind===ts.SyntaxKind.FalseKeyword)return false;
  if(ts.isMetaProperty(node)&&node.keywordToken===ts.SyntaxKind.ImportKeyword)return {moduleURL:pathToFileURL(resolve(root,row.path)).href};
  if(ts.isPropertyAccessExpression(node)&&ts.isMetaProperty(node.expression)&&node.name.text==='url')return pathToFileURL(resolve(root,row.path)).href;
  if(ts.isIdentifier(node)){
   stable(row,node);const symbol=row.checker.getSymbolAtLocation(node);if(environment.has(symbol))return environment.get(symbol);const owners=declarations(row,node);if(owners.length!==1)fail('unresolved original input binding: '+node.text);const owner=owners[0];
   if(ts.isVariableDeclaration(owner)){if(!(owner.parent.flags&ts.NodeFlags.Const))fail('mutable original input path declaration');if(owner.initializer)return evaluate(row,owner.initializer,environment,depth+1);const loop=owner.parent?.parent;if(ts.isForOfStatement(loop))return {alternatives:scalar(evaluate(row,loop.expression,environment,depth+1))};}
   if(ts.isParameter(owner))return parameter(row,owner,environment,depth+1);fail('unsupported original input binding: '+node.text);
  }
  if(ts.isArrayLiteralExpression(node)){if(node.elements.some(value=>ts.isSpreadElement(value)||ts.isOmittedExpression(value)))fail('dynamic input selector array');let out=[[]];for(const element of node.elements){const values=alternatives(evaluate(row,element,environment,depth+1));if(out.length*values.length>8192)fail('selector alternatives exceeded');out=out.flatMap(prefix=>values.map(value=>[...prefix,value]));}return out.length===1?out[0]:{alternatives:out};}
  if(ts.isTypeOfExpression(node))return typeof scalar(evaluate(row,node.expression,environment,depth+1));
  if(ts.isBinaryExpression(node)){
   if(node.operatorToken.kind===ts.SyntaxKind.PlusToken){const left=alternatives(evaluate(row,node.left,environment,depth+1)),right=alternatives(evaluate(row,node.right,environment,depth+1));if(left.length*right.length>8192)fail('path alternatives exceeded');const out=left.flatMap(a=>right.map(b=>a+b));return out.length===1?out[0]:{alternatives:out};}
   const left=scalar(evaluate(row,node.left,environment,depth+1)),right=scalar(evaluate(row,node.right,environment,depth+1));switch(node.operatorToken.kind){case ts.SyntaxKind.EqualsEqualsEqualsToken:return left===right;case ts.SyntaxKind.ExclamationEqualsEqualsToken:return left!==right;case ts.SyntaxKind.AmpersandAmpersandToken:return left&&right;default:fail('unknown dynamic path operator');}
  }
  if(ts.isConditionalExpression(node))return evaluate(row,scalar(evaluate(row,node.condition,environment,depth+1))?node.whenTrue:node.whenFalse,environment,depth+1);
  if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='URL'&&!declarations(row,node.expression).length){const args=node.arguments??[],bases=alternatives(evaluate(row,args[1],environment,depth+1)),values=alternatives(evaluate(row,args[0],environment,depth+1));if(bases.length*values.length>8192)fail('URL input alternatives exceeded');return {alternatives:values.flatMap(value=>bases.map(base=>new SourceURL(value,base)))};}
  if(ts.isCallExpression(node)){
   const binding=imported(row,node.expression),args=()=>node.arguments.map(value=>evaluate(row,value,environment,depth+1));
   if(binding){
    if(binding.specifier==='node:url'&&binding.exported==='fileURLToPath')return {alternatives:alternatives(args()[0]).map(value=>fileURLToPath(value))};
    if(binding.specifier==='node:path'&&binding.exported==='join'){const values=args(),out=[];function product(at,parts){if(out.length>8192)fail('source path alternatives exceeded');if(at===values.length){out.push(join(...parts));return;}for(const value of alternatives(values[at]))product(at+1,[...parts,value]);}product(0,[]);return {alternatives:out};}
    if(binding.specifier==='node:child_process'&&binding.exported==='execFileSync'){
     const command=scalar(evaluate(row,node.arguments[0],environment,depth+1)),argv=scalar(evaluate(row,node.arguments[1],environment,depth+1));if(command!=='git')fail('unproved dynamic subprocess input');
     gitOptions(row,node,environment,depth);
     if(same(argv,['ls-files','-z','--','*.rs']))return trackedRustPaths.join('\0')+'\0';if(same(argv,['rev-parse','HEAD']))return head+'\n';fail('unproved dynamic subprocess input');
    }
    if(binding.specifier.startsWith('.')){
     const target=name(posix.join(posix.dirname(row.path),binding.specifier)),values=args();
     if(target===LAYOUT){const actual=readSource(target),loaded=readFileSync(new SourceURL('./repository-layout.mjs',import.meta.url),'utf8');if(actual!==loaded)fail('actual repository path implementation differs');if(binding.exported==='repositoryRustLayout')return repositoryRustLayout(scalar(values[0]));if(binding.exported==='rustPackageSourcePath'){return {alternatives:alternatives(values[1]).map(path=>rustPackageSourcePath(scalar(values[0]),path))};}fail('unproved repository path operation');}
     const other=load(target),functions=other.file.statements.filter(value=>ts.isFunctionDeclaration(value)&&value.name?.text===binding.exported&&value.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword));if(functions.length!==1)fail('actual imported path helper binding differs');const fn=functions[0],scope=new Map();fn.parameters.forEach((parameter,index)=>{if(!ts.isIdentifier(parameter.name)||index>=values.length)fail('actual imported helper parameters differ');scope.set(other.checker.getSymbolAtLocation(parameter.name),values[index]);});
     let result;for(const statement of fn.body?.statements??[]){if(ts.isVariableStatement(statement)){for(const variable of statement.declarationList.declarations){if(!ts.isIdentifier(variable.name)||!variable.initializer)fail('unproved helper local');scope.set(other.checker.getSymbolAtLocation(variable.name),evaluate(other,variable.initializer,scope,depth+1));}}else if(ts.isReturnStatement(statement)){result=evaluate(other,statement.expression,scope,depth+1);break;}else fail('unproved imported path helper body');}if(result===undefined)fail('imported path helper has no complete return');return result;
    }
   }
   if(ts.isPropertyAccessExpression(node.expression)){
    const receiver=scalar(evaluate(row,node.expression.expression,environment,depth+1)),method=node.expression.name.text;
    if(method==='sort'&&Array.isArray(receiver)&&!node.arguments.length)return [...receiver].sort();
    if(method==='split'&&typeof receiver==='string')return receiver.split(scalar(evaluate(row,node.arguments[0],environment,depth+1)));
    if(method==='trim'&&typeof receiver==='string'&&!node.arguments.length)return receiver.trim();
    if(method==='filter'&&Array.isArray(receiver)&&node.arguments.length===1&&ts.isIdentifier(node.arguments[0])&&node.arguments[0].text==='Boolean'&&!declarations(row,node.arguments[0]).length)return receiver.filter(Boolean);
    if(method==='startsWith'&&typeof receiver==='string')return receiver.startsWith(scalar(evaluate(row,node.arguments[0],environment,depth+1)));
    if(method==='slice'&&typeof receiver==='string')return receiver.slice(scalar(evaluate(row,node.arguments[0],environment,depth+1)));
    if(method==='map'&&Array.isArray(receiver)&&node.arguments.length===1&&ts.isArrowFunction(node.arguments[0])){const fn=node.arguments[0];if(fn.parameters.length!==1||!ts.isIdentifier(fn.parameters[0].name)||ts.isBlock(fn.body))fail('unproved path map callback');return receiver.map(value=>{const scope=new Map(environment);scope.set(row.checker.getSymbolAtLocation(fn.parameters[0].name),value);return scalar(evaluate(row,fn.body,scope,depth+1));});}
   }
  }
  if(ts.isPropertyAccessExpression(node)){const object=scalar(evaluate(row,node.expression,environment,depth+1));if(object&&typeof object==='object'&&['root','manifest','lock'].includes(node.name.text)&&Object.hasOwn(object,node.name.text))return object[node.name.text];if(node.name.text==='length'&&typeof object==='string')return object.length;}
  fail('unproved dynamic input expression: '+node.getText(row.file));
 }
 function visit(path){
  path=select(path,'native original test import/export/resource closure').path;if(!/\.(?:mjs|js|mts|ts)$/u.test(path))return;const row=load(path);if(row.scanned)return;row.scanned=true;
  function scan(node){
   if(++nodes>200000)fail('native closure node bound');
   if((ts.isCallExpression(node)||ts.isNewExpression(node))&&ts.isIdentifier(node.expression)&&['require','eval','Function','fetch'].includes(node.expression.text)&&!declarations(row,node.expression).length)fail('unproved dynamic original input provider');
   if((ts.isCallExpression(node)||ts.isNewExpression(node))&&(ts.isElementAccessExpression(node.expression)||ts.isPropertyAccessExpression(node.expression)&&['constructor','call','apply','bind'].includes(node.expression.name.text)))fail('unproved indirect original input provider');
   if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='process'&&!declarations(row,node.expression.expression).length)fail('unproved process input provider');
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){if(!ts.isStringLiteral(node.moduleSpecifier))fail('nonliteral module dependency');bound(path,node.moduleSpecifier.text,node.moduleSpecifier);}
   if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){if(node.arguments.length!==1||!ts.isStringLiteral(node.arguments[0]))fail('uncertain dynamic module dependency');bound(path,node.arguments[0].text,node.arguments[0]);}
   if(ts.isCallExpression(node)){const binding=imported(row,node.expression);if(binding?.specifier==='node:fs'&&['readFileSync','readFile','openSync','createReadStream'].includes(binding.exported)){
    const values=alternatives(evaluate(row,node.arguments[0]));if(values.length>8192)fail('read dependency alternatives exceeded');const targets=[];
    for(const value of values){const absolute=value instanceof SourceURL?fileURLToPath(value):resolve(root,value),target=name(relative(root,absolute));select(target,'actual native file-read argument');targets.push(target);}
    reads.push({from:path,operation:binding.exported,span:[node.getStart(row.file),node.end],source:node.getText(row.file),targets:[...new Set(targets)].sort()});
   }else if(binding?.specifier==='node:child_process'&&binding.exported==='execFileSync'){
    const command=scalar(evaluate(row,node.arguments[0])),selectors=alternatives(evaluate(row,node.arguments[1])),targets=[];if(command!=='git')fail('unproved original subprocess dependency');gitOptions(row,node);
    for(const argv of selectors){if(same(argv,['rev-parse','HEAD'])||same(argv,['ls-files','-z','--','*.rs']))continue;if(!Array.isArray(argv)||argv.length!==2||argv[0]!=='show'||typeof argv[1]!=='string'||!argv[1].startsWith(head+':'))fail('unknown original Git source operation');targets.push(select(argv[1].slice(head.length+1),'complete original immutable Git source read').path);}
    processInputs.push({from:path,span:[node.getStart(row.file),node.end],source:node.getText(row.file),command,selectors,targets:[...new Set(targets)].sort()});
   }}
   if(ts.isIdentifier(node)){
    const binding=row.imports.get(row.checker.getSymbolAtLocation(node));if(binding&&(binding.specifier==='node:fs'&&['readFileSync','readFile','openSync','createReadStream'].includes(binding.exported)||binding.specifier==='node:child_process'&&binding.exported==='execFileSync')&&!ts.isImportSpecifier(node.parent)&&!(ts.isCallExpression(node.parent)&&node.parent.expression===node))fail('original native input operation escaped direct source calls');
   }
   ts.forEachChild(node,scan);
  }
  scan(row.file);
 }
 try{visit(entry);return {schema:'original-derive-additional-source-closure-v1',entry,head,paths:[...selected].sort(),modules:[...modules.values()].map(row=>({path:row.path,source:row.source,sha256:hash(row.source)})),edges,reads,processInputs,compilerBoundaries,uncertainDependencies:[],compilerInputsRetainedInFull:true,sourceAuthority:false,runtimeAuthority:false};}
 finally{modules.clear();}
}
