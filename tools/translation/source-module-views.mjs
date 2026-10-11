// Inline module views retain one complete original file and absolute positions.
// They are source evidence only; a consumer must separately prove namespace,
// attribute-phase, declaration and runtime behavior.
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {compilationProfile,itemConfiguration} from './cfg-profile.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const identifier=/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u;
const states=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const SOURCE_MODULE_VIEW_PROFILE=freeze({id:'original-inline-module-views-v1',maxSourceBytes:8_000_000,maxParsedBytes:32_000_000,maxModules:512,maxItems:20_000,maxDepth:64,namespaceAuthority:false,runtimeAuthority:false});
const condition=(parent,own)=>parent==='inactive'||own==='inactive'?'inactive':parent==='unknown'||own==='unknown'?'unknown':'active';
function originalItems(source,span,budget){
  const text=source.slice(span.start,span.end);budget.parsedBytes+=Buffer.byteLength(text);
  if(budget.parsedBytes>SOURCE_MODULE_VIEW_PROFILE.maxParsedBytes)throw new TypeError('Original module views exceed the parsed-byte bound');
  const items=sourceItems(text).filter(item=>!item.comment).map(item=>({...item,start:item.start+span.start,end:item.end+span.start,tokens:item.tokens.map(token=>({...token,start:token.start+span.start,end:token.end+span.start}))}));
  budget.items+=items.length;if(budget.items>SOURCE_MODULE_VIEW_PROFILE.maxItems)throw new TypeError('Original module views exceed the item bound');
  return items;
}
function inlineHeader(item,profile){
  const tokens=item.tokens.filter(token=>token.type!=='comment'),configuration=itemConfiguration(tokens,profile);
  let at=tokens.findIndex(token=>token.start>=(configuration.attributes.at(-1)?.span.end??item.start));
  if(at<0)return null;
  if(tokens[at]?.text==='pub'){
    at++;
    if(tokens[at]?.text==='('){let depth=0;do{if(tokens[at]?.text==='(')depth++;if(tokens[at]?.text===')')depth--;at++;}while(depth&&at<tokens.length);if(depth)return null;}
  }
  if(tokens[at++]?.text!=='mod')return null;
  let token=tokens[at++],name=token?.text;
  if(name==='r'&&tokens[at]?.text==='#'&&tokens[at+1]?.type==='ident'&&token.end===tokens[at].start&&tokens[at].end===tokens[at+1].start){name=tokens[at+1].text;at+=2;}
  if(!identifier.test(name??'')||tokens[at]?.text!=='{'||tokens[at]?.type!=='punct')return null;
  const open=tokens[at++];let depth=1;
  for(;at<tokens.length;at++){
    if(tokens[at].type!=='punct')continue;
    if(tokens[at].text==='{')depth++;if(tokens[at].text==='}')depth--;
    if(!depth){
      if(at!==tokens.length-1)return null;
      return {name,bodySpan:{start:open.end,end:tokens[at].start},configuration};
    }
  }
  return null;
}
export function captureSourceModuleViews({source,sourcePath,compilationProfile:input=null}={}){
  if(typeof source!=='string'||Buffer.byteLength(source)>SOURCE_MODULE_VIEW_PROFILE.maxSourceBytes)throw new TypeError('Original module source exceeds its byte bound');
  if(typeof sourcePath!=='string'||!sourcePath.endsWith('.rs')||sourcePath.includes('\\')||sourcePath.includes('\0')||sourcePath.includes(':')||sourcePath.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('Original module views need a repository-relative Rust source path');
  const profile=compilationProfile(input),sourceSha256=hash(source),views=[],diagnostics=[],paths=new Set(),budget={parsedBytes:0,items:0};
  function visit(path,bodySpan,parent=null,declaration=null,outer='active'){
    if(path.length>SOURCE_MODULE_VIEW_PROFILE.maxDepth||views.length>=SOURCE_MODULE_VIEW_PROFILE.maxModules)throw new TypeError('Original module views exceed their module/depth bound');
    const key=JSON.stringify(path);if(paths.has(key))throw new TypeError('Original module views have duplicate source module paths');paths.add(key);
    const items=originalItems(source,bodySpan,budget);
    const inner=items.filter(item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!').map(item=>itemConfiguration(item.tokens,profile));
    const own=inner.some(item=>item.status==='inactive')?'inactive':inner.some(item=>item.status==='unknown')?'unknown':'active';
    const configurationCondition=condition(outer,own),configurationEvidence=items.map(item=>({span:{start:item.start,end:item.end},...itemConfiguration(item.tokens,profile)}));
    const evidence={schema:'original-source-module-view-v1',sourcePath,sourceSha256,modulePath:path,bodySpan,bodySha256:hash(source.slice(bodySpan.start,bodySpan.end)),
      parentDigest:parent?.digest??null,declaration:declaration?{span:{start:declaration.start,end:declaration.end},sha256:hash(source.slice(declaration.start,declaration.end))}:null,
      compilationProfile:profile,configurationCondition,configurationEvidence,namespaceAuthority:false,attributeOwnerAuthority:false,runtimeAuthority:false};
    const view=freeze({...evidence,digest:hash(JSON.stringify(evidence))});states.set(view,{source,items:freeze(items),parent});views.push(view);
    for(const item of items.filter(item=>item.term==='mod')){
      const parsed=inlineHeader(item,profile);
      if(!parsed){diagnostics.push({source:sourcePath,modulePath:path,span:{start:item.start,end:item.end},kind:'source-module-view',message:'Original module requires an external-file or unsupported header consumer'});continue;}
      visit([...path,parsed.name],parsed.bodySpan,view,item,condition(configurationCondition,parsed.configuration.status));
    }
  }
  visit([],{start:0,end:source.length});
  return freeze({schema:'original-source-module-views-v1',profile:SOURCE_MODULE_VIEW_PROFILE,sourcePath,sourceSha256,views,diagnostics,observedParsedBytes:budget.parsedBytes,observedItems:budget.items,namespaceAuthority:false,runtimeAuthority:false});
}
export const isSourceModuleView=view=>!!view&&states.has(view);
export function originalModuleViewItems(view,source){
  const state=states.get(view);
  if(!state||typeof source!=='string'||source!==state.source||hash(source)!==view.sourceSha256)throw new TypeError('Original module view is unsealed or its complete source changed');
  return state.items;
}
export function originalModuleViewParent(view){
  const state=states.get(view);if(!state)throw new TypeError('Original module view is unsealed');return state.parent;
}
