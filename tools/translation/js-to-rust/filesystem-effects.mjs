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
function analyze(stage,input){
 const context=options(input),source=stage.source,language=stage.concreteSyntax.language,ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('lockfile TypeScript5.9.3 required');
 const file=ts.createSourceFile(context.sourcePath,source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native grammar differs');
 const imports=new Map(),functions=[],locals=new Set(),erase=[],annotate=[];
 for(const item of file.statements){
  if(ts.isImportDeclaration(item)){
   if(item.modifiers?.length||item.attributes||!ts.isStringLiteral(item.moduleSpecifier)||item.importClause?.isTypeOnly||item.importClause?.name||!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings))fail('one transparent named runtime import required');
   const specifier=item.moduleSpecifier.text;if(!specifier.startsWith('./')&&!specifier.startsWith('../'))fail('relative runtime source import required');
   if(posix.normalize(posix.join(posix.dirname(context.sourcePath),specifier))!==context.runtimePath)fail('import does not select the complete runtime input');
   for(const binding of item.importClause.namedBindings.elements){if(binding.isTypeOnly)fail('type-only operation import');const local=name(binding.name.text),imported=binding.propertyName?.text??local;if(locals.has(local))fail('competing imported binding');locals.add(local);imports.set(local,imported);if(imported!=='deferFilesystemEffect'&&!FILESYSTEM_EFFECT_CONTRACTS.some(row=>row.id===imported&&row.rustPath[1]==='fs'&&!row.async))fail('unsupported direct operation or eager async import');}
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
  if(item.body.statements.length!==1||!ts.isReturnStatement(item.body.statements[0])||!item.body.statements[0].expression)fail('one complete effect return required');
  const expression=item.body.statements[0].expression;if(!ts.isCallExpression(expression)||!ts.isIdentifier(expression.expression)||expression.typeArguments?.length||!imports.has(expression.expression.text))fail('direct actual imported operation required');
  const imported=imports.get(expression.expression.text);let selected,args,lazy=false;
  if(imported==='deferFilesystemEffect'){
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
 return rows.map(row=>{const op=contract(row.operation);if(row.lazy!==op.async||row.arguments.length!==op.params.length)fail('semantic operation shape differs');const args=row.arguments.map(name).join(', '),params=row.parameters.map(row=>name(row.name)+': &str').join(', ');return (row.exported?'pub ':'')+(op.async?'async ':'')+'fn '+name(row.name)+'('+params+') -> '+rustResult(op)+' { '+op.rustPath.join('::')+'('+args+')'+(op.async?'.await':'')+' }';}).join('\n')+'\n';
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
