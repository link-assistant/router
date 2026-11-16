// Generated overflow metadata is a dependent source projection, never authority.
import {OPAQUE_BODY_OPERATIONS} from './opaque-body-numeric-origins-20261102.mjs';
import {overflowMessage,zeroDivisorMessage} from './vendor/meta-language/translation/aborts.js';
/** Call-shape candidates only. The fixed inverse must still join actual checked
 * original body origins and exactly reproduce the entire independently emitted
 * target. Do not use helper spelling or this DATA as source/type permission.
 */
export function opaqueCheckedArithmeticCallParts(ts,node,source){
 if(!ts.isCallExpression(node)||!ts.isIdentifier(node.expression)||node.expression.text!=='ml_fixed'||node.arguments.length!==4)return null;
 let expression=node.arguments[0],wrappers=0;while(ts.isParenthesizedExpression(expression)&&wrappers++<16)expression=expression.expression;if(!ts.isBinaryExpression(expression)||!ts.isStringLiteral(node.arguments[3]))return null;
 const operator=expression.operatorToken,spelling=source.slice(operator.getStart(),operator.end),operation=OPAQUE_BODY_OPERATIONS.find(row=>row.kind==='arithmetic'&&row.target===spelling),message=node.arguments[3],messageOperation=OPAQUE_BODY_OPERATIONS.find(row=>row.kind==='arithmetic'&&overflowMessage(row.op)===message.text);
 if(!operation||!messageOperation)return null;return {operator,message,operation,messageOperation,sourceAuthority:false,semanticAuthority:false};
}
export function opaqueArithmeticOverflowText(symbol){const operation=OPAQUE_BODY_OPERATIONS.find(row=>row.kind==='arithmetic'&&row.target===symbol);if(!operation)throw TypeError('one supported checked arithmetic symbol required');return overflowMessage(operation.op);}

export function opaqueCheckedDivisionCallParts(ts,node,source){
 if(!ts.isCallExpression(node)||!ts.isIdentifier(node.expression)||node.expression.text!=='ml_divide'||node.arguments.length!==6)return null;
 const rounding=node.arguments[2],zero=node.arguments[3],marker=node.arguments[4],bounds=node.arguments[5];if(!ts.isStringLiteral(rounding)||rounding.text!=='trunc'||!ts.isStringLiteral(zero)||![ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(marker.kind)||!ts.isArrayLiteralExpression(bounds)||bounds.elements.length!==3||!ts.isStringLiteral(bounds.elements[2]))return null;
 const overflow=bounds.elements[2],operation=OPAQUE_BODY_OPERATIONS.find(row=>row.kind==='division'&&row.op===(marker.kind===ts.SyntaxKind.TrueKeyword?'rem':'div')),zeroOperation=OPAQUE_BODY_OPERATIONS.find(row=>row.kind==='division'&&zeroDivisorMessage(row.op,{kind:'fixed'})===zero.text),overflowOperation=OPAQUE_BODY_OPERATIONS.find(row=>row.kind==='division'&&overflowMessage(row.op)===overflow.text);
 if(!operation||!zeroOperation||!overflowOperation)return null;return {operation,cells:[{node:marker,kind:'division-marker',operation},{node:zero,kind:'division-zero-message',operation:zeroOperation},{node:overflow,kind:'division-overflow-message',operation:overflowOperation}],sourceAuthority:false,semanticAuthority:false};
}
export function opaqueDivisionProjectionText(symbol){const operation=OPAQUE_BODY_OPERATIONS.find(row=>row.kind==='division'&&row.target===symbol);if(!operation)throw TypeError('one checked division/remainder symbol required');return {marker:operation.op==='rem',zero:zeroDivisorMessage(operation.op,{kind:'fixed'}),overflow:overflowMessage(operation.op),sourceAuthority:false,semanticAuthority:false};}
export function opaqueNumericOriginKind(kind){return kind==='arithmetic-message'?'arithmetic':['division-marker','division-zero-message','division-overflow-message'].includes(kind)?'division':kind;}
