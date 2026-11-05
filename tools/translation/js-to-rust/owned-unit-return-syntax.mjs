// Native type syntax DATA only; the original receiving checker still owns
// source/alias/import/type admission. No result is cached across invocations.
export function ownedParenthesizedType(ts,type){
 let depth=0;while(type&&ts.isParenthesizedTypeNode(type)){if(++depth>160)throw new TypeError('Owned source type parenthesis depth bound');type=type.type;}return type;
}

// A source-shape candidate only. Complete private expression/effect/type and
// native re-entry checks remain required; this grants no execution authority.
export function primitiveUnitReturnSyntax(ts,body){
 if(!body)return false;let cells=0,valued=false;
 function visit(node,depth=0){if(++cells>100000||depth>160)throw new TypeError('Bounded complete unit return source syntax required');if(node!==body&&(ts.isFunctionLike(node)||ts.isClassLike(node)))return;if(ts.isReturnStatement(node)&&node.expression)valued=true;ts.forEachChild(node,child=>visit(child,depth+1));}
 visit(body);return !valued;
}
