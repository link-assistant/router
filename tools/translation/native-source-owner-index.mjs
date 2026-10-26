// One complete native AST walk for one substitution step. This temporary
// index holds actual node identities only, never owner or semantic verdicts.
const need=(value,message)=>{if(!value)throw new TypeError('Native source owner index: '+message);};
const key=(kind,name,argument)=>JSON.stringify([kind,name,kind==='call'?argument:null]);
export function createNativeSourceOwnerIndex(ts,file,edits){
 need(Array.isArray(edits)&&edits.length<=128,'original bounded edit sequence required');const selected=new Map(),callPaths=new Set();
 for(const edit of edits){const owner=edit.owner;if(owner.kind==='end-of-module')continue;selected.set(key(owner.kind,owner.name,owner.argument),[]);if(owner.kind==='call-path')callPaths.add(owner.name);}
 function callPath(node,depth=0){need(depth<=64,'bounded original member call path');if(ts.isIdentifier(node))return node.text;if(!ts.isPropertyAccessExpression(node)||node.questionDotToken)return null;const prefix=callPath(node.expression,depth+1);return prefix===null?null:prefix+'.'+node.name.text;}
 const add=(kind,name,node,argument=null)=>{const nodes=selected.get(key(kind,name,argument));if(nodes)nodes.push(node);};
 function visit(node){
  if(ts.isVariableStatement(node)&&node.declarationList.declarations.length===1&&ts.isIdentifier(node.declarationList.declarations[0].name))add('variable-statement',node.declarationList.declarations[0].name.text,node);
  if(ts.isFunctionDeclaration(node))add('function',node.name?.text,node);if(ts.isClassDeclaration(node))add('class',node.name?.text,node);if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier))add('import',node.moduleSpecifier.text,node);if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name))add('variable',node.name.text,node);
  if(ts.isCallExpression(node)){if(callPaths.size&&!node.questionDotToken){const path=callPath(node.expression);if(callPaths.has(path))add('call-path',path,node);}if(ts.isIdentifier(node.expression)&&node.arguments.length>0&&ts.isStringLiteral(node.arguments[0]))add('call',node.expression.text,node,node.arguments[0].text);}
  ts.forEachChild(node,visit);
 }if(selected.size)visit(file);
 return owner=>selected.get(key(owner.kind,owner.name,owner.argument))??[];
}
