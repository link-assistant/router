// Finite ordinary-JavaScript expression candidates only. No caller/type or
// source authority follows. The whole proposed module must be privately checked.
export function primitiveSlicePresenceExpression(ts,node,selectLength){
 const unwrap=value=>{for(let depth=0;value&&ts.isParenthesizedExpression(value);depth++){if(depth>=32)throw new RangeError('Primitive slice presence parenthesis depth');value=value.expression;}return value;},length=value=>selectLength(unwrap(value)),numeric=value=>{value=unwrap(value);return ts.isNumericLiteral(value)&&['0','1'].includes(value.text)?value.text:null;};let current=unwrap(node);
 if(ts.isBinaryExpression(current)){const op=current.operatorToken.kind,left=length(current.left),right=length(current.right),receiver=left??right,constant=numeric(left?current.right:current.left);if(!receiver||constant===null)return null;let empty=null;
  if(constant==='0'&&[ts.SyntaxKind.EqualsEqualsEqualsToken,ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(op))empty=op===ts.SyntaxKind.EqualsEqualsEqualsToken;
  else if(constant==='0'&&op===(left?ts.SyntaxKind.GreaterThanToken:ts.SyntaxKind.LessThanToken))empty=false;
  else if(constant==='0'&&op===(left?ts.SyntaxKind.LessThanEqualsToken:ts.SyntaxKind.GreaterThanEqualsToken))empty=true;
  else if(constant==='1'&&op===(left?ts.SyntaxKind.GreaterThanEqualsToken:ts.SyntaxKind.LessThanEqualsToken))empty=false;
  else if(constant==='1'&&op===(left?ts.SyntaxKind.LessThanToken:ts.SyntaxKind.GreaterThanToken))empty=true;
  return empty===null?null:{receiver,empty,sourceAuthority:false,semanticAuthority:false};
 }
 if(ts.isPrefixUnaryExpression(current)&&current.operator===ts.SyntaxKind.ExclamationToken){let operand=unwrap(current.operand),empty=true;if(ts.isPrefixUnaryExpression(operand)&&operand.operator===ts.SyntaxKind.ExclamationToken){empty=false;operand=unwrap(operand.operand);}const receiver=length(operand);return receiver?{receiver,empty,sourceAuthority:false,semanticAuthority:false}:null;}
 const receiver=length(current);if(!receiver)return null;let outer=node;for(let depth=0;outer.parent&&ts.isParenthesizedExpression(outer.parent);depth++){if(depth>=32)throw new RangeError('Primitive slice presence condition depth');outer=outer.parent;}const parent=outer.parent,condition=parent&&(ts.isIfStatement(parent)||ts.isWhileStatement(parent)||ts.isDoStatement(parent))&&parent.expression===outer||parent&&ts.isForStatement(parent)&&parent.condition===outer||parent&&ts.isConditionalExpression(parent)&&parent.condition===outer;return condition?{receiver,empty:false,sourceAuthority:false,semanticAuthority:false}:null;
}
