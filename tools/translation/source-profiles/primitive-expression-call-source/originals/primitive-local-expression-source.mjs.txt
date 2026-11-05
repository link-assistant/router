// Bounded original primitive expression/source DATA. No evaluation or permit.
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {readNativeIntegerLiteralSource} from './native-integer-literal-source.mjs';
const binary=new Map([['|',1],['^',2],['&',3],['<<',4],['>>',4],['+',5],['-',5],['*',6],['/',6],['%',6]]);
// Select only a complete shallow initializer; closures/blocks stay on the
// original separately selected result-call lane. Charge the enclosing budget.
export function primitiveLocalInitializerEnd(start,rows,tick){
 const groups=[];for(let at=start;at<rows.length&&at-start<=256;at++){
  tick();const word=rows[at].text;if(word===';'&&!groups.length)return at;if(['{','}'].includes(word))return null;if(word==='('||word==='[')groups.push(word==='('?')':']');else if(word===')'||word===']'){if(groups.pop()!==word)return null;}
 }return null;
}
export function readPrimitiveLocalExpression(rows,bindings,{readAtom,declared=null}){
 if(!rows.length||rows.length>256)return null;let at=0,cells=0;const domains=new Set();if(declared!==null){if(!primitiveBitwiseType(declared))return null;domains.add(declared);}const tick=()=>++cells<=1024;
 function atom(part){
  if(!tick())return null;const known=readAtom(part,bindings);if(known){domains.add(known.kind);return {kind:'atom',part,value:known};}const literal=readNativeIntegerLiteralSource(part);return literal&&!literal.suffix?{kind:'atom',part,value:null}:null;
 }
 function unary(depth){
  if(!tick()||depth>64)return null;const word=rows[at]?.text;if(word==='('){at++;const value=expression(0,depth+1);if(!value||rows[at++]?.text!==')')return null;return {kind:'group',value};}
  if(word==='-'||word==='!'){
   if(word==='-'&&rows[at+1]?.type==='number'){const part=rows.slice(at,at+2);at+=2;return atom(part);}at++;const value=unary(depth+1);return value?{kind:'unary',operator:word,value}:null;
  }
  if(!rows[at])return null;let end=at+(rows[at].text==='::'?1:0),size=1;if(rows[end]?.type==='ident'){end++;while(end-at<=15&&rows[end]?.text==='::'&&rows[end+1]?.type==='ident')end+=2;if(end-at>=3&&['MIN','MAX'].includes(rows[end-1]?.text))size=end-at;}const part=rows.slice(at,at+size);at+=size;return atom(part);
 }
 function expression(minimum,depth){
  let value=unary(depth);if(!value)return null;for(;;){const precedence=binary.get(rows[at]?.text);if(precedence===undefined||precedence<minimum)break;if(!tick())return null;const operator=rows[at++].text,right=expression(precedence+1,depth+1);if(!right)return null;value={kind:'binary',operator,left:value,right};}return value;
 }
 const tree=expression(0,0);if(!tree||at!==rows.length||domains.size!==1)return null;const domain=[...domains][0],native=primitiveBitwiseType(domain);if(!native)return null;
 function qualify(node,depth=0){
  if(!tick()||depth>64)return false;if(node.kind==='atom'){const value=node.value??readAtom(node.part,bindings,domain);return value?.kind===domain;}if(node.kind==='group')return qualify(node.value,depth+1);if(node.kind==='unary')return (node.operator!=='-'||native.signed)&&qualify(node.value,depth+1);return qualify(node.left,depth+1)&&qualify(node.right,depth+1);
 }
 if(!qualify(tree))return null;return tree.kind==='atom'&&tree.value?tree.value:{kind:domain,binding:null,bridge:'complete-native-primitive-expression'};
}
