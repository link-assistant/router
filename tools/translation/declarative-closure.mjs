// Source-sealed expansion closure evidence. This layer does not register a
// callable macro owner, close a namespace or supply a runtime implementation.
import {createHash} from 'node:crypto';
import {declarativeExpansionLineage,isDeclarativeExpansion} from './declarative-macros.mjs';
import {declarativeDefinitionSource,isDeclarativeSourceProof} from './declarative-source-profile.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const closures=new WeakSet(),partitions=new WeakSet();
const hash=value=>createHash('sha256').update(value).digest('hex');
function forwardingRoot(expansion) {
  let result=expansion,depth=0;
  for(;;){const {parent}=declarativeExpansionLineage(result);if(!parent)return result;if(++depth>32)throw new TypeError('Partition forwarding depth budget exceeded');result=parent;}
}
const samePath=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
function transparent(tree) {
  let depth=0;
  while(tree?.kind==='fragment'&&['ident','tt'].includes(tree.fragment)&&tree.trees.length===1) {
    if(++depth>64)throw new TypeError('Closure forwarding depth budget exceeded');tree=tree.trees[0];
  }
  return tree;
}
const text=tree=>transparent(tree)?.kind==='token'?transparent(tree).text:null;
const identifier=tree=>/^[A-Za-z_][A-Za-z0-9_]*$/u.test(text(tree)??'');
function sourceFrame(dependencies,expansion) {
  if(!isDeclarativeExpansion(expansion))throw new TypeError('Closure requires a privately checked expansion');
  const lineage=declarativeExpansionLineage(expansion);
  return {lineage,origin:declarativeDefinitionSource(dependencies,lineage.definition)};
}
function groupAt(expansion,path) {
  if(!Array.isArray(path)||path.length>64||path.some(index=>!Number.isSafeInteger(index)||index<0))throw new TypeError('Invalid closure source group path');
  let trees=expansion.trees,tree;
  for(const index of path){tree=trees[index];if(tree?.kind!=='group')throw new TypeError('Closure path requires actual expanded delimiters');trees=tree.children;}
  if(!tree)throw new TypeError('Closure attribute path requires a delimiter');return tree;
}
function inspectTrees(trees,path=[],local=false,rows={calls:[],attributes:[],declarations:[],opaque:[]},budget={cells:32000,depth:0}) {
  if(path.length>64)throw new TypeError('Closure delimiter depth budget exceeded');
  for(let at=0;at<trees.length;at++) {
    if(--budget.cells<0)throw new TypeError('Closure tree-cell budget exceeded');
    const tree=trees[at],current=[...path,at];
    if(text(tree)==='#') {
      const inner=text(trees[at+1])==='!',index=at+(inner?2:1),group=trees[index];
      if(group?.kind!=='group'||group.delimiter!=='[')throw new TypeError('Closure attribute has unproved expanded grammar');
      rows.attributes.push({path:[...path,index],inner,local,name:text(group.children[0]),sourceSyntax:group.sourceSyntax??null,ownerResolved:false});at=index;continue;
    }
    if(tree.kind==='owner'||identifier(tree)) {
      const segments=tree.kind==='owner'?[...tree.target]:[text(tree)];let end=at+1;
      while(text(trees[end])==='::'&&identifier(trees[end+1])){segments.push(text(trees[end+1]));end+=2;}
      if(text(trees[end])==='!'&&trees[end+1]?.kind==='group') {
        rows.calls.push({path:[...path,end+1],writtenPath:segments,local,hygiene:tree.kind==='owner'?'definition-site-dollar-crate':tree.kind==='fragment'?'forwarded-call-site':'definition-site-written-path',sourceSyntax:tree.sourceSyntax??null,ownerResolved:false});
        at=end+1;continue;
      }
    }
    if(!local&&['static','const','struct','enum','fn','mod','type'].includes(text(tree))&&identifier(trees[at+1]))rows.declarations.push({term:text(tree),name:text(trees[at+1]),outputPath:current});
    if(tree.kind==='group')inspectTrees(tree.children,current,local||tree.delimiter==='{',rows,budget);
    else if(tree.kind==='fragment'&&!['ident','tt','vis','ty','meta','expr','block'].includes(tree.fragment))rows.opaque.push({path:current,fragment:tree.fragment});
  }
  return rows;
}

export function inspectDeclarativeExpansionClosure({dependencies,root,expansions=[root]}={}) {
  if(!isDeclarativeSourceProof(dependencies)||!Array.isArray(expansions)||!expansions.length||expansions.length>128||new Set(expansions).size!==expansions.length||!expansions.includes(root))throw new TypeError('Closure requires a sealed source profile and bounded unique expansion trace');
  const trace=new Set(expansions),frames=[],obligations=[];
  for(const expansion of expansions) {
    const {lineage,origin}=sourceFrame(dependencies,expansion);
    let ancestor=expansion,depth=0;
    while(ancestor!==root) {
      const edge=declarativeExpansionLineage(ancestor);
      if(!edge.parent||!trace.has(edge.parent)||++depth>32)throw new TypeError('Closure trace is disconnected from its actual forwarding root');ancestor=edge.parent;
    }
    const inspection=inspectTrees(expansion.trees),edges=[];
    for(const call of inspection.calls) {
      const children=expansions.filter(candidate=>{
        const edge=declarativeExpansionLineage(candidate);return edge.parent===expansion&&samePath(edge.path,call.path);
      });
      edges.push({...call,children:children.map(child=>child.digest)});
      obligations.push({kind:'call-owner',expansionDigest:expansion.digest,path:call.path,writtenPath:call.writtenPath,message:'Actual macro owner resolution and hygiene remain unproved, even when a source transcriber was explicitly supplied.'});
      if(!children.length)obligations.push({kind:'unexpanded-call',expansionDigest:expansion.digest,path:call.path});
      if(children.length>1)obligations.push({kind:'conditional-alternatives',expansionDigest:expansion.digest,path:call.path,message:'Distinct source alternatives require an independently sealed exhaustive branch/owner footprint.'});
    }
    for(const attribute of inspection.attributes)obligations.push({kind:'attribute-owner',expansionDigest:expansion.digest,path:attribute.path,name:attribute.name});
    for(const child of expansions.filter(candidate=>declarativeExpansionLineage(candidate).parent===expansion)) {
      const edge=declarativeExpansionLineage(child);
      if(!inspection.calls.some(call=>samePath(call.path,edge.path)))throw new TypeError('Closure child was not forwarded from an actual expanded bang invocation');
    }
    frames.push({expansionDigest:expansion.digest,origin,parentDigest:lineage.parent?.digest??null,parentPath:lineage.path,declarations:inspection.declarations,calls:edges,attributes:inspection.attributes,opaque:inspection.opaque});
  }
  // The root source invocation itself has not been bound merely by choosing a
  // definition. A transcriber and a macro call owner are different proofs.
  obligations.unshift({kind:'root-owner',expansionDigest:root.digest});
  const evidence={schema:'declarative-expansion-closure-evidence-v1',dependencyDigest:dependencies.digest,rootDigest:root.digest,frames,obligations,dimensions:{typeNamespaceComplete:false,valueNamespaceComplete:false,bangMacroComplete:false,attributeMacroComplete:false},ownerVerified:false,generatedBehavior:false};
  const result=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});closures.add(result);return result;
}
export function isDeclarativeClosureEvidence(value){return !!value&&closures.has(value);}

// A propositional partition receipt is deliberately narrower than macro
// namespace closure. Unknown cfg atoms remain symbolic; no OS is selected.
function formulaTrees(trees,depth=0) {
  if(depth>64)throw new TypeError('Conditional fragment depth budget exceeded');
  return trees.flatMap(tree=>tree.kind==='fragment'?formulaTrees(tree.trees,depth+1):[tree]);
}
function conditionFormula(attribute) {
  if(attribute.delimiter!=='[')throw new TypeError('Partition condition requires original expanded attribute delimiters');
  const trees=formulaTrees(attribute.children);
  if(text(trees[0])!=='cfg'||trees.length!==2||trees[1]?.kind!=='group'||trees[1].delimiter!=='(')throw new TypeError('Partition requires a cfg predicate, never cfg_attr or arbitrary attributes');
  function list(input,depth=0) {
    if(depth>32)throw new TypeError('Partition predicate depth budget exceeded');
    const tokens=formulaTrees(input);let at=0;
    function predicate() {
      const begin=at,name=text(tokens[at++]);if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??''))throw new TypeError('Unproved partition predicate atom');
      const group=tokens[at];
      if(group?.kind==='group') {
        if(group.delimiter!=='('||!['all','any','not'].includes(name))throw new TypeError('Unproved partition predicate operation');at++;
        const children=list(group.children,depth+1);if(name==='not'&&children.length!==1)throw new TypeError('Partition not predicate needs one operand');return {kind:name,children};
      }
      if(text(tokens[at])==='=') {
        at++;const literal=tokens[at++];if(literal?.kind!=='token'||literal.type!=='string')throw new TypeError('Partition cfg value requires an original literal');
      }
      if(['true','false'].includes(name))throw new TypeError('Boolean cfg literals are outside the pinned predicate profile');
      return {kind:'atom',name:JSON.stringify(tokens.slice(begin,at).map(tree=>text(tree)))};
    }
    const rows=[];
    while(at<tokens.length){rows.push(predicate());if(at===tokens.length)break;if(text(tokens[at++])!==',')throw new TypeError('Partition predicate has unresolved trailing tokens');}
    return rows;
  }
  const rows=list(trees[1].children);if(rows.length!==1)throw new TypeError('Partition cfg requires exactly one predicate');return rows[0];
}
const atomsOf=node=>node.kind==='atom'?[node.name]:node.children.flatMap(atomsOf);
const evaluate=(node,assignment)=>node.kind==='atom'?assignment.get(node.name):node.kind==='all'?node.children.every(child=>evaluate(child,assignment)):node.kind==='any'?node.children.some(child=>evaluate(child,assignment)):!evaluate(node.children[0],assignment);
export function proveDeclarativeBranchPartition({dependencies,branches}={}) {
  if(!isDeclarativeSourceProof(dependencies)||!Array.isArray(branches)||!branches.length||branches.length>32)throw new TypeError('Partition requires sealed source expansions and bounded branches');
  const root=forwardingRoot(branches[0].expansion);
  const rows=branches.map(({expansion,attributePath})=>{
    if(forwardingRoot(expansion)!==root)throw new TypeError('Partition branches must share their actual checked forwarding root');
    const {origin}=sourceFrame(dependencies,expansion),attribute=groupAt(expansion,attributePath);
    // Require the exact group to occur as an attribute in checked output, not
    // arbitrary cfg-shaped macro input selected by the caller.
    if(!inspectTrees(expansion.trees).attributes.some(row=>samePath(row.path,attributePath)))throw new TypeError('Partition path does not identify an actual expanded attribute');
    return {expansionDigest:expansion.digest,origin,attributePath:[...attributePath],formula:conditionFormula(attribute)};
  });
  const atoms=[...new Set(rows.flatMap(row=>atomsOf(row.formula)))].sort();
  if(atoms.length>12)throw new TypeError('Partition symbolic assignment budget exceeded');
  for(let bits=0;bits<2**atoms.length;bits++) {
    const assignment=new Map(atoms.map((atom,index)=>[atom,!!(bits&(1<<index))])),selected=rows.filter(row=>evaluate(row.formula,assignment));
    if(selected.length!==1)throw new TypeError('Expanded conditional branches are not an exhaustive disjoint propositional partition');
  }
  const evidence={schema:'declarative-conditional-partition-v1',dependencyDigest:dependencies.digest,rootDigest:root.digest,originalInput:root.input,rows,atoms,assignments:2**atoms.length,exhaustive:true,disjoint:true,platformSelected:false,ownerVerified:false,namespaceComplete:false,generatedBehavior:false};
  const result=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});partitions.add(result);return result;
}
export function isDeclarativeBranchPartition(value){return !!value&&partitions.has(value);}
