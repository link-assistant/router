// Compare a freshly parsed emitted runtime against the complete independently
// normalized source tree. This avoids building a second normalized array tree;
// it grants no inference, ownership or executable authority.
import {createHash} from 'node:crypto';

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

// Fresh source/target parses with the same normalized structure as runtimeAST.
// Buffer only canonical JSON fragments and one node's immediate target children;
// retain neither a normalized array tree nor its complete JSON representation.
// A digest is returned only after every node matches. It is not a type verdict.
export function hashMatchingNativeRuntimeAST(ts,source,target,{rewriteImports=false}={}) {
 const parse=text=>{
  const file=ts.createSourceFile('runtime.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw new Error('invalid runtime syntax for identity check');
  return file;
 };
 const original=parse(source),emitted=parse(target),digest=createHash('sha256');
 let fragments=[],units=0;
 const write=text=>{
  fragments.push(text);units+=text.length;
  if(units>=8192){digest.update(fragments.join(''));fragments=[];units=0;}
 };
 const boundary=node=>{
  let parent=node.parent;
  while(ts.isParenthesizedExpression(parent))parent=parent.parent;
  return ts.isOptionalChain(node.expression)&&(ts.isPropertyAccessExpression(parent)||ts.isElementAccessExpression(parent)||ts.isCallExpression(parent)||ts.isNewExpression(parent)||ts.isTaggedTemplateExpression(parent));
 };
 const unwrap=node=>{
  while(ts.isParenthesizedExpression(node)&&!boundary(node))node=node.expression;
  return node;
 };
 const match=(left,right)=>{
  left=unwrap(left);right=unwrap(right);
  if(ts.isParenthesizedExpression(left)){
   if(!ts.isParenthesizedExpression(right))return false;
   write('["optional-chain-boundary",');
   const same=match(left.expression,right.expression);write(']');return same;
  }
  if(ts.isParenthesizedExpression(right)||left.kind!==right.kind)return false;
  const children=[];
  ts.forEachChild(right,child=>{if(!ts.isJSDoc(child))children.push(child);});
  let count=0,valid=true;
  ts.forEachChild(left,child=>{
   if(ts.isJSDoc(child))return;
   if(count===0)write('['+left.kind+','+Boolean(left.flags&ts.NodeFlags.OptionalChain)+',[');
   else write(',');
   const next=children[count++];
   if(valid&&(!next||!match(child,next)))valid=false;
  });
  if(count){
   write(']]');
   return valid&&count===children.length&&Boolean(left.flags&ts.NodeFlags.OptionalChain)===Boolean(right.flags&ts.NodeFlags.OptionalChain);
  }
  if(children.length)return false;
  if(typeof left.text==='string'){
   const parent=left.parent;
   const module=parent&&(ts.isImportDeclaration(parent)||ts.isExportDeclaration(parent)||ts.isCallExpression(parent)&&parent.expression.kind===ts.SyntaxKind.ImportKeyword);
   const text=rewriteImports&&module&&left.text.startsWith('.')?left.text.replace(/\.mjs$/u,'.js'):left.text;
   const raw=left.rawText??null;
   if(typeof right.text!=='string'||right.text!==text||(right.rawText??null)!==raw)return false;
   write('['+left.kind+','+JSON.stringify(text)+','+JSON.stringify(raw)+']');
  }else{
   if(typeof right.text==='string')return false;
   write('['+left.kind+']');
  }
  return true;
 };
 if(!match(original,emitted))return null;
 if(units)digest.update(fragments.join(''));
 return digest.digest('hex');
}
