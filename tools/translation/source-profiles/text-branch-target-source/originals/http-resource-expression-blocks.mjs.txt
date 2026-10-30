// Zero-argument original source invocation observations only. Actual lexical
// captures, complete body exits/types and source associations check separately.
const fail=reason=>{throw new TypeError('Original expression block source: '+reason);};
export function observeHttpResourceExpressionBlock(ts,node,{sourceFile,tick}){
 if(!ts.isCallExpression(node))return null;let callee=node.expression,groups=0;while(ts.isParenthesizedExpression(callee)){tick();if(++groups>16)fail('complete original expression block grouping bound');callee=callee.expression;}if(!ts.isArrowFunction(callee))return null;tick();
 if(!sourceFile||node.getSourceFile()!==sourceFile||callee.getSourceFile()!==sourceFile||node.questionDotToken||node.typeArguments?.length||node.arguments.length||callee.modifiers?.length||callee.typeParameters?.length||callee.parameters.length)fail('one complete synchronous zero-argument original arrow invocation required');
 return {arrow:callee,body:callee.body,block:ts.isBlock(callee.body),sourceAuthority:false,semanticAuthority:false};
}
