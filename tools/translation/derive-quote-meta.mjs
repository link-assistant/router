// Lift original generator quote templates into non-executable syntax meta.
// Interpolation names are obligations until a selected generator route supplies
// privately checked fragment values. No generated Rust trait body is executed.
import {createHash} from 'node:crypto';
import {DERIVE_SOURCE_PROFILE,deriveDependencySource,isDeriveDependencyProof} from './derive-dependencies.mjs';
import {rustTokens} from './rust-structure.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const inventories=new WeakMap(),templates=new WeakMap();
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
      if(pairs[token.text]){const body=list(pairs[token.text],depth+1);result.push({tag:'group',delimiter:token.text,nodes:body.nodes,span:{start:span.start,end:body.end}});}
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
export function inventoryDeriveQuoteMeta(dependencies,packageName='serde_derive'){
  if(!isDeriveDependencyProof(dependencies))throw new TypeError('Quote meta requires sealed original generator dependencies');
  const profile=DERIVE_SOURCE_PROFILE.packages.find(entry=>entry.name===packageName);
  if(!profile)throw new TypeError('Generator package is outside the original source profile');
  const members=[],all=[];
  for(const sourcePath of Object.keys(profile.members).filter(path=>path.startsWith('src/')&&path.endsWith('.rs')).sort()){
    const origin=deriveDependencySource(dependencies,packageName,sourcePath),roots=originalTrees(origin),rows=[];
    function walk(nodes,path=[]){
      for(let at=0;at<nodes.length;at++){
        const node=nodes[at],bang=nodes[at+1],group=nodes[at+2];
        if(ident(node)&&quotes.has(node.text)&&bang?.text==='!'&&group?.tag==='group'){
          let output=group.nodes,spanArgument=null;
          if(node.text==='quote_spanned'){
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
  const evidence={schema:'original-generator-quote-collection-v1',package:packageName,dependenciesDigest:dependencies.digest,members,quoteCount:all.length,sourceMemberCount:members.length,generatedImplBehavior:false};
  const result=freeze({...evidence,digest:hash(JSON.stringify(evidence))});inventories.set(result,{dependencies,all});return result;
}
export const isDeriveQuoteMeta=value=>!!value&&inventories.has(value);
export function quoteMetaOriginal(template){const state=templates.get(template);if(!state)throw new TypeError('Unsealed original generator template');return state.origin;}

// The route compiler owns these bindings; callers cannot assert a fragment's
// category by putting a string such as "Ident" next to arbitrary tokens.
const fragments=new WeakMap(),sequences=new WeakMap();
export function createQuoteFragmentCompiler(inventory){
  const state=inventories.get(inventory);if(!state)throw new TypeError('Unsealed generator quote inventory');
  const seal=(syntax,provenance)=>{
    let cells=0;const count=(nodes,depth=0)=>{if(depth>64)throw new TypeError('Generator fragment depth budget exceeded');for(const node of nodes){if(++cells>16000)throw new TypeError('Generator fragment value budget exceeded');if(node.nodes)count(node.nodes,depth+1);}};count(syntax);
    if(Buffer.byteLength(JSON.stringify(syntax))>256000)throw new TypeError('Generator fragment byte budget exceeded');
    const result=freeze({schema:'checked-generator-fragment-v1',syntax,provenance,generatedImplBehavior:false});fragments.set(result,{inventory});return result;
  };
  const token=(text,tokenType,provenance)=>{
    if(tokenType==='ident'&&!/^[_\p{L}][_\p{L}\p{N}]*$/u.test(text)||tokenType==='number'&&!/^\d+$/u.test(text)||!['ident','string','number'].includes(tokenType))throw new TypeError('Generator leaf does not have a bounded token category');
    if(tokenType==='string'){let value;try{value=JSON.parse(text);}catch{throw new TypeError('Generator string leaf must remain a literal token');}if(typeof value!=='string'||value.length>4096)throw new TypeError('Generator string leaf exceeds its literal profile');}
    return seal([{tag:'token',text,tokenType}],provenance);
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
  return Object.freeze({token,empty:provenance=>seal([],provenance),instantiate,sequence:(values,provenance)=>{
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
