// Bounded source-token expansion only. No macro owner, namespace completeness,
// generated type layout or runtime implementation is inferred by this engine.
import {createHash} from 'node:crypto';
import {originalMacroTrees,macroTreeSource,freezeMacroTree} from './macro-token-trees.mjs';
import {boundedMacroBlock,boundedMacroExpression} from './macro-fragments.mjs';
const definitions=new WeakMap(),expansions=new WeakMap(),forwardedInputs=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const text=tree=>tree?.kind==='token'?tree.text:null;
const ident=tree=>tree?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text);
const fragments=new Set(['ident','tt','ty','meta','vis','block','expr']);
const forbiddenTypes=new Set('as async await break const continue dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return static struct trait true type unsafe use where while abstract become box do final gen macro override priv try typeof unsized virtual yield'.split(' '));
const names=nodes=>nodes.flatMap(node=>node.kind==='capture'||node.kind==='variable'?[node.name]:node.children?names(node.children):[]);

function plan(trees,mode,bindings,depth=0) {
  const result=[];
  for(let at=0;at<trees.length;at++) {
    const tree=trees[at];
    if(text(tree)==='$') {
      const next=trees[++at];
      if(next?.kind==='group'&&next.delimiter==='(') {
        if(depth)throw new TypeError('Nested declarative repetitions require a separate capture-shape profile');
        let separator=null,operator=text(trees[++at]);
        if(!['*','+','?'].includes(operator)){separator=trees[at];operator=text(trees[++at]);}
        if(!['*','+','?'].includes(operator)||separator&&(!text(separator)||operator==='?'))throw new TypeError('Unproved declarative repetition separator or operator');
        const children=plan(next.children,mode,bindings,depth+1);
        if(mode==='matcher'&&!names(children).length)throw new TypeError('Declarative repetition requires consuming source captures');
        result.push({kind:'repeat',children,separator,operator});continue;
      }
      if(!ident(next))throw new TypeError('Declarative metavariable needs an original identifier');
      if(mode==='template') {
        if(next.text==='crate'){result.push({kind:'crate-owner'});continue;}
        if(!bindings.has(next.text))throw new TypeError('Unbound declarative transcription variable');
        result.push({kind:'variable',name:next.text,depth});continue;
      }
      if(text(trees[++at])!==':'||!ident(trees[++at]))throw new TypeError('Declarative matcher requires an explicit fragment specifier');
      const fragment=trees[at].text;
      if(!fragments.has(fragment))throw new TypeError('Declarative fragment is outside the checked initial profile: '+fragment);
      if(fragment==='ty') {
        const follow=trees[at+1];
        if(follow&&!(follow.kind==='token'&&['=>',',','=','|',';',':','>','as','where'].includes(follow.text))&&!(follow.kind==='group'&&['[','{'].includes(follow.delimiter)))throw new TypeError('Declarative type fragment has an unproved Rust follow set');
      }
      if(fragment==='vis') {
        const follow=trees[at+1];
        const capture=text(follow)==='$'&&ident(trees[at+2])&&text(trees[at+3])===':'&&['ident','ty'].includes(text(trees[at+4]));
        const typeStart=follow?.kind==='group'&&['(','['].includes(follow.delimiter)||['&','*','!','::','<'].includes(text(follow));
        if(follow&&!capture&&!typeStart&&text(follow)!==','&&!(ident(follow)&&follow.text!=='priv'))throw new TypeError('Declarative visibility fragment has an unproved Rust follow set');
      }
      if(fragment==='expr') {
        const follow=trees[at+1];
        if(follow&&!['=>',',',';'].includes(text(follow)))throw new TypeError('Declarative expression fragment has an unproved Rust follow set');
      }
      if(bindings.has(next.text))throw new TypeError('Duplicate declarative matcher variable');
      bindings.set(next.text,{fragment,depth});result.push({kind:'capture',name:next.text,fragment,depth});continue;
    }
    result.push(tree.kind==='group'?{kind:'group',delimiter:tree.delimiter,children:plan(tree.children,mode,bindings,depth)}:{kind:'literal',tree});
  }
  return result;
}

export function compileDeclarativeMacro(source,{name,owner=[]}={}) {
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??'')||!Array.isArray(owner)||!owner.length||owner.length>32||owner.some(part=>typeof part!=='string'||part.length>128||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(part)))throw new TypeError('Declarative definition requires explicit bounded source name and untrusted owner identity');
  const trees=originalMacroTrees(source),found=[];
  for(let at=0;at<trees.length;at++) {
    let group=null;
    if(text(trees[at])==='macro_rules'&&text(trees[at+1])==='!'&&text(trees[at+2])===name)group=trees[at+3];
    else if(text(trees[at])==='macro'&&text(trees[at+1])===name)group=trees[at+2];
    if(group?.kind==='group'&&group.delimiter==='{')found.push(group);
  }
  if(found.length!==1)throw new TypeError('Declarative definition requires one original top-level rule body');
  const body=found[0],rules=[];
  for(let at=0;at<body.children.length;) {
    const matcher=body.children[at++],arrow=body.children[at++],template=body.children[at++];
    if(matcher?.kind!=='group'||text(arrow)!=='=>'||template?.kind!=='group')throw new TypeError('Unproved original declarative rule grammar');
    const bindings=new Map(),pattern=plan(matcher.children,'matcher',bindings),output=plan(template.children,'template',bindings);
    rules.push({pattern,output,bindings:[...bindings],span:{start:matcher.span.start,end:template.span.end}});
    if(at<body.children.length&&![';',','].includes(text(body.children[at++])))throw new TypeError('Unproved declarative rule terminator');
  }
  if(!rules.length||rules.length>32)throw new TypeError('Declarative rule count budget exceeded');
  const evidence={schema:'bounded-declarative-macro-definition-v1',name,owner:[...owner],ownerVerified:false,sourceSha256:hash(source),definitionSpan:body.span,rules};
  const definition=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});definitions.set(definition,{source,trees});return definition;
}

// Fragment opacity survives forwarding. Literal matching cannot inspect ty or
// meta AST fragments. Only Rust's ident/tt forwarding exceptions are exposed.
function sameLiteral(pattern,actual) {
  if(actual?.kind==='fragment')return ['ident','tt'].includes(actual.fragment)&&actual.trees.length===1&&sameLiteral(pattern,actual.trees[0]);
  return pattern?.kind==='token'&&actual?.kind==='token'&&pattern.text===actual.text;
}
function opaque(tree,fragment) {return tree?.kind==='fragment'&&tree.fragment===fragment;}
function boundedType(trees,start,depth=0) {
  if(depth>24)throw new TypeError('Declarative type fragment budget exceeded');
  if(opaque(trees[start],'ty'))return start+1;
  const tuple=trees[start];
  if(tuple?.kind==='group'&&tuple.delimiter==='(') {
    let at=0;
    while(at<tuple.children.length){const end=boundedType(tuple.children,at,depth+1);if(end===null)return null;at=end;if(at<tuple.children.length&&text(tuple.children[at++])!==',')return null;}
    return start+1;
  }
  let at=start;if(text(trees[at])==='::')at++;
  for(;;) {
    if(!ident(trees[at])||forbiddenTypes.has(text(trees[at])))return null;at++;
    if(text(trees[at])==='<') {
      at++;let count=0;
      for(;;) {
        const end=boundedType(trees,at,depth+1);if(end===null)return null;at=end;count++;
        if(text(trees[at])==='>'){at++;break;}
        if(text(trees[at++])!==',')return null;
        if(text(trees[at])==='>'){at++;break;}
      }
      if(!count)return null;
    }
    if(text(trees[at])!=='::')return at;at++;
  }
}
function fragmentEnd(fragment,trees,start) {
  if(opaque(trees[start],fragment))return start+1;
  // A checked Block AST is a Rust expression. Retain its opaque AST rather
  // than exposing its interior to literal matching when forwarded as Expr.
  if(fragment==='expr'&&opaque(trees[start],'block'))return start+1;
  const forwarded=trees[start];
  if(forwarded?.kind==='fragment') {
    if(['ident','tt'].includes(forwarded.fragment)&&forwarded.trees.length===1)return fragmentEnd(fragment,forwarded.trees,0)===1?start+1:null;
    throw new TypeError('Opaque declarative fragments require the same checked fragment kind when forwarded');
  }
  if(fragment==='tt')return start<trees.length?start+1:null;
  if(fragment==='ident')return ident(trees[start])?start+1:null;
  if(fragment==='ty')return boundedType(trees,start);
  if(fragment==='block')return boundedMacroBlock(trees[start],boundedType)?start+1:null;
  if(fragment==='expr')return boundedMacroExpression(trees,start,boundedType);
  if(fragment==='vis') {
    if(text(trees[start])!=='pub')return start;
    const restriction=trees[start+1];
    if(restriction?.kind!=='group')return start+1;
    if(restriction.delimiter==='('&&restriction.children.length===1&&['crate','self','super'].includes(text(restriction.children[0])))return start+2;
    throw new TypeError('Declarative visibility fragment requires checked source restriction');
  }
  if(fragment==='meta') {
    if(!ident(trees[start]))return null;
    let at=start+1;
    while(text(trees[at])==='::'){if(!ident(trees[at+1]))return null;at+=2;}
    if(text(trees[at])==='='){if(trees[at+1]?.kind!=='token'||trees[at+1].type!=='string')return null;return at+2;}
    if(trees[at]?.kind==='group') {
      if(trees[at].delimiter!=='('||trees[at].children.some(tree=>tree.kind!=='token'||!ident(tree)&&![',','='].includes(text(tree))&&tree.type!=='string'))throw new TypeError('Declarative meta fragment expression remains unproved');
      at++;
    }
    return at;
  }
  throw new TypeError('Unchecked declarative fragment kind');
}

function matchSequence(nodes,trees,start,captures,budget) {
  let at=start;
  for(let index=0;index<nodes.length;index++) {
    if(--budget.steps<0)throw new TypeError('Declarative matching step budget exceeded');
    const node=nodes[index];
    if(node.kind==='literal'){if(!sameLiteral(node.tree,trees[at]))return null;at++;continue;}
    if(node.kind==='group') {
      const actual=trees[at];if(actual?.kind!=='group'||actual.delimiter!==node.delimiter)return null;
      const nested=matchSequence(node.children,actual.children,0,captures,budget);
      if(nested===null||nested!==actual.children.length)return null;at++;continue;
    }
    if(node.kind==='capture') {
      const end=fragmentEnd(node.fragment,trees,at);if(end===null)return null;
      const value=freezeMacroTree({kind:'fragment',fragment:node.fragment,trees:trees.slice(at,end)});
      if(node.depth){if(!captures.has(node.name))captures.set(node.name,[]);captures.get(node.name).push(value);}
      else {if(captures.has(node.name))throw new TypeError('Declarative scalar capture was assigned twice');captures.set(node.name,value);}
      at=end;continue;
    }
    if(node.kind==='repeat') {
      if(index<nodes.length-1&&node.children[0]?.kind!=='literal')throw new TypeError('Declarative repetition lookahead may be locally ambiguous');
      let count=0;
      for(;;) {
        const next=nodes[index+1];
        if(next&&next.kind==='literal'&&node.children[0]?.kind==='literal'&&sameLiteral(node.children[0].tree,trees[at])&&sameLiteral(next.tree,trees[at]))throw new TypeError('Declarative repetition has locally ambiguous source tokens');
        const trial=new Map([...captures].map(([name,value])=>[name,Array.isArray(value)?[...value]:value]));
        const end=matchSequence(node.children,trees,at,trial,budget);
        if(end===null)break;if(end===at)throw new TypeError('Declarative repetition matched an empty source sequence');
        if(++count>budget.repetitions)throw new TypeError('Declarative repetition budget exceeded');
        captures.clear();for(const entry of trial)captures.set(...entry);at=end;
        if(node.operator==='?')break;
        if(node.separator){if(!sameLiteral(node.separator,trees[at]))break;at++;if(at===trees.length)throw new TypeError('Declarative repetition has an unmatched trailing separator');}
      }
      if(node.operator==='+'&&!count)return null;
      for(const name of names(node.children))if(!captures.has(name))captures.set(name,[]);
      continue;
    }
    throw new TypeError('Unproved declarative matcher node');
  }
  return at;
}

function transcribe(nodes,captures,owner,budget,iteration=null) {
  const output=[];
  for(const node of nodes) {
    if(--budget.output<0)throw new TypeError('Declarative output token budget exceeded');
    if(node.kind==='literal'){output.push(node.tree);continue;}
    if(node.kind==='crate-owner'){output.push({kind:'owner',target:[...owner],verified:false,sourceFeature:'definition-site-dollar-crate'});continue;}
    if(node.kind==='group'){output.push({kind:'group',delimiter:node.delimiter,children:transcribe(node.children,captures,owner,budget,iteration)});continue;}
    if(node.kind==='variable') {
      const value=captures.get(node.name);
      if(Array.isArray(value)) {
        if(iteration===null||!node.depth)throw new TypeError('Declarative capture repetition depth differs from transcription');
        if(!value[iteration])throw new TypeError('Declarative capture repetition arity mismatch');output.push(value[iteration]);
      } else {if(!value)throw new TypeError('Missing declarative transcription capture');output.push(value);}
      continue;
    }
    if(node.kind==='repeat') {
      const repeated=names(node.children).map(name=>captures.get(name)).filter(Array.isArray);
      if(!repeated.length||repeated.some(value=>value.length!==repeated[0].length))throw new TypeError('Declarative transcription needs consistent source repetition arity');
      const length=repeated[0].length;if(node.operator==='+'&&!length||node.operator==='?'&&length>1)throw new TypeError('Declarative transcription repetition operator disagrees with captures');
      for(let at=0;at<length;at++){if(at&&node.separator)output.push(node.separator);output.push(...transcribe(node.children,captures,owner,budget,at));}continue;
    }
    throw new TypeError('Unproved declarative transcription node');
  }
  return output;
}

function checkOutputBudget(trees) {
  const pending=[...trees];let cells=32000,bytes=4*1024*1024;
  while(pending.length) {
    const tree=pending.pop();
    if(--cells<0)throw new TypeError('Declarative expanded fragment cell budget exceeded');
    bytes-=256+Buffer.byteLength(tree.kind==='token'?tree.text:tree.kind==='owner'?tree.target.join('::'):'');
    if(bytes<0)throw new TypeError('Declarative expanded fragment byte budget exceeded');
    const children=tree.kind==='group'?tree.children:tree.kind==='fragment'?tree.trees:[];
    if(children.length>cells+1)throw new TypeError('Declarative expanded fragment cell budget exceeded');
    pending.push(...children);
  }
}

export function expandDeclarativeMacro(definition,input,{steps=16000,repetitions=128,output=32000}={}) {
  const forwarded=forwardedInputs.get(input),original=macroTreeSource(input);
  if(!definitions.has(definition)||!original&&!forwarded)throw new TypeError('Declarative expansion requires sealed definition and original or privately forwarded input trees');
  const inputEvidence=forwarded?{kind:'checked-expansion',parentDigest:forwarded.parent.digest,path:forwarded.path,sha256:hash(JSON.stringify(input))}:{kind:'original-source',sha256:original.sha256};
  const depth=forwarded?expansions.get(forwarded.parent).depth+1:0;
  if(depth>32)throw new TypeError('Declarative recursive expansion depth budget exceeded');
  if(![steps,repetitions,output].every(value=>Number.isSafeInteger(value)&&value>0&&value<=100000))throw new TypeError('Invalid declarative expansion budgets');
  const budget={steps,repetitions,output};
  for(let index=0;index<definition.rules.length;index++) {
    const rule=definition.rules[index],captures=new Map(),end=matchSequence(rule.pattern,input,0,captures,budget);
    if(end!==input.length)continue;
    const trees=transcribe(rule.output,captures,definition.owner,budget);
    checkOutputBudget(trees);
    const evidence={schema:'bounded-declarative-expansion-v1',definitionDigest:definition.digest,input:inputEvidence,rule:index,trees,ownerVerified:false,namespaceComplete:false,generatedBehavior:false,remainingBudgets:budget};
    const proof=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});expansions.set(proof,{definition,input,depth});return proof;
  }
  throw new TypeError('Original invocation does not match a checked declarative rule');
}
export function isDeclarativeExpansion(value){return !!value&&expansions.has(value);}
export function declarativeNamespaceObservation(proof) {
  if(!expansions.has(proof))throw new TypeError('Namespace observations require privately checked expansion trees');
  const identifier=tree=>tree?.kind==='token'&&ident(tree)?tree.text:tree?.kind==='fragment'&&['ident','tt'].includes(tree.fragment)&&tree.trees.length===1?identifier(tree.trees[0]):null;
  const declarations=[];
  for(let at=0;at<proof.trees.length;at++)if(['static','const','struct','enum','fn','mod','type'].includes(text(proof.trees[at]))) {
    const term=text(proof.trees[at]),name=identifier(proof.trees[at+1]);
    if(name)declarations.push({term,name,namespace:['struct','enum','mod','type'].includes(term)?'type':'value',outputTokenIndex:at});
  }
  return freezeMacroTree({schema:'declarative-namespace-observation-v1',expansionDigest:proof.digest,declarations,dimensions:{typeNamespaceComplete:false,valueNamespaceComplete:false,bangMacroComplete:false,attributeMacroComplete:false},ownerVerified:false,generatedBehavior:false,obligation:'Observed emitted names do not close nested macro or attribute expansion and are not binding authority.'});
}
export function declarativeSubInput(proof,path=[]) {
  if(!expansions.has(proof)||!Array.isArray(path)||path.length>64||path.some(index=>!Number.isSafeInteger(index)||index<0))throw new TypeError('Unsealed declarative forwarding source or tree path');
  let trees=proof.trees;
  for(const index of path){const tree=trees[index];if(tree?.kind!=='group')throw new TypeError('Declarative forwarding path does not identify original expanded delimiters');trees=tree.children;}
  forwardedInputs.set(trees,{parent:proof,path:[...path]});return trees;
}
