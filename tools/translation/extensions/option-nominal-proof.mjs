// Only the closed original project Copy prepass can issue nominal payload
// authority. Copy proves absence of Drop; actual checked layouts remain exact.
import {originalOptionCopyPayload} from '../project-copy.mjs';
import {metadataDigest} from './source-links.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const contexts=new WeakMap(),tokens=new WeakSet();
const layout=entry=>({fullName:entry.fullName,modulePath:entry.modulePath,ctors:entry.ctors,record:entry.record,tuple:entry.tuple,standardGeneric:entry.standardGeneric});
export function captureOptionNominals(checker,surface){
  const entries=new Map();
  const visit=items=>{for(const item of items){if(item.k==='module')visit(item.items);else{const proof=originalOptionCopyPayload(item);if(proof){const token=Object.freeze({proof,layoutDigest:metadataDigest(layout(proof.layout))});tokens.add(token);entries.set(proof.layout.fullName,token);}}}};
  visit(surface.items);contexts.set(checker,entries);
}
export function checkedOptionNominal(checker,type,span){
  const entries=contexts.get(checker),entry=checker.items.get(type?.name);
  const decoded=typeof type?.name==='string'&&/^rp_(?:[a-f0-9]{2})+$/u.test(type.name)?Buffer.from(type.name.slice(3),'hex').toString('utf8'):null;
  const token=entries?.get(type?.name)??(decoded&&type.name==='rp_'+Buffer.from(decoded).toString('hex')?entries?.get(decoded):null);
  const actualLayout=(actual,original)=>{
    if(!actual)return null;let value=layout(actual);
    const target='rp_'+Buffer.from(original.fullName).toString('hex');
    if(actual.fullName===target&&actual.generated==='router-project-flattened'){
      const restore=value=>{if(Array.isArray(value))return value.map(restore);if(!value||typeof value!=='object')return value;const result=Object.fromEntries(Object.entries(value).map(([key,item])=>[key,restore(item)]));if(value.kind==='named'&&value.path?.length===2&&value.path[0]==='crate'&&/^rp_(?:[a-f0-9]{2})+$/u.test(value.path[1]))result.path=['crate',...Buffer.from(value.path[1].slice(3),'hex').toString('utf8').split('.')];if(value.kind==='data'&&/^rp_(?:[a-f0-9]{2})+$/u.test(value.name??''))result.name=Buffer.from(value.name.slice(3),'hex').toString('utf8');return result;};
      value={...restore(value),fullName:original.fullName,modulePath:original.modulePath};
    }
    return value;
  };
  const actual=token&&actualLayout(entry,token.proof.layout);
  if(type?.kind!=='data'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||!token||!tokens.has(token)||!entry||metadataDigest(actual)!==token.layoutDigest)throw unsupported('Option nominal payload','requires a private original checked Copy layout and closed no-Drop implementation evidence',span);
  for(const original of token.proof.dependencies){const target=entry.fullName===token.proof.layout.fullName?original.fullName:'rp_'+Buffer.from(original.fullName).toString('hex'),actual=checker.items.get(target);if(metadataDigest(actualLayout(actual,original))!==metadataDigest(layout(original)))throw unsupported('Option nominal dependency','requires every exact private checked Copy/no-Drop payload layout',span);}
  return token;
}
export function optionNominalContext(checker){return contexts.get(checker);}
export function restoreOptionNominals(checker,context){
  if(!(context instanceof Map)||[...context.values()].some(token=>!tokens.has(token)))throw new TypeError('Option nominal context is not privately issued');
  contexts.set(checker,context);
}
