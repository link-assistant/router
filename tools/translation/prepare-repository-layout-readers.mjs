#!/usr/bin/env node
// Source proposal only. Operational path equations grant no semantic authority.
import {readFileSync,lstatSync} from 'node:fs';
import {resolve,dirname,join,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRulePipeline} from './rule-pipeline.mjs';
import {exactLiteralSubstitutionRule as exactSubstitutionRule} from './literal-substitution-rule.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function concrete(source){const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);if(transportConcreteSyntaxMeta(wire).source!==source)throw Error('Complete source CST inverse differs');return wire;}
function syntax(path,source){const ts=ownershipCompiler();if(ts.version!=='5.9.3')throw Error('Installed TypeScript 5.9.3 required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw Error('Complete JavaScript grammar failed');if(process.versions.bun){if(typeof globalThis.Bun?.Transpiler!=='function')throw Error('Native Bun JavaScript scanner required');new globalThis.Bun.Transpiler({loader:'js',target:'bun'}).scan(source);}else execFileSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8',timeout:20000,maxBuffer:1048576});}
function trackedSourceReexport(){
 const path='tools/translation/bulk.mjs',source=readFileSync(new URL('./bulk.mjs',import.meta.url),'utf8'),ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)throw Error('Complete actual tracked-source reexport grammar failed');
 const nodes=file.statements.filter(node=>ts.isExportDeclaration(node)&&!node.isTypeOnly&&node.moduleSpecifier?.text==='./source-corpus.mjs'&&node.exportClause&&ts.isNamedExports(node.exportClause)&&node.exportClause.elements.some(item=>!item.isTypeOnly&&item.name.text==='trackedSource'&&(!item.propertyName||item.propertyName.text==='trackedSource')));
 if(nodes.length!==1)throw Error('Actual unique tracked-source reexport required');
 return {path,source,meta:concrete(source),statement:nodes[0].getText(file),span:[nodes[0].getStart(file),nodes[0].end],modules:['../source-corpus.mjs','../bulk.mjs']};
}
function deriveFile(path,source,root,tracker){
 const ts=ownershipCompiler(),absolute=resolve(root,path),file=ts.createSourceFile(absolute,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw Error('Whole original syntax failed: '+path);
 const options={allowJs:true,noResolve:true,noLib:true,noEmit:true},host=ts.createCompilerHost(options);host.getSourceFile=name=>name===absolute?file:undefined;host.readFile=()=>undefined;host.fileExists=name=>name===absolute;
 const program=ts.createProgram([absolute],options,host),checker=program.getTypeChecker(),imports=new Map(),required=new Set(),edits=[],reads=[],roots=[];
 for(const node of file.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.importClause){const module=node.moduleSpecifier.text,clause=node.importClause;if(clause.name)imports.set(checker.getSymbolAtLocation(clause.name),{module,name:'*'});if(clause.namedBindings){if(ts.isNamespaceImport(clause.namedBindings))imports.set(checker.getSymbolAtLocation(clause.namedBindings.name),{module,name:'*'});else for(const item of clause.namedBindings.elements)imports.set(checker.getSymbolAtLocation(item.name),{module,name:item.propertyName?.text??item.name.text,local:item.name.text});}}
 function dynamicImports(node){
  if(ts.isVariableDeclaration(node)&&(node.parent.flags&ts.NodeFlags.Const)&&node.initializer&&ts.isAwaitExpression(node.initializer)){
   const value=node.initializer.expression;
   if(ts.isCallExpression(value)&&value.expression.kind===ts.SyntaxKind.ImportKeyword&&value.arguments.length===1&&ts.isStringLiteral(value.arguments[0])){
    const module=value.arguments[0].text;
    if(ts.isIdentifier(node.name))imports.set(checker.getSymbolAtLocation(node.name),{module,name:'*',local:node.name.text});
    if(ts.isObjectBindingPattern(node.name))for(const item of node.name.elements)if(ts.isIdentifier(item.name)&&!item.dotDotDotToken&&!item.initializer&&(!item.propertyName||ts.isIdentifier(item.propertyName)||ts.isStringLiteral(item.propertyName)))imports.set(checker.getSymbolAtLocation(item.name),{module,name:item.propertyName?.text??item.name.text,local:item.name.text});
   }
  }
  ts.forEachChild(node,dynamicImports);
 }
 dynamicImports(file);
 function binding(node){if(ts.isIdentifier(node))return imports.get(checker.getSymbolAtLocation(node));if(ts.isPropertyAccessExpression(node)){const owner=binding(node.expression);if(owner?.name==='*')return {...owner,name:node.name.text};}return null;}
 const builtin=(node,module,name)=>{const value=binding(node);return value&&[module,'node:'+module].includes(value.module)&&value.name===name;};
 function evaluate(node,seen=new Set()){
  if(!node||seen.has(node))return null;seen=new Set(seen).add(node);
  if(ts.isParenthesizedExpression(node))return evaluate(node.expression,seen);
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return node.text;
  if(node.getText(file)==='import.meta.url')return pathToFileURL(absolute).href;
  if(ts.isIdentifier(node)){const symbol=checker.getSymbolAtLocation(node),declarations=symbol?.declarations??[];if(declarations.length!==1||!ts.isVariableDeclaration(declarations[0])||!(declarations[0].parent.flags&ts.NodeFlags.Const))return null;return evaluate(declarations[0].initializer,seen);}
  if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.QuestionQuestionToken&&node.left.getText(file)==='process.env.ROUTER_NATIVE_TS_SOURCE_ROOT'&&!checker.getSymbolAtLocation(node.left.expression.expression))return evaluate(node.right,seen);
  if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='URL'&&(!checker.getSymbolAtLocation(node.expression)||builtin(node.expression,'url','URL'))&&node.arguments?.length===2){const a=evaluate(node.arguments[0],seen),b=evaluate(node.arguments[1],seen);if(typeof a==='string'&&(typeof b==='string'||b instanceof URL))return new URL(a,b);}
  if(ts.isCallExpression(node)){
   const args=node.arguments.map(value=>evaluate(value,seen));if(args.some(value=>value===null))return null;
   if(builtin(node.expression,'url','fileURLToPath')&&args.length===1)return fileURLToPath(args[0]);
   if(builtin(node.expression,'path','dirname')&&args.length===1&&typeof args[0]==='string')return dirname(args[0]);
   if(builtin(node.expression,'path','resolve')&&args.every(value=>typeof value==='string'))return resolve(...args);
   if(builtin(node.expression,'path','join')&&args.every(value=>typeof value==='string'))return join(...args);
  }
  return null;
 }
 function repository(node){let value;try{value=evaluate(node);}catch{return null;}if(value instanceof URL&&value.protocol==='file:'&&resolve(fileURLToPath(value))===root)return {kind:'url',source:node.getText(file)};if(typeof value==='string'&&value.length<4096&&isAbsolute(value)&&resolve(value)===root)return {kind:'path',source:node.getText(file)};return null;}
 const relevant=path=>path==='Cargo.toml'||path==='Cargo.lock'||path==='build.rs'||/^(?:src|tests|benches|examples|fixtures|fuzz|proptest-regressions)(?:\/|$)/u.test(path);
 const helperCall=node=>ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&['repositorySourcePath','rustPackageSourcePath','repositorySourceURL'].includes(node.expression.text);
 function urlRead(node){
  if(!ts.isNewExpression(node)||node.expression.getText(file)!=='URL'||node.arguments?.length!==2||checker.getSymbolAtLocation(node.expression)&&!builtin(node.expression,'url','URL'))return null;
  const [arg,base]=node.arguments,owner=repository(base);if(owner?.kind==='url'&&!helperCall(arg)){
   if((ts.isStringLiteral(arg)||ts.isNoSubstitutionTemplateLiteral(arg))&&!relevant(arg.text))return null;required.add('repositorySourceURL');return 'repositorySourceURL('+arg.getText(file)+','+base.getText(file)+')';
  }
  if(base.getText(file)!=='import.meta.url'||new URL('../../../',pathToFileURL(absolute)).href!==pathToFileURL(root+'/').href)return null;
  let pathText=null;
  if((ts.isStringLiteral(arg)||ts.isNoSubstitutionTemplateLiteral(arg))&&arg.text.startsWith('../../../')&&relevant(arg.text.slice(9)))pathText=JSON.stringify(arg.text.slice(9));
  if(ts.isBinaryExpression(arg)&&arg.operatorToken.kind===ts.SyntaxKind.PlusToken&&ts.isStringLiteral(arg.left)&&arg.left.text==='../../../')pathText=arg.right.getText(file);
  if(ts.isTemplateExpression(arg)&&arg.head.text.startsWith('../../../')&&arg.getText(file).startsWith(String.fromCharCode(96)+'../../../'))pathText=String.fromCharCode(96)+arg.getText(file).slice(10);
  if(pathText===null)return null;required.add('repositorySourceURL');return 'repositorySourceURL('+pathText+",new URL('../../../',import.meta.url))";
 }
 function pathRead(node){
  if(!ts.isCallExpression(node)||![['path','join'],['path','resolve']].some(([module,name])=>builtin(node.expression,module,name))||node.arguments.length<2)return null;
  const [base,...rest]=node.arguments,owner=repository(base);if(owner?.kind!=='path'||rest.length===1&&helperCall(rest[0]))return null;
  if(ts.isStringLiteral(rest[0])&&!relevant(rest[0].text))return null;
  const part=rest.length===1?rest[0].getText(file):node.expression.getText(file)+'('+rest.map(arg=>arg.getText(file)).join(',')+')';required.add('repositorySourcePath');
  return node.expression.getText(file)+'('+base.getText(file)+',repositorySourcePath('+part+','+base.getText(file)+'))';
 }
 function select(node,after,kind){if(!after)return;const before=node.getText(file);if(after===before)throw Error('Actual path edit required');edits.push({start:node.getStart(file),end:node.end,before,after,kind});}
 function visit(node){
  if(ts.isVariableDeclaration(node)&&node.initializer){const value=repository(node.initializer);if(value)roots.push({name:node.name.getText(file),...value,span:[node.getStart(file),node.end]});}
  if(ts.isCallExpression(node)&&builtin(node.expression,'fs','readFileSync')&&node.arguments.length){const arg=node.arguments[0];reads.push({callee:node.expression.getText(file),argument:arg.getText(file),span:[node.getStart(file),node.end]});select(arg,urlRead(arg)??pathRead(arg),'actual-current-repository-read');}
  if(ts.isCallExpression(node)&&binding(node.expression)?.name==='trackedSource'&&tracker.modules.includes(binding(node.expression).module)&&node.arguments.length===2&&repository(node.arguments[0])&&!helperCall(node.arguments[1])){required.add('repositorySourcePath');select(node.arguments[1],'repositorySourcePath('+node.arguments[1].getText(file)+','+node.arguments[0].getText(file)+')','actual-current-tracked-source-read');}
  ts.forEachChild(node,visit);
 }
 visit(file);
 const helpers=new Set([...imports.values()].filter(row=>row.module==='./fixtures/repository-paths.mjs'&&row.local===row.name).map(row=>row.name)),missing=[...required].filter(name=>!helpers.has(name)).sort();
 if(missing.length){const first=file.statements[0];if(!first)throw Error('Complete statement owner required');edits.push({start:first.getStart(file),end:first.getStart(file),before:'',after:'import {'+missing.join(',')+'} from "./fixtures/repository-paths.mjs";\n',kind:'actual-helper-import'});}
 if(!edits.length)return {path,source,sha256:hash(source),roots,reads,selected:[],changed:false};
 let text=source,boundary=source.length;for(const edit of [...edits].sort((a,b)=>b.start-a.start||b.end-a.end)){if(edit.end>boundary||source.slice(edit.start,edit.end)!==edit.before)throw Error('Original selected spans overlap or changed');text=text.slice(0,edit.start)+edit.after+text.slice(edit.end);boundary=edit.start;}
 syntax(path,source);syntax(path,text);const beforeMeta=concrete(source),afterMeta=concrete(text),rule=exactSubstitutionRule('router:complete-current-operational-path-equation',source,text,'Complete original source changed');
 const result=createRulePipeline([{phase:'language',rules:[{id:'javascript:native-bound-lexical-read-selection',apply:value=>{if(value!==source)throw Error('Native parser source changed');return value;}}]},{phase:'repository',rules:[rule]}]).run(transportConcreteSyntaxMeta(beforeMeta).source);
 if(result.value!==transportConcreteSyntaxMeta(afterMeta).source||result.value!==text)throw Error('Complete source equation differs');const inverse=text.replace(text,()=>source);if(inverse!==source)throw Error('Complete source inverse differs');
 return {literalSubstitutions:true,path,source,text,sourceSha256:hash(source),sha256:hash(text),beforeMeta,afterMeta,inverse,language:[],repository:[['complete-current-operational-path-equation',source,text]],trace:result.trace,roots,reads,selected:edits,changed:true};
}
export function deriveRepositoryLayoutReadSources({sources,repositoryRoot}){
 if(!(sources instanceof Map)||typeof repositoryRoot!=='string'||sources.size>1000)throw Error('Bounded complete source map and explicit repository root required');const root=resolve(repositoryRoot),tracker=trackedSourceReexport();let total=0;const rows=[];
 for(const [path,source]of sources){if(!/^tools\/translation\/test\/[^/]+\.test\.mjs$/.test(path)||typeof source!=='string'||Buffer.byteLength(source)>1048576||(total+=Buffer.byteLength(source))>33554432)throw Error('Closed complete compiler test source scope required');rows.push(deriveFile(path,source,root,tracker));}
 if(readFileSync(new URL('./bulk.mjs',import.meta.url),'utf8')!==tracker.source)throw Error('Complete actual reexport source changed during proposal');
 return {trackedSourceReexport:tracker,schema:'complete-repository-layout-reader-source-proposal-v1',files:rows.filter(row=>row.changed),unchanged:rows.filter(row=>!row.changed),allSelectedSourceBytes:total,sourceOrOwnerVerdictsCached:false,historicalStringsRewritten:false,qualified:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--emit')throw Error('Usage: prepare-repository-layout-readers.mjs --emit TARGET_PATHS_JSON');const root=fileURLToPath(new URL('../../',import.meta.url)),targets=JSON.parse(readFileSync(args[1],'utf8'));if(!Array.isArray(targets)||new Set(targets).size!==targets.length)throw Error('Unique complete source path array required');
 const sources=new Map();for(const path of targets){if(typeof path!=='string'||!/^tools\/translation\/test\/[^/]+\.test\.mjs$/.test(path))throw Error('Closed source path required');const target=join(root,path),status=lstatSync(target);if(!status.isFile()||status.isSymbolicLink()||status.size>1048576)throw Error('Ordinary bounded actual source required');sources.set(path,readFileSync(target,'utf8'));}
 console.log(JSON.stringify(deriveRepositoryLayoutReadSources({sources,repositoryRoot:root})));
}
