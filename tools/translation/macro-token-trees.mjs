// Original Rust token trees for bounded declarative expansion. This module
// does not resolve macro owners or grant generated runtime implementations.
import {createHash} from 'node:crypto';
import {rustTokens} from './rust-structure.mjs';
const snapshots=new WeakMap();
const pairs={'(':')','[':']','{':'};
const hash=value=>createHash('sha256').update(value).digest('hex');
export const freezeMacroTree=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeMacroTree);Object.freeze(value);}return value;};

export function originalMacroTrees(source,{maxBytes=128000,maxTokens=16000,maxDepth=64}={}) {
  if(!Number.isSafeInteger(maxBytes)||maxBytes<=0||maxBytes>256000||!Number.isSafeInteger(maxTokens)||maxTokens<=0||maxTokens>32000||!Number.isSafeInteger(maxDepth)||maxDepth<=0||maxDepth>64)throw new TypeError('Invalid declarative source budgets');
  if(typeof source!=='string'||Buffer.byteLength(source)>maxBytes)throw new TypeError('Declarative macro source budget exceeded');
  const sourceSha256=hash(source);
  const tokens=[];
  for(const token of rustTokens(source)) {
    if(token.type==='comment') {
      if(token.text.startsWith('/*!')||token.text.startsWith('/**'))throw new TypeError('Declarative macro block documentation requires a separate lexical proof');
      if(token.text.startsWith('//!')||token.text.startsWith('///')&&!token.text.startsWith('////')) {
        const value=token.text.slice(3);
        if(/[\u0000-\u001f]/u.test(value))throw new TypeError('Declarative macro documentation escape profile exceeded');
        for(const text of ['#',...(token.text.startsWith('//!')?['!']:[]),'[','doc','=',JSON.stringify(value),']'])tokens.push({kind:'token',text,type:text.startsWith('"')?'string':'generated-doc',span:{start:token.start,end:token.end},sourceSha256,sourceFeature:'original-line-doc-comment'});
      }
      continue;
    }
    const append=(text,start,end)=>tokens.push({kind:'token',text,type:token.type,span:{start,end},sourceSha256});
    if(token.type==='ident'&&token.text.startsWith('$')) {
      if(!/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?$/u.test(token.text))throw new TypeError('Declarative macro metavariable requires bounded original spelling');
      append('$',token.start,token.start+1);if(token.text.length>1)append(token.text.slice(1),token.start+1,token.end);
    } else if(token.type==='ident'&&token.text.endsWith('!')) {
      append(token.text.slice(0,-1),token.start,token.end-1);append('!',token.end-1,token.end);
    } else if(token.text==='>>') {
      // Rust TT punctuation consists of individual punctuators, even when
      // their original lexical spacing forms a compound type close token.
      append('>',token.start,token.start+1);append('>',token.start+1,token.end);
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
      if(pairs[token.text]) {
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
