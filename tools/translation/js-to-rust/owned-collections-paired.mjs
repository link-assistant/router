// Native nodes remain invocation-local. This selection never issues a caller.
export function pairedCollectionCallback(ts,declaration,callback,paired){
 if(!paired)return null;
 const arrows=body=>{const rows=[];function visit(node){if(ts.isTypeNode(node))return;if(ts.isArrowFunction(node))rows.push(node);ts.forEachChild(node,visit);}visit(body);return rows;};
 const javascript=arrows(declaration),typescript=arrows(paired.declaration),index=javascript.indexOf(callback);
 if(index<0||javascript.length!==typescript.length)throw new TypeError('Complete paired collection callback census differs');
 const target=typescript[index];if(target.parameters.length!==callback.parameters.length)throw new TypeError('Paired collection callback parameters differ');
 const locals=body=>{const rows=[];function visit(node){if(ts.isFunctionLike(node))return;if(ts.isVariableDeclaration(node))rows.push(node);ts.forEachChild(node,visit);}visit(body);return rows;};
 const before=locals(callback.body),after=locals(target.body);if(before.length!==after.length)throw new TypeError('Complete paired collection local census differs');
 const original=callback.getSourceFile(),typed=target.getSourceFile();
 const evidence=before.map((node,at)=>{
  const next=after[at];if(!ts.isIdentifier(node.name)||!ts.isIdentifier(next.name)||node.name.text!==next.name.text)throw new TypeError('Paired callback local binding differs');
  return {javascriptSpan:[node.getStart(original),node.end],typescriptSpan:[next.getStart(typed),next.end],typeSpan:next.type?[next.type.getStart(typed),next.type.end]:null};
 });
 return {...paired,declaration:target,evidence:{...paired.evidence,locals:evidence}};
}
