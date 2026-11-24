// Original type-only source DATA. Expansion never supplies a value domain,
// source owner or semantic permit; the complete caller must still be checked.
const fail=message=>{throw new TypeError('Resource original type alias: '+message);};
export function resolveHttpResourceTypeAlias(ts,node,aliases,tick=()=>{}){
 const active=new Set();for(let depth=0;depth<=32;depth++){
  tick();if(ts.isParenthesizedTypeNode(node)){node=node.type;continue;}
  if(!ts.isTypeReferenceNode(node)||!ts.isIdentifier(node.typeName)||!aliases?.has(node.typeName.text))return node;
  const alias=aliases.get(node.typeName.text);if(node.typeArguments?.length||active.has(alias))fail('bounded acyclic nongeneric original type aliases required');active.add(alias);node=alias.type;
 }fail('complete original type-alias chain bound');
}
export function expandHttpResourceTypeAliasSource(ts,written,{file,aliases}){
 let cells=0;const active=new Set();
 function expand(node,depth=0){
  if(++cells>200000||depth>32||node.getSourceFile()!==file)fail('bounded complete original alias source required');
  if(ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)&&aliases.has(node.typeName.text)){
   const alias=aliases.get(node.typeName.text);if(node.typeArguments?.length||active.has(alias))fail('recursive or generic type alias needs its own source rule');active.add(alias);try{return '('+expand(alias.type,depth+1)+')';}finally{active.delete(alias);}
  }
  const begin=node.getStart(file),source=file.text.slice(begin,node.end),edits=[];
  function visit(child,level){
   if(++cells>200000||level>160)fail('complete original type-alias native span bound');
   if(ts.isTypeReferenceNode(child)&&ts.isIdentifier(child.typeName)&&aliases.has(child.typeName.text)){edits.push({start:child.getStart(file)-begin,end:child.end-begin,source:expand(child,depth+1)});return;}ts.forEachChild(child,value=>visit(value,level+1));
  }
  ts.forEachChild(node,child=>visit(child,0));let result=source,previous=source.length;
  for(const edit of edits.sort((left,right)=>right.start-left.start)){if(edit.start<0||edit.end>previous)fail('nonoverlapping original type-alias spans required');result=result.slice(0,edit.start)+edit.source+result.slice(edit.end);previous=edit.start;}return result;
 }
 return expand(written);
}
