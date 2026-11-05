// Closed awaited resource flow. Syntax candidates receive complete fresh source
// checking in the caller adapter; this module issues no standalone source permit.
import {httpResourceCallerContract as actualHttpResourceContract,httpResourceCallerRustType as actualHttpResourceRustType,httpResourceOwned,httpResourceBorrowRole,httpResourceNeedsDisposal,httpResourceResult,httpResourceResultOwnsDisposal} from './http-resource-caller-contracts.mjs';
import {httpResourceOption} from './http-resource-options.mjs';
import {httpResourceValueRoots} from './http-resource-root-sets.mjs';
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
export function checkHttpResourceCallerFlow(ts,statements,parameters,imports,{lazy=false,allowColdTail=false,bindings=null,moduleNames=new Set(),budget={cells:0},depth=0,localFunctions=null,fragment=null}={}){
 if(depth>64||!statements.length&&!fragment||statements.length>4096)fail('bounded complete HTTP resource flow required');
 const environment=bindings?new Map([...bindings].map(([key,row])=>[key,{...row}])):new Map(parameters.map(row=>[row.name,{type:row.type,input:true,moved:false,disposed:false,root:row.type==='str'?row.name:null,roots:row.type==='str'?[row.name]:[]}])),steps=[],failures=[],alternatives=[],resourceExits=[],loopExits=[],functionReturns=[],scopeFallthroughs=[];let tail=null;
 const tick=()=>{if(++budget.cells>100000)fail('complete HTTP resource source-cell budget');};
 const binding=id=>{const row=environment.get(id);if(!row||row.moved||row.disposed)fail('unknown, moved or disposed actual HTTP binding: '+id);return row;};
 const newName=id=>{httpResourceCallerName(id);if(environment.has(id)||moduleNames.has(id))fail('unique actual resource local required');return id;};
 const isLoan=type=>['cancel-ref','sender-ref','receiver-mut','http-client-ref','http-client-mut','http-stream-ref','http-stream-mut','json-ref'].includes(type);
 function recordResourceExit(loopBoundary=false){const states=[];for(const [name,row]of environment)if(row.input&&['receiver-mut','http-client-mut','http-stream-mut'].includes(row.type)){tick();states.push({name,disposed:!!row.disposed});}(loopBoundary?loopExits:resourceExits).push(states);}
 function requireLocalCleanup(id,row){if(row.input||row.moved||row.disposed)return;if(httpResourceNeedsDisposal(row.type)||httpResourceResultOwnsDisposal(row.type)&&!row.used)fail('every local resource must be explicitly released or returned on this exit: '+id);}
 function finish(){for(const [id,row]of environment)requireLocalCleanup(id,row);recordResourceExit();}
 function requireLoopState(entry,actual){
  for(const [id,previous]of entry){tick();const row=actual.get(id);if(!row||row.type!==previous.type||!!row.input!==!!previous.input||!!row.mutable!==!!previous.mutable||!!row.moved!==!!previous.moved||!!row.disposed!==!!previous.disposed||!!row.used!==!!previous.used||!!row.guarded!==!!previous.guarded||httpResourceValueRoots(row).join('\0')!==httpResourceValueRoots(previous).join('\0'))fail('every loopback must preserve incoming ownership, resource and scalar type state: '+id);}
 }
 function snapshotIncoming(entry=environment){
  const states=[];for(const [id]of entry){tick();const row=environment.get(id);if(!row)fail('actual incoming lexical binding disappeared');states.push([id,{...row,roots:httpResourceValueRoots(row)}]);}return states;
 }
 function finishLoopExit(){
  const loop=fragment?.scopeOnly?fragment.nearestLoop:fragment;if(!loop)fail('actual nearest loop required');requireLoopState(loop.entry,environment);for(const [id,row]of environment)if(!loop.entry.has(id))requireLocalCleanup(id,row);recordResourceExit(true);
 }
 function finishFragment(){
  if(fragment.scopeOnly){for(const [id,row]of environment)if(!fragment.entry.has(id))requireLocalCleanup(id,row);scopeFallthroughs.push(snapshotIncoming(fragment.entry));return;}
  finishLoopExit();
 }
 function operand(node,wanted=null,{move=true}={}){
  tick();if(ts.isParenthesizedExpression(node))return operand(node.expression,wanted,{move});
  if(ts.isIdentifier(node)){
   const row=binding(node.text),result=httpResourceResult(row.type),option=httpResourceOption(row.type);
   if(wanted&&(isLoan(wanted)||wanted==='str')){
    const shared=wanted==='http-client-ref'&&row.type==='http-client-mut'||wanted==='http-stream-ref'&&row.type==='http-stream-mut';
    const exclusive=wanted==='http-client-mut'&&row.type==='http-client-owned'||wanted==='http-stream-mut'&&row.type==='http-stream-owned';
    if(httpResourceBorrowRole(row.type)!==wanted&&!shared&&!exclusive)fail('actual input loan role differs');
    return {kind:'borrow',name:node.text,type:wanted,sourceType:row.type,owned:httpResourceOwned(row.type),root:row.root??null,roots:httpResourceValueRoots(row)};
   }
   if(isLoan(row.type))fail('borrowed resources cannot be stored or escape this caller');
   if(option){if(row.used)fail('whole Option payload already consumed');if(move){row.used=true;row.moved=true;}return {kind:'optional-variable',name:node.text,type:row.type,guarded:!!row.guarded,root:row.root??null,roots:httpResourceValueRoots(row)};}
   if(result){if(row.used)fail('complete Result payload already consumed');if(move){row.used=true;row.moved=true;}return {kind:'result-variable',name:node.text,type:row.type,guarded:!!row.guarded,root:row.root??null,roots:httpResourceValueRoots(row)};}
   if(httpResourceOwned(row.type)&&move){if([...environment].some(([id,loan])=>id!==node.text&&!loan.moved&&!loan.disposed&&httpResourceValueRoots(loan).includes(node.text)))fail('owned value cannot move while an original borrowed view remains live');row.moved=true;}return {kind:'variable',name:node.text,type:row.type,root:row.root??null,roots:httpResourceValueRoots(row)};
  }
  if(ts.isPropertyAccessExpression(node)&&node.name.text==='field0'&&ts.isIdentifier(node.expression)){
   const row=binding(node.expression.text),result=httpResourceResult(row.type)??httpResourceOption(row.type);if(!result||!row.guarded||row.used||result.value==='channel-pair')fail('actual guarded complete payload required');
   if(httpResourceOwned(result.value)||httpResourceResult(result.value)){row.used=true;row.moved=true;}return {kind:'payload',name:node.expression.text,type:result.value,root:row.root??null,roots:httpResourceValueRoots(row)};
  }
  if(ts.isBigIntLiteral(node)){const raw=node.text.replace(/_/gu,'');if(!/^[0-9]+n$/u.test(raw)||BigInt(raw.slice(0,-1))>18446744073709551615n)fail('closed decimal u64 literal required');return {kind:'integer',value:BigInt(raw.slice(0,-1)).toString(),type:'u64'};}
  if(ts.isStringLiteral(node)){if(/\p{Surrogate}/u.test(node.text))fail('well-formed scalar text required');return {kind:'string',value:node.text,type:'str'};}
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'boolean',value:node.kind===ts.SyntaxKind.TrueKeyword,type:'bool'};
  if(node.kind===ts.SyntaxKind.NullKeyword)return {kind:'unit',type:'unit'};
  if(wanted==='empty-json-list'&&ts.isArrayLiteralExpression(node)&&node.elements.length===0)return {kind:'empty-json-list',type:'empty-json-list'};
  fail('actual checked HTTP resource or scalar operand required');
 }
 function call(node,{coldTail=false,level=depth}={}){
  tick();if(level>160)fail('complete nested resource operation depth bound');let awaited=ts.isAwaitExpression(node);if(awaited)node=node.expression;
  if(!ts.isCallExpression(node)||!ts.isIdentifier(node.expression)||node.typeArguments?.length||!imports.has(node.expression.text)&&!localFunctions?.has(node.expression.text))fail('one actual imported or checked local operation required');
  const operation=imports.has(node.expression.text)?httpResourceCallerContract(imports.get(node.expression.text)):localFunctions?.get(node.expression.text);if(!operation)fail('unregistered actual operation');if(operation.localRefusal)fail(operation.localRefusal);
  if(operation.args.includes('deferred-callback'))fail('generic deadline callbacks use the separate control lane; HTTP resources require closed settled operations');
  const implicitAwait=operation.async&&!awaited&&coldTail;if(Boolean(operation.async)!==Boolean(awaited||implicitAwait)||operation.async&&!lazy)fail('future must be immediately awaited inside a cold caller');
  if(node.arguments.length!==operation.args.length)fail('complete actual operation arity differs');const loans=new Map(),args=[];
  for(let index=0;index<operation.args.length;index++){
   const role=operation.args[index],argument=node.arguments[index];let value,candidate=argument,grouping=0;while(ts.isParenthesizedExpression(candidate)){if(++grouping>16)fail('bounded actual call argument grouping required');candidate=candidate.expression;}
   if(ts.isCallExpression(candidate)||ts.isAwaitExpression(candidate)||ts.isBinaryExpression(candidate)){
    value=expression(candidate,{level:level+1});if(role==='json-ref'&&value.type==='json')value={kind:'temporary-json-borrow',value,type:'json-ref'};
   }else value=operand(argument,role,{move:!isLoan(role)&&role!=='str'});
   if(value.type!==role)fail('actual complete operation argument domain differs');
   if(value.kind==='borrow'){
    const exclusive=['receiver-mut','http-client-mut','http-stream-mut'].includes(value.type),previous=loans.get(value.name);if(previous!==undefined&&(previous||exclusive))fail('competing simultaneous exclusive call loans');loans.set(value.name,exclusive);
   }
   args.push(value);
  }
  const returnedRoots=new Set();if(operation.borrowedResult){
   const indices=operation.rootArguments??[operation.rootArgument];for(const index of indices){
    const argument=args[index],actual=argument?.kind==='borrow'?environment.get(argument.name):null,roots=argument?httpResourceValueRoots(argument):[];
    if(roots.length)for(const root of roots)returnedRoots.add(root);
    else if(argument?.kind==='string')continue;
    else if(actual?.input&&actual.type==='json-ref'&&argument.type==='json-ref')returnedRoots.add(argument.name);
    else if(actual?.type==='text-owned'&&argument.type==='str')returnedRoots.add(argument.name);
    else fail('borrowed output must retain every actual string or public immutable JSON root');
   }
   for(const root of returnedRoots){const owner=environment.get(root);if(!owner||owner.moved||owner.disposed||!['str','text-owned','json-ref'].includes(owner.type))fail('actual borrowed output owner is unavailable');}
  }const roots=[...returnedRoots],root=roots[0]??null;
  httpResourceCallerRustType(operation.ret);const value={kind:'http-resource-call',operation:operation.javascriptName,args,type:operation.ret,awaited:Boolean(awaited||implicitAwait),implicitAwait,root,roots,local:!!operation.local};
  if(operation.release){if(args.length!==1||args[0].kind!=='borrow')fail('release must bind one actual resource');const row=binding(args[0].name);row.disposed=true;value.release=operation.release;}
  if(operation.releasedArguments?.length){for(const index of operation.releasedArguments){const argument=args[index];if(argument?.kind!=='borrow'||!['receiver-mut','http-client-mut','http-stream-mut'].includes(argument.type))fail('proven helper release must bind its actual exclusive resource input');binding(argument.name).disposed=true;}value.releasedArguments=[...operation.releasedArguments];if(operation.ret==='unit')value.release='local-proven-release';}
  return value;
 }
 function expression(node,flags={}){
  tick();const level=flags.level??depth;if(level>160)fail('complete scalar expression depth bound');if(ts.isParenthesizedExpression(node))return expression(node.expression,{...flags,level:level+1});
  if(ts.isCallExpression(node)||ts.isAwaitExpression(node))return call(node,flags);
  if(ts.isBinaryExpression(node)){
   const operators=new Map([[ts.SyntaxKind.EqualsEqualsEqualsToken,'=='],[ts.SyntaxKind.ExclamationEqualsEqualsToken,'!='],[ts.SyntaxKind.LessThanToken,'<'],[ts.SyntaxKind.LessThanEqualsToken,'<='],[ts.SyntaxKind.GreaterThanToken,'>'],[ts.SyntaxKind.GreaterThanEqualsToken,'>=']]),operator=operators.get(node.operatorToken.kind);
   if(operator){const left=expression(node.left,{level:level+1}),right=expression(node.right,{level:level+1});if(left.type!==right.type||left.type!=='u64'&&!(left.type==='bool'&&['==','!='].includes(operator)))fail('comparison needs actual matching u64 or Boolean domains');return {kind:'compare',operator,left,right,type:'bool'};}
  }
  return operand(node);
 }
 function condition(node,level=0){
  tick();if(level+depth>160)fail('Boolean resource condition depth budget');if(ts.isParenthesizedExpression(node))return condition(node.expression,level+1);
  if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.ExclamationToken)return {kind:'not',value:condition(node.operand,level+1),type:'bool'};
  if(ts.isBinaryExpression(node)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind)){
   const left=condition(node.left,level+1),entry=new Map([...environment].map(([id,row])=>[id,{...row,roots:httpResourceValueRoots(row)}])),right=condition(node.right,level+1);requireLoopState(entry,environment);return {kind:node.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken?'and':'or',left,right,type:'bool'};
  }
  const value=expression(node);if(value.type!=='bool')fail('primitive Boolean condition required');return value;
 }
 function branchStatements(node){
  tick();if(!node||ts.isEmptyStatement(node))return [];if(ts.isBlock(node))return node.statements;
  if(ts.isIfStatement(node)||ts.isReturnStatement(node)||ts.isBreakStatement(node)||ts.isContinueStatement(node)||ts.isExpressionStatement(node))return [node];fail('actual lexical branch block or portable statement required');
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
 function optionGuard(node,id,value){
  if(!hasGuard(node,id)||node.elseStatement)fail('complete immediate same-Option absent guard required');const {right,operatorToken}=node.expression;
  if(!ts.isStringLiteral(right)||!(operatorToken.kind===ts.SyntaxKind.EqualsEqualsEqualsToken&&right.text==='None'||operatorToken.kind===ts.SyntaxKind.ExclamationEqualsEqualsToken&&right.text==='Some'))fail('actual original absent Option tag required');
  const rows=ts.isBlock(node.thenStatement)?node.thenStatement.statements:[node.thenStatement],last=rows.at(-1);let fallback,pass=false;
  if(last&&ts.isReturnStatement(last)&&ts.isIdentifier(last.expression)&&last.expression.text===id){
   const saved=new Map([...environment].map(([key,row])=>[key,{...row}])),cleanup=[];
   for(const statement of rows.slice(0,-1)){if(!ts.isExpressionStatement(statement))fail('absent Option cleanup requires explicit releases');const effect=call(statement.expression);if(!effect.release)fail('only actual resource release may precede original None return');cleanup.push({kind:'effect',value:effect});}
   finish();environment.clear();for(const [key,row]of saved)environment.set(key,row);pass=cleanup.length===0;fallback={steps:cleanup,tail:{kind:'value',value:{kind:'option-none',type:value.type}},type:value.type,lazy,captures:[],returnRoots:[]};
  }else{fallback=checkHttpResourceCallerFlow(ts,rows,[],imports,{lazy,allowColdTail:false,bindings:environment,moduleNames,budget,depth:depth+1,localFunctions});resourceExits.push(...fallback.resourceExits);}
  alternatives.push({type:fallback.type,returnRoots:fallback.returnRoots});return {fallback,pass};
 }
 for(let at=0;at<statements.length;at++){
  tick();const statement=statements[at];if(tail)fail('statement follows complete resource return');
  if(ts.isVariableStatement(statement)){
   const declarationKind=statement.declarationList.flags&ts.NodeFlags.BlockScoped,mutable=declarationKind===ts.NodeFlags.Let;if(statement.modifiers?.length||![ts.NodeFlags.Const,ts.NodeFlags.Let].includes(declarationKind)||statement.declarationList.declarations.length!==1)fail('one actual const or scalar let declaration required');const declaration=statement.declarationList.declarations[0];if(!declaration.initializer||declaration.type||declaration.exclamationToken)fail('inferred original resource local required');
   if(ts.isArrayBindingPattern(declaration.name)){if(mutable)fail('mutable resource destructuring needs a separate ownership rule');
    const input=declaration.initializer;if(!ts.isPropertyAccessExpression(input)||input.name.text!=='field0'||!ts.isIdentifier(input.expression))fail('original guarded channel pair split required');const row=binding(input.expression.text);if(row.type!=='result:channel-pair'||!row.guarded||row.used||declaration.name.elements.length!==2)fail('one complete guarded channel pair required');row.used=true;row.moved=true;
    const names=declaration.name.elements.map((element,index)=>{if(!ts.isBindingElement(element)||element.dotDotDotToken||element.propertyName||element.initializer||!ts.isIdentifier(element.name))fail('exact complete channel destructuring required');const id=newName(element.name.text);environment.set(id,{type:index?'receiver-owned':'sender-owned',moved:false,disposed:false});return id;});steps.push({kind:'channel-split',from:input.expression.text,names});continue;
   }
   if(!ts.isIdentifier(declaration.name))fail('ordinary resource local required');const id=newName(declaration.name.text),value=expression(declaration.initializer),carrier=httpResourceResult(value.type)??httpResourceOption(value.type),guarded=!!carrier&&hasGuard(statements[at+1],id),isOption=!!httpResourceOption(value.type);let cleanup=[],option=null;if(guarded){const next=statements[++at];if(isOption)option=optionGuard(next,id,value);else cleanup=guard(next,id,value.type);}
   if(mutable&&!['bool','u64','text-owned'].includes(value.type))fail('mutable locals require actual Boolean, guarded u64 or owned String values');environment.set(id,{type:value.type,mutable,guarded,moved:false,disposed:false,used:false,root:value.root??null,roots:httpResourceValueRoots(value)});steps.push({kind:'let',name:id,value,mutable,guarded,cleanup,option});continue;
  }
  if(ts.isWhileStatement(statement)){
   if(!ts.isBlock(statement.statement))fail('complete original loop block required');const entry=new Map([...environment].map(([id,row])=>[id,{...row,roots:httpResourceValueRoots(row)}])),test=condition(statement.expression);requireLoopState(entry,environment);
   const body=checkHttpResourceCallerFlow(ts,statement.statement.statements,[],imports,{lazy,allowColdTail:false,bindings:environment,moduleNames,budget,depth:depth+1,localFunctions,fragment:{entry}});if(body.type!=='unit'||body.returnRoots.length)fail('complete loop control fragment required');resourceExits.push(...body.resourceExits);functionReturns.push(...body.functionReturns);failures.push(...body.propagatedErrors);steps.push({kind:'while',condition:test,body});continue;
  }
  if(ts.isExpressionStatement(statement)&&ts.isBinaryExpression(statement.expression)&&statement.expression.operatorToken.kind===ts.SyntaxKind.EqualsToken){
   const assignment=statement.expression;if(!ts.isIdentifier(assignment.left))fail('assignment needs one actual scalar local');const id=assignment.left.text,row=environment.get(id);if(!row||!row.mutable||row.input||row.disposed||!['bool','u64','text-owned'].includes(row.type))fail('assignment requires an actual mutable scalar or owned String local');if(row.type==='text-owned'&&[...environment].some(([name,loan])=>name!==id&&!loan.moved&&!loan.disposed&&httpResourceValueRoots(loan).includes(id)))fail('owned String replacement cannot invalidate any live original view');const value=expression(assignment.right);if(value.type!==row.type||httpResourceValueRoots(value).length)fail('assignment must preserve its complete scalar or owned String domain');row.moved=false;row.used=false;row.root=null;row.roots=[];steps.push({kind:'assign',name:id,value});continue;
  }
  if(ts.isExpressionStatement(statement)){const value=call(statement.expression);if(httpResourceResult(value.type)||httpResourceOwned(value.type))fail('owned values and Results cannot be discarded');steps.push({kind:'effect',value});continue;}
  if(ts.isIfStatement(statement)){
   const remaining=statements.slice(at+1),yesSource=branchStatements(statement.thenStatement),noSource=branchStatements(statement.elseStatement),test=condition(statement.expression);
   if(remaining.length){
    const entry=new Map(snapshotIncoming()),nearestLoop=fragment?.scopeOnly?fragment.nearestLoop:fragment,settings={lazy,allowColdTail:false,bindings:environment,moduleNames,budget,depth:depth+1,localFunctions,fragment:{entry,scopeOnly:true,nearestLoop}},yes=checkHttpResourceCallerFlow(ts,yesSource,[],imports,settings),no=checkHttpResourceCallerFlow(ts,noSource,[],imports,settings),continuations=[...yes.scopeFallthroughs,...no.scopeFallthroughs];
    if(!continuations.length)fail('source after two complete abrupt branches is unreachable');const joined=new Map(continuations[0]);for(const states of continuations)requireLoopState(joined,new Map(states));environment.clear();for(const [id,row]of joined)environment.set(id,{...row,roots:httpResourceValueRoots(row)});
    resourceExits.push(...yes.resourceExits,...no.resourceExits);loopExits.push(...yes.loopExits,...no.loopExits);functionReturns.push(...yes.functionReturns,...no.functionReturns);failures.push(...yes.propagatedErrors,...no.propagatedErrors);steps.push({kind:'scoped-if',condition:test,yes,no});continue;
   }
   if(!statement.elseStatement&&!fragment)fail('every complete function branch needs its return continuation');const settings={lazy,allowColdTail,bindings:environment,moduleNames,budget,depth:depth+1,localFunctions,fragment},yes=checkHttpResourceCallerFlow(ts,yesSource,[],imports,settings),no=checkHttpResourceCallerFlow(ts,noSource,[],imports,settings);if(yes.type!==no.type)fail('all resource branch return domains must agree');resourceExits.push(...yes.resourceExits,...no.resourceExits);loopExits.push(...yes.loopExits,...no.loopExits);scopeFallthroughs.push(...yes.scopeFallthroughs,...no.scopeFallthroughs);functionReturns.push(...yes.functionReturns,...no.functionReturns);failures.push(...yes.propagatedErrors,...no.propagatedErrors);tail={kind:'branch',condition:test,yes,no};break;
  }
  if(ts.isBreakStatement(statement)||ts.isContinueStatement(statement)){
   if(!(fragment?.scopeOnly?fragment.nearestLoop:fragment)||statement.label||at!==statements.length-1)fail('complete unlabelled nearest-loop exit required');finishLoopExit();tail={kind:ts.isBreakStatement(statement)?'break':'continue'};continue;
  }
  if(at!==statements.length-1||!ts.isReturnStatement(statement)||!statement.expression)fail('complete terminal resource return required');const value=expression(statement.expression,{coldTail:allowColdTail});finish();functionReturns.push({type:value.type,returnRoots:httpResourceValueRoots(value)});tail={kind:fragment?'return':value.kind==='http-resource-call'?'operation':'value',value};
 }
 if(!tail&&fragment){finishFragment();tail={kind:'fallthrough'};}if(!tail)fail('every resource path must return');
 const type=fragment?'unit':tail.kind==='branch'?tail.yes.type:tail.value.type,result=httpResourceResult(type);functionReturns.push(...alternatives);
 if(!fragment&&failures.some(error=>result?.error!==error))fail('propagated error families must agree with the complete return Result');
 if(!fragment&&functionReturns.some(row=>row.type!==type))fail('every actual function return including loop and Option exits must share its complete domain');
 const actualRoots=[...new Set(functionReturns.flatMap(row=>row.returnRoots))];for(const id of actualRoots){const row=environment.get(id);if(!row?.input||!['json-ref','str'].includes(row.type))fail('returned loan must retain a public immutable source input root');}
 if(!resourceExits.length&&!loopExits.length&&!scopeFallthroughs.length)fail('every complete resource flow needs its actual exit states');return {steps,tail,type,lazy,captures:[],returnRoots:fragment?[]:actualRoots,resourceExits,loopExits,scopeFallthroughs,functionReturns,propagatedErrors:[...new Set(failures)],loopFragment:!!fragment};
}

function rustString(value){return '"'+[...value].map(character=>character==='"'?'\\"':character==='\\'?'\\\\':character==='\n'?'\\n':character==='\r'?'\\r':character==='\t'?'\\t':character==='\0'?'\\0':character.codePointAt(0)<32||character.codePointAt(0)===127?'\\u{'+character.codePointAt(0).toString(16)+'}':character).join('')+'"';}
export function emitHttpResourceCallerFlow(flow,{localFunctions=null}={}){
 function expression(value){
  if(value.kind==='variable'||value.kind==='payload')return value.name;
  if(value.kind==='option-none')return 'None';if(value.kind==='optional-variable')return value.guarded?'Some('+value.name+')':value.name;
  if(value.kind==='result-variable')return value.guarded?'Ok('+value.name+')':value.name;
  if(value.kind==='temporary-json-borrow')return '&'+expression(value.value);
  if(value.kind==='borrow'){
   if(value.type==='str')return value.sourceType==='text-owned'?'&'+value.name:value.name;
   if(['receiver-mut','http-client-mut','http-stream-mut'].includes(value.type))return value.owned?'&mut '+value.name:'&mut *'+value.name;
   if(['http-client-mut','http-stream-mut'].includes(value.sourceType))return '&*'+value.name;
   return (value.owned?'&':'')+value.name;
  }
  if(value.kind==='integer')return value.value+'_u64';if(value.kind==='string')return rustString(value.value);if(value.kind==='boolean')return String(value.value);if(value.kind==='unit')return '()';if(value.kind==='empty-json-list')return '[]';
  if(value.kind==='compare')return '('+expression(value.left)+' '+value.operator+' '+expression(value.right)+')';
  if(value.kind==='not')return '(!'+expression(value.value)+')';if(value.kind==='and'||value.kind==='or')return '('+expression(value.left)+(value.kind==='and'?' && ':' || ')+expression(value.right)+')';
  if(value.kind==='http-resource-call'){
   const operation=value.local?localFunctions?.get(value.operation):httpResourceCallerContract(value.operation);if(!operation)fail('unregistered complete emission operation');
   if(operation.nativeForm)return operation.rustPath+'('+(operation.nativeForm==='null'?'null':operation.nativeForm==='array'?'[]':expression(value.args[0]))+')';
   return operation.rustPath+'('+value.args.map(expression).join(', ')+')'+(value.awaited?'.await':'');
  }
  fail('unproved complete HTTP resource emission node');
 }
 // Mutability follows actual exclusive uses throughout all child branches.
 const declared=new Set(flow.steps.flatMap(row=>row.kind==='let'?[row.name]:row.kind==='channel-split'?row.names:[])),mutable=new Set();let cells=0;
 function collect(value,depth=0,hidden=new Set()){
  if(++cells>100000||depth>160)fail('complete emission walk bound');if(!value||typeof value!=='object')return;
  if(value!==flow&&Array.isArray(value.steps)&&value.tail){hidden=new Set(hidden);for(const step of value.steps)if(step.kind==='let')hidden.add(step.name);else if(step.kind==='channel-split')for(const name of step.names)hidden.add(name);}
  if(value.kind==='assign'&&declared.has(value.name)&&!hidden.has(value.name))mutable.add(value.name);if(value.kind==='borrow'&&declared.has(value.name)&&!hidden.has(value.name)&&value.owned&&['receiver-mut','http-client-mut','http-stream-mut'].includes(value.type))mutable.add(value.name);
  for(const [key,child]of Object.entries(value)){if(['resourceExits','loopExits','scopeFallthroughs','functionReturns','propagatedErrors'].includes(key))continue;if(child&&typeof child==='object'){if(Array.isArray(child))for(const row of child)collect(row,depth+1,hidden);else collect(child,depth+1,hidden);}}
 }
 collect(flow);
 const lines=flow.steps.map(row=>{
  if(row.kind==='scoped-if')return 'if '+expression(row.condition)+' {\n'+emitHttpResourceCallerFlow(row.yes,{localFunctions})+'\n} else {\n'+emitHttpResourceCallerFlow(row.no,{localFunctions})+'\n}';
  if(row.kind==='assign')return row.name+' = '+expression(row.value)+';';if(row.kind==='while')return 'while '+expression(row.condition)+' {\n'+emitHttpResourceCallerFlow(row.body,{localFunctions})+'\n}';
  if(row.kind==='channel-split')return 'let ('+row.names.map(id=>(mutable.has(id)?'mut ':'')+id).join(', ')+') = '+row.from+';';if(row.kind==='effect')return expression(row.value)+';';
  const cleanup=row.cleanup.map(value=>expression(value)+';').join(' '),value=expression(row.value);
  if(row.option)return 'let '+(mutable.has(row.name)?'mut ':'')+row.name+' = '+(row.option.pass?value+'?':'match '+value+' { Some(__ro_http_some) => __ro_http_some, None => { return { '+emitHttpResourceCallerFlow(row.option.fallback,{localFunctions})+' }; } }')+';';
  return 'let '+(mutable.has(row.name)?'mut ':'')+row.name+' = '+(row.guarded?(cleanup?'match '+value+' { Ok(__ro_http_value) => __ro_http_value, Err(__ro_http_error) => { '+cleanup+' return Err(__ro_http_error); } }':value+'?'):value)+';';
 });
 const tail=flow.tail;if(tail.kind==='fallthrough')return lines.join('\n');if(['break','continue'].includes(tail.kind)){lines.push(tail.kind+';');return lines.join('\n');}if(tail.kind==='return'){lines.push('return '+expression(tail.value)+';');return lines.join('\n');}lines.push(tail.kind==='branch'?'if '+expression(tail.condition)+' { '+emitHttpResourceCallerFlow(tail.yes,{localFunctions})+' } else { '+emitHttpResourceCallerFlow(tail.no,{localFunctions})+' }':expression(tail.value));return lines.join('\n');
}
