// Source-local numeric observations only. Actual bindings, entry guards,
// operation contracts and whole body checks must still establish every use.
const fail=message=>{throw new TypeError('Resource original signed literal: '+message);};
export function httpResourceSignedLiteral(ts,node,wanted,tick){
 tick();let negative=false,value=node;if(ts.isPrefixUnaryExpression(value)&&value.operator===ts.SyntaxKind.MinusToken){negative=true;value=value.operand;}if(!ts.isBigIntLiteral(value)||!negative&&!resourceInteger(wanted))return null;const type=resourceInteger(wanted)?wanted:'i64',raw=value.text.replace(/_/gu,''),decimal=resourceIntegerLiteral(raw,negative,type);if(decimal===null)fail('actual literal exceeds its original fixed-width integer domain');return {kind:'integer',value:decimal,type};
}
export function httpResourceNumericSourceHint(ts,node,{environment,imports,localFunctions,contract,literalFallback=true},depth=0){
 if(depth>160)fail('complete numeric source-hint grouping bound');if(ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isSatisfiesExpression(node)||ts.isNonNullExpression(node))return httpResourceNumericSourceHint(ts,node.expression,{environment,imports,localFunctions,contract,literalFallback},depth+1);
 let type=null;if(ts.isIdentifier(node))type=environment.get(node.text)?.type;
 else if(literalFallback&&ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(node.operand))type='i64';
 else if(ts.isCallExpression(node)){const callee=selectHttpResourceCallableSource(ts,node.expression);if(callee&&ts.isIdentifier(callee)){const row=imports.has(callee.text)?contract(imports.get(callee.text)):localFunctions?.get(callee.text);type=row?.ret;}}
 return resourceInteger(type)?type:null;
}

import {selectHttpResourceCallableSource} from './http-resource-source-grouping.mjs';

import {resourceInteger,resourceIntegerLiteral} from './http-resource-integer-domains.mjs';
