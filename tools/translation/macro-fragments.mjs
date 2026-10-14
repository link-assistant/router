// A syntactic fragment subset, not an expression evaluator or owner proof.
// Existing blocks/paths/literals plus source-proved bounded prefix/postfix syntax.
import {originalMacroExpressionRules,assertOriginalMacroExpressionRules} from './macro-expression-source.mjs';
// Rust's ident/lifetime/tt forwarding exceptions expose one original tree;
// expr/block/type nonterminals retain their opaque boundary.
function transparent(tree){
  let depth=0;
  while(tree?.kind==='fragment'&&['ident','lifetime','tt'].includes(tree.fragment)&&tree.trees.length===1){
    if(++depth>64)throw new TypeError('Declarative transparent forwarding depth budget exceeded');tree=tree.trees[0];
  }
  return tree;
}
const text=tree=>{tree=transparent(tree);return tree?.kind==='token'?tree.text:null;};
const identifier=tree=>{tree=transparent(tree);return tree?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text);};
const reserved=new Set('as async await break const continue dyn else enum extern fn for if impl in let loop match mod move mut pub ref return static struct trait type unsafe use where while'.split(' '));
const atom=tree=>{tree=transparent(tree);return identifier(tree)&&!reserved.has(tree.text)||tree?.kind==='owner'||tree?.kind==='token'&&['string','number','char'].includes(tree.type);};
const opaque=(tree,kind)=>tree?.kind==='fragment'&&tree.fragment===kind;
const fieldReserved=new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final gen macro override priv try typeof unsized virtual yield raw _'.split(' '));
const fieldIdentifier=tree=>identifier(tree)&&!fieldReserved.has(tree.text)||tree?.kind==='fragment'&&tree.fragment==='ident'&&tree.trees.length===1&&identifier(tree.trees[0])&&!fieldReserved.has(tree.trees[0].text);
const sourceGrammar=()=>assertOriginalMacroExpressionRules(originalMacroExpressionRules());

function tupleEnd(group,typeEnd,depth) {
  let at=0;
  while(at<group.children.length) {
    const end=boundedMacroExpression(group.children,at,typeEnd,depth+1);
    if(end===null)return null;at=end;
    if(at<group.children.length&&text(group.children[at++])!==',')return null;
  }
  return true;
}

export function boundedMacroBlock(tree,typeEnd,depth=0) {
  if(depth>24)throw new TypeError('Declarative block fragment depth budget exceeded');
  tree=transparent(tree);if(opaque(tree,'block'))return true;
  if(tree?.kind!=='group'||tree.delimiter!=='{')return false;
  const trees=tree.children;let at=0;
  while(text(trees[at])==='const') {
    if(!identifier(trees[at+1])||reserved.has(text(trees[at+1]))||text(trees[at+2])!==':')return false;
    const end=typeEnd(trees,at+3,depth+1);if(end===null||text(trees[end])!=='=')return false;
    const value=boundedMacroExpression(trees,end+1,typeEnd,depth+1);
    if(value===null||text(trees[value])!==';')return false;at=value+1;
  }
  if(at===trees.length)return true;
  const end=boundedMacroExpression(trees,at,typeEnd,depth+1);
  return end===trees.length||end!==null&&text(trees[end])===';'&&end+1===trees.length;
}

export function boundedMacroExpression(trees,start,typeEnd,depth=0) {
  if(depth>24)throw new TypeError('Declarative expression fragment depth budget exceeded');
  const tree=transparent(trees[start]);
  if(['&','*'].includes(text(tree))){sourceGrammar();if(text(tree)==='&'&&(['mut','raw'].includes(text(trees[start+1]))||trees[start+1]?.type==='char'))return null;return boundedMacroExpression(trees,start+1,typeEnd,depth+1);}
  let at=start,path=false,compound=false;
  if(opaque(tree,'expr')||opaque(tree,'block')){at=start+1;compound=true;}
  else if(tree?.kind==='group'&&tree.delimiter==='{'){if(!boundedMacroBlock(tree,typeEnd,depth+1))return null;at=start+1;compound=true;}
  else if(tree?.kind==='group'&&tree.delimiter==='('){if(!tupleEnd(tree,typeEnd,depth+1))return null;at=start+1;compound=true;}
  if(!compound){
  if(text(trees[at])==='::')at++;
  if(!atom(trees[at]))return null;
  path=identifier(trees[at])||trees[at]?.kind==='owner';at++;
  if(path)while(text(trees[at])==='::') {
    if(!identifier(trees[at+1])||reserved.has(text(trees[at+1])))return null;at+=2;
  }
  // A macro invocation is one syntactic expression with opaque balanced TT
  // input. Capturing it proves no expansion, callee or runtime behavior.
  if(path&&text(trees[at])==='!')return transparent(trees[at+1])?.kind==='group'?at+2:null;
  }
  // Calling a literal is a trait obligation outside this syntactic profile.
  if(path&&transparent(trees[at])?.kind==='group'&&transparent(trees[at]).delimiter==='(') {
    if(!tupleEnd(transparent(trees[at]),typeEnd,depth+1))return null;at++;
  }
  while(text(trees[at])==='.'){sourceGrammar();if(!fieldIdentifier(transparent(trees[at+1])))return null;at+=2;if(transparent(trees[at])?.kind==='group'&&transparent(trees[at]).delimiter==='('){if(!tupleEnd(transparent(trees[at]),typeEnd,depth+1))return null;at++;}}
  return at;
}
