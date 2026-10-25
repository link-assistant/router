// Original type-only source DATA. Expansion never supplies a value domain,
// source owner or semantic permit; the complete caller must still be checked.
const fail=message=>{throw new TypeError('Resource original type alias: '+message);};
export function resolveHttpResourceTypeAlias(ts,node,aliases,tick=()=>{}){
 let bindings=null;for(let depth=0;depth<=32;depth++){
  tick();const slot=httpResourceTypeAliasSlot(ts,node,bindings);if(slot){node=slot.node;bindings=slot.bindings;continue;}if(ts.isParenthesizedTypeNode(node)){node=node.type;continue;}
  if(!ts.isTypeReferenceNode(node)||!ts.isIdentifier(node.typeName)||!aliases?.has(node.typeName.text))return node;
  const alias=aliases.get(node.typeName.text);bindings=httpResourceTypeAliasBindings(ts,alias,node,bindings,tick);node=alias.type;
 }fail('complete original type-alias chain bound');
}
export function expandHttpResourceTypeAliasSource(ts,written,{file,aliases}){
 let cells=0;
 function expand(node,depth=0,bindings=null){
  if(++cells>200000||depth>32||node.getSourceFile()!==file)fail('bounded complete original alias source required');
  const slot=httpResourceTypeAliasSlot(ts,node,bindings);if(slot)return '('+expand(slot.node,depth+1,slot.bindings)+')';
  if(ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)&&aliases.has(node.typeName.text)){
   const alias=aliases.get(node.typeName.text),nested=httpResourceTypeAliasBindings(ts,alias,node,bindings);return '('+expand(alias.type,depth+1,nested)+')';
  }
  const begin=node.getStart(file),source=file.text.slice(begin,node.end),edits=[];
  function visit(child,level){
   if(++cells>200000||level>160)fail('complete original type-alias native span bound');
   if(ts.isTypeReferenceNode(child)&&ts.isIdentifier(child.typeName)&&(aliases.has(child.typeName.text)||bindings?.has(child.typeName.text))){edits.push({start:child.getStart(file)-begin,end:child.end-begin,source:expand(child,depth+1,bindings)});return;}ts.forEachChild(child,value=>visit(value,level+1));
  }
  ts.forEachChild(node,child=>visit(child,0));let result=source,previous=source.length;
  for(const edit of edits.sort((left,right)=>right.start-left.start)){if(edit.start<0||edit.end>previous)fail('nonoverlapping original type-alias spans required');result=result.slice(0,edit.start)+edit.source+result.slice(edit.end);previous=edit.start;}return result;
 }
 return expand(written);
}

import {httpResourceTypeAliasBindings,httpResourceTypeAliasSlot} from './http-resource-type-alias-templates.mjs';
