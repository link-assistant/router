// Standard Option<String>::as_deref borrows an existing shared source place.
// It neither manufactures a borrow of a local owned Option nor dispatches a
// user Deref implementation based on its portable string representation.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sameType} from '../checked-types.mjs';
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
const root=new URL('../source-profiles/option-deref/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const source of manifest.sources){const compressed=readFileSync(new URL(source.file,root)),raw=gunzipSync(compressed,{maxOutputLength:150_000});if(hash(compressed)!==source.compressedSha256||raw.length!==source.bytes||hash(raw)!==source.sha256)throw new Error('Option Deref source differs from its pinned original bytes');}
export const OPTION_DEREF_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,constEligible:false});
const ownedString=type=>type?.kind==='string'&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String';
export function sharedOptionString(checker,type,path,span){
  const reference=type?.rustReference,pointee=reference?.pointee;
  if(reference?.kind!=='shared'||pointee?.kind!=='data'||type.kind!=='data'||type.name!==pointee.name||pointee.rustReference||pointee.rustGenericIdentityUnresolved||pointee.rustBorrowingUnresolved)throw unsupported('Option::as_deref receiver','requires an actual existing shared Option<String> source place',span);
  const entry=checker.items.get(pointee.name),source=pointee.rustStandardGeneric??entry?.standardGeneric;
  if(entry?.k!=='data'||entry.fullName!==pointee.name||!Array.isArray(entry.modulePath)||entry.standardGeneric?.kind!=='Option'||entry.standardGeneric.arguments?.length!==1||source?.kind!=='Option'||source.arguments?.length!==1||entry.ctors?.length!==2)throw unsupported('Option::as_deref owner','requires the actual canonical standard Option declaration and its checked argument',span);
  const some=entry.ctors.filter(ctor=>ctor.name==='Some'),none=entry.ctors.filter(ctor=>ctor.name==='None');
  if(some.length!==1||none.length!==1||some[0].fields?.length!==1||some[0].fields[0].name!=='field0'||none[0].fields?.length!==0)throw typeError('Option::as_deref constructor layout is not canonical',span);
  const argument=checker.resolveType(source.arguments[0],entry.modulePath,span);
  for(const item of [argument,checker.resolveType(entry.standardGeneric.arguments[0],entry.modulePath,span),checker.resolveType(some[0].fields[0].type,entry.modulePath,span)]){
    if(!ownedString(item)||!sameType(item,argument))throw unsupported('Option::as_deref Deref target','only actual standard owned String has the pinned str target',span);
    checker.expectedOwnership?.(item,argument,path,span);
  }
  return {pointee,argument};
}
export function checkedOptionAsDeref(checker,node,object,path){
  if(node.args.length)throw typeError('Option::as_deref expects no arguments',node.span);
  const {pointee}=sharedOptionString(checker,object.type,path,node.span);
  if(!checker.instantiations?.option)throw unsupported('Option::as_deref result','requires the canonical checked Option instantiator',node.span);
  const element={kind:'string',rustSourceType:true,rustOwnership:{kind:'borrowed',source:'str'},rustBorrowLifetime:{kind:'elided',source:'Option::as_deref',span:{...node.span}}};
  return {k:'routerOptionAsDeref',object,type:checker.instantiations.option(element,node.span),optionDerefProof:{profile:OPTION_DEREF_PROFILE.id,verified:true,operation:'as_deref',receiver:'existing-shared-place',pointee:structuredClone(pointee),constEligible:false,span:{...node.span}},constEligible:false,span:node.span};
}
export function requireOptionDerefProof(node){if(node.optionDerefProof?.profile!==OPTION_DEREF_PROFILE.id||node.optionDerefProof.verified!==true||node.optionDerefProof.operation!=='as_deref'||node.optionDerefProof.receiver!=='existing-shared-place'||node.object?.type?.rustReference?.kind!=='shared'||node.constEligible!==false)throw new Error('missing checked standard shared Option<String> Deref proof');}
