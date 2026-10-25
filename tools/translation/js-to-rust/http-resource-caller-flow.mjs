// Closed awaited resource flow. Syntax candidates receive complete fresh source
// checking in the caller adapter; this module issues no standalone source permit.
import {httpResourceCallerContract as actualHttpResourceContract,httpResourceCallerRustType as actualHttpResourceRustType,httpResourceOwned,httpResourceBorrowRole,httpResourceNeedsDisposal,httpResourceResult,httpResourceResultOwnsDisposal} from './http-resource-caller-contracts.mjs';
const fail=message=>{throw new TypeError('Async control caller: '+message);};
const roles=Object.freeze({'shared-cancellation':'cancel-ref','shared-sender':'sender-ref','exclusive-receiver':'receiver-mut'});
const outputs=Object.freeze({cancellation:'cancel-owned',sender:'sender-owned','control-channel-result':'result:channel-pair','control-unit-result':'result:unit','control-optional-text-result':'result:option-text'});
const owned=type=>['cancel-owned','sender-owned','receiver-owned'].includes(type);
const receiver=type=>['receiver-owned','receiver-mut'].includes(type);
const borrowRole=type=>type==='cancel-owned'?'cancel-ref':type==='sender-owned'?'sender-ref':type==='receiver-owned'?'receiver-mut':type;
const reserved=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield abstract become box final gen macro override priv unsized virtual std tokio Parameters ReturnType Promise String Result Option Self'.split(' '));
export function httpResourceCallerName(value){if(typeof value!=='string'||value==='_'||!/^[_a-zA-Z][_a-zA-Z0-9]*$/u.test(value)||value.startsWith('__ro')||reserved.has(value))fail('ordinary portable unshadowed control name required');return value;}
export function httpResourceCallerContract(name){return actualHttpResourceContract(name);}
export function httpResourceCallerRustType(type,options){return actualHttpResourceRustType(type,options);}
export function checkHttpResourceCallerFlow(ts,statements,parameters,imports,{lazy=false,allowColdTail=false,bindings=null,moduleNames=new Set(),budget={cells:0},depth=0}={}){
 if(depth>64||!statements.length||statements.length>4096)fail('bounded complete HTTP resource flow required');
 const environment=bindings?new Map([...bindings].map(([key,row])=>[key,{...row}])):new Map(parameters.map(row=>[row.name,{type:row.type,input:true,moved:false,disposed:false,root:row.type==='str'?row.name:null}])),steps=[],failures=[];let tail=null;
 const tick=()=>{if(++budget.cells>100000)fail('complete HTTP resource source-cell budget');};
 const binding=id=>{const row=environment.get(id);if(!row||row.moved||row.disposed)fail('unknown, moved or disposed actual HTTP binding: '+id);return row;};
 const newName=id=>{httpResourceCallerName(id);if(environment.has(id)||moduleNames.has(id))fail('unique actual resource local required');return id;};
 const isLoan=type=>['cancel-ref','sender-ref','receiver-mut','http-client-ref','http-client-mut','http-stream-ref','http-stream-mut','json-ref'].includes(type);
 function finish(){for(const [id,row]of environment){if(row.input||row.moved||row.disposed)continue;if(httpResourceNeedsDisposal(row.type)||httpResourceResultOwnsDisposal(row.type)&&!row.used)fail('every local resource must be explicitly released or returned on this exit: '+id);}}
 function operand(node,wanted=null,{move=true}={}){
  tick();if(ts.isParenthesizedExpression(node))return operand(node.expression,wanted,{move});
  if(ts.isIdentifier(node)){
   const row=binding(node.text),result=httpResourceResult(row.type);
   if(wanted&&(isLoan(wanted)||wanted==='str')){
    const shared=wanted==='http-client-ref'&&row.type==='http-client-mut'||wanted==='http-stream-ref'&&row.type==='http-stream-mut';
    const exclusive=wanted==='http-client-mut'&&row.type==='http-client-owned'||wanted==='http-stream-mut'&&row.type==='http-stream-owned';
    if(httpResourceBorrowRole(row.type)!==wanted&&!shared&&!exclusive)fail('actual input loan role differs');
    return {kind:'borrow',name:node.text,type:wanted,sourceType:row.type,owned:httpResourceOwned(row.type),root:row.root??null};
   }
   if(isLoan(row.type))fail('borrowed resources cannot be stored or escape this caller');
   if(result){if(row.used)fail('complete Result payload already consumed');if(move){row.used=true;row.moved=true;}return {kind:'result-variable',name:node.text,type:row.type,guarded:!!row.guarded,root:row.root??null};}
   if(httpResourceOwned(row.type)&&move)row.moved=true;return {kind:'variable',name:node.text,type:row.type,root:row.root??null};
  }
  if(ts.isPropertyAccessExpression(node)&&node.name.text==='field0'&&ts.isIdentifier(node.expression)){
   const row=binding(node.expression.text),result=httpResourceResult(row.type);if(!result||!row.guarded||row.used||result.value==='channel-pair')fail('actual guarded complete payload required');
   if(httpResourceOwned(result.value)||httpResourceResult(result.value)){row.used=true;row.moved=true;}return {kind:'payload',name:node.expression.text,type:result.value,root:row.root??null};
  }
  if(ts.isBigIntLiteral(node)){const raw=node.text.replace(/_/gu,'');if(!/^[0-9]+n$/u.test(raw)||BigInt(raw.slice(0,-1))>18446744073709551615n)fail('closed decimal u64 literal required');return {kind:'integer',value:BigInt(raw.slice(0,-1)).toString(),type:'u64'};}
  if(ts.isStringLiteral(node)){if(/\p{Surrogate}/u.test(node.text))fail('well-formed scalar text required');return {kind:'string',value:node.text,type:'str'};}
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'boolean',value:node.kind===ts.SyntaxKind.TrueKeyword,type:'bool'};
  if(node.kind===ts.SyntaxKind.NullKeyword)return {kind:'unit',type:'unit'};
  if(wanted==='empty-json-list'&&ts.isArrayLiteralExpression(node)&&node.elements.length===0)return {kind:'empty-json-list',type:'empty-json-list'};
  fail('actual checked HTTP resource or scalar operand required');
 }
 function call(node,{coldTail=false}={}){
  tick();let awaited=ts.isAwaitExpression(node);if(awaited)node=node.expression;
  if(!ts.isCallExpression(node)||!ts.isIdentifier(node.expression)||node.typeArguments?.length||!imports.has(node.expression.text))fail('one direct actual imported HTTP operation required');
  const operation=httpResourceCallerContract(imports.get(node.expression.text));if(!operation)fail('unregistered actual operation');
  if(operation.args.includes('deferred-callback'))fail('generic deadline callbacks use the separate control lane; HTTP resources require closed settled operations');
  const implicitAwait=operation.async&&!awaited&&coldTail;if(Boolean(operation.async)!==Boolean(awaited||implicitAwait)||operation.async&&!lazy)fail('future must be immediately awaited inside a cold caller');
  if(node.arguments.length!==operation.args.length)fail('complete actual operation arity differs');const loans=new Map(),args=[];
  for(let index=0;index<operation.args.length;index++){
   const role=operation.args[index],argument=node.arguments[index];let value;
   if(ts.isCallExpression(argument)||ts.isAwaitExpression(argument)){
    value=call(argument);if(role==='json-ref'&&value.type==='json')value={kind:'temporary-json-borrow',value,type:'json-ref'};
   }else value=operand(argument,role,{move:!isLoan(role)&&role!=='str'});
   if(value.type!==role)fail('actual complete operation argument domain differs');
   if(value.kind==='borrow'){
    const exclusive=['receiver-mut','http-client-mut','http-stream-mut'].includes(value.type),previous=loans.get(value.name);if(previous!==undefined&&(previous||exclusive))fail('competing simultaneous exclusive call loans');loans.set(value.name,exclusive);
   }
   args.push(value);
  }
  let root=null;if(operation.borrowedResult){const argument=args[operation.rootArgument],actual=argument?.kind==='borrow'?environment.get(argument.name):null;if(!actual?.input||actual.type!=='json-ref'||argument.type!=='json-ref')fail('borrowed protocol output must retain its actual public immutable JSON input root');root=argument.name;}
  httpResourceCallerRustType(operation.ret);const value={kind:'http-resource-call',operation:operation.javascriptName,args,type:operation.ret,awaited:Boolean(awaited||implicitAwait),implicitAwait,root};
  if(operation.release){if(args.length!==1||args[0].kind!=='borrow')fail('release must bind one actual resource');const row=binding(args[0].name);row.disposed=true;value.release=operation.release;}
  return value;
 }
 function expression(node,flags={}){return ts.isCallExpression(node)||ts.isAwaitExpression(node)?call(node,flags):operand(node);}
 function condition(node,level=0){
  tick();if(level+depth>160)fail('Boolean resource condition depth budget');if(ts.isParenthesizedExpression(node))return condition(node.expression,level+1);
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken)return {kind:'not',value:condition(node.operand,level+1),type:'bool'};
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind))return {kind:node.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken?'and':'or',left:condition(node.left,level+1),right:condition(node.right,level+1),type:'bool'};
  const value=expression(node);if(value.type!=='bool')fail('primitive Boolean condition required');return value;
 }
 function hasGuard(node,id){return node&&ts.isIfStatement(node)&&ts.isBinaryExpression(node.expression)&&ts.isPropertyAccessExpression(node.expression.left)&&ts.isIdentifier(node.expression.left.expression)&&node.expression.left.expression.text===id&&node.expression.left.name.text==='$';}
 function guard(node,id,type){
  if(!hasGuard(node,id)||node.elseStatement)fail('complete immediate same-Result failure guard required');const {left,right,operatorToken}=node.expression;
  if(left.expression.text!==id||!ts.isStringLiteral(right)||!(operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken&&right.text==='Err'||operatorToken.kind===ts.SyntaxKind.ExclamationEqualsEqualsToken&&right.text==='Ok'))fail('actual same-Result error tag required');
  const rows=ts.isBlock(node.thenStatement)?node.thenStatement.statements:[node.thenStatement],last=rows.at(-1),saved=new Map([...environment].map(([key,row])=>[key,{...row}])),cleanup=[];
  if(!last||!ts.isReturnStatement(last)||!ts.isIdentifier(last.expression)||last.expression.text!==id)fail('failure branch must return the whole original Result');
  for(const statement of rows.slice(0,-1)){if(!ts.isExpressionStatement(statement))fail('explicit resource release required before error return');const value=call(statement.expression);if(!value.release)fail('only actual resource release may precede error return');cleanup.push(value);}
  finish();environment.clear();for(const [key,row]of saved)environment.set(key,row);failures.push(httpResourceResult(type).error);return cleanup;
 }
 for(let at=0;at<statements.length;at++){
  tick();const statement=statements[at];if(tail)fail('statement follows complete resource return');
  if(ts.isVariableStatement(statement)){
   if(statement.modifiers?.length||(statement.declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const||statement.declarationList.declarations.length!==1)fail('one immutable resource declaration required');const declaration=statement.declarationList.declarations[0];if(!declaration.initializer||declaration.type||declaration.exclamationToken)fail('inferred original resource local required');
   if(ts.isArrayBindingPattern(declaration.name)){
    const input=declaration.initializer;if(!ts.isPropertyAccessExpression(input)||input.name.text!=='field0'||!ts.isIdentifier(input.expression))fail('original guarded channel pair split required');const row=binding(input.expression.text);if(row.type!=='result:channel-pair'||!row.guarded||row.used||declaration.name.elements.length!==2)fail('one complete guarded channel pair required');row.used=true;row.moved=true;
    const names=declaration.name.elements.map((element,index)=>{if(!ts.isBindingElement(element)||element.dotDotDotToken||element.propertyName||element.initializer||!ts.isIdentifier(element.name))fail('exact complete channel destructuring required');const id=newName(element.name.text);environment.set(id,{type:index?'receiver-owned':'sender-owned',moved:false,disposed:false});return id;});steps.push({kind:'channel-split',from:input.expression.text,names});continue;
   }
   if(!ts.isIdentifier(declaration.name))fail('ordinary resource local required');const id=newName(declaration.name.text),value=expression(declaration.initializer),guarded=!!httpResourceResult(value.type)&&hasGuard(statements[at+1],id),cleanup=guarded?guard(statements[++at],id,value.type):[];
   environment.set(id,{type:value.type,guarded,moved:false,disposed:false,used:false,root:value.root??null});steps.push({kind:'let',name:id,value,guarded,cleanup});continue;
  }
  if(ts.isExpressionStatement(statement)){const value=call(statement.expression);if(httpResourceResult(value.type)||httpResourceOwned(value.type))fail('owned values and Results cannot be discarded');steps.push({kind:'effect',value});continue;}
  if(ts.isIfStatement(statement)){
   if(at!==statements.length-1||!ts.isBlock(statement.thenStatement)||!statement.elseStatement||!ts.isBlock(statement.elseStatement))fail('both complete terminal resource branches required');const test=condition(statement.expression),settings={lazy,allowColdTail,bindings:environment,moduleNames,budget,depth:depth+1},yes=checkHttpResourceCallerFlow(ts,statement.thenStatement.statements,[],imports,settings),no=checkHttpResourceCallerFlow(ts,statement.elseStatement.statements,[],imports,settings);if(yes.type!==no.type)fail('all resource branch return domains must agree');tail={kind:'branch',condition:test,yes,no};continue;
  }
  if(at!==statements.length-1||!ts.isReturnStatement(statement)||!statement.expression)fail('complete terminal resource return required');const value=expression(statement.expression,{coldTail:allowColdTail});finish();tail={kind:value.kind==='http-resource-call'?'operation':'value',value};
 }
 if(!tail)fail('every resource path must return');const type=tail.kind==='branch'?tail.yes.type:tail.value.type,result=httpResourceResult(type);if(failures.some(error=>result?.error!==error))fail('propagated error families must agree with the complete return Result');const returnRoots=tail.kind==='branch'?[...new Set([...tail.yes.returnRoots,...tail.no.returnRoots])]:tail.value.root?[tail.value.root]:[];for(const id of returnRoots){const row=environment.get(id);if(!row?.input||!['json-ref','str'].includes(row.type))fail('returned loan must retain a public immutable source input root');}return {steps,tail,type,lazy,captures:[],returnRoots};
}

function rustString(value){return '"'+[...value].map(character=>character==='"'?'\\"':character==='\\'?'\\\\':character==='\n'?'\\n':character==='\r'?'\\r':character==='\t'?'\\t':character==='\0'?'\\0':character.codePointAt(0)<32||character.codePointAt(0)===127?'\\u{'+character.codePointAt(0).toString(16)+'}':character).join('')+'"';}
export function emitHttpResourceCallerFlow(flow){
 function expression(value){
  if(value.kind==='variable'||value.kind==='payload')return value.name;
  if(value.kind==='result-variable')return value.guarded?'Ok('+value.name+')':value.name;
  if(value.kind==='temporary-json-borrow')return '&'+expression(value.value);
  if(value.kind==='borrow'){
   if(value.type==='str')return value.sourceType==='text-owned'?'&'+value.name:value.name;
   if(['receiver-mut','http-client-mut','http-stream-mut'].includes(value.type))return value.owned?'&mut '+value.name:'&mut *'+value.name;
   if(['http-client-mut','http-stream-mut'].includes(value.sourceType))return '&*'+value.name;
   return (value.owned?'&':'')+value.name;
  }
  if(value.kind==='integer')return value.value+'_u64';if(value.kind==='string')return rustString(value.value);if(value.kind==='boolean')return String(value.value);if(value.kind==='unit')return '()';if(value.kind==='empty-json-list')return '[]';
  if(value.kind==='not')return '(!'+expression(value.value)+')';if(value.kind==='and'||value.kind==='or')return '('+expression(value.left)+(value.kind==='and'?' && ':' || ')+expression(value.right)+')';
  if(value.kind==='http-resource-call'){
   const operation=httpResourceCallerContract(value.operation);if(!operation)fail('unregistered complete emission operation');
   if(operation.nativeForm)return operation.rustPath+'('+(operation.nativeForm==='null'?'null':operation.nativeForm==='array'?'[]':expression(value.args[0]))+')';
   return operation.rustPath+'('+value.args.map(expression).join(', ')+')'+(value.awaited?'.await':'');
  }
  fail('unproved complete HTTP resource emission node');
 }
 // Mutability follows actual exclusive uses throughout all child branches.
 const mutable=new Set();let cells=0;
 function collect(value,depth=0){if(++cells>100000||depth>160)fail('complete emission walk bound');if(!value||typeof value!=='object')return;if(value.kind==='borrow'&&value.owned&&['receiver-mut','http-client-mut','http-stream-mut'].includes(value.type))mutable.add(value.name);for(const child of Object.values(value))if(child&&typeof child==='object'){if(Array.isArray(child))for(const row of child)collect(row,depth+1);else collect(child,depth+1);}}
 collect(flow);
 const lines=flow.steps.map(row=>{
  if(row.kind==='channel-split')return 'let ('+row.names.map(id=>(mutable.has(id)?'mut ':'')+id).join(', ')+') = '+row.from+';';if(row.kind==='effect')return expression(row.value)+';';
  const cleanup=row.cleanup.map(value=>expression(value)+';').join(' '),value=expression(row.value);
  return 'let '+(mutable.has(row.name)?'mut ':'')+row.name+' = '+(row.guarded?(cleanup?'match '+value+' { Ok(__ro_http_value) => __ro_http_value, Err(__ro_http_error) => { '+cleanup+' return Err(__ro_http_error); } }':value+'?'):value)+';';
 });
 const tail=flow.tail;lines.push(tail.kind==='branch'?'if '+expression(tail.condition)+' { '+emitHttpResourceCallerFlow(tail.yes)+' } else { '+emitHttpResourceCallerFlow(tail.no)+' }':expression(tail.value));return lines.join('\n');
}
