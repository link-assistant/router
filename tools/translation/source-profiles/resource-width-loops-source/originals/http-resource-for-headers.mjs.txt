// Invocation-local observations of actual header nodes, never source permits.
const fail=message=>{throw new TypeError('Resource original for header: '+message);};
export function observeHttpResourceForIncrement(ts,node,condition,{environment,tick}){
 const unwrap=value=>{let depth=0;while(value&&ts.isParenthesizedExpression(value)){tick();if(++depth>160)fail('complete original for grouping bound');value=value.expression;}return value;};
 node=unwrap(node);if(!node||!ts.isPrefixUnaryExpression(node)&&!ts.isPostfixUnaryExpression(node)||![ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(node.operator))return null;
 const target=unwrap(node.operand),test=unwrap(condition),up=node.operator===ts.SyntaxKind.PlusPlusToken;
 if(!target||!ts.isIdentifier(target)||!test||!ts.isBinaryExpression(test)||test.operatorToken.kind!==(up?ts.SyntaxKind.LessThanToken:ts.SyntaxKind.GreaterThanToken)||!ts.isIdentifier(unwrap(test.left))||unwrap(test.left).text!==target.text)fail('unit counter update needs its actual strict dominating range condition');
 const actual=environment.get(target.text);if(!actual||!actual.mutable||actual.input||actual.moved||actual.disposed||!['u64','i64'].includes(actual.type))fail('range counter must be one actual live mutable native integer local');
 const bound=unwrap(test.right);if(ts.isIdentifier(bound)){const row=environment.get(bound.text);if(!row||row.mutable||row.moved||row.disposed||row.type!==actual.type)fail('range bound must be an actual immutable matching native integer');}
 else if(!(ts.isBigIntLiteral(bound)||ts.isPrefixUnaryExpression(bound)&&bound.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(bound.operand)))fail('range bound must retain a real immutable integer or original integer literal');
 return {name:target.text,type:actual.type,operation:'router_integer_'+actual.type+'_saturating_'+(up?'add':'sub'),sourceAuthority:false,semanticAuthority:false};
}
export function requireHttpResourceForCounterUnassigned(flow,name,tick){
 let cells=0;function visit(value,depth=0){tick();if(++cells>100000||depth>160)fail('complete original counter assignment census bound');if(!value||typeof value!=='object')return;if(value.kind==='assign'&&value.name===name)fail('the actual range counter must remain unassigned throughout the complete body');for(const [key,child]of Object.entries(value)){if(['resourceExits','loopExits','scopeFallthroughs','functionReturns','propagatedErrors'].includes(key))continue;if(child&&typeof child==='object'){if(Array.isArray(child))for(const row of child)visit(row,depth+1);else visit(child,depth+1);}}}visit(flow);
}
