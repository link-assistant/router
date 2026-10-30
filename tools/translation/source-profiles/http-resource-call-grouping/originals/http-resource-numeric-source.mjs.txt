// Actual original guard syntax can establish a u64 entry domain. A written
// bigint type or copied guard record alone supplies no numeric permission.
const fail=message=>{throw new TypeError('Async control u64 guard: '+message);};
export const CONTROL_U64_GUARD_MESSAGE='Control u64 input outside native range';
function unparenthesized(ts,node){let depth=0;while(ts.isParenthesizedExpression(node)){if(++depth>16)fail('guard grouping bound');node=node.expression;}return node;}
function originalGuards(ts,statements,file,parameters,parameterType=null){
 const records=[],names=new Set();let at=0;
 for(;at<statements.length;at++){
  const statement=statements[at],container=observeHttpResourceNumericContainerGuard(ts,statement,file,parameters,parameterType);if(container){if(names.has(container.name))fail('one complete original numeric parameter guard required');records.push(container);names.add(container.name);continue;}if(!ts.isIfStatement(statement)||statement.elseStatement)break;
  const condition=unparenthesized(ts,statement.expression);if(!ts.isBinaryExpression(condition)||condition.operatorToken.kind!==ts.SyntaxKind.BarBarToken)break;
  const right=unparenthesized(ts,condition.right),left=unparenthesized(ts,condition.left);if(!ts.isBinaryExpression(left)||left.operatorToken.kind!==ts.SyntaxKind.BarBarToken)break;
  const primitive=unparenthesized(ts,left.left),lower=unparenthesized(ts,left.right),upper=right;
  if(!ts.isBinaryExpression(primitive)||primitive.operatorToken.kind!==ts.SyntaxKind.ExclamationEqualsEqualsToken||!ts.isTypeOfExpression(primitive.left)||!ts.isIdentifier(primitive.left.expression)||!ts.isStringLiteral(primitive.right)||primitive.right.text!=='bigint')break;
  const name=primitive.left.expression.text;
  const signed=ts.isBinaryExpression(lower)&&ts.isPrefixUnaryExpression(lower.right)&&lower.right.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(lower.right.operand)&&lower.right.operand.text==='9223372036854775808n',type=signed?'i64':'u64',minimum=signed?'-9223372036854775808':'0',maximum=signed?'9223372036854775807':'18446744073709551615';
  if(!parameters.has(name)||names.has(name)||!ts.isBinaryExpression(lower)||lower.operatorToken.kind!==ts.SyntaxKind.LessThanToken||!ts.isIdentifier(lower.left)||lower.left.text!==name||(!signed&&(!ts.isBigIntLiteral(lower.right)||lower.right.text!=='0n'))||!ts.isBinaryExpression(upper)||upper.operatorToken.kind!==ts.SyntaxKind.GreaterThanToken||!ts.isIdentifier(upper.left)||upper.left.text!==name||!ts.isBigIntLiteral(upper.right)||upper.right.text!==maximum+'n')fail('complete actual same-parameter native integer range condition required');
  const body=ts.isBlock(statement.thenStatement)?statement.thenStatement.statements:[statement.thenStatement];if(body.length!==1||!ts.isThrowStatement(body[0]))fail('one complete invalid-domain throw required');const error=body[0].expression;
  if(!ts.isNewExpression(error)||!ts.isIdentifier(error.expression)||error.expression.text!=='RangeError'||error.typeArguments?.length||error.arguments?.length!==1||!ts.isStringLiteral(error.arguments[0])||error.arguments[0].text!==(type==='i64'?RESOURCE_I64_GUARD_MESSAGE:CONTROL_U64_GUARD_MESSAGE))fail('complete canonical u64 domain error required');
  const span={start:statement.getStart(file),end:statement.end};records.push({name,type,span,source:file.text.slice(span.start,span.end),minimum,maximum,sourceAuthority:false,semanticAuthority:false});names.add(name);
 }
 return {statements:statements.slice(at),records};
}
export function selectHttpResourceNumericCallerBody(ts,item,imports,file,contract,{parameterType=null}={}){
 const parameters=new Set(item.parameters.filter(parameter=>ts.isIdentifier(parameter.name)).map(parameter=>parameter.name.text)),root=originalGuards(ts,item.body.statements,file,parameters,parameterType);let statements=root.statements,lazy=false,allowColdTail=false,records=root.records;
 if(statements.length===1&&ts.isReturnStatement(statements[0])&&ts.isCallExpression(statements[0].expression)&&ts.isIdentifier(statements[0].expression.expression)){
  const call=statements[0].expression,imported=imports.get(call.expression.text);
  if(imported==='deferFilesystemFlow'){
   const callback=call.arguments[0];if(call.arguments.length!==1||call.typeArguments?.length||!ts.isArrowFunction(callback)||callback.parameters.length||callback.type||callback.typeParameters?.length||callback.modifiers?.length!==1||callback.modifiers[0].kind!==ts.SyntaxKind.AsyncKeyword||!ts.isBlock(callback.body))fail('one closed original deferred async body required');const inner=originalGuards(ts,callback.body.statements,file,parameters,parameterType);statements=inner.statements;records=[...records,...inner.records];lazy=true;
  }else if(contract(imported)?.async){lazy=true;allowColdTail=true;}
 }
 if(new Set(records.map(row=>row.name)).size!==records.length)fail('one complete entry guard per numeric parameter');return {statements,lazy,allowColdTail,inputGuards:records};
}
export function emitHttpResourceNumericGuards(parameters){return parameters.map(({name,type})=>httpResourceNumericContainerGuardDomain(type)?emitHttpResourceNumericContainerGuard({name,type}):type==='i64'?'if (typeof '+name+' !== \"bigint\" || '+name+' < -9223372036854775808n || '+name+' > 9223372036854775807n) { throw new RangeError('+JSON.stringify(RESOURCE_I64_GUARD_MESSAGE)+'); }':'if (typeof '+name+' !== "bigint" || '+name+' < 0n || '+name+' > 18446744073709551615n) { throw new RangeError('+JSON.stringify(CONTROL_U64_GUARD_MESSAGE)+'); }').join('\n');}

export const RESOURCE_I64_GUARD_MESSAGE='Resource i64 input outside native range';

import {observeHttpResourceNumericContainerGuard,emitHttpResourceNumericContainerGuard,httpResourceNumericContainerGuardDomain} from './http-resource-container-guards.mjs';
