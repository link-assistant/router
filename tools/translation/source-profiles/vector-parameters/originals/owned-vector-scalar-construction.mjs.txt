// Native AST source DATA only; the receiving checker retains every Rust origin,
// paired TypeScript, integer-domain and fresh private reissuance obligation.
export function readOwnedVectorScalarConstruction({ts,checker,statements,readLiteral}){
 const fail=message=>{throw new TypeError('Owned reverse vector array-literal: '+message);};
 let work=0,bindings=0;const charge=()=>{if(++work>20000)fail('source work bound');};
 const unparen=node=>{let depth=0;while(ts.isParenthesizedExpression(node)){if(++depth>64)fail('source grouping bound');node=node.expression;}return node;};
 function atom(node,scope){charge();node=unparen(node);if(!ts.isIdentifier(node))return readLiteral(node);const symbol=checker.getSymbolAtLocation(node),selected=scope.get(symbol);if(!symbol||!selected||symbol.declarations?.length!==1||symbol.declarations[0]!==selected.declaration)fail('scalar reference needs its actual unique const binding');return {...selected.value};}
 function expression(node,scope,depth){
  charge();node=unparen(node);if(depth>8)fail('construction scope bound');
  if(ts.isArrayLiteralExpression(node)){if(node.elements.length>4096)fail('dense owned vector list bound');return node.elements.map(value=>{if(ts.isSpreadElement(value)||ts.isOmittedExpression(value))fail('spread or sparse construction refused');return atom(value,scope);});}
  if(!ts.isCallExpression(node)||node.arguments.length||node.typeArguments?.length||node.questionDotToken)fail('complete direct array-literal or closed scalar construction required; calls remain refused');
  const arrow=unparen(node.expression);if(!ts.isArrowFunction(arrow)||arrow.parameters.length||arrow.typeParameters?.length||arrow.modifiers?.length||!ts.isBlock(arrow.body))fail('only an ordinary zero-argument block IIFE is qualified');
  return body(arrow.body.statements,new Map(scope),depth+1);
 }
 function body(rows,scope,depth){
  if(!rows.length||rows.length>65)fail('bounded complete construction body required');
  for(let at=0;at<rows.length;at++){
   charge();const row=rows[at];if(ts.isReturnStatement(row)){if(at!==rows.length-1||!row.expression)fail('complete final array-literal return required');return expression(row.expression,scope,depth);}
   if(!ts.isVariableStatement(row)||row.modifiers?.length||row.declarationList.flags!==ts.NodeFlags.Const||row.declarationList.declarations.length!==1)fail('only const scalar declarations before the array-literal return are qualified');
   const declaration=row.declarationList.declarations[0];if(!ts.isIdentifier(declaration.name)||!declaration.initializer||declaration.exclamationToken||++bindings>64)fail('bounded plain scalar declaration required');
   const symbol=checker.getSymbolAtLocation(declaration.name);if(!symbol||symbol.declarations?.length!==1||symbol.declarations[0]!==declaration||scope.has(symbol))fail('unique actual scalar declaration required');
   const value=atom(declaration.initializer,scope);scope.set(symbol,{declaration,value});
  }
  fail('complete final array-literal return required');
 }
 return body(statements,new Map(),0);
}
