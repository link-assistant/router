// Source-known slice membership is a standard trait operation, not substring
// search or permission to invoke arbitrary JavaScript equality implementations.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fixedArrayLength} from '../checked-types.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const root=new URL('../source-profiles/slice-membership/',import.meta.url);
const manifestBytes=readFileSync(new URL('manifest.json',root));
if(hash(manifestBytes)!=='832476761c901eb0e22a72c12480482f111c31111d4dddd007ee7701fffe7fe9')throw new TypeError('Slice membership source manifest changed');
const manifest=JSON.parse(manifestBytes.toString('utf8'));
for(const entry of manifest.sources){
  const packed=readFileSync(new URL(entry.file,root));
  if(hash(packed)!==entry.compressedSha256)throw new TypeError('Slice membership source archive changed');
  const source=gunzipSync(packed,{maxOutputLength:250_000});
  if(source.length!==entry.bytes||hash(source)!==entry.sha256)throw new TypeError('Slice membership source differs from its pinned original bytes');
}
for(const entry of manifest.licenses){const text=readFileSync(new URL(entry.file,root));if(text.length!==entry.bytes||hash(text)!==entry.sha256)throw new TypeError('Slice membership source license changed');}
export const SLICE_MEMBERSHIP_PROFILE=freeze({...manifest,sourceInputsVerified:true});
const fail=span=>{throw unsupported('borrowed string slice membership','requires actual standard slice/Vec/fixed-array source ownership, &str elements and one checked &&str argument; custom equality and other borrow adjustments remain unsupported',span);};
const scalar=type=>type?.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str'&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.patternOwnershipRefusal;
const range=span=>Number.isInteger(span?.start)&&Number.isInteger(span?.end)&&span.start>=0&&span.end>=span.start;
function reference(type,span){
  const value=type?.rustReference;
  if(value?.kind!=='shared'||!value.pointee||value.pointee.rustReference||type.patternOwnershipRefusal!=='shared source reference'||!range(value.span)||value.tokens?.[0]?.value!=='&')return fail(span);
  return value.pointee;
}
export function borrowedStringSliceReceiver(type,span){
  if(type?.kind!=='array'||type.rustSourceType!==true||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return fail(span);
  const base=type.rustReference?reference(type,span):type;
  if(base.kind!=='array'||base.rustGenericIdentityUnresolved||base.rustBorrowingUnresolved||base.patternOwnershipRefusal||!scalar(base.element)||base.element.rustBorrowingUnresolved)return fail(span);
  const owner=base.rustOwnership,length=fixedArrayLength(base);
  let kind;
  if(owner?.kind==='owned'&&owner.source==='Vec'&&length===null)kind='Vec';
  else if(owner?.kind==='borrowed'&&owner.source==='slice'&&type.rustReference&&length===null)kind='slice';
  else if(owner?.kind==='value'&&owner.source==='array'&&length!==null)kind='fixed-array';
  else return fail(span);
  return {kind,length,sharedReceiver:Boolean(type.rustReference)};
}
function scopedStr(value,span){
  const type=value?.type;if(!scalar(type))return fail(span);
  if(!type.rustBorrowingUnresolved)return;
  const proof=value.sourceOwnershipOperation,receiver=value.sourceOwnershipReceiver;
  if(type.rustBorrowingUnresolved!=='borrow of owned String'||type.rustBorrowLifetime?.source!=='String::as_str'||proof?.profile!=='checked-standard-string-ownership-v1'||proof.verified!==true||proof.operation!=='as_str'||!range(proof.span)||receiver?.type?.kind!=='string'||receiver.type.rustReference||receiver.type.rustOwnership?.kind!=='owned'||receiver.type.rustOwnership.source!=='String'||receiver.type.rustGenericIdentityUnresolved)return fail(span);
}
export function planBorrowedStringSliceContains(receiver,argument,surface,span,methodScope){
  const adjusted=borrowedStringSliceReceiver(receiver?.type,span);
  // Vec/array adjustment reaches slice only after earlier receiver candidates.
  // An in-scope trait may provide a method on those earlier candidates. The
  // first profile accepts adjustment only in an actual closed, value-only
  // module namespace; ordinary slice's inherent receiver is already first.
  if(adjusted.kind!=='slice'&&(!methodScope||typeof methodScope.source!=='string'||!Array.isArray(methodScope.module)||!Array.isArray(methodScope.bindings)||methodScope.unresolvedTypeScope!==false||methodScope.unresolvedAttributeMacroScope!==false||methodScope.bindings.some(binding=>binding.namespace!=='value')))return fail(span);
  let borrow;
  if(surface?.k==='routerTextReference'){
    const token=surface.sourceBorrowToken;
    if(token?.value!=='&'||!range(token.span)||token.span.end!==token.span.start+1||token.span.start!==surface.span?.start||argument.type?.rustReference)return fail(span);
    scopedStr(argument,span);borrow={kind:'explicit-shared-borrow',token:structuredClone(token),pointee:structuredClone(argument.type)};
  }else{
    const pointee=reference(argument?.type,span);
    scopedStr({...argument,type:pointee},span);
    if(argument.type?.kind!=='string'||argument.type.rustOwnership?.kind!=='borrowed'||argument.type.rustOwnership.source!=='str'||argument.type.rustGenericIdentityUnresolved||argument.type.rustBorrowingUnresolved)return fail(span);
    borrow={kind:'existing-shared-reference',reference:structuredClone(argument.type.rustReference)};
  }
  return freeze({profile:SLICE_MEMBERSHIP_PROFILE.profile,rust:SLICE_MEMBERSHIP_PROFILE.rust,sourceInputsVerified:true,receiver:adjusted,...(adjusted.kind!=='slice'?{sourceMethodScope:structuredClone(methodScope)}:{}),argument:borrow,implementation:'SliceContains<&str>; PartialEq<&str> for &str; PartialEq for str',constEligible:false,namespaceAuthority:false,runtimeParity:false});
}
