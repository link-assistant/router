// Closed awaited resource flow. Syntax candidates receive complete fresh source
// checking in the caller adapter; this module issues no standalone source permit.
import {ASYNC_CONTROL_CONTRACTS} from '../async-control-contracts.mjs';
const fail=message=>{throw new TypeError('Async control caller: '+message);};
const roles=Object.freeze({'shared-cancellation':'cancel-ref','shared-sender':'sender-ref','exclusive-receiver':'receiver-mut'});
const outputs=Object.freeze({cancellation:'cancel-owned',sender:'sender-owned','control-channel-result':'result:channel-pair','control-unit-result':'result:unit','control-optional-text-result':'result:option-text'});
const owned=type=>['cancel-owned','sender-owned','receiver-owned'].includes(type);
const receiver=type=>['receiver-owned','receiver-mut'].includes(type);
const borrowRole=type=>type==='cancel-owned'?'cancel-ref':type==='sender-owned'?'sender-ref':type==='receiver-owned'?'receiver-mut':type;
const reserved=new Set('as async await break const continue crate default do dyn else enum export extern false fn for function if impl import in let loop match mod move mut new null pub ref return self static struct super switch this throw trait true try type typeof undefined unsafe use var void where while with yield abstract become box final gen macro override priv unsized virtual std tokio Parameters ReturnType Promise String Result Option Self'.split(' '));
export function asyncControlCallerName(value){if(typeof value!=='string'||value==='_'||!/^[_a-zA-Z][_a-zA-Z0-9]*$/u.test(value)||value.startsWith('__ro')||reserved.has(value))fail('ordinary portable unshadowed control name required');return value;}
export function asyncControlCallerContract(name){const row=ASYNC_CONTROL_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name);return row?{...row,args:row.parameters.map(role=>roles[role]??role),ret:outputs[row.returns]??row.returns}:null;}
export function asyncControlCallerRustType(type,depth=0){
 if(depth>8)fail('closed result nesting budget');if(type.startsWith('result:'))return 'Result<'+asyncControlCallerRustType(type.slice(7),depth+1)+', crate::translation_async_control_core::ControlError>';
 const table={'cancel-owned':'crate::translation_async_control_core::Cancellation','cancel-ref':'&crate::translation_async_control_core::Cancellation','sender-owned':'crate::translation_async_control_core::Sender','sender-ref':'&crate::translation_async_control_core::Sender','receiver-owned':'crate::translation_async_control_core::Receiver','receiver-mut':'&mut crate::translation_async_control_core::Receiver','channel-pair':'(crate::translation_async_control_core::Sender, crate::translation_async_control_core::Receiver)','option-text':'Option<String>',unit:'()',bool:'bool',str:'&str',u64:'u64'};
 if(!Object.hasOwn(table,type))fail('unsupported original control result domain');return table[type];
}
export function checkAsyncControlCallerFlow(ts,statements,parameters,imports,{lazy=false,allowColdTail=false,bindings=null,moduleNames=new Set(),budget={cells:0},depth=0,tailOnly=false,childCancellation=null}={}){
 if(depth>64||!statements.length||statements.length>4096)fail('bounded complete resource flow required');
 const environment=bindings?new Map([...bindings].map(([key,row])=>[key,{...row}])):new Map(parameters.map(row=>[row.name,{type:row.type,input:true,moved:false,disposed:false}])),steps=[],captures=new Map();let tail=null,hadFailureReturn=false;
 const comparisonOperations=new Map([[ts.SyntaxKind.EqualsEqualsEqualsToken,'==='],[ts.SyntaxKind.ExclamationEqualsEqualsToken,'!=='],[ts.SyntaxKind.LessThanToken,'<'],[ts.SyntaxKind.LessThanEqualsToken,'<='],[ts.SyntaxKind.GreaterThanToken,'>'],[ts.SyntaxKind.GreaterThanEqualsToken,'>=']]);
 const tick=()=>{if(++budget.cells>100000)fail('complete resource flow source-cell budget');};
 const binding=name=>{const row=environment.get(name);if(!row||row.moved)fail('unknown or moved actual control binding: '+name);if(row.capture)captures.set(name,{name,type:row.captureType});return row;};
 const newName=value=>{asyncControlCallerName(value);if(environment.has(value)||moduleNames.has(value))fail('ordinary unique resource local required');return value;};
 const resultPayload=type=>type.startsWith('result:')?type.slice(7):null;
 function finish(){for(const [name,row]of environment){if(row.input||row.capture||row.moved)continue;if(row.type==='receiver-owned'&&!row.disposed)fail('every local owned receiver must be explicitly disposed or returned: '+name);if(row.type==='result:channel-pair'&&!row.used)fail('guarded channel resources must be moved or explicitly disposed');}}
 function operand(node,wanted=null,{move=true}={}){
  tick();if(ts.isParenthesizedExpression(node))return operand(node.expression,wanted,{move});
  if(ts.isIdentifier(node)){
   const row=binding(node.text);if(wanted&&['cancel-ref','sender-ref','receiver-mut'].includes(wanted)){if(borrowRole(row.type)!==wanted)fail('actual opaque operand role differs');return {kind:'borrow',name:node.text,type:wanted,owned:owned(row.type)};}
   if(['cancel-ref','sender-ref','receiver-mut'].includes(row.type))fail('borrowed control operands cannot be stored or returned');
   if(owned(row.type)&&move)row.moved=true;
   if(resultPayload(row.type)){if(row.used)fail('guarded control payload is used more than once');if(move)row.used=true;return {kind:'result-variable',name:node.text,type:row.type};}
   return {kind:'variable',name:node.text,type:row.type};
  }
  if(ts.isBigIntLiteral(node)){const raw=node.text.replace(/_/gu,'');if(!/^[0-9]+n$/u.test(raw))fail('decimal closed unsigned literal required');const value=BigInt(raw.slice(0,-1));if(value>18446744073709551615n)fail('u64 literal overflow');return {kind:'integer',value:value.toString(),type:'u64'};}
  if(ts.isStringLiteral(node)){if(/\p{Surrogate}/u.test(node.text))fail('well-formed scalar text required');return {kind:'string',value:node.text,type:'str'};}
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'boolean',value:node.kind===ts.SyntaxKind.TrueKeyword,type:'bool'};
  if(node.kind===ts.SyntaxKind.NullKeyword)return {kind:'unit',type:'unit'};
  if(ts.isPropertyAccessExpression(node)&&node.name.text==='field0'&&ts.isIdentifier(node.expression)){
   const row=binding(node.expression.text),type=resultPayload(row.type);if(!type||row.used||['channel-pair'].includes(type))fail('one actual guarded scalar payload required');row.used=true;return {kind:'payload',name:node.expression.text,type};
  }
  fail('actual local resource or closed scalar operand required');
 }
 function callback(node,level){
  if(!ts.isArrowFunction(node)||node.type||node.typeParameters?.length||node.modifiers?.length!==1||node.modifiers[0].kind!==ts.SyntaxKind.AsyncKeyword||node.parameters.length!==1||!ts.isIdentifier(node.parameters[0].name)||node.parameters[0].type||node.parameters[0].initializer||node.parameters[0].dotDotDotToken||node.parameters[0].questionToken||!ts.isBlock(node.body))fail('one source-bound async deadline callback required');
  const child=newName(node.parameters[0].name.text),local=new Map();
  for(const [name,row]of environment)if(!row.moved&&!resultPayload(row.type))local.set(name,{...row,type:borrowRole(row.type),capture:true,captureType:row.type,input:false});
  local.set(child,{type:'cancel-owned',input:true,moved:false,disposed:false});
  const body=checkAsyncControlCallerFlow(ts,node.body.statements,[],imports,{lazy:true,allowColdTail:true,bindings:local,moduleNames,budget,depth:level+1,tailOnly:true,childCancellation:child});
  // A deadline may drop its native future immediately. Only a single tail
  // operation may survive the cancellation boundary; no post-await side effect.
  if(body.steps.length||body.tail.kind!=='operation'||!body.tail.value.awaited)fail('deadline callback requires one complete cancellable awaited tail operation');
  return {kind:'deadline-callback',child,body,captures:body.captures,type:'deferred-callback'};
 }
 function call(node,{coldTail=false,level=depth}={}){
  tick();let awaited=ts.isAwaitExpression(node);if(awaited)node=node.expression;
  if(!ts.isCallExpression(node)||!ts.isIdentifier(node.expression)||node.typeArguments?.length||!imports.has(node.expression.text))fail('one direct actual imported control operation required');
  const operation=asyncControlCallerContract(imports.get(node.expression.text));if(!operation)fail('unregistered control operation');
  const implicitAwait=operation.async&&!awaited&&coldTail;if(operation.async!==Boolean(awaited||implicitAwait)||operation.async&&!lazy)fail('future must be immediately awaited inside the cold flow');
  if(node.arguments.length!==operation.args.length)fail('actual control operation arity differs');const args=[];
  for(let index=0;index<operation.args.length;index++){const role=operation.args[index],argument=node.arguments[index];const value=role==='deferred-callback'?callback(argument,level):operand(argument,role,{move:false});if(role!=='deferred-callback'&&value.type!==role)fail('actual operation operand type differs');if(role==='deferred-callback')for(const captured of value.captures)binding(captured.name);args.push(value);}
  if(childCancellation&&operation.async){const index=operation.args.indexOf('cancel-ref');if(index<0||args[index]?.kind!=='borrow'||args[index].name!==childCancellation)fail('deadline tail operation must borrow its actual child cancellation');}
  const type=operation.rustName==='with_deadline'?'result:'+args.at(-1).body.type:operation.ret;asyncControlCallerRustType(type);
  const value={kind:'control-call',operation:operation.rustName,args,type,awaited:Boolean(awaited||implicitAwait),implicitAwait};
  if(operation.rustName==='dispose'){const row=environment.get(args[0].name);row.disposed=true;}
  return value;
 }
 function expression(node,flags={},level=0){tick();if(level+depth>160)fail('complete scalar expression depth budget');if(ts.isParenthesizedExpression(node))return expression(node.expression,flags,level+1);if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken||ts.isBinaryExpression(node)&&(comparisonOperations.has(node.operatorToken.kind)||[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind)))return condition(node,level);return ts.isCallExpression(node)||ts.isAwaitExpression(node)?call(node,flags):operand(node);}
 function condition(node,level=0){
  tick();if(level+depth>160)fail('Boolean control condition depth budget');if(ts.isParenthesizedExpression(node))return condition(node.expression,level+1);
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken)return {kind:'not',value:condition(node.operand,level+1),type:'bool'};
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind))return {kind:node.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken?'and':'or',left:condition(node.left,level+1),right:condition(node.right,level+1),type:'bool'};
  if(ts.isBinaryExpression(node)){
   const operation=comparisonOperations.get(node.operatorToken.kind);
   if(operation){const left=expression(node.left,{},level+1),right=expression(node.right,{},level+1);if(left.type!==right.type||!['u64','bool'].includes(left.type)||left.type==='bool'&&!['===','!=='].includes(operation))fail('control comparisons require exact guarded u64 or primitive Boolean equality operands');return {kind:'comparison',operation,left,right,type:'bool'};}
  }
  const value=expression(node);if(value.type!=='bool')fail('actual primitive Boolean branch condition required');return value;
 }
 function guard(node,id){
  hadFailureReturn=true;
  if(!node||!ts.isIfStatement(node)||node.elseStatement||!ts.isBinaryExpression(node.expression))fail('Result requires immediate complete failure propagation');const {left,right,operatorToken}=node.expression;
  if(!ts.isPropertyAccessExpression(left)||!ts.isIdentifier(left.expression)||left.expression.text!==id||left.name.text!=='$'||!ts.isStringLiteral(right)||!(operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken&&right.text==='Err'||operatorToken.kind===ts.SyntaxKind.ExclamationEqualsEqualsToken&&right.text==='Ok'))fail('failure guard must inspect the same actual control Result tag');
  const statements=ts.isBlock(node.thenStatement)?node.thenStatement.statements:[node.thenStatement],last=statements.at(-1),saved=new Map([...environment].map(([key,row])=>[key,{...row}])),cleanup=[];
  if(!last||!ts.isReturnStatement(last)||!ts.isIdentifier(last.expression)||last.expression.text!==id)fail('failure guard must return its whole original Result');
  for(const statement of statements.slice(0,-1)){if(!ts.isExpressionStatement(statement))fail('failure cleanup requires explicit disposal');const value=call(statement.expression);if(value.operation!=='dispose')fail('only exclusive disposal may precede the propagated error');cleanup.push(value);}
  finish();environment.clear();for(const [key,row]of saved)environment.set(key,row);return cleanup;
 }
 for(let at=0;at<statements.length;at++){
  tick();const statement=statements[at];if(tail)fail('statement follows complete control return');if(tailOnly&&statements.length!==1)fail('deadline callback cannot run post-await statements');
  if(ts.isVariableStatement(statement)){
   if(statement.modifiers?.length||(statement.declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const||statement.declarationList.declarations.length!==1)fail('one immutable control declaration required');const declaration=statement.declarationList.declarations[0];if(!declaration.initializer||declaration.type||declaration.exclamationToken)fail('inferred actual control local required');
   if(ts.isArrayBindingPattern(declaration.name)){
    const input=declaration.initializer;if(!ts.isPropertyAccessExpression(input)||input.name.text!=='field0'||!ts.isIdentifier(input.expression))fail('channel split requires the guarded original pair');const row=binding(input.expression.text);if(row.type!=='result:channel-pair'||row.used||declaration.name.elements.length!==2)fail('one complete owned channel pair required');row.used=true;
    const names=declaration.name.elements.map((element,index)=>{if(!ts.isBindingElement(element)||element.dotDotDotToken||element.propertyName||element.initializer||!ts.isIdentifier(element.name))fail('ordinary exact channel destructuring required');const name=newName(element.name.text);environment.set(name,{type:index?'receiver-owned':'sender-owned',moved:false,disposed:false});return name;});steps.push({kind:'channel-split',from:input.expression.text,names});continue;
   }
   if(!ts.isIdentifier(declaration.name))fail('ordinary named control local required');const id=newName(declaration.name.text),value=expression(declaration.initializer);let cleanup=[];
   if(resultPayload(value.type))cleanup=guard(statements[++at],id);
   environment.set(id,{type:value.type,moved:false,disposed:false,used:false});steps.push({kind:'let',name:id,value,cleanup});continue;
  }
  if(ts.isExpressionStatement(statement)){const value=call(statement.expression);if(resultPayload(value.type)||owned(value.type))fail('owned resources and Results cannot be discarded');steps.push({kind:'effect',value});continue;}
  if(ts.isIfStatement(statement)){
   if(at!==statements.length-1||!ts.isBlock(statement.thenStatement)||!statement.elseStatement||!ts.isBlock(statement.elseStatement))fail('both complete terminal control branches required');const test=condition(statement.expression),settings={lazy,allowColdTail,bindings:environment,moduleNames,budget,depth:depth+1,childCancellation},yes=checkAsyncControlCallerFlow(ts,statement.thenStatement.statements,[],imports,settings),no=checkAsyncControlCallerFlow(ts,statement.elseStatement.statements,[],imports,settings);if(yes.type!==no.type)fail('all control return domains must agree');for(const row of [...yes.captures,...no.captures])captures.set(row.name,row);tail={kind:'branch',condition:test,yes,no};continue;
  }
  if(at!==statements.length-1||!ts.isReturnStatement(statement)||!statement.expression)fail('complete terminal control return required');
  const value=expression(statement.expression,{coldTail:allowColdTail});if(tailOnly&&value.kind!=='control-call')fail('deadline tail must be a genuine operation');finish();tail={kind:value.kind==='control-call'?'operation':'value',value};
 }
 if(!tail)fail('every control path must return');const type=tail.kind==='branch'?tail.yes.type:tail.value.type;if(hadFailureReturn&&!type.startsWith('result:'))fail('propagated errors require the same complete Result return domain');return {steps,tail,type,lazy,captures:[...captures.values()]};
}

function rustString(value){return '"'+[...value].map(character=>character==='"'?'\\"':character==='\\'?'\\\\':character==='\n'?'\\n':character==='\r'?'\\r':character==='\t'?'\\t':character==='\0'?'\\0':character.codePointAt(0)<32||character.codePointAt(0)===127?'\\u{'+character.codePointAt(0).toString(16)+'}':character).join('')+'"';}
export function emitAsyncControlCallerFlow(flow,{rename=new Map(),state={sequence:0}}={}){
 const name=value=>rename.get(value)??value;
 function expression(value){
  if(value.kind==='variable'||value.kind==='payload')return name(value.name);
  if(value.kind==='result-variable')return 'Ok('+name(value.name)+')';
  if(value.kind==='borrow')return value.type==='receiver-mut'?(value.owned?'&mut '+name(value.name):'&mut *'+name(value.name)):(value.owned?'&':'')+name(value.name);
  if(value.kind==='integer')return value.value+'_u64';if(value.kind==='string')return rustString(value.value);if(value.kind==='boolean')return String(value.value);if(value.kind==='unit')return '()';
  if(value.kind==='comparison')return '('+expression(value.left)+' '+({'===':'==','!==':'!='}[value.operation]??value.operation)+' '+expression(value.right)+')';
  if(value.kind==='not')return '(!'+expression(value.value)+')';if(value.kind==='and'||value.kind==='or')return '('+expression(value.left)+(value.kind==='and'?' && ':' || ')+expression(value.right)+')';
  if(value.kind==='control-call'){
   const operation=asyncControlCallerContract(value.operation),callback=value.args.find(row=>row.kind==='deadline-callback'),prelude=[],localRename=new Map(rename);
   if(callback){for(const row of callback.captures){const local='__ro_control_capture_'+state.sequence++,original=name(row.name);prelude.push('let '+local+' = '+(row.type==='receiver-owned'?'&mut '+original:row.type==='receiver-mut'?'&mut *'+original:owned(row.type)?'&'+original:original)+';');localRename.set(row.name,local);}}
   const args=value.args.map(argument=>argument.kind==='deadline-callback'?'move |'+argument.child+'| async move { '+emitAsyncControlCallerFlow(argument.body,{rename:localRename,state})+' }':expression(argument));let result=operation.rustPath+'('+args.join(', ')+')'+(value.awaited?'.await':'');if(prelude.length)result='{ '+prelude.join(' ')+' '+result+' }';return result;
  }
  fail('unproved control emission node');
 }
 const lines=flow.steps.map(row=>{
  if(row.kind==='channel-split')return 'let ('+row.names[0]+', mut '+row.names[1]+') = '+name(row.from)+';';if(row.kind==='effect')return expression(row.value)+';';
  const result=row.value.type.startsWith('result:'),cleanup=row.cleanup.map(value=>expression(value)+';').join(' '),value=expression(row.value)+(result&&!cleanup?'?':'');
  return 'let '+(row.value.type==='receiver-owned'?'mut ':'')+row.name+' = '+(result&&cleanup?'match '+expression(row.value)+' { Ok(__ro_control_value) => __ro_control_value, Err(__ro_control_error) => { '+cleanup+' return Err(__ro_control_error); } }':value)+';';
 });
 const tail=flow.tail;lines.push(tail.kind==='branch'?'if '+expression(tail.condition)+' { '+emitAsyncControlCallerFlow(tail.yes,{rename,state})+' } else { '+emitAsyncControlCallerFlow(tail.no,{rename,state})+' }':expression(tail.value));return lines.join('\n');
}
