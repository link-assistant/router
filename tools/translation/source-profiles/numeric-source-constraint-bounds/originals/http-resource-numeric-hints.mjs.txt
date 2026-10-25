// Invocation-local literal selection DATA, never a semantic/type/source permit.
// Constraints only choose a bounded literal representation; the complete body
// and every actual operation, state and source binding still check afterward.
const fail=message=>{throw new TypeError('Resource original numeric constraints: '+message);};
export function collectHttpResourceNumericHints(ts,statements,{bindings,imports,localFunctions,contract,numericReturnDomain,tick,inlineExpression=null}){
 const hints=new Map(),edges=[],constraints=[];let nodes=0;
 for(const [name,row]of bindings)if(['u64','i64'].includes(row.type))hints.set(name,row.type);
 const unwrap=node=>{let depth=0;while(node&&ts.isParenthesizedExpression(node)){tick();if(++depth>32)fail('complete native grouping bound');node=node.expression;}return node;};
 const operation=node=>{node=unwrap(node);return node&&ts.isCallExpression(node)&&ts.isIdentifier(node.expression)?imports.has(node.expression.text)?contract(imports.get(node.expression.text)):localFunctions?.get(node.expression.text):null;};
 const numeric=type=>['u64','i64'].includes(type)?type:null;
 function impose(node,type){node=unwrap(node);if(!numeric(type)||!node)return;if(ts.isIdentifier(node))constraints.push([node.text,type]);else if(ts.isConditionalExpression(node)){impose(node.whenTrue,type);impose(node.whenFalse,type);}}
 function connect(left,right){left=unwrap(left);right=unwrap(right);if(!left||!right)return;if(ts.isIdentifier(left)&&ts.isIdentifier(right))edges.push([left.text,right.text]);const row=operation(right);if(row)impose(left,row.ret);if(ts.isPrefixUnaryExpression(right)&&right.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(right.operand))impose(left,'i64');}
 function visit(node,depth=0){
  tick();if(++nodes>100000||depth>160)fail('complete original numeric constraint census bound');
  if(ts.isArrowFunction(node)||ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node))return;
  if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.initializer)connect(node.name,node.initializer);
  if(ts.isReturnStatement(node)&&node.expression)impose(node.expression,numericReturnDomain);
  if(ts.isBinaryExpression(node)){
   if(node.operatorToken.kind===ts.SyntaxKind.EqualsToken)connect(node.left,node.right);
   if([ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken,ts.SyntaxKind.LessThanToken,ts.SyntaxKind.LessThanEqualsToken,ts.SyntaxKind.GreaterThanToken,ts.SyntaxKind.GreaterThanEqualsToken].includes(node.operatorToken.kind)){connect(node.left,node.right);connect(node.right,node.left);}
  }
  const row=operation(node);if(row)node.arguments.forEach((argument,index)=>impose(argument,row.args[index]));
  ts.forEachChild(node,child=>visit(child,depth+1));
 }
 for(const statement of statements)visit(statement);if(inlineExpression){impose(inlineExpression,numericReturnDomain);visit(inlineExpression);}
 const assign=(name,type)=>{const previous=hints.get(name);if(previous&&previous!==type)fail('one actual lexical numeric binding cannot require conflicting native integer domains');if(previous)return false;hints.set(name,type);if(hints.size>8192)fail('complete numeric binding constraint bound');return true;};
 for(const [name,type]of constraints)assign(name,type);
 let changed=true,round=0;while(changed){tick();if(++round>8192)fail('complete finite numeric constraint convergence bound');changed=false;for(const [left,right]of edges){tick();if(hints.has(left))changed=assign(right,hints.get(left))||changed;if(hints.has(right))changed=assign(left,hints.get(right))||changed;}}
 return hints;
}
