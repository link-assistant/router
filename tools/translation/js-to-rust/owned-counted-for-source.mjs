// Candidate syntax is checked inside the original whole-function source issuer.
// This helper cannot issue executable IR independently of that fresh check.
export function checkOwnedCountedFor(statement,scope,helpers){
 const {ts,file,checker,paired,depth,loopDepth,expression,branchScope,bind,block,fail,ownedBase64Result}=helpers,list=statement.initializer;
 if(!list||!ts.isVariableDeclarationList(list)||(list.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Let||list.declarations.length!==1||!ts.isBlock(statement.statement))fail('counted for requires one fresh let and an ordinary block');
 const declaration=list.declarations[0],condition=statement.condition,increment=statement.incrementor;
 if(!ts.isIdentifier(declaration.name)||!declaration.initializer||declaration.type||declaration.exclamationToken||scope.has(declaration.name.text)||!condition||!ts.isBinaryExpression(condition)||condition.operatorToken.kind!==ts.SyntaxKind.LessThanToken)fail('counted for needs a fresh bounded index and exclusive ascending comparison');
 const symbol=checker.getSymbolAtLocation(declaration.name),index=node=>ts.isIdentifier(node)&&node.text===declaration.name.text&&checker.getSymbolAtLocation(node)===symbol,one=node=>Boolean(node)&&ts.isBigIntLiteral(node)&&node.getText(file)==='1n';
 if(!symbol||!index(condition.left)||!increment)fail('counted for condition needs its actual native index binding');
 const unary=(ts.isPrefixUnaryExpression(increment)||ts.isPostfixUnaryExpression(increment))&&increment.operator===ts.SyntaxKind.PlusPlusToken&&index(increment.operand),add=ts.isBinaryExpression(increment)&&index(increment.left)&&(increment.operatorToken.kind===ts.SyntaxKind.PlusEqualsToken&&one(increment.right)||increment.operatorToken.kind===ts.SyntaxKind.EqualsToken&&ts.isBinaryExpression(increment.right)&&increment.right.operatorToken.kind===ts.SyntaxKind.PlusToken&&index(increment.right.left)&&one(increment.right.right));
 if(!unary&&!add)fail('counted for progress must be the actual index plus exactly one BigInt');
 if(paired){const matches=paired.evidence.locals.filter(row=>row.javascriptSpan[0]===declaration.getStart(file)&&row.javascriptSpan[1]===declaration.end);if(matches.length!==1||matches[0].typeSpan)fail('counted for paired binding requires its actual inferred declaration');}
 const immutable=value=>value.root===null&&['integer','variable'].includes(value.kind)&&(value.kind!=='variable'||scope.get(value.name)&&!scope.get(value.name).mutable);
 const end=expression(condition.right,scope,depth+1);if(!['usize','u64','i64'].includes(end.type)||!immutable(end))fail('counted for upper bound needs an actual immutable native integer or bounded literal');
 const start=expression(declaration.initializer,scope,depth+1,false,end.type);if(start.type!==end.type||!immutable(start))fail('counted for initial value must have the actual identical bounded integer domain');
 const local=branchScope(scope);for(const [name,value]of local){if(ownedBase64Result(value.type))local.delete(name);else if(value.mutable)local.set(name,{...value,variant:undefined,some:undefined});}
 const name=bind(declaration.name,{type:end.type,root:null,input:false},local),checked=block(statement.statement.statements,local,depth+1,loopDepth+1);
 // The body cannot write the induction binding. Native Range performs its
 // step after continue and never steps after break. Exclusive same-domain
 // bounds keep the final +1 inside the actual signed/unsigned native domain.
 return {statement:{kind:'for-range',name,start,end,body:checked.body},scope:local};
}
