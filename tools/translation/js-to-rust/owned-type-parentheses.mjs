// Native type syntax DATA only; the original receiving checker still owns
// source/alias/import/type admission. No result is cached across invocations.
export function ownedParenthesizedType(ts,type){
 let depth=0;while(type&&ts.isParenthesizedTypeNode(type)){if(++depth>160)throw new TypeError('Owned source type parenthesis depth bound');type=type.type;}return type;
}
