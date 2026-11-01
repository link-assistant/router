// Generated overflow metadata is a dependent source projection, never authority.
import {OPAQUE_BODY_OPERATIONS} from './opaque-body-arithmetic-origins-20261102.mjs';
import {overflowMessage} from './vendor/meta-language/translation/aborts.js';
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
