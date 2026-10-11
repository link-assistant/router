// A syntactic fragment subset, not an expression evaluator or owner proof.
// Only braced blocks, paths/calls, literals and const locals are admitted.
const text=tree=>tree?.kind==='token'?tree.text:null;
const identifier=tree=>tree?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text);
const reserved=new Set('as async await break const continue dyn else enum extern fn for if impl in let loop match mod move mut pub ref return static struct trait type unsafe use where while'.split(' '));
const atom=tree=>identifier(tree)&&!reserved.has(tree.text)||tree?.kind==='owner'||tree?.kind==='token'&&['string','number','char'].includes(tree.type);
const opaque=(tree,kind)=>tree?.kind==='fragment'&&tree.fragment===kind;

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
  if(opaque(tree,'block'))return true;
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
  const tree=trees[start];
  if(opaque(tree,'expr')||opaque(tree,'block'))return start+1;
  if(tree?.kind==='group'&&tree.delimiter==='{')return boundedMacroBlock(tree,typeEnd,depth+1)?start+1:null;
  if(tree?.kind==='group'&&tree.delimiter==='(')return tupleEnd(tree,typeEnd,depth+1)?start+1:null;
  let at=start;
  if(text(trees[at])==='::')at++;
  if(!atom(trees[at]))return null;
  const path=identifier(trees[at])||trees[at]?.kind==='owner';at++;
  if(path)while(text(trees[at])==='::') {
    if(!identifier(trees[at+1])||reserved.has(text(trees[at+1])))return null;at+=2;
  }
  // Calling a literal is a trait obligation outside this syntactic profile.
  if(path&&trees[at]?.kind==='group'&&trees[at].delimiter==='(') {
    if(!tupleEnd(trees[at],typeEnd,depth+1))return null;at++;
  }
  return at;
}
