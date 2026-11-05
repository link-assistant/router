// Original Rust token trees for bounded declarative expansion. This module
// does not resolve macro owners or grant generated runtime implementations.
import {createHash} from 'node:crypto';
import {rustTokens} from './rust-structure.mjs';
const snapshots=new WeakMap();
const pairs={'(':')','[':']','{':'}'};
const hash=value=>createHash('sha256').update(value).digest('hex');
export const freezeMacroTree=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeMacroTree);Object.freeze(value);}return value;};

export function originalMacroTrees(source,{maxBytes=128000,maxTokens=16000,maxDepth=64}={}) {
  if(!Number.isSafeInteger(maxBytes)||maxBytes<=0||maxBytes>256000||!Number.isSafeInteger(maxTokens)||maxTokens<=0||maxTokens>32000||!Number.isSafeInteger(maxDepth)||maxDepth<=0||maxDepth>64)throw new TypeError('Invalid declarative source budgets');
  if(typeof source!=='string'||Buffer.byteLength(source)>maxBytes)throw new TypeError('Declarative macro source budget exceeded');
  const sourceSha256=hash(source);
  const tokens=[];
  for(const token of rustTokens(source)) {
    if(token.type==='comment') {
      const block=token.text.startsWith('/*!')||token.text.startsWith('/**')&&!['*','/'].includes(token.text[3]);
      if(block||token.text.startsWith('//!')||token.text.startsWith('///')&&!token.text.startsWith('////')) {
        if(block&&!token.text.endsWith('*/'))throw new TypeError('Declarative macro documentation is unterminated');const value=block?token.text.slice(3,-2):token.text.slice(3);
        if(/[\u0000-\u0008\u000b-\u001f]/u.test(value))throw new TypeError('Declarative macro documentation escape profile exceeded');
        for(const text of ['#',...(token.text.startsWith('//!')||token.text.startsWith('/*!')?['!']:[]),'[','doc','=',JSON.stringify(value),']'])tokens.push({kind:'token',text,type:text.startsWith('"')?'string':'generated-doc',span:{start:token.start,end:token.end},sourceSha256,sourceFeature:block?'original-block-doc-comment':'original-line-doc-comment'});
      }
      continue;
    }
    const append=(text,start,end)=>tokens.push({kind:'token',text,type:token.type,span:{start,end},sourceSha256});
    if(token.type==='ident'&&token.text.includes('$')) {
      if(!/^(?:[A-Za-z_][A-Za-z0-9_]*)?(?:\$(?:[A-Za-z_][A-Za-z0-9_]*)?)+!?$/u.test(token.text)||token.text.endsWith('!')&&!/[A-Za-z0-9_]!$/u.test(token.text))throw new TypeError('Declarative macro metavariable requires bounded original spelling');
      const bang=token.text.endsWith('!'),end=token.end-(bang?1:0);
      // The structural lexer retains adjacent dollars in one identifier.
      // Rust TT boundaries still separate each dollar and source identifier:
      // `$Visitor$(...)` is `$`, `Visitor`, `$`, then the original group.
      // Retain every exact source position; no expression/repetition semantics
      // or new spelling domain follows from this lexical projection.
      let cursor=token.start;
      while(cursor<end){if(token.text[cursor-token.start]==='$'){append('$',cursor,cursor+1);cursor++;}else{const begin=cursor;while(cursor<end&&token.text[cursor-token.start]!=='$')cursor++;append(token.text.slice(begin-token.start,cursor-token.start),begin,cursor);}}
      if(bang)append('!',end,token.end);
    } else if(token.type==='ident'&&token.text.endsWith('!')) {
      append(token.text.slice(0,-1),token.start,token.end-1);append('!',token.end-1,token.end);
    } else if(token.type==='punct'&&token.text==='**') {
      // Original rustc_ast TokenKind::Star has no Star+Star glue branch.
      // The structural lexer fuses this spelling; retain its two exact TT
      // punctuators, without admitting compound **= or other operators.
      append('*',token.start,token.start+1);append('*',token.start+1,token.end);
    } else if(token.text==='>>'||token.text==='>>>') {
      // Rust TT punctuation consists of individual punctuators, even when
      // their original lexical spacing forms a compound type close token.
      // The structural JS lexer also fuses >>>, which has no single Rust
      // TokenKind. Keep the same individual Gt projection for all three
      // original positions; compound assignments retain their old domain.
      for(let index=0;index<token.text.length;index++)append('>',token.start+index,token.start+index+1);
    } else append(token.text,token.start,token.end);
  }
  if(tokens.length>maxTokens)throw new TypeError('Declarative macro token budget exceeded');
  let at=0;
  function list(close=null,depth=0) {
    if(depth>maxDepth)throw new TypeError('Declarative macro delimiter budget exceeded');
    const result=[];
    while(at<tokens.length) {
      const token=tokens[at++];
      if([')',']','}'].includes(token.text)) {
        if(token.text!==close)throw new TypeError('Declarative macro mismatched original delimiters');
        return {children:result,end:token.span.end};
      }
      if(Object.hasOwn(pairs,token.text)) {
        const nested=list(pairs[token.text],depth+1);
        result.push({kind:'group',delimiter:token.text,children:nested.children,span:{start:token.span.start,end:nested.end},sourceSha256});
      } else result.push(token);
    }
    if(close)throw new TypeError('Declarative macro unterminated original delimiter');
    return {children:result,end:source.length};
  }
  const trees=freezeMacroTree(list().children);
  snapshots.set(trees,{source,sha256:sourceSha256});return trees;
}
export function macroTreeSource(trees){return snapshots.get(trees)??null;}
export function originalMacroInvocation(source) {
  const trees=originalMacroTrees(source),path=[];let at=0;
  while(trees[at]?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(trees[at].text)) {
    path.push(trees[at++].text);if(trees[at]?.text!=='::')break;at++;
  }
  if(!path.length||trees[at++]?.text!=='!'||trees[at]?.kind!=='group'||at+1!==trees.length)throw new TypeError('Declarative invocation requires one original qualified bang call');
  const input=trees[at].children;
  snapshots.set(input,{...snapshots.get(trees),span:trees[at].span});
  return freezeMacroTree({path,trees:input,sourceSha256:hash(source),ownerVerified:false});
}
export function originalMacroTreeText(tree) {
  if(tree.kind==='token')return tree.text;
  if(tree.kind==='group')return tree.delimiter+tree.children.map(originalMacroTreeText).join(' ')+pairs[tree.delimiter];
  if(tree.kind==='fragment')return tree.trees.map(originalMacroTreeText).join(' ');
  if(tree.kind==='owner')return tree.target.join(' :: ');
  throw new TypeError('Unproved declarative macro output tree');
}
export function originalTopLevelMacroInvocations(source) {
  const trees=originalMacroTrees(source),result=[];
  for(let at=0;at<trees.length;at++) {
    if(trees[at]?.kind!=='token'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(trees[at].text))continue;
    let end=at+1;
    while(trees[end]?.text==='::'&&trees[end+1]?.kind==='token'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(trees[end+1].text))end+=2;
    if(trees[end]?.text!=='!'||trees[end+1]?.kind!=='group')continue;
    const span={start:trees[at].span.start,end:trees[end+1].span.end};
    result.push(freezeMacroTree({...originalMacroInvocation(source.slice(span.start,span.end)),sourceFileSha256:hash(source),sourceSpan:span}));
    at=end+1;
  }
  return freezeMacroTree(result);
}
