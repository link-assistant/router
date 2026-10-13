// Standard shared references are Copy independently of their pointees. This
// source rule grants no pointee move, mutation, destructor or lifetime escape.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
const bytes=gunzipSync(readFileSync(new URL('./source-profiles/copy-standard/rust-marker-1.89.0.rs.gz',import.meta.url)),{maxOutputLength:100000});
const hash=value=>createHash('sha256').update(value).digest('hex');
if(bytes.length!==53066||hash(bytes)!=='db5d413946a48f816af89e83f99741693d1aaf088633db60c8d372a555ff8809')throw new TypeError('Shared reference Copy requires the actual pinned marker source');
const source=bytes.toString('utf8'),matches=sourceItems(source).filter(item=>item.term==='impl'&&item.tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('').endsWith('impl<T:PointeeSized>Copyfor&T{}'));
if(matches.length!==1)throw new TypeError('Shared reference Copy requires its exact original generic implementation');
const item=matches[0];
export const SHARED_REFERENCE_COPY_SOURCE=Object.freeze({profile:'rust-1.89-original-shared-reference-copy',sourceSha256:hash(bytes),implementationSha256:hash(source.slice(item.start,item.end)),span:Object.freeze({start:item.start,end:item.end}),url:'https://github.com/rust-lang/rust/blob/1.89.0/library/core/src/marker.rs',pointeeCopyRequired:false,pointeeDropAuthority:false,lifetimeAuthority:false});
function identity(type,depth=0){
  if(!type||depth>32||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return null;
  if(type.rustReference){if(type.rustReference.kind!=='shared')return null;const pointee=identity(type.rustReference.pointee,depth+1);return pointee?'&'+pointee:null;}
  if(type.kind==='data'&&typeof type.name==='string')return 'data:'+type.name;
  if(type.kind==='fixed'&&typeof type.rustPrimitiveName==='string')return type.rustPrimitiveName;
  if(['bool','unit'].includes(type.kind))return type.kind;
  if(type.kind==='float'&&type.rustPrimitiveName==='f64')return 'f64';
  if(type.kind==='string'&&type.rustOwnership)return 'string:'+type.rustOwnership.kind+':'+type.rustOwnership.source;
  if(type.kind==='array'){const element=identity(type.element,depth+1);return element?'array:'+type.rustOwnership?.kind+':'+type.rustOwnership?.source+':'+(type.rustFixedArray?.length??'slice')+':'+element:null;}
  return null;
}
export function sharedReferenceCopyIdentity(type){return type?.rustReference?.kind==='shared'?identity(type):null;}

const optionBytes=gunzipSync(readFileSync(new URL('./source-profiles/option-deref/core-option.rs.gz',import.meta.url)),{maxOutputLength:100000});
if(optionBytes.length!==86718||hash(optionBytes)!=='4c172731ebf0ef2ae6fc3e9b5127096d3c5c400c3757cfe5e38223de91bc3efd')throw new TypeError('Option Copy requires the pinned original Option declaration');
const optionSource=optionBytes.toString('utf8'),options=sourceItems(optionSource).filter(item=>item.term==='enum'&&item.name==='Option');
if(options.length!==1||!options[0].tokens.map(token=>token.text).join('').includes('#[derive(Copy,Eq,Debug,Hash)]'))throw new TypeError('Option Copy requires its actual original builtin derive');
export const STANDARD_OPTION_COPY_SOURCE=Object.freeze({profile:'rust-1.89-original-option-copy-derive',sourceSha256:hash(optionBytes),declarationSha256:hash(optionSource.slice(options[0].start,options[0].end)),span:Object.freeze({start:options[0].start,end:options[0].end}),url:'https://github.com/rust-lang/rust/blob/1.89.0/library/core/src/option.rs',payloadCopyRequired:true});
