// Written annotation DATA. Actual callback context and complete bodies govern
// the native domains; no annotation or public source span issues permission.
import {httpResourceCallerContract} from './http-resource-caller-contracts.mjs';
const fail=message=>{throw new TypeError('Resource callback annotations: '+message);};
export function captureHttpResourceCallbackAnnotations(ts,node,contract,imports,context,tick){
 const written=node.type||node.parameters.some(parameter=>parameter.type);if(!written)return;
 if(!context||context.language!=='TypeScript'||node.getSourceFile()!==context.file||!Array.isArray(context.erase))fail('actual complete original TypeScript annotation context required');
 const describe=createHttpResourceWrittenAnnotationReader(ts,imports,tick);
 const edits=[];
 for(let index=0;index<node.parameters.length;index++){const parameter=node.parameters[index];if(!parameter.type)continue;const actual=describe(parameter.type);if(actual.kind!=='domain'||actual.type!==contract.args[index])fail('written parameter must preserve its actual contextual native domain');edits.push({span:[parameter.name.end,parameter.type.end],replacement:''});}
 if(node.type){const actual=describe(node.type);if(actual.kind!=='domain'||actual.type!==contract.ret)fail('written return annotation must preserve its complete actual callback domain');const colons=node.getChildren(context.file).filter(child=>child.kind===ts.SyntaxKind.ColonToken);if(colons.length!==1||colons[0].end>node.type.getStart(context.file))fail('actual native arrow return annotation boundary required');edits.push({span:[colons[0].getStart(context.file),node.type.end],replacement:''});}
 context.erase.push(...edits);
}


// Fresh invocation-local type DATA reader, shared by source obligations only.
export function createHttpResourceWrittenAnnotationReader(ts,imports,tick){
 const domain=type=>({kind:'domain',type});
 function callable(row){
  if(!row)fail('actual imported operation type required');const args=row.args.map(type=>type==='json-callback'?row.callbackContract?{kind:'function',args:row.callbackContract.args.map(domain),returns:domain(row.callbackContract.ret)}:fail('actual complete callback descriptor required'):domain(type));
  return {kind:'function',args,returns:row.async?{kind:'future',value:domain(row.ret)}:domain(row.ret)};
 }
 function describe(type,depth=0){
  tick();if(!type||depth>32)fail('complete bounded original callback type required');if(ts.isParenthesizedTypeNode(type))return describe(type.type,depth+1);
  const primitive=new Map([[ts.SyntaxKind.StringKeyword,'str'],[ts.SyntaxKind.BooleanKeyword,'bool'],[ts.SyntaxKind.BigIntKeyword,'u64']]);if(primitive.has(type.kind))return domain(primitive.get(type.kind));
  if(ts.isTypeQueryNode(type)){if(!ts.isIdentifier(type.exprName)||!imports.has(type.exprName.text))fail('type query must name an actual imported operation');return callable(httpResourceCallerContract(imports.get(type.exprName.text)));}
  if(ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)&&['Parameters','ReturnType'].includes(type.typeName.text)&&type.typeArguments?.length===1){
   const owner=describe(type.typeArguments[0],depth+1);if(owner.kind!=='function')fail('Parameters and ReturnType require an actual function type');return type.typeName.text==='Parameters'?{kind:'parameters',values:owner.args}:owner.returns;
  }
  if(ts.isIndexedAccessTypeNode(type)){
   const owner=describe(type.objectType,depth+1);if(owner.kind==='parameters'&&ts.isLiteralTypeNode(type.indexType)&&ts.isNumericLiteral(type.indexType.literal)&&/^[0-9]+$/u.test(type.indexType.literal.text)){const index=Number(type.indexType.literal.text);if(!Number.isSafeInteger(index)||index>=owner.values.length)fail('actual written callback parameter index is outside its signature');return owner.values[index];}
   if(owner.kind==='domain'&&['json-list-ref','json-list-owned'].includes(owner.type)&&type.indexType.kind===ts.SyntaxKind.NumberKeyword)return domain('json-ref');
   fail('original indexed type needs a closed actual callback or list element rule');
  }
  fail('written callback type needs a separate original-source inverse rule');
 }
 return describe;
}
