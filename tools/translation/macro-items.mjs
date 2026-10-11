// Bounded Rust item syntax for opaque macro captures. This validates parsing
// only: attributes, macro invocations and imported paths have no owner proof.
const text=tree=>tree?.kind==='token'?tree.text:null;
const reserved=new Set('as async await break const continue dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return static struct trait true type unsafe use where while'.split(' '));
const identifier=tree=>tree?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text);
const name=tree=>identifier(tree)&&!reserved.has(tree.text)&&tree.text!=='_';
const useSegment=tree=>name(tree)||['crate','self','super'].includes(text(tree));
function useTree(trees,start,depth=0,allowBareGlob=false) {
  if(depth>24)throw new TypeError('Declarative use tree depth budget exceeded');
  let at=start;if(text(trees[at])==='::')at++;
  function group(tree) {
    if(tree?.kind!=='group'||tree.delimiter!=='{')return false;
    let child=0;
    while(child<tree.children.length) {
      const end=useTree(tree.children,child,depth+1,true);if(end===null)return false;child=end;
      if(child<tree.children.length&&text(tree.children[child++])!==',')return false;
    }
    return true;
  }
  if(group(trees[at]))return at+1;
  if(text(trees[at])==='*')return allowBareGlob?at+1:null;
  if(!useSegment(trees[at]))return null;at++;
  while(text(trees[at])==='::') {
    at++;
    if(group(trees[at])||text(trees[at])==='*')return at+1;
    if(!useSegment(trees[at]))return null;at++;
  }
  if(text(trees[at])==='as') {
    at++;if(!name(trees[at])&&text(trees[at])!=='_')return null;at++;
  }
  return at;
}
export function boundedMacroItem(trees,start,metaEnd,depth=0) {
  if(depth>24)throw new TypeError('Declarative item depth budget exceeded');
  if(trees[start]?.kind==='fragment'&&trees[start].fragment==='item')return start+1;
  let at=start;
  while(text(trees[at])==='#') {
    // Inner attributes belong to the enclosing module, never this item.
    const attribute=trees[at+1];
    if(attribute?.kind!=='group'||attribute.delimiter!=='['||metaEnd(attribute.children,0)!==attribute.children.length)return null;at+=2;
  }
  if(text(trees[at])==='pub') {
    at++;const restriction=trees[at];
    if(restriction?.kind==='group') {
      if(restriction.delimiter!=='(')return null;
      const values=restriction.children;
      if(values.length===1&&['crate','self','super'].includes(text(values[0])))at++;
      else return null;
    }
  }
  if(text(trees[at])==='use') {
    const end=useTree(trees,at+1);return end!==null&&text(trees[end])===';'?end+1:null;
  }
  if(text(trees[at])==='mod') {
    if(!name(trees[at+1]))return null;at+=2;
    if(text(trees[at])===';')return at+1;
    const body=trees[at];if(body?.kind!=='group'||body.delimiter!=='{')return null;
    let child=0;
    while(child<body.children.length) {
      const end=boundedMacroItem(body.children,child,metaEnd,depth+1);if(end===null)return null;child=end;
    }
    return at+1;
  }
  // Macro item grammar checks delimiters/terminator but never interprets its
  // arbitrary token-tree input. Closure inspection still owes its expansion.
  if(text(trees[at])==='::')at++;
  if(!useSegment(trees[at]))return null;at++;
  while(text(trees[at])==='::'){if(!useSegment(trees[at+1]))return null;at+=2;}
  const group=trees[at+1];
  if(text(trees[at])!=='!'||group?.kind!=='group')return null;at+=2;
  if(text(trees[at])===';')return at+1;
  return group.delimiter==='{'?at:null;
}
