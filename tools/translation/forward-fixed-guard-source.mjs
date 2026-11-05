// Shared inverse source-prefix observations, never a guard or type issuer.
// The caller must freshly compile the original whole project and authenticate
// ml_fixed through its complete original emitter source on every operation.
export function countUnchangedForwardFixedParameterGuards(ts,{before,after,parameters,arithmetic}){
 const fail=message=>{throw new TypeError('Forward fixed guard source: '+message);};
 if(!before?.file||!after?.file||before.file.text!==before.source||after.file.text!==after.source||!ts.isBlock(before.expression)||!ts.isBlock(after.expression))fail('complete original and requested native function bodies required');
 const original=[...before.expression.statements],requested=[...after.expression.statements];let at=0;
 const range=statement=>{
  if(!ts.isExpressionStatement(statement)||!ts.isCallExpression(statement.expression))return null;const call=statement.expression;
  if(!ts.isIdentifier(call.expression)||call.expression.text!=='ml_fixed'||!arithmetic.names.has('ml_fixed')||call.arguments.length!==4||!ts.isIdentifier(call.arguments[0])||!parameters.has(call.arguments[0].text))return null;
  return call;
 };
 const unchanged=index=>{if(!requested[index]||original[index].getText(before.file)!==requested[index].getText(after.file))fail('original native parameter guards must remain exact');};
 const strict=statement=>{
  if(!ts.isIfStatement(statement)||statement.elseStatement)return null;const condition=statement.expression;
  if(!ts.isBinaryExpression(condition)||condition.operatorToken.kind!==ts.SyntaxKind.ExclamationEqualsEqualsToken||!ts.isTypeOfExpression(condition.left)||!ts.isIdentifier(condition.left.expression)||!parameters.has(condition.left.expression.text)||!ts.isStringLiteral(condition.right)||condition.right.text!=='bigint')return null;
  const body=ts.isBlock(statement.thenStatement)?statement.thenStatement.statements:[statement.thenStatement];if(body.length!==1||!ts.isThrowStatement(body[0]))return null;const error=body[0].expression;
  if(!error||!ts.isNewExpression(error)||!ts.isIdentifier(error.expression)||error.expression.text!=='TypeError'||error.typeArguments?.length||error.arguments?.length!==1||!ts.isStringLiteral(error.arguments[0])||error.arguments[0].text!=='argument outside supported Rust fixed-integer domain')return null;
  return condition.left.expression.text;
 };
 const guarded=new Set();
 while(at<original.length){
  if(at>128)fail('complete original fixed guard prefix bound');const parameter=strict(original[at]);
  if(parameter){
   const call=range(original[at+1]);if(!call||call.questionDotToken||call.typeArguments?.length||call.arguments.some(ts.isSpreadElement)||call.arguments[0].text!==parameter||guarded.has(parameter))fail('strict type check requires its adjacent complete original same-parameter range check');
   // The real source range must be one of the ten closed fixed widths. This
   // observes syntax only; freshly checked original signatures remain required.
   observeResourceIntegerGuardBounds(ts,call.arguments[1],call.arguments[2]);if(!ts.isStringLiteral(call.arguments[3])||!call.arguments[3].text||call.arguments[3].text.length>4096)fail('original bounded fixed-integer range error required');
   unchanged(at);unchanged(at+1);guarded.add(parameter);at+=2;continue;
  }
  // Preserve the historical call-only prefix domain and its exact source rule.
  if(!range(original[at]))break;unchanged(at);at++;
 }
 return at;
}
import {observeResourceIntegerGuardBounds} from './js-to-rust/http-resource-integer-domains.mjs';
