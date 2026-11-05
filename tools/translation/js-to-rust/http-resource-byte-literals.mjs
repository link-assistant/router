// Values are reselected from actual original syntax on every body check.
// No type record or public metadata can manufacture an octet literal.
export function observeHttpResourceByteLiteral(ts,node,tick){
 if(!ts.isArrayLiteralExpression(node)||!node.elements.length)return null;
 if(node.elements.length>4096)throw new TypeError('Complete original octet literal element bound');
 const values=[];
 for(const element of node.elements){
  tick();if(!ts.isBigIntLiteral(element))return null;
  const raw=element.text.replace(/_/gu,'');if(!/^[0-9]+n$/u.test(raw))throw new TypeError('Original octet requires a decimal bigint literal');
  const value=BigInt(raw.slice(0,-1));if(value>255n)throw new TypeError('Original octet literal is outside native u8 range');values.push(value.toString());
 }
 return {kind:'bytes-literal',type:'bytes-owned',values};
}
