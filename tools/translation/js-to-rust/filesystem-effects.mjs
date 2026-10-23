// A separate source-bound reverse lane for standard filesystem effect wrappers.
// Existing portable/owned APIs retain their original admission domains.
import {readFileSync} from 'node:fs';
import {posix} from 'node:path';
import {types} from 'node:util';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {prepareReverseConcreteSource,parseReverseConcreteSource} from './concrete-source.mjs';
import {FILESYSTEM_EFFECT_CONTRACTS} from '../extensions/filesystem-effects-contracts.mjs';
import {parseRust,checkProgram} from '../extensions/effects.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';

const RUNTIME=new URL('../extensions/filesystem-effects-runtime.mjs',import.meta.url);
const SCHEMA='router-filesystem-effect-reverse-v1';
const reserved=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield std tokio'.split(' '));
const fail=message=>{throw new TypeError('Reverse filesystem effects: '+message);};
function path(value){if(typeof value!=='string'||!value||value.startsWith('/')||value.includes('\\')||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('repository-relative ordinary source path required');return value;}
function own(value,key){if(!value||typeof value!=='object'||types.isProxy(value))fail('ordinary input record required');const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('own data field required: '+key);return field.value;}
function name(value){if(typeof value!=='string'||!/^[_a-zA-Z][_a-zA-Z0-9]*$/u.test(value)||reserved.has(value)||value.startsWith('__ro_'))fail('portable unshadowed identifier required');return value;}
function options(input){
 const sourcePath=path(own(input,'sourcePath')),runtimePath=path(own(input,'runtimePath')),runtimeSource=own(input,'runtimeSource');
 if(typeof runtimeSource!=='string'||runtimeSource!==readFileSync(RUNTIME,'utf8'))fail('complete actual filesystem runtime source differs');
 return {sourcePath,runtimePath,runtimeSource};
}
function contract(id){const row=FILESYSTEM_EFFECT_CONTRACTS.find(row=>row.id===id&&row.rustPath[1]==='fs');if(!row)fail('unregistered filesystem operation');return row;}
function rustResult(row){return row.rustPath.at(-1)==='read'?'std::io::Result<Vec<u8>>':row.rustPath.at(-1)==='read_to_string'?'std::io::Result<String>':'std::io::Result<()>';}
function flow(ts,statements,parameters,imports,{lazy=false}={}){
 const bindings=new Map(),steps=[];let tail=null;
 function operand(node){
  if(ts.isIdentifier(node)&&parameters.includes(node.text))return {kind:'parameter',name:node.text,type:'str'};
  if(ts.isPropertyAccessExpression(node)&&node.name.text==='field0'&&ts.isIdentifier(node.expression)&&bindings.has(node.expression.text)){
   const row=bindings.get(node.expression.text);if(row.used++)fail('owned successful payload is used more than once');return {kind:'payload',name:node.expression.text,type:row.type};
  }
  fail('flow operand is not an actual parameter or guarded unique payload');
 }
 function call(expression){
  const awaited=ts.isAwaitExpression(expression);if(awaited)expression=expression.expression;
  if(!ts.isCallExpression(expression)||!ts.isIdentifier(expression.expression)||expression.typeArguments?.length||!imports.has(expression.expression.text))fail('flow requires direct bound filesystem operations');
  const op=contract(imports.get(expression.expression.text));if(op.async!==awaited||op.async&&!lazy)fail('flow await/polling contract differs');
  if(expression.arguments.length!==op.params.length)fail('flow operation argument count differs');const args=[...expression.arguments].map(operand);
  if(args.some((arg,index)=>arg.type!=='str'||op.params[index].kind!=='string'))fail('flow operand type differs from the declared operation');
  return {operation:op.id,arguments:args,awaited,result:op.rustPath.at(-1)==='read'?'bytes':op.rustPath.at(-1)==='read_to_string'?'str':'unit'};
 }
 function guard(node,local){
  if(!node||!ts.isIfStatement(node)||node.elseStatement||!ts.isBinaryExpression(node.expression))fail('each result binding requires its immediate complete failure return');
  const condition=node.expression,left=condition.left,right=condition.right;if(!ts.isPropertyAccessExpression(left)||left.name.text!=='$'||!ts.isIdentifier(left.expression)||left.expression.text!==local||!ts.isStringLiteral(right))fail('failure guard must inspect the same actual Result tag');
  if(!(condition.operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken&&right.text==='Err'||condition.operatorToken.kind===ts.SyntaxKind.ExclamationEqualsEqualsToken&&right.text==='Ok'))fail('unsupported Result failure condition');
  const body=ts.isBlock(node.thenStatement)?node.thenStatement.statements:[node.thenStatement];if(body.length!==1||!ts.isReturnStatement(body[0])||!body[0].expression||!ts.isIdentifier(body[0].expression)||body[0].expression.text!==local)fail('failure branch must return that complete original Result');
 }
 if(!statements.length||statements.length>4096)fail('bounded nonempty effect flow required');
 for(let at=0;at<statements.length;at++){
  const statement=statements[at];
  if(ts.isVariableStatement(statement)){
   if(statement.modifiers?.length||!(statement.declarationList.flags&ts.NodeFlags.Const)||statement.declarationList.declarations.length!==1)fail('one immutable Result binding per source step');const declaration=statement.declarationList.declarations[0];
   if(!ts.isIdentifier(declaration.name)||!declaration.initializer||declaration.type)fail('inferred ordinary Result binding required');const id=name(declaration.name.text);if(bindings.has(id)||parameters.includes(id)||imports.has(id))fail('flow binding shadows an actual source binding');
   const value=call(declaration.initializer);guard(statements[++at],id);bindings.set(id,{type:value.result,operation:value.operation,used:0});steps.push({name:id,...value});continue;
  }
  if(at!==statements.length-1||!ts.isReturnStatement(statement)||!statement.expression)fail('flow requires one complete final Result return');
  const expression=statement.expression;
  if(ts.isIdentifier(expression)&&bindings.has(expression.text)){const row=bindings.get(expression.text);if(row.used++)fail('returned payload was already consumed');tail={kind:'bound-result',name:expression.text,operation:row.operation};}
  else tail={kind:'operation',...call(expression)};
 }
 if(!tail)fail('complete effect flow has no return');return {steps,tail,lazy};
}
function emitFlow(value){
 const argument=row=>name(row.name),operation=row=>contract(row.operation).rustPath.join('::')+'('+row.arguments.map(argument).join(', ')+')'+(row.awaited?'.await':'');
 return value.steps.map(row=>'let '+name(row.name)+' = '+operation(row)+'?;').concat(value.tail.kind==='bound-result'?'Ok('+name(value.tail.name)+')':operation(value.tail)).join('\n');
}
function analyze(stage,input){
 const context=options(input),source=stage.source,language=stage.concreteSyntax.language,ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const file=ts.createSourceFile(context.sourcePath,source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native grammar differs');
 const imports=new Map(),functions=[],locals=new Set(),erase=[],annotate=[];
 for(const item of file.statements){
  if(ts.isImportDeclaration(item)){
   if(item.modifiers?.length||item.attributes||!ts.isStringLiteral(item.moduleSpecifier)||item.importClause?.isTypeOnly||item.importClause?.name||!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('one transparent named runtime import required');
   const specifier=item.moduleSpecifier.text;if(!specifier.startsWith('./')&&!specifier.startsWith('../'))fail('relative runtime source import required');
   if(posix.normalize(posix.join(posix.dirname(context.sourcePath),specifier))!==context.runtimePath)fail('import does not select the complete runtime input');
   for(const binding of item.importClause.namedBindings.elements){if(binding.isTypeOnly)fail('type-only operation import');const local=name(binding.name.text),imported=binding.propertyName?.text??local;if(locals.has(local))fail('competing imported binding');locals.add(local);imports.set(local,imported);if(!['deferFilesystemEffect','deferFilesystemFlow'].includes(imported)&&!FILESYSTEM_EFFECT_CONTRACTS.some(row=>row.id===imported&&row.rustPath[1]==='fs'))fail('unsupported direct operation import');}
  }else{
   if(!ts.isFunctionDeclaration(item)||!item.name||!item.body||item.asteriskToken||item.typeParameters?.length||item.type||item.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('ordinary synchronous wrapper with inferred return required');
   const id=name(item.name.text);if(locals.has(id))fail('competing module binding');locals.add(id);functions.push(item);
  }
 }
 if(!functions.length||functions.length>4096)fail('bounded nonempty complete wrapper module required');
 const rows=functions.map(item=>{
  const parameters=item.parameters.map(parameter=>{
   if(!ts.isIdentifier(parameter.name)||parameter.questionToken||parameter.dotDotDotToken||parameter.initializer||parameter.modifiers?.length)fail('ordinary required string parameter');
   const id=name(parameter.name.text);if(locals.has(id))fail('parameter shadows a source operation or module function');
   if(language==='TypeScript'){if(parameter.type?.kind!==ts.SyntaxKind.StringKeyword)fail('explicit TypeScript string parameter required');erase.push({span:[parameter.name.end,parameter.type.end],replacement:''});}
   else{const tags=ts.getJSDocParameterTags(parameter);if(tags.length!==1||tags[0].typeExpression?.type.kind!==ts.SyntaxKind.StringKeyword)fail('one native JSDoc string parameter required');annotate.push({span:[parameter.name.end,parameter.name.end],replacement:': string'});}
   return id;
  });
  if(new Set(parameters).size!==parameters.length||parameters.length>64)fail('unique bounded source parameters');
  if(item.body.statements.length!==1){const value=flow(ts,item.body.statements,parameters,imports);return {kind:'filesystem-effect-function',name:item.name.text,exported:item.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)??false,parameters:parameters.map(name=>({name,type:'str'})),operation:value.tail.operation,arguments:[],lazy:false,flow:value,span:{start:item.getStart(file),end:item.end}};}
  if(!ts.isReturnStatement(item.body.statements[0])||!item.body.statements[0].expression)fail('one complete effect return required');
  const expression=item.body.statements[0].expression;if(!ts.isCallExpression(expression)||!ts.isIdentifier(expression.expression)||expression.typeArguments?.length||!imports.has(expression.expression.text))fail('direct actual imported operation required');
  const imported=imports.get(expression.expression.text);let selected,args,lazy=false;
  if(imported==='deferFilesystemFlow'){
   const callback=expression.arguments[0];if(expression.arguments.length!==1||!ts.isArrowFunction(callback)||callback.parameters.length||callback.type||callback.typeParameters?.length||!ts.isBlock(callback.body)||callback.modifiers?.length!==1||callback.modifiers[0].kind!==ts.SyntaxKind.AsyncKeyword)fail('one closed deferred async flow required');
   const value=flow(ts,callback.body.statements,parameters,imports,{lazy:true});return {kind:'filesystem-effect-function',name:item.name.text,exported:item.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)??false,parameters:parameters.map(name=>({name,type:'str'})),operation:value.tail.operation,arguments:[],lazy:true,flow:value,span:{start:item.getStart(file),end:item.end}};
  }else if(imported==='deferFilesystemEffect'){
   if(expression.arguments.length!==2||!ts.isStringLiteral(expression.arguments[0])||!ts.isArrayLiteralExpression(expression.arguments[1]))fail('literal lazy operation and ordinary argument array required');
   selected=contract(expression.arguments[0].text);if(!selected.async)fail('lazy wrapper requires an asynchronous operation');args=[...expression.arguments[1].elements];lazy=true;
  }else{selected=contract(imported);if(selected.async)fail('eager JS async calls have a different polling contract');args=[...expression.arguments];}
  if(args.length!==selected.params.length||selected.params.some(type=>type.kind!=='string'))fail('operation argument contract differs');
  const operands=args.map(arg=>{if(!ts.isIdentifier(arg)||!parameters.includes(arg.text))fail('only actual bound string operands');return arg.text;});
  return {kind:'filesystem-effect-function',name:item.name.text,exported:item.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)??false,parameters:parameters.map(name=>({name,type:'str'})),operation:selected.id,arguments:operands,lazy,span:{start:item.getStart(file),end:item.end}};
 });
 if(readFileSync(RUNTIME,'utf8')!==context.runtimeSource)fail('actual runtime source changed');
 return {rows,source,context,language,erase,annotate,concreteSyntax:stage.concreteSyntax};
}
function edit(source,edits){let value=source,last=source.length+1;for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(row.span[1]>=last)fail('overlapping native type selections');value=value.slice(0,row.span[0])+row.replacement+value.slice(row.span[1]);last=row.span[0];}return value;}
function emit(rows){
 return rows.map(row=>{const op=contract(row.operation);if(!row.flow&&(row.lazy!==op.async||row.arguments.length!==op.params.length))fail('semantic operation shape differs');const args=row.arguments.map(name).join(', '),params=row.parameters.map(row=>name(row.name)+': &str').join(', '),body=row.flow?emitFlow(row.flow):op.rustPath.join('::')+'('+args+')'+(op.async?'.await':'');return (row.exported?'pub ':'')+(row.lazy?'async ':'')+'fn '+name(row.name)+'('+params+') -> '+rustResult(op)+' { '+body+' }';}).join('\n')+'\n';
}
function translate(stage,input){
 const analysis=analyze(stage,input),pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:bind-native-effect-wrappers-to-actual-runtime',apply:()=>JSON.stringify({schema:SCHEMA,functions:analysis.rows})},{id:'meta:serialize-reparse-and-retain-typed-operation-rows',apply:wire=>{const data=JSON.parse(wire);if(data.schema!==SCHEMA||JSON.stringify(data.functions)!==JSON.stringify(analysis.rows))fail('complete semantic source association differs');return data;}}]},
  {phase:'repository',rules:[{id:'router:emit-qualified-rust-filesystem-operations',apply:data=>({meta:JSON.stringify(data),rust:emit(data.functions)})}]},
 ]),run=pipeline.run(null),rustConcrete=transportConcreteSyntaxSource(run.value.rust,{language:'Rust'}),rustSource=transportConcreteSyntaxMeta(rustConcrete.meta).source;
 const program=checkProgram(parseRust(rustSource)),checkedMeta=serializeProgram(program),checked=parseProgram(checkedMeta),entries=[...checked.declarations.values()].filter(row=>row.k==='fn');
 if(entries.length!==analysis.rows.length)fail('independent complete Rust semantic census differs');
 for(const row of analysis.rows){const selected=entries.find(entry=>entry.name===row.name);if(!selected||Boolean(selected.async)!==row.lazy)fail('independent Rust function association differs');}
 const sourceRules=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:substitute-only-native-selected-string-annotations',apply:source=>({javascript:analysis.language==='JavaScript'?source:edit(source,analysis.erase),typescript:analysis.language==='TypeScript'?source:edit(source,analysis.annotate)})}]},
  {phase:'repository',rules:[{id:'router:retain-whole-target-source-and-annotation-inverses',apply:targets=>({...targets,equations:transportConcreteSourceEquations([{before:analysis.source,after:targets.javascript,language:analysis.language},{before:analysis.source,after:targets.typescript,language:analysis.language}])})}]},
 ]).run(analysis.source),{javascript,typescript}=sourceRules.value;
 const targets=[['JavaScript',javascript],['TypeScript',typescript]].map(([language,source])=>{const row=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(row.meta).source!==source)fail('complete target concrete roundtrip differs');return {language,meta:row.meta};});
 if(readFileSync(RUNTIME,'utf8')!==analysis.context.runtimeSource)fail('actual runtime changed before return');
 return {schema:SCHEMA,meta:run.value.meta,rust:rustSource,javascript,typescript,checkedRustMeta:checkedMeta,concreteSyntax:analysis.concreteSyntax,rustConcreteSyntax:rustConcrete.meta,targetConcreteSyntax:targets,targetSourceEquations:sourceRules.value.equations,sourceRuleTrace:sourceRules.trace,trace:run.trace,mappings:analysis.rows.map(row=>({source:row.name,target:row.name,operation:row.operation,span:row.span})),sourcePath:analysis.context.sourcePath,runtimePath:analysis.context.runtimePath,runtimeParity:false,wholeRouterSynchronization:false};
}
export function translateFilesystemEffectJavaScript(source,input){return translate(prepareReverseConcreteSource(source),input);}
export function translateFilesystemEffectTypeScript(source,input){return translate(prepareReverseConcreteSource(source,'TypeScript'),input);}
export function translateFilesystemEffectConcreteSyntaxMeta(meta,input){return translate(parseReverseConcreteSource(meta),input);}
export function readFilesystemEffectMeta(meta,source,input,{language='JavaScript'}={}){
 const analysis=analyze(prepareReverseConcreteSource(source,language),input),expected=JSON.stringify({schema:SCHEMA,functions:analysis.rows});if(meta!==expected)fail('complete current source and semantic meta differ');return JSON.parse(expected);
}
