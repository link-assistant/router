// Bounded source-token expansion only. No macro owner, namespace completeness,
// generated type layout or runtime implementation is inferred by this engine.
import {createHash} from 'node:crypto';
import {originalMacroTrees,macroTreeSource,freezeMacroTree,originalMacroTreeText} from './macro-token-trees.mjs';
import {boundedMacroBlock,boundedMacroExpression} from './macro-fragments.mjs';
import {boundedMacroItem} from './macro-items.mjs';
import {originalMacroArrayTypeRules,originalMacroArrayLiteralLength} from './macro-array-type-source.mjs';
import {originalMacroSequenceFollowRule,assertOriginalMacroSequenceFollowRule} from './macro-follow-source.mjs';
import {originalMacroMetavarRules,assertOriginalMacroMetavarRules} from './macro-metavar-source.mjs';
import {requireOriginalMacroLiteralGrammar,originalMacroLiteralEnd} from './macro-literal-source.mjs';
import {requireOriginalMacroEofRule} from './macro-eof-source.mjs';
// Each instance keeps separate definition, expansion and forwarding authority.
export function createLocalDeclarativeMacroEngine(sourceFragmentAdapter=null,literalGrammar=null,eofRule=null) {
if(eofRule!==null)requireOriginalMacroEofRule(eofRule);
if(literalGrammar!==null)requireOriginalMacroLiteralGrammar(literalGrammar);
const definitions=new WeakMap(),expansions=new WeakMap(),forwardedInputs=new WeakMap(),nestedInvocations=new WeakMap();
const {isOriginalMacroFragmentContext,originalMacroFragmentDefinition,parseOriginalMacroFragment}=sourceFragmentAdapter??{};
const hash=value=>createHash('sha256').update(value).digest('hex');
const text=tree=>tree?.kind==='token'?tree.text:null;
const ident=tree=>tree?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text);
const fragments=new Set(['ident','tt','ty','meta','vis','block','expr','item','lifetime']);
if(literalGrammar!==null)fragments.add('literal');
const forbiddenTypes=new Set('as async await break const continue dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return static struct trait true type unsafe use where while abstract become box do final gen macro override priv try typeof unsized virtual yield'.split(' '));
const names=nodes=>nodes.flatMap(node=>['capture','variable','ignore-variable'].includes(node.kind)?[node.name]:node.children?names(node.children):[]);
const syntax=(tree,end=tree)=>({sourceSha256:tree.sourceSha256,span:{start:tree.span.start,end:end.span.end},...(tree.sourceFeature?{sourceFeature:tree.sourceFeature}:{})});

// FOLLOW(ty/expr/pat) is checked on the actual planned matcher, including every
// nullable exit and original rustc separator rule of each repetition. Unknown
// fragment FIRST sets are carried; their opaque ASTs are never exposed.
function assertTypeFollowers(pattern){
  let cells=32000;const end='end',allowed=new Set(['=>',',','=','|',';',':','>','as','where'].map(value=>'literal:'+value));allowed.add('group:[');allowed.add('group:{');allowed.add(end);
  const literal=tree=>tree?.kind==='token'?'literal:'+tree.text:tree?.kind==='group'?'group:'+tree.delimiter:'unknown';
  function first(nodes,start=0,depth=0){
    if(depth>8)throw new TypeError('Declarative follow-set nesting budget');const result=new Set();for(let at=start;at<nodes.length;at++){
      if(--cells<0)throw new TypeError('Declarative follow-set cell budget');const node=nodes[at];let values,nullable=false;
      if(node.kind==='literal')values=[literal(node.tree)];else if(node.kind==='group')values=['group:'+node.delimiter];else if(node.kind==='capture')values=['capture:'+node.fragment];else if(node.kind==='repeat'){const child=first(node.children,0,depth+1);values=[...child].filter(value=>value!==end);nullable=['*','?'].includes(node.operator)||child.has(end);}else values=['unknown'];
      for(const value of values)result.add(value);if(!nullable)return result;
    }result.add(end);return result;
  }
  const suffix=(nodes,start,outer)=>{const result=first(nodes,start);if(result.delete(end))for(const value of outer)result.add(value);return result;};
  function check(nodes,outer=new Set([end]),depth=0){
    if(depth>64)throw new TypeError('Declarative follow-set nesting budget');for(let at=0;at<nodes.length;at++){
      if(--cells<0)throw new TypeError('Declarative follow-set cell budget');const node=nodes[at],following=suffix(nodes,at+1,outer);
      if(node.kind==='capture') {
        const permitted=node.fragment==='ty'?allowed:node.fragment==='pat'?new Set(['literal:=>','literal:,','literal:=','literal:if','literal:in',end]):node.fragment==='expr'?new Set(['literal:=>','literal:,','literal:;',end]):null;
        if(permitted&&[...following].some(value=>!permitted.has(value)))throw new TypeError('Declarative '+(node.fragment==='ty'?'type':node.fragment==='pat'?'pattern':'expression')+' fragment has an unproved Rust follow set');
      }
      if(node.kind==='group')check(node.children,new Set([end]),depth+1);
      if(node.kind==='repeat'){
        const rule=assertOriginalMacroSequenceFollowRule(originalMacroSequenceFollowRule()),next=new Set(following);
        if(rule.includeOwnFirst!==false||rule.includeSeparator!==true)throw new TypeError('Unsupported original repetition FOLLOW plan');
        if(node.separator)next.add(literal(node.separator));check(node.children,next,depth+1);
      }
    }
  }check(pattern);
}

// Conservative FIRST/nullability over the actual matcher grammar. A grouped
// token tree consumes its delimiter even when its children are empty. Opaque
// fragments remain nonterminals: their interiors never enter this analysis.
function matcherFirst(nodes,depth=0,budget={cells:32000}) {
  if(depth>8)throw new TypeError('Declarative lookahead nesting budget');
  const starts=[];
  for(const node of nodes) {
    if(--budget.cells<0)throw new TypeError('Declarative lookahead cell budget');
    if(node.kind==='repeat') {
      const child=matcherFirst(node.children,depth+1,budget);starts.push(...child.starts);
      if(['*','?'].includes(node.operator)||child.nullable)continue;
    } else {
      starts.push(node);
      if(node.kind==='capture'&&node.fragment==='vis')continue;
    }
    return {starts,nullable:false};
  }
  return {starts,nullable:true};
}
function matcherStartsOverlap(left,right) {
  if(left.kind==='capture'&&right.kind!=='capture')return matcherStartsOverlap(right,left);
  if(left.kind==='literal'&&right.kind==='literal')return text(left.tree)===text(right.tree);
  if(left.kind==='group'&&right.kind==='group')return left.delimiter===right.delimiter;
  if(left.kind==='literal'&&right.kind==='group'||left.kind==='group'&&right.kind==='literal')return false;
  if(right.kind==='capture') {
    if(left.kind==='capture')return true;
    if(['tt','expr','item','block'].includes(right.fragment)) {
      if(right.fragment==='block')return left.kind==='group'&&left.delimiter==='{';
      return true;
    }
    if(left.kind==='group')return right.fragment==='ty'&&['(','['].includes(left.delimiter);
    if(left.kind==='literal') {
      if(right.fragment==='vis')return text(left.tree)==='pub';
      if(['ident','meta'].includes(right.fragment))return ident(left.tree);
      if(right.fragment==='ty')return ident(left.tree)||['&','*','!','::','<'].includes(text(left.tree));
    }
  }
  return true;
}

// A shared first literal alone cannot distinguish `#[left ...]` from
// `#[right ...]`. Compare only mandatory fixed matcher terminals: a group
// consumes exactly one TT, and an interior required literal can prove two
// same-delimiter groups disjoint. Continuing outside a group requires its
// entire matcher to be equal fixed terminals; a capture or nullable interior
// cannot be skipped to inspect a later outside token. Captures are never parsed or looked through.
// Nullable repetitions retain every possible leading sequence. Unknown or
// exhausted analysis falls back to the existing ambiguity refusal.
function matcherLiteralPrefixesDisjoint(left,right) {
  let cells=32000;
  function alternatives(nodes,depth){
    if(depth>8||--cells<0)return null;
    const first=nodes[0];if(first?.kind!=='repeat')return [nodes];
    const repeated=alternatives(first.children,depth+1);if(!repeated)return null;
    if(['*','?'].includes(first.operator)||matcherFirst(first.children).nullable){const suffix=alternatives(nodes.slice(1),depth+1);if(!suffix)return null;return [...repeated,...suffix];}
    return repeated;
  }
  function sequences(a,b,depth){
    if(depth>8||--cells<0)return false;
    const lefts=alternatives(a,depth),rights=alternatives(b,depth);if(!lefts||!rights)return false;
    return lefts.every(x=>rights.every(y=>fixed(x,y,depth+1)));
  }
  function equalFixed(a,b,depth){
    if(depth>8||--cells<0||a.length!==b.length)return false;
    return a.every((x,index)=>{const y=b[index];if(--cells<0)return false;if(x.kind==='literal'&&y.kind==='literal')return sameLiteral(x.tree,y.tree);return x.kind==='group'&&y.kind==='group'&&x.delimiter===y.delimiter&&equalFixed(x.children,y.children,depth+1);});
  }
  function fixed(a,b,depth){
    if(depth>8||--cells<0)return false;
    for(let at=0;at<a.length&&at<b.length;at++){
      const x=a[at],y=b[at];if(--cells<0)return false;
      if(x.kind==='repeat'||y.kind==='repeat')return sequences(a.slice(at),b.slice(at),depth+1);
      if(!matcherStartsOverlap(x,y))return true;
      if(x.kind==='literal'&&y.kind==='literal')continue;
      if(x.kind==='group'&&y.kind==='group'){if(sequences(x.children,y.children,depth+1))return true;if(!equalFixed(x.children,y.children,depth+1))return false;continue;}
      return false;
    }
    // Only an actual exhausted sequence versus a required fixed terminal is
    // separated by EOF. A capture, nullable prefix, equal empty paths, or an
    // exhausted proof budget retains the old ambiguity refusal.
    const remaining=a.length>b.length?a.slice(b.length):b.slice(a.length);
    return eofRule!==null&&a.length!==b.length&&['literal','group'].includes(remaining[0]?.kind);
  }
  return sequences(left,right,0);
}
function plan(trees,mode,bindings,depth=0,sourceFragments=null) {
  const result=[];
  for(let at=0;at<trees.length;at++) {
    const tree=trees[at];
    if(text(tree)==='$') {
      const next=trees[++at];
      if(next?.kind==='group'&&next.delimiter==='(') {
        if(depth>=4)throw new TypeError('Nested declarative capture-shape depth budget exceeded');
        let separator=null,operator=text(trees[++at]);
        if(!['*','+','?'].includes(operator)){separator=trees[at];operator=text(trees[++at]);}
        if(!['*','+','?'].includes(operator)||separator&&(!text(separator)||operator==='?'))throw new TypeError('Unproved declarative repetition separator or operator');
        const children=plan(next.children,mode,bindings,depth+1,sourceFragments);
        if(mode==='matcher'&&!names(children).length&&matcherFirst(children).nullable)throw new TypeError('Declarative repetition requires a consuming original source sequence');
        result.push({kind:'repeat',children,separator,operator,sourceSyntax:syntax(tree,trees[at])});continue;
      }
      if(next?.kind==='group'&&next.delimiter==='{'){
        if(mode!=='template')throw new TypeError('Metavariable expressions are supported only in original transcribers');
        const body=next.children,args=body[1];
        if(body.length!==2||text(body[0])!=='ignore'||args?.delimiter!=='('||args.children.length!==2||text(args.children[0])!=='$'||!ident(args.children[1]))throw new TypeError('Original transcriber requires exactly ignore($bound_name); other metavariable expressions remain unproved');
        const name=text(args.children[1]);if(!bindings.has(name))throw new TypeError('Unbound original ignore transcription variable');
        const sourceRule=assertOriginalMacroMetavarRules(originalMacroMetavarRules());result.push({kind:'ignore-variable',name,sourceRuleDigest:sourceRule.digest,sourceSyntax:syntax(tree,next)});continue;
      }
      if(!ident(next))throw new TypeError('Declarative metavariable needs an original identifier');
      if(mode==='template') {
        if(next.text==='crate'){result.push({kind:'crate-owner',sourceSyntax:syntax(tree,next)});continue;}
        if(!bindings.has(next.text))throw new TypeError('Unbound declarative transcription variable');
        const binding=bindings.get(next.text);
        if(binding.depth&&binding.depth!==depth)throw new TypeError('Declarative capture repetition depth differs from transcription');
        result.push({kind:'variable',name:next.text,depth:binding.depth,sourceSyntax:syntax(tree,next)});continue;
      }
      if(text(trees[++at])!==':'||!ident(trees[++at]))throw new TypeError('Declarative matcher requires an explicit fragment specifier');
      const fragment=trees[at].text;
      if(!fragments.has(fragment)&&!(fragment==='pat'&&sourceFragments))throw new TypeError('Declarative fragment is outside the checked initial profile: '+fragment);
      if(fragment==='lifetime')assertOriginalMacroMetavarRules(originalMacroMetavarRules());
      if(fragment==='vis') {
        const follow=trees[at+1];
        const capture=text(follow)==='$'&&ident(trees[at+2])&&text(trees[at+3])===':'&&['ident','ty'].includes(text(trees[at+4]));
        const typeStart=follow?.kind==='group'&&['(','['].includes(follow.delimiter)||['&','*','!','::','<'].includes(text(follow));
        if(follow&&!capture&&!typeStart&&text(follow)!==','&&!(ident(follow)&&follow.text!=='priv'))throw new TypeError('Declarative visibility fragment has an unproved Rust follow set');
      }
      // Complete nullable/repetition FOLLOW sets are checked on the planned
      // matcher by assertTypeFollowers; one raw '$' is not its following token.
      if(bindings.has(next.text))throw new TypeError('Duplicate declarative matcher variable');
      bindings.set(next.text,{fragment,depth});result.push({kind:'capture',name:next.text,fragment,depth,sourceSyntax:syntax(tree,trees[at])});continue;
    }
    result.push(tree.kind==='group'?{kind:'group',delimiter:tree.delimiter,children:plan(tree.children,mode,bindings,depth,sourceFragments),sourceSyntax:syntax(tree)}:{kind:'literal',tree});
  }
  return result;
}

function compileDeclarativeMacro(source,{name,owner=[],sourceFragments=null,maxRules=32}={}) {
  if(literalGrammar!==null)requireOriginalMacroLiteralGrammar(literalGrammar);
  if(!Number.isSafeInteger(maxRules)||maxRules<1||maxRules>64)throw new TypeError('Declarative explicit rule budget must be an integer from 1 through 64');
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name??'')||!Array.isArray(owner)||!owner.length||owner.length>32||owner.some(part=>typeof part!=='string'||part.length>128||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(part)))throw new TypeError('Declarative definition requires explicit bounded source name and untrusted owner identity');
  if(sourceFragments!==null){
    if(!sourceFragmentAdapter)throw new TypeError('Token-only declarative expansion rejects source AST fragment contexts');
    if(!isOriginalMacroFragmentContext(sourceFragments))throw new TypeError('Declarative source fragments require a private original parser context');
    const original=originalMacroFragmentDefinition(sourceFragments);
    if(original.source!==source||original.name!==name||original.edition!=='2024')throw new TypeError('Declarative fragment definition/source edition differs from its private original profile');
  }
  const trees=originalMacroTrees(source),found=[];
  for(let at=0;at<trees.length;at++) {
    let group=null,inlineMatcher=null;
    if(text(trees[at])==='macro_rules'&&text(trees[at+1])==='!'&&text(trees[at+2])===name)group=trees[at+3];
    else if(text(trees[at])==='macro'&&text(trees[at+1])===name){
      group=trees[at+2];
      if(group?.kind==='group'&&group.delimiter==='('){inlineMatcher=group;group=trees[at+3];}
    }
    if(group?.kind==='group'&&group.delimiter==='{')found.push({body:group,inlineMatcher});
  }
  if(found.length!==1)throw new TypeError('Declarative definition requires one original top-level rule body');
  const {body,inlineMatcher}=found[0],rules=[];
  const addRule=(matcher,template)=>{
    const bindings=new Map(),pattern=plan(matcher.children,'matcher',bindings,0,sourceFragments),output=plan(template.children,'template',bindings,0,sourceFragments);assertTypeFollowers(pattern);
    rules.push({pattern,output,bindings:[...bindings],span:{start:matcher.span.start,end:template.span.end}});
  };
  if(inlineMatcher)addRule(inlineMatcher,body);
  else for(let at=0;at<body.children.length;) {
    const matcher=body.children[at++],arrow=body.children[at++],template=body.children[at++];
    if(matcher?.kind!=='group'||text(arrow)!=='=>'||template?.kind!=='group')throw new TypeError('Unproved original declarative rule grammar');
    addRule(matcher,template);
    if(at<body.children.length&&![';',','].includes(text(body.children[at++])))throw new TypeError('Unproved declarative rule terminator');
  }
  if(!rules.length||rules.length>maxRules)throw new TypeError('Declarative rule count budget exceeded');
  const evidence={schema:'bounded-declarative-macro-definition-v1',name,owner:[...owner],ownerVerified:false,sourceSha256:hash(source),definitionSpan:body.span,...(inlineMatcher?{declarationForm:'single-rule-decl-macro',matcherSpan:inlineMatcher.span}:{}),...(maxRules!==32?{explicitRuleBudget:maxRules}:{}),rules};
  const definition=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});definitions.set(definition,{source,trees,sourceFragments});return definition;
}

// Fragment opacity survives forwarding. Literal matching cannot inspect ty or
// meta AST fragments. Only Rust's ident/lifetime/tt forwarding exceptions are exposed.
function sameLiteral(pattern,actual) {
  if(actual?.kind==='fragment')return ['ident','lifetime','tt'].includes(actual.fragment)&&actual.trees.length===1&&sameLiteral(pattern,actual.trees[0]);
  return pattern?.kind==='token'&&actual?.kind==='token'&&pattern.text===actual.text;
}
function transparentTree(tree) {
  while(tree?.kind==='fragment'&&['ident','lifetime','tt'].includes(tree.fragment)&&tree.trees.length===1)tree=tree.trees[0];
  return tree;
}
function opaque(tree,fragment) {return tree?.kind==='fragment'&&tree.fragment===fragment;}
function boundedType(trees,start,depth=0) {
  if(depth>24)throw new TypeError('Declarative type fragment budget exceeded');
  if(opaque(transparentTree(trees[start]),'ty'))return start+1;
  const typeText=tree=>text(transparentTree(tree)),typeIdent=tree=>ident(transparentTree(tree));
  if(typeText(trees[start])==='*'){if(!['const','mut'].includes(typeText(trees[start+1])))return null;return boundedType(trees,start+2,depth+1);}
  const tuple=transparentTree(trees[start]);
  if(tuple?.kind==='group'&&tuple.delimiter==='[') {
    const rule=originalMacroArrayTypeRules(),end=boundedType(tuple.children,0,depth+1);
    if(end===null)return null;
    if(end===tuple.children.length)return start+1;
    return typeText(tuple.children[end])===';'&&end+2===tuple.children.length&&originalMacroArrayLiteralLength(rule,tuple.children[end+1])?start+1:null;
  }
  if(tuple?.kind==='group'&&tuple.delimiter==='(') {
    let at=0;
    while(at<tuple.children.length){const end=boundedType(tuple.children,at,depth+1);if(end===null)return null;at=end;if(at<tuple.children.length&&typeText(tuple.children[at++])!==',')return null;}
    return start+1;
  }
  let at=start;if(typeText(trees[at])==='::')at++;
  for(;;) {
    if(!typeIdent(trees[at])||forbiddenTypes.has(typeText(trees[at])))return null;at++;
    if(typeText(trees[at])==='<') {
      at++;let count=0;
      for(;;) {
        const end=boundedType(trees,at,depth+1);if(end===null)return null;at=end;count++;
        if(typeText(trees[at])==='>'){at++;break;}
        if(typeText(trees[at++])!==',')return null;
        if(typeText(trees[at])==='>'){at++;break;}
      }
      if(!count)return null;
    }
    if(typeText(trees[at])!=='::')return at;at++;
  }
}
function boundedMeta(trees,start,depth=0) {
  if(depth>24)throw new TypeError('Declarative meta fragment depth budget exceeded');
  if(opaque(trees[start],'meta'))return start+1;
  if(!ident(trees[start]))return null;
  let at=start+1;
  while(text(trees[at])==='::'){if(!ident(trees[at+1]))return null;at+=2;}
  if(text(trees[at])==='=') {
    const value=trees[at+1];
    return value?.kind==='token'&&(['string','number'].includes(value.type)||['true','false'].includes(value.text))?at+2:null;
  }
  if(trees[at]?.kind==='group') {
    const group=trees[at];if(group.delimiter!=='(')return null;let child=0;
    while(child<group.children.length) {
      const end=boundedMeta(group.children,child,depth+1);if(end===null)return null;child=end;
      if(child<group.children.length&&text(group.children[child++])!==',')return null;
    }
    at++;
  }
  return at;
}
function fragmentEnd(fragment,trees,start) {
  // Rust's TT parser captures an invisible-delimited nonterminal as one
  // tree. Keep its opaque fragment intact; this never exposes its interior.
  if(fragment==='tt')return start<trees.length?start+1:null;
  if(fragment==='literal')return originalMacroLiteralEnd(literalGrammar,trees,start)?.end??null;
  if(fragment==='expr'&&(opaque(trees[start],'expr')||opaque(trees[start],'block')))return boundedMacroExpression(trees,start,boundedType);
  if(opaque(trees[start],fragment))return start+1;
  // A checked Block AST is a Rust expression. Retain its opaque AST rather
  // than exposing its interior to literal matching when forwarded as Expr.
  if(fragment==='expr'&&opaque(trees[start],'block'))return start+1;
  const forwarded=trees[start];
  if(forwarded?.kind==='fragment') {
    if(['ident','lifetime','tt'].includes(forwarded.fragment)&&forwarded.trees.length===1){if(fragment==='ty')return boundedType(trees,start);if(fragment==='expr')return boundedMacroExpression(trees,start,boundedType);return fragmentEnd(fragment,forwarded.trees,0)===1?start+1:null;}
    throw new TypeError('Opaque declarative fragments require the same checked fragment kind when forwarded');
  }
  if(fragment==='ident')return ident(trees[start])?start+1:null;
  if(fragment==='lifetime'){assertOriginalMacroMetavarRules(originalMacroMetavarRules());return trees[start]?.kind==='token'&&trees[start].type==='char'&&/^'[A-Za-z_][A-Za-z0-9_]*$/u.test(trees[start].text)?start+1:null;}
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
  if(fragment==='meta')return boundedMeta(trees,start);
  if(fragment==='item')return boundedMacroItem(trees,start,boundedMeta);
  throw new TypeError('Unchecked declarative fragment kind');
}

const copyCapture=value=>Array.isArray(value)?value.map(copyCapture):value;
function captureArray(captures,name,indices) {
  let array=captures.get(name);
  if(array===undefined){array=[];captures.set(name,array);}
  if(!Array.isArray(array))throw new TypeError('Declarative capture shape is not a repetition');
  for(const index of indices) {
    if(array[index]===undefined)array[index]=[];
    if(!Array.isArray(array[index]))throw new TypeError('Declarative nested capture shape differs from source repetition');
    array=array[index];
  }
  return array;
}
function matchSequence(nodes,trees,start,captures,budget,indices=[],sourceFragments=null) {
  let at=start;
  for(let index=0;index<nodes.length;index++) {
    if(--budget.steps<0)throw new TypeError('Declarative matching step budget exceeded');
    const node=nodes[index];
    if(node.kind==='literal'){if(!sameLiteral(node.tree,trees[at]))return null;at++;continue;}
    if(node.kind==='group') {
      const actual=transparentTree(trees[at]);if(actual?.kind!=='group'||actual.delimiter!==node.delimiter)return null;
      const nested=matchSequence(node.children,actual.children,0,captures,budget,indices,sourceFragments);
      if(nested===null||nested!==actual.children.length)return null;at++;continue;
    }
    if(node.kind==='capture') {
      const parsed=sourceFragments&&['expr','pat'].includes(node.fragment)?parseOriginalMacroFragment(sourceFragments,node.fragment,trees,at):null;
      const end=parsed?.end??fragmentEnd(node.fragment,trees,at);if(end===null)return null;
      const value=freezeMacroTree({kind:'fragment',fragment:node.fragment,trees:trees.slice(at,end),...(parsed?{sourceAstCapture:parsed.capture}:{})});
      if(node.depth) {
        if(indices.length!==node.depth)throw new TypeError('Declarative capture depth lacks source iteration evidence');
        const array=captureArray(captures,node.name,indices.slice(0,-1)),index=indices.at(-1);
        if(array[index]!==undefined)throw new TypeError('Declarative repetition capture was assigned twice');array[index]=value;
      }
      else {if(captures.has(node.name))throw new TypeError('Declarative scalar capture was assigned twice');captures.set(node.name,value);}
      at=end;continue;
    }
    if(node.kind==='repeat') {
      const repeatedFirst=matcherFirst(node.children),followingFirst=matcherFirst(nodes.slice(index+1));
      const startsOverlap=repeatedFirst.starts.some(left=>followingFirst.starts.some(right=>matcherStartsOverlap(left,right))),prefixDisjoint=startsOverlap&&matcherLiteralPrefixesDisjoint(node.children,nodes.slice(index+1));
      if(startsOverlap&&!prefixDisjoint)throw new TypeError('Declarative repetition lookahead may be locally ambiguous');
      let count=0;
      for(const name of names(node.children))captureArray(captures,name,indices);
      for(;;) {
        const next=nodes[index+1];
        if(next&&next.kind==='literal'&&node.children[0]?.kind==='literal'&&sameLiteral(node.children[0].tree,trees[at])&&sameLiteral(next.tree,trees[at])&&!prefixDisjoint)throw new TypeError('Declarative repetition has locally ambiguous source tokens');
        let candidate=at;
        if(count&&node.separator){if(!sameLiteral(node.separator,trees[candidate]))break;candidate++;}
        const trial=new Map([...captures].map(([name,value])=>[name,copyCapture(value)]));
        const end=matchSequence(node.children,trees,candidate,trial,budget,[...indices,count],sourceFragments);
        if(end===null)break;if(end===candidate)throw new TypeError('Declarative repetition matched an empty source sequence');
        if(++count>budget.repetitions)throw new TypeError('Declarative repetition budget exceeded');
        captures.clear();for(const entry of trial)captures.set(...entry);at=end;
        if(node.operator==='?')break;
      }
      if(node.operator==='+'&&!count)return null;
      continue;
    }
    throw new TypeError('Unproved declarative matcher node');
  }
  return at;
}

function captureAt(captures,name,indices) {
  let value=captures.get(name);
  for(const index of indices){if(!Array.isArray(value))throw new TypeError('Declarative transcription capture shape differs from source');value=value[index];}
  return value;
}
function transcribe(nodes,captures,owner,budget,indices=[]) {
  const output=[];
  for(const node of nodes) {
    if(--budget.output<0)throw new TypeError('Declarative output token budget exceeded');
    if(node.kind==='literal'){output.push(node.tree);continue;}
    if(node.kind==='crate-owner'){output.push({kind:'owner',target:[...owner],verified:false,sourceFeature:'definition-site-dollar-crate',sourceSyntax:node.sourceSyntax});continue;}
    if(node.kind==='group'){output.push({kind:'group',delimiter:node.delimiter,children:transcribe(node.children,captures,owner,budget,indices),sourceSyntax:node.sourceSyntax});continue;}
    if(node.kind==='variable') {
      if(node.depth>indices.length)throw new TypeError('Declarative capture repetition depth differs from transcription');
      const value=captureAt(captures,node.name,indices.slice(0,node.depth));
      if(!value||Array.isArray(value))throw new TypeError('Declarative transcription capture arity mismatch');output.push(value);
      continue;
    }
    if(node.kind==='ignore-variable'){
      const sourceRule=assertOriginalMacroMetavarRules(originalMacroMetavarRules());if(node.sourceRuleDigest!==sourceRule.digest||!captures.has(node.name))throw new TypeError('Original ignore requires its bound LHS match and pinned source rule');
      // The original Ignore arm checks matched_from_ident without descending
      // or emitting a token. Its referenced name still constrains repetition.
      continue;
    }
    if(node.kind==='repeat') {
      const repeated=names(node.children).map(name=>{
        const value=captures.get(name);return Array.isArray(value)?captureAt(captures,name,indices):value;
      }).filter(Array.isArray);
      if(!repeated.length||repeated.some(value=>value.length!==repeated[0].length))throw new TypeError('Declarative transcription needs consistent source repetition arity');
      const length=repeated[0].length;if(node.operator==='+'&&!length||node.operator==='?'&&length>1)throw new TypeError('Declarative transcription repetition operator disagrees with captures');
      for(let at=0;at<length;at++){if(at&&node.separator)output.push(node.separator);output.push(...transcribe(node.children,captures,owner,budget,[...indices,at]));}continue;
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

function expandDeclarativeMacro(definition,input,{steps=16000,repetitions=128,output=32000}={}) {
  if(literalGrammar!==null)requireOriginalMacroLiteralGrammar(literalGrammar);
  if(eofRule!==null)requireOriginalMacroEofRule(eofRule);
  const forwarded=forwardedInputs.get(input),original=macroTreeSource(input);
  if(!definitions.has(definition)||!original&&!forwarded)throw new TypeError('Declarative expansion requires sealed definition and original or privately forwarded input trees');
  const inputEvidence=forwarded?{kind:forwarded.nested?'checked-nested-macro-input':'checked-expansion',parentDigest:forwarded.parent.digest,path:forwarded.path,sha256:hash(JSON.stringify(input))}:{kind:'original-source',sha256:original.sha256};
  const depth=forwarded?expansions.get(forwarded.parent).depth+1:0;
  if(depth>32)throw new TypeError('Declarative recursive expansion depth budget exceeded');
  if(![steps,repetitions,output].every(value=>Number.isSafeInteger(value)&&value>0&&value<=100000))throw new TypeError('Invalid declarative expansion budgets');
  const budget={steps,repetitions,output};
  for(let index=0;index<definition.rules.length;index++) {
    const rule=definition.rules[index],captures=new Map(),end=matchSequence(rule.pattern,input,0,captures,budget,[],definitions.get(definition).sourceFragments);
    if(end!==input.length)continue;
    const trees=transcribe(rule.output,captures,definition.owner,budget);
    checkOutputBudget(trees);
    const evidence={schema:'bounded-declarative-expansion-v1',definitionDigest:definition.digest,input:inputEvidence,rule:index,trees,ownerVerified:false,namespaceComplete:false,generatedBehavior:false,remainingBudgets:budget};
    const proof=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});expansions.set(proof,{definition,input,depth,parent:forwarded?.parent??null,path:forwarded?.path??null,...(forwarded?.nested?{nested:true}:{})});return proof;
  }
  throw new TypeError('Original invocation does not match a checked declarative rule');
}
function isDeclarativeExpansion(value){return !!value&&expansions.has(value);}
function declarativeNamespaceObservation(proof) {
  if(!expansions.has(proof))throw new TypeError('Namespace observations require privately checked expansion trees');
  const identifier=tree=>tree?.kind==='token'&&ident(tree)?tree.text:tree?.kind==='fragment'&&['ident','tt'].includes(tree.fragment)&&tree.trees.length===1?identifier(tree.trees[0]):null;
  const declarations=[];
  for(let at=0;at<proof.trees.length;at++)if(['static','const','struct','enum','fn','mod','type'].includes(text(proof.trees[at]))) {
    const term=text(proof.trees[at]),name=identifier(proof.trees[at+1]);
    if(name)declarations.push({term,name,namespace:['struct','enum','mod','type'].includes(term)?'type':'value',outputTokenIndex:at});
  }
  return freezeMacroTree({schema:'declarative-namespace-observation-v1',expansionDigest:proof.digest,declarations,dimensions:{typeNamespaceComplete:false,valueNamespaceComplete:false,bangMacroComplete:false,attributeMacroComplete:false},ownerVerified:false,generatedBehavior:false,obligation:'Observed emitted names do not close nested macro or attribute expansion and are not binding authority.'});
}
function declarativeSubInput(proof,path=[]) {
  if(!expansions.has(proof)||!Array.isArray(path)||path.length>64||path.some(index=>!Number.isSafeInteger(index)||index<0))throw new TypeError('Unsealed declarative forwarding source or tree path');
  let trees=proof.trees;
  for(const index of path){const tree=trees[index];if(tree?.kind!=='group')throw new TypeError('Declarative forwarding path does not identify original expanded delimiters');trees=tree.children;}
  forwardedInputs.set(trees,{parent:proof,path:[...path]});return trees;
}

// A nested bang's own delimiter is an independent token-tree input, even
// when its containing expression remains opaque to an outer matcher. Only
// complete privately captured invocations can issue this narrower forwarding.
function declarativeNestedMacroInvocations(proof){
  if(!expansions.has(proof))throw new TypeError('Nested macro discovery requires a privately checked expansion');
  const result=[],budget={cells:32000};
  const word=tree=>{tree=transparentTree(tree);return tree?.kind==='token'&&ident(tree)?tree.text:null;};
  const punctuation=tree=>text(transparentTree(tree));
  function visit(trees,path=[],depth=0){
    if(depth>64)throw new TypeError('Nested macro discovery exceeds its delimiter depth budget');
    for(let at=0;at<trees.length;at++){
      if(--budget.cells<0)throw new TypeError('Nested macro discovery exceeds its tree-cell budget');
      const tree=trees[at],base=transparentTree(tree),first=base.kind==='owner'?[...base.target]:word(tree)?[word(tree)]:null;
      if(first){
        let end=at+1;const segments=[...first];
        while(punctuation(trees[end])==='::'&&word(trees[end+1])){segments.push(word(trees[end+1]));end+=2;}
        if(punctuation(trees[end])==='!'&&transparentTree(trees[end+1])?.kind==='group'){
          const input=transparentTree(trees[end+1]),location=[...path,{kind:'macro-input',index:end+1}],row=freezeMacroTree({
            path:location,writtenPath:segments,delimiter:input.delimiter,
            hygiene:base.kind==='owner'?'definition-site-dollar-crate':'written-or-forwarded-path',
            ownerVerified:false,namespaceAuthority:false,runtimeAuthority:false,
          });
          nestedInvocations.set(row,{proof,input:input.children,path:location});result.push(row);at=end+1;continue;
        }
      }
      if(base.kind==='group')visit(base.children,[...path,{kind:tree===base?'group':'transparent-group',index:at}],depth+1);
      else if(tree.kind==='fragment'&&['expr','block','ident','tt'].includes(tree.fragment))visit(tree.trees,[...path,{kind:'opaque-fragment',fragment:tree.fragment,index:at}],depth+1);
    }
  }
  visit(proof.trees);return freezeMacroTree(result);
}
function declarativeNestedMacroInput(proof,invocation){
  const state=nestedInvocations.get(invocation);
  if(!expansions.has(proof)||!state||state.proof!==proof)throw new TypeError('Nested macro forwarding requires its exact private parent and invocation');
  forwardedInputs.set(state.input,{parent:proof,path:state.path,nested:true});return state.input;
}

// Lineage is evidence of actual checked forwarding, never macro path resolution.
function declarativeExpansionLineage(proof) {
  const state=expansions.get(proof);if(!state)throw new TypeError('Unsealed declarative expansion lineage');
  return freezeMacroTree({definition:state.definition,parent:state.parent,path:state.path,depth:state.depth,...(state.nested?{sourceAssociationKind:'checked-nested-macro-input'}:{})});
}

// A new observer can join an exact original invocation input without looking
// it up by a public digest. Forwarded/generated arrays are a different lane.
function declarativeExpansionOriginalInput(proof,input){
 const state=expansions.get(proof),original=macroTreeSource(input);
 if(!state||state.input!==input||state.parent!==null||state.depth!==0||forwardedInputs.has(input)||!original?.span)throw new TypeError('Expansion requires its exact private original invocation input');
 return state.input;
}

// Declaration headers are exact source evidence; attribute spellings and a
// public/export annotation never grant their own owner or hygiene semantics.
function declarativeDefinitionHeader(definition) {
  const state=definitions.get(definition);if(!state)throw new TypeError('Unsealed declarative definition header');
  const trees=state.trees;
  const body=trees.findIndex(tree=>tree.kind==='group'&&tree.span.start===definition.definitionSpan.start&&tree.span.end===definition.definitionSpan.end);
  if(body<0)throw new TypeError('Original declaration body is absent from the sealed source');
  let begin=body-2,kind='macro';
  if(text(trees[body-3])==='macro_rules'&&text(trees[body-2])==='!'){begin=body-3;kind='macro_rules';}
  const inline=definition.declarationForm==='single-rule-decl-macro';
  if(inline){
    if(trees[body-1]?.kind!=='group'||trees[body-1].delimiter!=='('||trees[body-1].span.start!==definition.matcherSpan.start||trees[body-1].span.end!==definition.matcherSpan.end)throw new TypeError('Original inline macro matcher differs from its compiled definition');
    begin=body-3;
  }
  if(text(trees[begin])!==kind||text(trees[body-(inline?2:1)])!==definition.name)throw new TypeError('Original macro declaration header differs from its compiled definition');
  let visibility=null;
  if(text(trees[begin-1])==='pub'){visibility=syntax(trees[--begin]);}
  const attributes=[];
  while(trees[begin-1]?.kind==='group'&&trees[begin-1].delimiter==='['&&text(trees[begin-2])==='#') {
    const group=trees[begin-1];attributes.unshift({tokens:group.children,sourceSyntax:syntax(trees[begin-2],group),ownerResolved:false});begin-=2;
  }
  return freezeMacroTree({sourceSha256:definition.sourceSha256,span:{start:trees[begin].span.start,end:definition.definitionSpan.end},name:definition.name,kind,visibility,attributes,sourceVerified:true,attributeOwnersResolved:false,hygieneVerified:false});
}


// This renderer consumes only this actual engine's private expansion/input joins.
// Its lexical resolver supplies source candidates; no namespace/type permit leaves.
function renderLocalDeclarativeExpansion(proof,resolve){
 if(!expansions.has(proof)||typeof resolve!=='function')throw new TypeError('Local declarative rendering requires its actual expansion and lexical resolver');
 const budget={calls:0,cells:0,bytes:0},receipts=[];
 const check=()=>{if(++budget.cells>65536)throw new TypeError('Complete local declarative render tree budget exceeded');};
 const identifiers=(trees,result=new Set())=>{for(const tree of trees){check();if(tree.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tree.text))result.add(tree.text);else if(tree.kind==='group')identifiers(tree.children,result);else if(tree.kind==='fragment')identifiers(tree.trees,result);else if(tree.kind==='owner')throw new TypeError('Local source rendering cannot infer dollar-crate definition ownership');}return result;};
 const hygiene=current=>{
  const state=expansions.get(current),rule=state?.definition.rules[current.rule];if(!rule)throw new TypeError('Actual private selected macro rule required');
  const input=identifiers(state.input),introduced=new Set(),visit=nodes=>{for(const node of nodes){check();if(node.kind==='literal')identifiers([node.tree],introduced);else if(node.kind==='crate-owner')throw new TypeError('Local source rendering cannot infer dollar-crate definition ownership');else if(node.children)visit(node.children);if(node.separator)identifiers([node.separator],introduced);}};visit(rule.output);
  for(const name of input)if(introduced.has(name))throw new TypeError('Local macro source rendering requires disjoint captured and literal identifiers: '+name);
 };
 const plainOutput=trees=>{
  for(let at=0;at<trees.length;at++){check();const tree=trees[at],word=text(transparentTree(tree));
   if(word==='macro_rules'&&text(transparentTree(trees[at+1]))==='!'||word==='macro')throw new TypeError('Generated macro definitions require a separate lexical-scope rule');
   if(word==='#'||tree.kind==='owner')throw new TypeError('Generated attributes raw identifiers and dollar-crate paths require independent owner rules');
   if(tree.kind==='group')plainOutput(tree.children);else if(tree.kind==='fragment')plainOutput(tree.trees);
  }
 };
 const render=(current,depth=0)=>{
  if(depth>64||++budget.calls>64)throw new TypeError('Complete local declarative recursion budget exceeded');if(!expansions.has(current))throw new TypeError('Local render requires actual private output trees');hygiene(current);plainOutput(current.trees);
  const occurrences=declarativeNestedMacroInvocations(current),byPath=new Map();
  for(const invocation of occurrences){if(invocation.writtenPath.length!==1||invocation.hygiene!=='written-or-forwarded-path'||!definitions.has(resolve(invocation.writtenPath[0])))throw new TypeError('Unknown or qualified nested macro can change lexical bindings; retain the original complete invocation');const prefix=invocation.path.slice(0,-1),key=JSON.stringify(prefix),index=invocation.path.at(-1).index;if(!byPath.has(key))byPath.set(key,new Map());byPath.get(key).set(index,invocation);}
  const lists=(trees,path=[])=>{
   const parts=[],lookup=byPath.get(JSON.stringify(path));
   for(let at=0;at<trees.length;at++){
    check();const invocation=lookup?.get(at+2);if(invocation&&invocation.writtenPath.length===1&&invocation.hygiene==='written-or-forwarded-path'){
     const selected=resolve(invocation.writtenPath[0]);if(selected!==null&&selected!==undefined){if(!definitions.has(selected))throw new TypeError('Lexical macro candidate is not this engine original definition');const input=declarativeNestedMacroInput(current,invocation),child=expandDeclarativeMacro(selected,input);receipts.push({name:invocation.writtenPath[0],parentDigest:current.digest,definitionDigest:selected.digest,output:child,lineage:declarativeExpansionLineage(child),sourceAuthority:false,semanticAuthority:false});parts.push(render(child,depth+1));at+=2;continue;}
    }
    const tree=trees[at],base=transparentTree(tree);
    if(base.kind==='group')parts.push(base.delimiter+lists(base.children,[...path,{kind:tree===base?'group':'transparent-group',index:at}])+({'(':')','[':']','{':'}'}[base.delimiter]));
    else if(tree.kind==='fragment'&&['expr','block','ident','tt'].includes(tree.fragment))parts.push(lists(tree.trees,[...path,{kind:'opaque-fragment',fragment:tree.fragment,index:at}]));
    else if(tree.kind==='fragment')parts.push(tree.trees.map(originalMacroTreeText).join(' '));
    else parts.push(originalMacroTreeText(tree));
   }
   return parts.join(' ');
  };
  const source=lists(current.trees);budget.bytes+=Buffer.byteLength(source);if(budget.bytes>2097152)throw new TypeError('Complete local declarative rendered source budget exceeded');return source;
 };
 const source=render(proof);return {source,root:proof,receipts,renderCalls:budget.calls,renderCells:budget.cells,renderedRawBytes:budget.bytes,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false};
}

return Object.freeze({renderLocalDeclarativeExpansion,compileDeclarativeMacro,expandDeclarativeMacro,isDeclarativeExpansion,declarativeNamespaceObservation,declarativeSubInput,declarativeNestedMacroInvocations,declarativeNestedMacroInput,declarativeExpansionLineage,declarativeDefinitionHeader,declarativeExpansionOriginalInput});
}
