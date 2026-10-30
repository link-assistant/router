// Original callable selection only. Value parentheses retain their separate
// written-type checks; this helper never issues a type or binding certificate.
export function selectHttpResourceCallableSource(ts,node,tick=()=>{}){
 let depth=0;
 while(node&&ts.isParenthesizedExpression(node)){
  tick();if(++depth>16)throw new TypeError('Resource original callable grouping bound');
  if(ts.getJSDocType(node))throw new TypeError('Written callable grouping type requires a separate original signature rule');
  node=node.expression;
 }
 return node;
}
