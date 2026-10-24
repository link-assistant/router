// Candidate syntax is checked inside the original whole-function source issuer.
// This helper cannot issue executable IR independently of that fresh check.
export function checkOwnedCountedFor(statement,scope,helpers){
 const {ts,file,checker,paired,depth,loopDepth,expression,branchScope,bind,block,fail,ownedBase64Result}=helpers,list=statement.initializer;
 if(!list||!ts.isVariableDeclarationList(list)||(list.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Let||list.declarations.length!==1||!ts.isBlock(statement.statement))fail('counted for requires one fresh let and an ordinary block');
 const declaration=list.declarations[0],condition=statement.condition,increment=statement.incrementor;
 if(!ts.isIdentifier(declaration.name)||!declaration.initializer||declaration.type||declaration.exclamationToken||scope.has(declaration.name.text)||!condition||!ts.isBinaryExpression(condition)||![ts.SyntaxKind.LessThanToken,ts.SyntaxKind.GreaterThanEqualsToken].includes(condition.operatorToken.kind))fail('counted for needs a fresh bounded index and exclusive ascending or inclusive descending comparison');
 const reverse=condition.operatorToken.kind===ts.SyntaxKind.GreaterThanEqualsToken;
 const symbol=checker.getSymbolAtLocation(declaration.name),index=node=>ts.isIdentifier(node)&&node.text===declaration.name.text&&checker.getSymbolAtLocation(node)===symbol,one=node=>Boolean(node)&&ts.isBigIntLiteral(node)&&node.getText(file)==='1n';
 if(!symbol||!index(condition.left)||!increment)fail('counted for condition needs its actual native index binding');
 const unary=(ts.isPrefixUnaryExpression(increment)||ts.isPostfixUnaryExpression(increment))&&increment.operator===(reverse?ts.SyntaxKind.MinusMinusToken:ts.SyntaxKind.PlusPlusToken)&&index(increment.operand),add=ts.isBinaryExpression(increment)&&index(increment.left)&&(increment.operatorToken.kind===(reverse?ts.SyntaxKind.MinusEqualsToken:ts.SyntaxKind.PlusEqualsToken)&&one(increment.right)||increment.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isBinaryExpression(increment.right)&&increment.right.operatorToken.kind===(reverse?ts.SyntaxKind.MinusToken:ts.SyntaxKind.PlusToken)&&index(increment.right.left)&&one(increment.right.right));
 if(!unary&&!add)fail('counted for progress must be the actual index plus/minus exactly one BigInt in its checked direction');
 if(paired){const matches=paired.evidence.locals.filter(row=>row.javascriptSpan[0]===declaration.getStart(file)&&row.javascriptSpan[1]===declaration.end);if(matches.length!==1||matches[0].typeSpan)fail('counted for paired binding requires its actual inferred declaration');}
 const immutable=value=>value.root===null&&['integer','variable'].includes(value.kind)&&(value.kind!=='variable'||scope.get(value.name)&&!scope.get(value.name).mutable);
 let end=expression(condition.right,scope,depth+1);if(!['usize','u64','i64'].includes(end.type)||!immutable(end))fail('counted for upper bound needs an actual immutable native integer or bounded literal');
 const start=expression(declaration.initializer,scope,depth+1,false,end.type);if(start.type!==end.type&&end.kind==='integer'&&end.type==='usize'&&['u64','i64'].includes(start.type))end=expression(condition.right,scope,depth+1,false,start.type);if(start.type!==end.type||!immutable(start))fail('counted for initial value must have the actual identical bounded integer domain');
 const local=branchScope(scope);for(const [name,value]of local){if(ownedBase64Result(value.type))local.delete(name);else if(value.mutable)local.set(name,{...value,variant:undefined,some:undefined});}
 const name=bind(declaration.name,{type:end.type,root:null,input:false},local),checked=block(statement.statement.statements,local,depth+1,loopDepth+1);
 // The body cannot write the induction binding. Native ranges preserve the
 // step after continue and stop on break. Descending inclusive iteration only
 // exposes in-domain Items; its discarded JS successor below the minimum
 // cannot escape the fresh index scope or become a checked body value.
 return {statement:reverse?{kind:'for-range',name,start:end,end:start,inclusive:true,reverse:true,body:checked.body}:{kind:'for-range',name,start,end,body:checked.body},scope:local};
}
