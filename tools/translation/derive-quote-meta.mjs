// Lift original generator quote templates into non-executable syntax meta.
// Interpolation names are obligations until a selected generator route supplies
// privately checked fragment values. No generated Rust trait body is executed.
import {createHash} from 'node:crypto';
import {DERIVE_SOURCE_PROFILE,deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {rustTokens,sourceItems} from './rust-structure.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {lexPrivateConcreteSources} from './private-parser-execution.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const inventories=new WeakMap(),templates=new WeakMap(),matchBlocks=new WeakMap();
const pairs={'(':')','[':']','{':'}'},quotes=new Set(['quote','quote_expr','quote_block','quote_spanned']);
const ident=node=>node?.tag==='token'&&node.tokenType==='ident'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(node.text);

function originalTrees(origin){
  if(Buffer.byteLength(origin.source)>256000)throw new TypeError('Generator member source exceeds quote grammar budget');
  const tokens=[];
  for(const token of rustTokens(origin.source)){
    if(token.type==='comment'){
      // Documentation is emitted as an actual attribute, never erased from a
      // quoted template. Its original value remains an opaque string token.
      if(token.text.startsWith('///')&&!token.text.startsWith('////')||token.text.startsWith('//!')){
        const doc=token.text.slice(3),inner=token.text.startsWith('//!');
        for(const text of ['#',...(inner?['!']:[]),'[','doc','=',JSON.stringify(doc),']'])tokens.push({text,type:text.startsWith('"')?'string':'doc-token',span:{start:token.start,end:token.end}});
      }else if(token.text.startsWith('/**')||token.text.startsWith('/*!'))throw new TypeError('Generator block documentation requires a source grammar extension');
      continue;
    }
    if(token.type==='ident'&&token.text.endsWith('!')){
      tokens.push({...token,text:token.text.slice(0,-1),end:token.end-1},{text:'!',type:'punct',start:token.end-1,end:token.end});
    }else tokens.push(token);
  }
  if(tokens.length>32000)throw new TypeError('Generator member token budget exceeded');
  let at=0;
  function list(close=null,depth=0){
    if(depth>64)throw new TypeError('Generator delimiter budget exceeded');
    const result=[];
    while(at<tokens.length){
      const token=tokens[at++],span=token.span??{start:token.start,end:token.end};
      if([')',']','}'].includes(token.text)){
        if(token.text!==close)throw new TypeError('Generator original delimiter mismatch');
        return {nodes:result,end:span.end};
      }
      if(Object.hasOwn(pairs,token.text)){const body=list(pairs[token.text],depth+1);result.push({tag:'group',delimiter:token.text,nodes:body.nodes,span:{start:span.start,end:body.end}});}
      else result.push({tag:'token',text:token.text,tokenType:token.type,span});
    }
    if(close)throw new TypeError('Generator original delimiter is unterminated');
    return {nodes:result,end:origin.source.length};
  }
  return list().nodes;
}
function lifted(nodes,origin){
  const result=[];
  for(let at=0;at<nodes.length;at++){
    const node=nodes[at],next=nodes[at+1];
    if(node.text==='#'&&ident(next)){
      result.push({tag:'slot',name:next.text,span:{start:node.span.start,end:next.span.end}});at++;continue;
    }
    if(node.text==='#'&&next?.tag==='group'&&next.delimiter==='('){
      let end=at+2,separator=null;
      if(nodes[end]?.text!=='*'&&nodes[end]?.text!=='+'){separator=nodes[end];end++;}
      if(!['*','+'].includes(nodes[end]?.text))throw new TypeError('Generator quote repetition lacks an original quantifier');
      result.push({tag:'repeat',nodes:lifted(next.nodes,origin),separator,quantifier:nodes[end].text,span:{start:node.span.start,end:nodes[end].span.end}});at=end;continue;
    }
    if(node.text==='#'&&next?.tag!=='group'&&nodes[at+1]?.text!=='!')throw new TypeError('Generator quote interpolation grammar remains unresolved');
    result.push(node.tag==='group'?{...node,nodes:lifted(node.nodes,origin)}:node);
  }
  return result;
}
export function inventoryDeriveQuoteMeta(dependencies,packageName='serde_derive',includeParseQuote=false){
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Quote meta requires sealed original generator dependencies');
  if(typeof includeParseQuote!=='boolean')throw new TypeError('Typed parse_quote inventory mode requires an explicit boolean');
  let parseQuoteSources=null;
  if(includeParseQuote){
    const origin=deriveDependencySource(dependencies,'syn','src/parse_quote.rs'),rules=[['parse_quote','macro_rules! parse_quote { ($($tt:tt)*) => { $crate::__private::parse_quote($crate::__private::quote::quote!($($tt)*)) }; }'],['parse_quote_spanned','macro_rules! parse_quote_spanned { ($span:expr=> $($tt:tt)*) => { $crate::__private::parse_quote($crate::__private::quote::quote_spanned!($span=> $($tt)*)) }; }']],actual=rustTokens(origin.source).filter(token=>token.type!=='comment');
    const declarations=rules.map(([name,written])=>{const expected=rustTokens(written).filter(token=>token.type!=='comment'),found=[];for(let at=0;at<=actual.length-expected.length;at++)if(expected.every((token,index)=>token.text===actual[at+index].text&&token.type===actual[at+index].type))found.push({start:actual[at].start,end:actual[at+expected.length-1].end});if(found.length!==1)throw new TypeError('Original Syn parse_quote declaration is absent or ambiguous: '+name);const span=found[0];return{name,span,sha256:hash(origin.source.slice(span.start,span.end))};});
    parseQuoteSources={source:origin.path,sourceSha256:origin.sha256,bytes:Buffer.byteLength(origin.source),declarations,parsedAstAuthority:false};
  }
  const selectedQuotes=includeParseQuote?new Set([...quotes,'parse_quote','parse_quote_spanned']):quotes;
  const profile=DERIVE_SOURCE_PROFILE.packages.find(entry=>entry.name===packageName);
  if(!profile)throw new TypeError('Generator package is outside the original source profile');
  const members=[],all=[];
  for(const sourcePath of Object.keys(profile.members).filter(path=>path.startsWith('src/')&&path.endsWith('.rs')).sort()){
    const origin=deriveDependencySource(dependencies,packageName,sourcePath),roots=originalTrees(origin),rows=[];
    function walk(nodes,path=[]){
      for(let at=0;at<nodes.length;at++){
        const node=nodes[at],bang=nodes[at+1],group=nodes[at+2];
        if(ident(node)&&selectedQuotes.has(node.text)&&bang?.text==='!'&&group?.tag==='group'){
          let output=group.nodes,spanArgument=null;
          if(['quote_spanned','parse_quote_spanned'].includes(node.text)){
            const split=output.findIndex(entry=>entry.text==='=>');
            if(split<0)throw new TypeError('Original quote_spanned separator is unresolved');
            spanArgument=output.slice(0,split);output=output.slice(split+1);
          }
          const span={start:node.span.start,end:group.span.end},evidence={schema:'original-generator-quote-meta-v1',package:packageName,version:origin.version,source:sourcePath,sourceSha256:origin.sha256,dependenciesDigest:dependencies.digest,macro:node.text,path:[...path,at],span,sha256:hash(origin.source.slice(span.start,span.end)),spanArgument,syntax:lifted(output,origin),generatorBindingComplete:false,generatedImplBehavior:false};
          const template=freeze({...evidence,digest:hash(JSON.stringify(evidence))});templates.set(template,{origin,dependencies});rows.push(template);all.push(template);
          if(all.length>1024)throw new TypeError('Generator quote inventory exceeds bounded template count');
        }
        if(node.tag==='group')walk(node.nodes,[...path,at]);
      }
    }
    walk(roots);members.push({source:sourcePath,sourceSha256:origin.sha256,bytes:Buffer.byteLength(origin.source),quotes:rows});
  }
  const evidence={schema:'original-generator-quote-collection-v1',package:packageName,dependenciesDigest:dependencies.digest,members,quoteCount:all.length,sourceMemberCount:members.length,...(parseQuoteSources?{parseQuoteSources}:{}),generatedImplBehavior:false};
  const result=freeze({...evidence,digest:hash(JSON.stringify(evidence))});inventories.set(result,{dependencies,all});return result;
}
export const isDeriveQuoteMeta=value=>!!value&&inventories.has(value);
export function quoteMetaOriginal(template){const state=templates.get(template);if(!state)throw new TypeError('Unsealed original generator template');return state.origin;}
export function originalSerdeMatchBlockAdapter(inventory){
  const state=inventories.get(inventory);if(!state||inventory.package!=='serde_derive')throw new TypeError('Match block adapter requires its original Serde inventory');
  const origin=deriveDependencySource(state.dependencies,'serde_derive','src/fragment.rs'),owners=sourceItems(origin.source).filter(item=>item.term==='impl'&&item.tokens.filter(token=>token.type!=='comment').slice(0,item.tokens.findIndex(token=>token.text==='{')).map(token=>token.text).join('')==='implToTokensforMatch');
  if(owners.length!==1)throw new TypeError('Original Fragment Match ToTokens owner is absent/ambiguous');
  const owner=owners[0],open=owner.tokens.find(token=>token.text==='{'),close=owner.tokens.at(-1),body=origin.source.slice(open.end,close.start),methods=sourceItems(body).filter(item=>item.term==='fn'&&item.name==='to_tokens');if(methods.length!==1)throw new TypeError('Original Match ToTokens method is absent/ambiguous');
  const method=methods[0],text=body.slice(method.start,method.end),tokens=rustTokens(text).filter(token=>token.type!=='comment').map(token=>token.text),pattern=rustTokens('Fragment::Block(block) => { token::Brace::default().surround(out, |out| block.to_tokens(out)); }').filter(token=>token.type!=='comment').map(token=>token.text),hits=[];
  for(let at=0;at<=tokens.length-pattern.length;at++)if(pattern.every((token,index)=>token===tokens[at+index]))hits.push(at);
  if(hits.length!==1||!text.includes('<Token![,]>::default().to_tokens(out)'))throw new TypeError('Original Match block/expr adapter branch changed');
  const evidence=freeze({schema:'original-serde-fragment-match-block-adapter-v1',dependenciesDigest:state.dependencies.digest,source:origin,ownerSpan:{start:owner.start,end:owner.end},methodSpan:{start:open.end+method.start,end:open.end+method.end},originalMethod:text,blockConstructor:'token::Brace::default().surround',expressionConstructor:'original Expr tokens followed by Token![,]',namespaceAuthority:false,generatedImplBehavior:false});matchBlocks.set(evidence,{inventory});return evidence;
}

// Single unmodified named trait bounds are syntax only. Rejoin the matching
// locked Syn schema/parser/printer; no trait lookup or generated-body fact is
// inferred from retaining `dyn Path` tokens.
function originalTraitObjectSyntax(dependencies){
  const ty=deriveDependencySource(dependencies,'syn','src/ty.rs'),generics=deriveDependencySource(dependencies,'syn','src/generics.rs');
  // One explicit private token operation over both complete originals. Its
  // authentication callbacks are additional to the seven selected-slice hashes;
  // it deliberately does not reuse the public lexer's escaped mutable tables.
  const captured=lexPrivateConcreteSources([{source:ty.source,language:'Rust'},{source:generics.source,language:'Rust'}]);
  if(captured.rows.length!==2||captured.rows[0].source!==ty.source||captured.rows[1].source!==generics.source||captured.rows[0].language!=='Rust'||captured.rows[1].language!=='Rust')throw new TypeError('Original trait-object source transaction changed');
  const select=(origin,anchor,needles)=>{
    const start=origin.source.indexOf(anchor);if(start<0||origin.source.indexOf(anchor,start+1)>=0)throw new TypeError('Original trait-object source selection is absent or ambiguous');
    const tokens=captured.rows[origin===ty?0:1].tokens;let depth=0,end=-1;
    for(let at=0;at<tokens.length;at++){const token=tokens[at];if(token.start<start||token.type!=='punct')continue;if(token.text==='{')depth++;else if(token.text==='}'&&!--depth){end=token.end;break;}}
    if(end<0)throw new TypeError('Original trait-object source selection is incomplete');
    const text=origin.source.slice(start,end);for(const needle of needles)if(!text.includes(needle))throw new TypeError('Original trait-object schema/parser/printer changed');
    return {package:origin.package,version:origin.version,source:origin.path,sourceSha256:origin.sha256,span:{start,end},sha256:hash(text)};
  };
  return {schema:'original-single-trait-object-syntax-v1',sources:[
    select(ty,'pub enum Type {',['TraitObject(TypeTraitObject)']),
    select(generics,'pub enum TypeParamBound {',['Trait(TraitBound)']),
    select(ty,'pub struct TypeTraitObject {',['pub attrs: Vec<Attribute>','pub dyn_token: Option<Token![dyn]>','pub bounds: Punctuated<TypeParamBound, Token![+]>']),
    select(ty,'impl TypeTraitObject {',['let dyn_token: Option<Token![dyn]> = input.parse()?','let allow_precise_capture = false','let allow_const = false','TypeParamBound::Trait(_)','if !at_least_one_trait']),
    select(ty,'impl ToTokens for TypeTraitObject {',['self.dyn_token.to_tokens(tokens)','self.bounds.to_tokens(tokens)']),
    select(generics,'pub struct TraitBound {',['pub lifetimes: Option<BoundLifetimes>','pub modifiers: TraitBoundModifiers','pub maybe: Option<Token![?]>','pub path: Path']),
    select(generics,'impl TraitBound {',['fn do_parse','let mut lifetimes: Option<BoundLifetimes> = input.parse()?','let mut path: Path = input.parse()?']),
  ],sourceSelection:{contract:'private-authenticated-token-batch-v1',completeOriginals:2,tokenizations:2,selectedSliceHashes:7},domain:'explicit dyn; one unmodified named/path trait bound; no higher-ranked lifetimes, bounds list, associated bindings, macro or executable syntax',traitOwnerResolved:false,generatedImplBehavior:false};
}

// The route compiler owns these bindings; callers cannot assert a fragment's
// category by putting a string such as "Ident" next to arbitrary tokens.
export const GENERATOR_FRAGMENT_LIMITS=Object.freeze({cells:16000,depth:64,tokenBytes:256000,metadataBytes:524288});
const fragments=new WeakMap(),sequences=new WeakMap();
export function createQuoteFragmentCompiler(inventory){
  const state=inventories.get(inventory);if(!state)throw new TypeError('Unsealed generator quote inventory');
  const seal=(syntax,provenance)=>{
    let cells=0,tokenBytes=0;const count=(nodes,depth=0)=>{if(depth>GENERATOR_FRAGMENT_LIMITS.depth)throw new TypeError('Generator fragment depth budget exceeded');for(const node of nodes){if(++cells>GENERATOR_FRAGMENT_LIMITS.cells)throw new TypeError('Generator fragment value budget exceeded');tokenBytes+=node.tag==='token'?Buffer.byteLength(node.text):node.tag==='group'?2:0;if(tokenBytes>GENERATOR_FRAGMENT_LIMITS.tokenBytes)throw new TypeError('Generator fragment token-byte budget exceeded');if(node.nodes)count(node.nodes,depth+1);}};count(syntax);
    const encodedBytes=Buffer.byteLength(JSON.stringify(syntax));if(encodedBytes>GENERATOR_FRAGMENT_LIMITS.metadataBytes)throw new TypeError('Generator fragment metadata-byte budget exceeded ('+encodedBytes+' bytes, '+cells+' cells)');
    const result=freeze({schema:'checked-generator-fragment-v1',syntax,provenance,generatedImplBehavior:false});fragments.set(result,{inventory});return result;
  };
  const token=(text,tokenType,provenance)=>{
    if(tokenType==='ident'&&!/^[_\p{L}][_\p{L}\p{N}]*$/u.test(text)||tokenType==='number'&&!/^\d+$/u.test(text)||tokenType==='lifetime'&&!/^'[_\p{L}][_\p{L}\p{N}]*$/u.test(text)||!['ident','string','number','lifetime','byte-string'].includes(tokenType))throw new TypeError('Generator leaf does not have a bounded token category');
    if(tokenType==='string'){let value;try{value=JSON.parse(text);}catch{throw new TypeError('Generator string leaf must remain a literal token');}if(typeof value!=='string'||value.length>4096)throw new TypeError('Generator string leaf exceeds its literal profile');}
    if(tokenType==='byte-string'&&!/^b"(?:[\x20-\x21\x23-\x5b\x5d-\x7e]|\\(?:[\\"nrt0]|x[\da-fA-F]{2}))*"$/u.test(text))throw new TypeError('Generator byte string must remain a bounded Rust literal token');
    if(text.length>8192)throw new TypeError('Generator leaf exceeds its token byte profile');
    return seal([{tag:'token',text,tokenType}],provenance);
  };
  const sourceType=(source,provenance)=>{
    if(typeof source!=='string'||Buffer.byteLength(source)>4096)throw new TypeError('Original syn Type source exceeds its bounded grammar');
    const roots=originalMacroTrees(source,{maxBytes:4096,maxTokens:512,maxDepth:32});let traitObjects=0;
    const identifier=node=>node?.kind==='token'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(node.text)&&!['impl','dyn','fn','const','macro','where','extern','Self','mut'].includes(node.text);
    const lifetime=node=>/^'[_\p{L}][_\p{L}\p{N}]*$/u.test(node?.text??'');
    // Rust 1.89 strict/reserved names (including edition-2024 names), only
    // for the new trait-object path and its recursive type arguments.
    const traitName=node=>identifier(node)&&node.text!=='_'&&!(' as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield async await dyn gen try ').includes(' '+node.text+' ');
    function type(nodes,start=0,depth=0,traitInput=false){
      if(depth>32)throw new TypeError('Original syn Type recursion exceeds its profile');let at=start;
      if(nodes[at]?.text==='&'){at++;if(lifetime(nodes[at]))at++;if(nodes[at]?.text==='mut')at++;return type(nodes,at,depth+1,traitInput);}
      const node=nodes[at];
      if(node?.kind==='group'){
        if(!['(','['].includes(node.delimiter))throw new TypeError('Original syn Type excludes executable groups');
        let inner=0;const children=node.children;
        if(node.delimiter==='['){inner=type(children,0,depth+1,traitInput);if(children[inner]?.text===';'){inner++;if(!/^\d+$/u.test(children[inner]?.text??''))throw new TypeError('Array Type requires a literal length');inner++;}}
        else while(inner<children.length){inner=type(children,inner,depth+1,traitInput);if(inner<children.length&&children[inner++]?.text!==',')throw new TypeError('Tuple Type separator is unresolved');}
        if(inner!==children.length)throw new TypeError('Original syn Type has trailing group syntax');return at+1;
      }
      const traitObject=nodes[at]?.text==='dyn';if(traitObject){traitObjects++;at++;}traitInput ||= traitObject;
      const absolute=nodes[at]?.text==='::';if(absolute)at++;
      // Relative roots are prefixes, never trait names or later segments.
      if(traitInput&&!absolute&&['crate','self','super'].includes(nodes[at]?.text)){
        const root=nodes[at++].text;
        if(root==='super')while(nodes[at]?.text==='::'&&nodes[at+1]?.text==='super')at+=2;
        if(nodes[at++]?.text!=='::')throw new TypeError('Original trait-object root requires a qualified named path');
      }
      if(!(traitInput?traitName(nodes[at]):identifier(nodes[at])))throw new TypeError('Original syn Type requires a named, reference, product or single trait-object leaf');at++;
      while(true){
        if(nodes[at]?.text==='<'){
          at++;if(nodes[at]?.text==='>')throw new TypeError('Original Type has empty generic arguments');
          while(true){at=lifetime(nodes[at])?at+1:type(nodes,at,depth+1,traitInput);if(nodes[at]?.text===','){at++;if(nodes[at]?.text==='>')break;}else break;}
          if(nodes[at++]?.text!=='>')throw new TypeError('Original syn Type generic arguments remain unresolved');
        }
        if(nodes[at]?.text!=='::')break;at++;if(!(traitInput?traitName(nodes[at]):identifier(nodes[at])))throw new TypeError('Original syn Type path segment is unresolved');at++;
      }return at;
    }
    if(type(roots)!==roots.length)throw new TypeError('Original syn Type has unproved trailing syntax');
    const lift=nodes=>nodes.map(node=>node.kind==='group'?{tag:'group',delimiter:node.delimiter,nodes:lift(node.children),span:node.span}:{tag:'token',text:node.text,tokenType:lifetime(node)?'lifetime':node.type,span:node.span});
    return seal(lift(roots),{...provenance,category:'original syn::Type',sourceSha256:hash(source),...(traitObjects?{traitObjectSyntax:originalTraitObjectSyntax(state.dependencies)}:{})});
  };
  const sourceExpression=(source,provenance)=>{
    if(typeof source!=='string'||Buffer.byteLength(source)>4096)throw new TypeError('Original syn Expr exceeds its bounded source grammar');
    const roots=originalMacroTrees(source,{maxBytes:4096,maxTokens:128,maxDepth:8});
    const decimal=node=>node?.kind==='token'&&node.type==='number'&&/^\d{1,38}$/u.test(node.text)&&BigInt(node.text)<2n**128n;
    const identifier=node=>node?.kind==='token'&&node.type==='ident'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.text)&&!['as','async','await','const','dyn','else','extern','false','fn','for','if','impl','in','let','loop','match','mod','move','mut','return','struct','true','unsafe','use','where','while'].includes(node.text);
    let category;
    if(roots.length===1&&(decimal(roots[0])||['true','false'].includes(roots[0]?.text)))category='Expr::Lit';
    else if(roots.length===1&&roots[0]?.type==='string'){for(let at=1;at<roots[0].text.length-1;at++)if(roots[0].text[at]==='\\'&&!['"','\\','n','r','t'].includes(roots[0].text[++at]))throw new TypeError('Original syn Expr string escape needs its independent Rust literal route');token(roots[0].text,'string',provenance);category='Expr::Lit';}
    else if([4,5].includes(roots.length)&&decimal(roots[0])&&roots[1]?.text==='.'&&roots[2]?.text==='.'&&roots[1].span.end===roots[2].span.start&&decimal(roots.at(-1))&&(roots.length===4||roots[3]?.text==='='&&roots[2].span.end===roots[3].span.start))category='Expr::Range';
    else {let at=roots[0]?.text==='::'?1:0;if(!identifier(roots[at++]))throw new TypeError('Original syn Expr requires a bounded literal, path or closed integer range');while(at<roots.length)if(roots[at++]?.text!=='::'||!identifier(roots[at++]))throw new TypeError('Original syn Expr path excludes calls, macros, generics and effects');category='Expr::Path';}
    return seal(roots.map(node=>({tag:'token',text:node.text,tokenType:node.type,span:node.span})),{...provenance,category:'original syn::Expr syntactic subset',expressionKind:category,sourceSha256:hash(source)});
  };
  function instantiate(template,bindings,provenance){
    if(!templates.has(template)||!state.all.includes(template)||!(bindings instanceof Map))throw new TypeError('Generator route requires a genuine template and checked bindings');
    let cells=0;
    const slot=name=>{
      const fragment=bindings.get(name);
      if(!fragments.has(fragment)||fragments.get(fragment).inventory!==inventory)throw new TypeError('Unproved generator splice: '+name);
      return fragment.syntax;
    };
    function walk(nodes,iteration=null){
      const result=[];
      for(const node of nodes){
        if(++cells>16000)throw new TypeError('Generator fragment value budget exceeded');
        if(node.text==='$')throw new TypeError('Generator metavariable forwarding lacks a checked source binding');
        if(node.tag==='slot'){
          const sequence=sequences.get(bindings.get(node.name));
          if(sequence){if(iteration===null||sequence.inventory!==inventory)throw new TypeError('Generator sequence used outside its original repetition');result.push(...sequence.values[iteration].syntax);}
          else result.push(...slot(node.name));
        }else if(node.tag==='repeat'){
          if(iteration!==null)throw new TypeError('Nested generator repetition requires a separate sequence binding plan');
          const sizes=[];
          const find=nodes=>{for(const child of nodes){if(child.tag==='slot'){const sequence=sequences.get(bindings.get(child.name));if(sequence){if(sequence.inventory!==inventory)throw new TypeError('Unrelated generator sequence');sizes.push(sequence.values.length);}}if(child.nodes)find(child.nodes);}};
          find(node.nodes);if(!sizes.length||new Set(sizes).size!==1||node.quantifier==='+'&&sizes[0]===0)throw new TypeError('Generator repetition has no equal-length checked sequence');
          for(let index=0;index<sizes[0];index++){if(index&&node.separator)result.push(node.separator);result.push(...walk(node.nodes,index));}
        }else result.push(node.tag==='group'?{...node,nodes:walk(node.nodes,iteration)}:node);
      }
      return result;
    }
    return seal(walk(template.syntax),{...provenance,templateDigest:template.digest,source:template.source,span:template.span});
  }
  // This compiler is a trusted source-profile implementation, not a binder
  // certificate API. The final route still must verify every original binding,
  // output macro owner and generated attribute before returning authority.
  return Object.freeze({token,sourceType,sourceExpression,byteString:(value,provenance)=>{
    if(typeof value!=='string'||Buffer.byteLength(value)>4096||/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))throw new TypeError('Literal::byte_string requires bounded original Unicode scalar bytes');
    const text='b"'+[...Buffer.from(value,'utf8')].map(byte=>'\\x'+byte.toString(16).padStart(2,'0')).join('')+'"';
    // Bytes are a single literal token, including quotes/backslashes/non-ASCII
    // source names; they can never become attributes or executable syntax.
    return seal([{tag:'token',text,tokenType:'byte-string'}],provenance);
  },empty:provenance=>seal([],provenance),instantiate,genericLifetimes:(values,provenance)=>{
    if(!Array.isArray(values)||!values.length||values.length>16||values.some(value=>!fragments.has(value)||fragments.get(value).inventory!==inventory||value.syntax.length!==1||value.syntax[0].tokenType!=='lifetime'))throw new TypeError('Generic lifetime parameters require checked Lifetime leaves');
    const syntax=[{tag:'token',text:'<',tokenType:'punct'}];values.forEach((value,index)=>{if(index)syntax.push({tag:'token',text:',',tokenType:'punct'});syntax.push(...value.syntax);});syntax.push({tag:'token',text:'>',tokenType:'punct'});return seal(syntax,provenance);
  },sequence:(values,provenance)=>{
    if(!Array.isArray(values)||values.length>128||values.some(value=>!fragments.has(value)||fragments.get(value).inventory!==inventory))throw new TypeError('Generator repetition requires bounded ordered checked values');
    const result=freeze({schema:'checked-generator-sequence-v1',length:values.length,provenance});sequences.set(result,{inventory,values:[...values]});return result;
  },join:(values,provenance)=>{
    if(!Array.isArray(values)||values.some(value=>!fragments.has(value)||fragments.get(value).inventory!==inventory))throw new TypeError('Generator join requires checked fragments');
    const syntax=values.flatMap(value=>value.syntax);if(syntax.length>16000)throw new TypeError('Generator join value budget exceeded');return seal(syntax,provenance);
  },roundTrip:value=>{
    if(!fragments.has(value)||fragments.get(value).inventory!==inventory)throw new TypeError('Only a checked original fragment can enter semantic roundtrip');
    const encoded=JSON.stringify(value.syntax),syntax=JSON.parse(encoded);
    if(JSON.stringify(syntax)!==encoded)throw new TypeError('Generator semantic syntax roundtrip changed its canonical bytes');
    return seal(syntax,{...value.provenance,semanticRoundTrip:true,syntaxSha256:hash(encoded)});
  },matchExpression:(value,provenance)=>{
    if(!fragments.has(value)||fragments.get(value).inventory!==inventory)throw new TypeError('Match requires a checked expression fragment');
    // Pinned Fragment::Match(Expr) appends Token![,]. The selected source
    // route must verify that adapter before using this grammar operation.
    return seal([...value.syntax,{tag:'token',text:',',tokenType:'punct'}],provenance);
  },matchBlock:(value,adapter,provenance)=>{
    if(!fragments.has(value)||fragments.get(value).inventory!==inventory||matchBlocks.get(adapter)?.inventory!==inventory)throw new TypeError('Match block requires its private checked fragment and original Serde source adapter');
    return seal([{tag:'group',delimiter:'{',nodes:value.syntax}],{...provenance,originalMatchBlockAdapter:adapter});
  }});
}
export function inspectQuoteFragment(fragment){
  if(!fragments.has(fragment))throw new TypeError('Unsealed generator fragment');
  const attributes=[],bangCalls=[],definitions=[];
  function walk(nodes,path=[]){
    for(let at=0;at<nodes.length;at++){
      const node=nodes[at];
      if(node.text==='#'&&(nodes[at+1]?.delimiter==='['||nodes[at+1]?.text==='!'&&nodes[at+2]?.delimiter==='[')){
        const group=nodes[at+1]?.delimiter==='['?nodes[at+1]:nodes[at+2];attributes.push({name:group.nodes[0]?.text,path:[...path,at],syntax:group.nodes});
      }
      if(ident(node)&&nodes[at+1]?.text==='!'){
        if(node.text==='macro_rules')definitions.push({name:nodes[at+2]?.text,path:[...path,at]});
        else if(nodes[at+2]?.tag==='group'){
          let begin=at;while(begin>=2&&nodes[begin-1]?.text==='::'&&ident(nodes[begin-2]))begin-=2;
          bangCalls.push({writtenPath:nodes.slice(begin,at+1).filter(entry=>entry.text!=='::').map(entry=>entry.text),path:[...path,at]});
        }
      }
      if(node.text==='macro'&&ident(nodes[at+1]))definitions.push({name:nodes[at+1].text,path:[...path,at]});
      if(node.tag==='group')walk(node.nodes,[...path,at]);
    }
  }
  walk(fragment.syntax);
  return freeze({schema:'generator-fragment-bang-syntax-v1',fragmentSha256:hash(JSON.stringify(fragment)),attributes,bangCalls,definitions,macroExports:attributes.filter(attribute=>attribute.name==='macro_export'),macroOwnerComplete:false,generatedImplBehavior:false});
}
