// Compare a freshly parsed emitted runtime against the complete independently
// normalized source tree. This avoids building a second normalized array tree;
// it grants no inference, ownership or executable authority.
export function matchesNativeRuntimeAST(ts,source,expected) {
 const file=ts.createSourceFile('runtime.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)throw new Error('invalid runtime syntax for identity check');
 const match=(node,value)=>{
  if(ts.isParenthesizedExpression(node)){
   let parent=node.parent;
   while(ts.isParenthesizedExpression(parent))parent=parent.parent;
   const boundary=ts.isOptionalChain(node.expression)&&(ts.isPropertyAccessExpression(parent)||ts.isElementAccessExpression(parent)||ts.isCallExpression(parent)||ts.isNewExpression(parent)||ts.isTaggedTemplateExpression(parent));
   if(boundary)return Array.isArray(value)&&value.length===2&&value[0]==='optional-chain-boundary'&&match(node.expression,value[1]);
   return match(node.expression,value);
  }
  if(!Array.isArray(value)||value[0]!==node.kind)return false;
  if(value.length===3&&typeof value[1]==='boolean'&&Array.isArray(value[2])){
   if(value[1]!==Boolean(node.flags&ts.NodeFlags.OptionalChain))return false;
   let at=0,valid=true;
   ts.forEachChild(node,child=>{
    if(!ts.isJSDoc(child)){
     const next=value[2][at++];
     if(valid&&!match(child,next))valid=false;
    }
   });
   return valid&&at>0&&at===value[2].length;
  }
  let children=false;
  ts.forEachChild(node,child=>{if(!ts.isJSDoc(child))children=true;});
  if(children)return false;
  return typeof node.text==='string'
   ?value.length===3&&value[1]===node.text&&value[2]===(node.rawText??null)
   :value.length===1;
 };
 return match(file,expected);
}
