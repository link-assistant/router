// Complete original primitive Clone transcription. This leaf selects source
// tokens and members only: callers still owe trait identity, layout and loans.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {compileDeclarativeMacro,expandDeclarativeMacro} from '../declarative-token-macros.mjs';
import {originalTopLevelMacroInvocations,originalMacroTreeText,freezeMacroTree} from '../macro-token-trees.mjs';
const root=new URL('../source-profiles/source-clone/',import.meta.url),manifestBytes=readFileSync(new URL('manifest.json',root)),manifest=JSON.parse(manifestBytes);
const hash=value=>createHash('sha256').update(value).digest('hex'),brands=new WeakSet();let selected;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
export function originalPrimitiveCloneExpansion(){
  if(selected)return selected;
  const refs=manifest.references.filter(row=>row.path==='library/core/src/clone.rs');
  if(manifest.rust!=='1.89.0'||refs.length!==1||refs[0].bytes!==21530||refs[0].sha256!=='c1b8a02d24d463b92f2f97f0012dfa01fdb8e2d8821a4c53af7640ec145adcf5'||refs[0].archiveSha256!=='34a2a64d9a2a15a170989290dd7c9e13635ae11880152b1825c4d2ed571e2f0b')throw new TypeError('Original primitive Clone source profile differs');
  const pin=refs[0],packed=readFileSync(new URL(pin.archive,root)),raw=gunzipSync(packed,{maxOutputLength:32000});
  if(hash(packed)!==pin.archiveSha256||raw.length!==pin.bytes||hash(raw)!==pin.sha256)throw new TypeError('Original primitive Clone source bytes differ');
  const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),modules=sourceItems(source).filter(item=>item.term==='mod'&&item.name==='impls');
  if(modules.length!==1)throw new TypeError('Original primitive Clone implementation module is absent or ambiguous');
  const module=modules[0],tokens=significant(module.tokens),open=tokens.findIndex(token=>token.text==='{'),moduleBodySpan={start:tokens[open].end,end:tokens.at(-1).start},moduleBody=source.slice(moduleBodySpan.start,moduleBodySpan.end);
  const definition=compileDeclarativeMacro(moduleBody,{name:'impl_clone',owner:['core','clone','impls']}),calls=originalTopLevelMacroInvocations(moduleBody).filter(call=>same(call.path,['impl_clone']));
  if(calls.length!==1)throw new TypeError('Original complete primitive Clone invocation is absent or ambiguous');
  const invocation=calls[0],expansion=expandDeclarativeMacro(definition,invocation.trees),expandedSource=expansion.trees.map(originalMacroTreeText).join(' '),items=sourceItems(expandedSource).filter(item=>!item.comment);
  if(!invocation.trees.length||items.length!==invocation.trees.length||items.some(item=>item.term!=='impl')||invocation.trees.some(tree=>tree.kind!=='token'||tree.type!=='ident'))throw new TypeError('Original primitive Clone expansion does not preserve its complete type repetition');
  const members=items.map((item,index)=>{
    const words=significant(item.tokens),start=words.findIndex(token=>token.text==='impl'),open=words.findIndex((token,at)=>at>start&&token.text==='{'),target=invocation.trees[index].text;
    if(!same(words.slice(start,open).map(token=>token.text),['impl','Clone','for',target]))throw new TypeError('Original primitive Clone target or trait slot differs');
    const bodyOffset=words[open].end,body=expandedSource.slice(bodyOffset,words.at(-1).start),methods=sourceItems(body).filter(entry=>!entry.comment);
    if(methods.length!==1||methods[0].term!=='fn'||methods[0].name!=='clone')throw new TypeError('Original primitive Clone needs one complete actual method');
    const method=methods[0],mt=significant(method.tokens),fn=mt.findIndex(token=>token.text==='fn'),methodOpen=mt.findIndex((token,at)=>at>fn&&token.text==='{');
    if(!same(mt.slice(fn,methodOpen).map(token=>token.text),['fn','clone','(','&','self',')','->','Self']))throw new TypeError('Original primitive Clone shared receiver signature differs');
    return {target,implSource:expandedSource.slice(item.start,item.end),implSpan:{start:item.start,end:item.end},methodSource:body.slice(method.start,method.end),methodSpan:{start:bodyOffset+method.start,end:bodyOffset+method.end},bodySource:body.slice(mt[methodOpen].end,mt.at(-1).start),signature:mt.slice(fn,methodOpen).map(token=>token.text),originalTypeSyntax:invocation.trees[index],traitOwnerResolved:false,bodyChecked:false};
  });
  const evidence={schema:'complete-original-primitive-clone-transcription-v1',rust:manifest.rust,profileSha256:hash(manifestBytes),source:{path:pin.path,sha256:pin.sha256,bytes:pin.bytes,original:source},moduleSpan:{start:module.start,end:module.end},moduleBodySpan,moduleBody,definition,invocation,expansion,expandedSource,members,namespaceAuthority:false,runtimeAuthority:false,wholeTraitTranslated:false};
  selected=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});brands.add(selected);return selected;
}
export function assertOriginalPrimitiveCloneExpansion(proof){if(!brands.has(proof)||proof!==selected)throw new TypeError('Primitive Clone transcription needs its private original source proof');return proof;}
