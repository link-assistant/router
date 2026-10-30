// Source-local numeric observations only. Actual bindings, entry guards,
// operation contracts and whole body checks must still establish every use.
const fail=message=>{throw new TypeError('Resource original signed literal: '+message);};
export function httpResourceSignedLiteral(ts,node,wanted,tick){
 tick();let negative=false,value=node;
 if(ts.isPrefixUnaryExpression(value)&&value.operator===ts.SyntaxKind.MinusToken){negative=true;value=value.operand;}
 if(!ts.isBigIntLiteral(value)||!negative&&wanted!=='i64')return null;
 const raw=value.text.replace(/_/gu,'');if(!/^[0-9]+n$/u.test(raw))fail('actual decimal signed bigint literal required');const magnitude=BigInt(raw.slice(0,-1)),limit=negative?9223372036854775808n:9223372036854775807n;if(magnitude>limit)fail('actual signed literal exceeds the original i64 range');return {kind:'integer',value:(negative?-magnitude:magnitude).toString(),type:'i64'};
}
export function httpResourceNumericSourceHint(ts,node,{environment,imports,localFunctions,contract},depth=0){
 if(depth>160)fail('complete numeric source-hint grouping bound');if(ts.isParenthesizedExpression(node)||ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isSatisfiesExpression(node)||ts.isNonNullExpression(node))return httpResourceNumericSourceHint(ts,node.expression,{environment,imports,localFunctions,contract},depth+1);
 let type=null;if(ts.isIdentifier(node))type=environment.get(node.text)?.type;
 else if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(node.operand))type='i64';
 else if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)){const row=imports.has(node.expression.text)?contract(imports.get(node.expression.text)):localFunctions?.get(node.expression.text);type=row?.ret;}
 return ['u64','i64'].includes(type)?type:null;
}
