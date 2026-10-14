// Block-scoped impls have crate-wide trait/coherence effects. Module-only
// declaration discovery cannot silently certify their absence.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {ownData,copyMetadata} from './extensions/source-links.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
function opaqueReferencePrefix(tokens,index){
 let at=index-1;if(tokens[at]?.text==='mut')at--;
 if(tokens[at]?.type==='char'&&/^'[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(tokens[at].text))at--;
 return tokens[at]?.text==='&';
}
export function originalNestedImplementationObligations(module){
 if(!module||types.isProxy(module)||![null,Object.prototype].includes(Object.getPrototypeOf(module)))throw new TypeError('Nested implementation census requires an ordinary original module');
 const source=ownData(module,'source'),file=ownData(module,'file'),path=ownData(module,'path');
 for(const key of ['sourceView','compilationProfile','configurationCondition'])if(Object.hasOwn(module,key))ownData(module,key);
 if(typeof source!=='string'||typeof file!=='string'||!Array.isArray(path)||types.isProxy(path))throw new TypeError('Nested implementation census lacks original source identity');
 const modulePath=copyMetadata(path);let sourceSha256;
 const items=originalSourceModuleItems(module),rows=[];
 if(module.configurationCondition==='inactive')return Object.freeze(rows);
 for(const item of items){
  // Genuine module wrappers have independently captured child views. Their
  // module-level impls must retain their actual lexical module identity.
  if(item.term==='mod'||itemConfiguration(item.tokens,module.compilationProfile).status==='inactive')continue;
  let braces=0,previous=null;const tokens=item.tokens.filter(token=>token.type!=='comment');
  for(let index=0;index<tokens.length;index++){
   const token=tokens[index];
   // In a written parameter/return type, `impl Trait` introduces an opaque
   // type, not a crate-wide implementation declaration.
   if(token.text==='impl'&&braces>0&&![':','->','='].includes(previous)&&!opaqueReferencePrefix(tokens,index))rows.push(Object.freeze({
    source:file,sourceSha256:sourceSha256??=hash(source),module:Object.freeze([...modulePath]),
    enclosingTerm:item.term,enclosingName:item.name??null,
    enclosingSpan:Object.freeze({start:item.start,end:item.end}),
    span:Object.freeze({start:token.start,end:token.end}),
    message:'Nested original implementation requires separately checked lexical target and coherence evidence',
   }));
   if(token.text==='{')braces++;
   else if(token.text==='}')braces--;
   previous=token.text;
  }
 }
 return Object.freeze(rows);
}
