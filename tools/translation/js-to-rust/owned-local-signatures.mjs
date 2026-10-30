// Native signature query selection is DATA. The private source checker calls
// this only after its actual complete callee body has independently checked.
const fail=message=>{throw new TypeError('Owned local signature query: '+message);};
export function ownedLocalTypeQuery(ts,type,checker){
 let reference,index=null,kind;
 if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&type.typeName.text==='ReturnType'){reference=type;kind='return';}
 else if(ts.isIndexedAccessTypeNode(type)&&ts.isTypeReferenceNode(type.objectType)&&ts.isIdentifier(type.objectType.typeName)&&type.objectType.typeName.text==='Parameters'&&ts.isLiteralTypeNode(type.indexType)){
  const literal=type.indexType.literal;if(!ts.isNumericLiteral(literal)&&!ts.isStringLiteral(literal))return null;if(!/^(?:0|[1-9][0-9]?)$/u.test(literal.text)||Number(literal.text)>63)fail('bounded canonical parameter index required');index=Number(literal.text);reference=type.objectType;kind='parameter';
 }else return null;
 if(reference.typeArguments?.length!==1)return null;if(checker.getSymbolAtLocation(reference.typeName)?.declarations?.length)fail('actual unshadowed signature utility required');const query=reference.typeArguments[0];if(!ts.isTypeQueryNode(query)||!ts.isIdentifier(query.exprName))return null;
 return {kind,index,query,symbol:checker.getSymbolAtLocation(query.exprName)};
}
export function ownedLocalWrittenType(type,analysis){
 const selected=ownedLocalTypeQuery(analysis.ts,type,analysis.checker);if(!selected)return null;const symbol=analysis.localFunctionAliases?.get(selected.symbol)??selected.symbol,item=analysis.localFunctions?.get(symbol);if(!item)return null;
 const domain=selected.kind==='return'?item.returns:item.params[selected.index]?.type;if(!domain)fail('parameter index is outside the actual freshly checked callee');
 return domain==='json'?'json-ref':domain==='json-list-owned'?'json-list-ref':domain==='text-owned'?'str':domain;
}
