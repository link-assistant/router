// Independent source-declared Node case budgets; never changes test execution.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const MAX_FILE=4*1024*1024,MAX_SOURCE=64*1024*1024,MAX_CASES=131072;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=state=>Object.fromEntries(['dev','ino','mode','size','mtimeMs','ctimeMs'].map(key=>[key,state[key]]));
export function canonicalCasePath(filename){
 let absolute=path.resolve(filename);
 for(const alias of ['/tmp','/var'])if((absolute===alias||absolute.startsWith(alias+'/'))&&fs.lstatSync(alias).isSymbolicLink())absolute=fs.realpathSync(alias)+absolute.slice(alias.length);
 return absolute;
}
export function readCaseSource(filename,maximum=MAX_FILE){
 if(!Number.isSafeInteger(maximum)||maximum<0||maximum>128*1024*1024)throw Error('Invalid complete source/control read bound');
 const absolute=canonicalCasePath(filename);
 for(let part=absolute;;part=path.dirname(part)){if(fs.lstatSync(part).isSymbolicLink())throw Error('Linked deadline source: '+absolute);if(path.dirname(part)===part)break;}
 const fd=fs.openSync(absolute,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const before=fs.fstatSync(fd);if(!before.isFile()||before.size>maximum)throw Error('Bounded regular deadline source required');
  if(JSON.stringify(identity(before))!==JSON.stringify(identity(fs.lstatSync(absolute))))throw Error('Deadline source fd/path differs');
  const bytes=fs.readFileSync(fd),after=fs.fstatSync(fd);
  if(bytes.length!==before.size||JSON.stringify(identity(before))!==JSON.stringify(identity(after))||JSON.stringify(identity(before))!==JSON.stringify(identity(fs.lstatSync(absolute))))throw Error('Deadline source changed during read');
  const source=bytes.toString('utf8');if(!Buffer.from(source).equals(bytes))throw Error('Complete deadline source/control must have lossless UTF8 bytes');
  return {path:absolute,bytes:bytes.length,sha256:hash(bytes),identity:identity(before),source};
 }finally{fs.closeSync(fd);}
}
export function installedDeadlineCompiler(root){
 const require=createRequire(path.join(root,'packages/javascript/package.json'));
 const resolved=require.resolve('typescript'),ts=require(resolved);
 if(ts.version!=='5.9.3')throw Error('Deadline source audit requires installed TypeScript5.9.3');
 return {ts,observation:{version:ts.version,resolved}};
}
function parseSource(record,ts){
 const file=ts.createSourceFile(record.path,record.source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)throw Error('Invalid complete deadline source syntax');
 const host={getSourceFile:name=>name===record.path?file:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>path.dirname(record.path),getDirectories:()=>[],fileExists:name=>name===record.path,readFile:name=>name===record.path?record.source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 const checker=ts.createProgram([record.path],{allowJs:true,noLib:true,noResolve:true,noEmit:true},host).getTypeChecker();
 const nodes=[],calls=[],stack=[file];
 while(stack.length){const node=stack.pop();nodes.push(node);if(nodes.length>524288)throw Error('Deadline AST node bound');if(ts.isCallExpression(node))calls.push(node);const children=[];ts.forEachChild(node,child=>{children.push(child);});for(let i=children.length-1;i>=0;i--)stack.push(children[i]);}
 const unwrap=node=>{while(node&&ts.isParenthesizedExpression(node))node=node.expression;return node;};
 function declaration(node){
  const declarations=checker.getSymbolAtLocation(node)?.declarations;
  if(declarations?.length!==1||!ts.isVariableDeclaration(declarations[0])||!ts.isIdentifier(declarations[0].name)||!(declarations[0].parent.flags&ts.NodeFlags.Const))throw Error('Deadline constant is not one lexical const');
  return declarations[0];
 }
 function number(node,seen=new Set()){
  node=unwrap(node);if(!node||seen.size>32||seen.has(node))throw Error('Ambiguous source timeout value');seen=new Set(seen).add(node);
  let result;
  if(ts.isNumericLiteral(node))result=Number(node.text.replaceAll('_',''));
  else if(ts.isIdentifier(node))result=number(declaration(node).initializer,seen);
  else if(ts.isPrefixUnaryExpression(node)&&[ts.SyntaxKind.PlusToken,ts.SyntaxKind.MinusToken].includes(node.operator)){result=number(node.operand,seen);if(node.operator===ts.SyntaxKind.MinusToken)result=-result;}
  else if(ts.isBinaryExpression(node)){
   const a=number(node.left,seen),b=number(node.right,seen),op=node.operatorToken.kind;
   if(op===ts.SyntaxKind.PlusToken)result=a+b;else if(op===ts.SyntaxKind.MinusToken)result=a-b;else if(op===ts.SyntaxKind.AsteriskToken)result=a*b;else if(op===ts.SyntaxKind.SlashToken)result=a/b;else if(op===ts.SyntaxKind.AsteriskAsteriskToken)result=a**b;else throw Error('Ambiguous source timeout arithmetic');
  }else throw Error('Ambiguous source timeout value');
  if(!Number.isFinite(result)||result<0||result>2147483647)throw Error('Unsupported finite declared timeout');return result;
 }
 function nodeTestCall(call){
  const callee=unwrap(call.expression);if(!ts.isIdentifier(callee))return false;
  const declarations=checker.getSymbolAtLocation(callee)?.declarations;if(declarations?.length!==1)return false;
  let item=declarations[0];if(!ts.isImportClause(item)&&!ts.isImportSpecifier(item))return false;
  const imported=ts.isImportSpecifier(item)?(item.propertyName??item.name).text:'test';
  while(item&&!ts.isImportDeclaration(item))item=item.parent;
  return item?.moduleSpecifier.text==='node:test'&&['test','it','describe','suite'].includes(imported);
 }
 function closedObjectUses(decl,seen=new Set()){
  const symbol=checker.getSymbolAtLocation(decl.name);if(seen.has(symbol))return;
  if(seen.size>32||decl.parent.parent.modifiers?.some(item=>item.kind===ts.SyntaxKind.ExportKeyword)||nodes.some(item=>ts.isExportDeclaration(item)||ts.isExportAssignment(item)))throw Error('Exported or ambiguous constant deadline options');
  seen=new Set(seen).add(symbol);
  for(const reference of nodes){
   if(!ts.isIdentifier(reference)||checker.getSymbolAtLocation(reference)!==symbol||reference===decl.name)continue;
   let use=reference;while(ts.isParenthesizedExpression(use.parent))use=use.parent;
   if(ts.isVariableDeclaration(use.parent)&&use.parent.initializer===use&&(use.parent.parent.flags&ts.NodeFlags.Const)){closedObjectUses(declaration(use.parent.name),seen);continue;}
   if(ts.isCallExpression(use.parent)&&nodeTestCall(use.parent)&&(use.parent.arguments[1]===use||use.parent.arguments[0]===use&&use.parent.arguments[1]&&(ts.isArrowFunction(unwrap(use.parent.arguments[1]))||ts.isFunctionExpression(unwrap(use.parent.arguments[1])))))continue;
   throw Error('Mutable or escaped constant deadline options');
  }
 }
 function constantObject(node,seen=new Set()){
  node=unwrap(node);if(!node||seen.has(node)||seen.size>32)throw Error('Ambiguous deadline options');
  if(ts.isObjectLiteralExpression(node))return node;
  if(!ts.isIdentifier(node))throw Error('Ambiguous deadline options');
  const decl=declaration(node),next=new Set(seen).add(node);
  // A mutable object can only be shared through const aliases and direct
  // built-in Node test options. Every other escape/write refuses, even reads.
  closedObjectUses(decl);
  if(nodes.some(item=>ts.isCallExpression(item)&&ts.isIdentifier(item.expression)&&['eval','Function'].includes(item.expression.text)))throw Error('Dynamic scope prevents constant options qualification');
  return constantObject(decl.initializer,next);
 }
 function timeout(call){
  const args=call.arguments;
  const first=unwrap(args[0]),second=unwrap(args[1]);
  const callbackSecond=second&&(ts.isArrowFunction(second)||ts.isFunctionExpression(second));
  if(args.length<2)return {kind:'default-no-source-deadline'};
  function stringName(node,seen=new Set()){
   node=unwrap(node);if(!node||seen.size>32||seen.has(node))return false;
   if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isTemplateExpression(node))return true;
   const next=new Set(seen).add(node);
   if(ts.isIdentifier(node))try{return stringName(declaration(node).initializer,next);}catch{return false;}
   // Addition produces a primitive string whenever either completed operand is
   // already a primitive string. Unknown coercions may throw, but cannot turn
   // an observed completed registration into an options object.
   if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken)return stringName(node.left,next)||stringName(node.right,next);
   return false;
  }
  if(callbackSecond&&stringName(first))return {kind:'default-no-source-deadline'};
  let options;
  try{options=constantObject(callbackSecond?args[0]:args[1]);}catch(error){return {kind:'ambiguous-options',error:error.message};}
  const properties=[];
  for(const member of options.properties){
   if(!ts.isPropertyAssignment(member)&&!ts.isShorthandPropertyAssignment(member))return {kind:'ambiguous-options',error:'Spread, method or accessor may replace timeout'};
   let name=member.name;if(ts.isComputedPropertyName(name)){name=unwrap(name.expression);if(!ts.isStringLiteral(name)&&!ts.isNumericLiteral(name))return {kind:'ambiguous-options',error:'Nonliteral computed option may define timeout'};}
   if(!ts.isIdentifier(name)&&!ts.isStringLiteral(name)&&!ts.isNumericLiteral(name))return {kind:'ambiguous-options',error:'Unknown option property name'};
   if(name.text==='__proto__')return {kind:'ambiguous-options',error:'Prototype-initialized options cannot qualify an absent timeout'};
   if(name.text==='timeout')properties.push(member);
  }
  if(!properties.length)return {kind:'default-no-source-deadline'};
  if(properties.length!==1)return {kind:'ambiguous-declared-deadline',error:'Duplicate timeout properties'};
  try{return {kind:'finite-source-deadline',milliseconds:number(ts.isShorthandPropertyAssignment(properties[0])?properties[0].name:properties[0].initializer)};}
  catch(error){return {kind:'ambiguous-declared-deadline',error:error.message};}
 }
 return {file,calls,timeout,nodeTestCall};
}
export function createCaseDeadlineAudit({root,files}={}){
 root=canonicalCasePath(root);const compiler=installedDeadlineCompiler(root),ts=compiler.ts;
 const sources=new Map(),records=[],errors=[];let sourceBytes=0,observed=0,overflow=false;
 const fail=message=>{if(errors.length<4096)errors.push(String(message));else overflow=true;};
 function load(filename){
  const absolute=canonicalCasePath(filename.startsWith('file:')?fileURLToPath(filename):path.resolve(root,filename));
  if(path.relative(root,absolute).startsWith('..')||path.isAbsolute(path.relative(root,absolute)))throw Error('Observed source outside declared repository');
  if(!sources.has(absolute)){
   if(sources.size>=4096)throw Error('Deadline source count bound');const record=readCaseSource(absolute);sourceBytes+=record.bytes;if(sourceBytes>MAX_SOURCE)throw Error('Deadline source total bound');
   const selected={record,parsed:null,seen:new Set(),parseError:null};sources.set(absolute,selected);
   try{selected.parsed=parseSource(record,ts);}catch(error){selected.parseError=error.message;}
  }
  const selected=sources.get(absolute);if(selected.parseError)throw Error(selected.parseError);return selected;
 }
 for(const filename of files??[])try{load(filename);}catch(error){fail(error.message);}
 function observe(event){
  if(!['test:pass','test:fail'].includes(event.type))return;
  if(++observed>MAX_CASES){overflow=true;return;}
  if(typeof event.data?.name==='string'&&event.data.name.length>65536||typeof event.data?.file==='string'&&event.data.file.length>4096){records.push({sequence:observed,type:event.type,unboundedMetadataRefused:true,completeOriginalEventForwardedToTap:true});fail('Observed name/source exceeds bounded audit metadata; full original event remains in TAP');return;}
  const data=event.data,entry={sequence:observed,type:event.type,name:data?.name,file:data?.file,line:data?.line,column:data?.column,nesting:data?.nesting,testNumber:data?.testNumber,durationMs:data?.details?.duration_ms,skip:data?.skip??null,todo:data?.todo??null};records.push(entry);
  try{
   if(typeof entry.name!=='string'||typeof entry.file!=='string')throw Error('Observed completed case lacks exact source/name');
   const observedFile=canonicalCasePath(entry.file.startsWith('file:')?fileURLToPath(entry.file):path.resolve(root,entry.file));
   if(!sources.has(observedFile))throw Error('Observed callsite was not among the complete preselected source files');
   const {record,parsed,seen}=load(entry.file);entry.sourceSha256=record.sha256;
   if(!Number.isFinite(entry.durationMs)||entry.durationMs<0)throw Error('Observed case lacks finite nonnegative duration');
   if(!Number.isSafeInteger(entry.line)||entry.line<1||!Number.isSafeInteger(entry.column)||entry.column<1)throw Error('Observed completed case lacks source position');
   const starts=parsed.file.getLineStarts();if(entry.line>starts.length)throw Error('Observed case line outside complete source');
   const position=starts[entry.line-1]+entry.column-1;
   if(position>=(starts[entry.line]??record.source.length))throw Error('Observed column lies outside exact source line');
   const candidates=parsed.calls.filter(call=>call.expression.getStart(parsed.file)<=position&&position<call.expression.end);
   if(candidates.length!==1){
    if(!candidates.length&&[record.path,path.relative(root,record.path)].includes(entry.name)){entry.deadline={kind:'file-container-no-case-deadline'};return;}
    throw Error('Ambiguous observed case/source call join');
   }
   const call=candidates[0],name=call.arguments[0];
   if(name&&(ts.isStringLiteral(name)||ts.isNoSubstitutionTemplateLiteral(name))&&name.text!==entry.name)throw Error('Observed case name differs from exact source');
   seen.add(call);entry.sourceCallSpan={start:call.getStart(parsed.file),end:call.end};entry.deadline=parsed.timeout(call);
   if(entry.deadline.kind.startsWith('ambiguous'))throw Error(entry.deadline.error);
   if(entry.deadline.kind==='finite-source-deadline'&&entry.durationMs>entry.deadline.milliseconds){entry.durationBreach=true;throw Error(`Observed ${entry.durationMs}ms exceeds unchanged source-declared ${entry.deadline.milliseconds}ms timeout`);}
  }catch(error){entry.auditError=error.message;fail(`${entry.file??'?'}:${entry.line??'?'}:${entry.column??'?'} ${entry.name??'?'}: ${error.message}`);}
 }
 function finish(){
  const sourceRecords=[],unobserved=[];
  for(const {record,parsed,seen} of sources.values()){
   try{const after=readCaseSource(record.path);if(JSON.stringify({...after,source:undefined})!==JSON.stringify({...record,source:undefined}))throw Error('Full source bytes/identity changed during test reporting');}catch(error){fail(error.message);}
   sourceRecords.push(record);
   if(parsed)for(const call of parsed.calls){if(!parsed.nodeTestCall(call))continue;const deadline=parsed.timeout(call);if(deadline.kind==='finite-source-deadline'&&!seen.has(call))unobserved.push({file:record.path,span:{start:call.getStart(parsed.file),end:call.end},deadline,observed:false});}
  }
  if(overflow)fail('Complete deadline audit record/error count exceeded');
  return {schema:'source-declared-node-case-deadlines-v1',root,node:process.versions,typescript:compiler.observation,originalCaseLimitsChanged:false,sourceRecords,records,unobservedFiniteSourceDeadlines:unobserved,defaultDeadlinesInferred:false,observedCompletedCases:observed,observedFiniteDeadlineCases:records.filter(row=>row.deadline?.kind==='finite-source-deadline').length,originalFailedCompletionEvents:records.filter(row=>row.type==='test:fail').length,durationBreaches:records.filter(row=>row.durationBreach).length,errors,overflow,passed:errors.length===0&&!overflow,runtimeParity:false,rustExecuted:false};
 }
 return {observe,finish};
}
