// Standard line views retain the actual borrowed str item and source origin.
// No named/custom iterator, Borrow trait, or owned String borrow is inferred.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {WHITESPACE_ITERATOR_PROFILE} from './whitespace-profile.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../source-profiles/string-iterators/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
for(const source of [...manifest.sources,...manifest.reusedSources]) {
  const compressed=readFileSync(new URL(source.file,root));
  if(source.compressedSha256&&hash(compressed)!==source.compressedSha256)throw new Error('String iterator source archive differs from its pinned bytes');
  const bytes=gunzipSync(compressed,{maxOutputLength:150_000});
  if(hash(bytes)!==source.sha256||source.bytes&&bytes.length!==source.bytes)throw new Error('String iterator source differs from its pinned original bytes');
}
export const STRING_ITERATOR_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,constEligible:false});
const borrowed=type=>type?.kind==='string'&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str';
export function requireBorrowedString(type,span) {
  if(!borrowed(type))throw unsupported('standard borrowed str operation','requires an actual checked borrowed str without erased references or owned borrow escapes',span);
}
function proof(operation,span,extra={}) {return {profile:STRING_ITERATOR_PROFILE.id,verified:true,operation,constEligible:false,span:{...span},...extra};}
export function checkStringIteratorOperation(checker,node,object,env,path) {
  const count=node.operation==='join'?1:0;
  if(node.args.length!==count)throw typeError(`${node.operation} expects ${count} arguments`,node.span);
  if(['lines','split_whitespace'].includes(node.operation)) {
    requireBorrowedString(object.type,node.span);
    const element=structuredClone(object.type);
    return {k:node.operation==='lines'?'routerStringLines':'routerStringWords',object,type:{kind:'routerIterator',element},stringIteratorProof:proof(node.operation,node.span),...(node.operation==='split_whitespace'?{whitespaceIteratorProfile:WHITESPACE_ITERATOR_PROFILE}:{}),constEligible:false,span:node.span};
  }
  if(node.operation==='next') {
    // An immediate fresh cursor cannot be aliased or consumed twice. Stored
    // iterators and arbitrary adapters remain outside this first contract.
    if(!['routerStringLines','routerStringWords'].includes(object.k)||object.stringIteratorProof?.profile!==STRING_ITERATOR_PROFILE.id||object.stringIteratorProof.verified!==true)throw unsupported('Iterator::next','only an immediate fresh checked standard str cursor has a linear consumption proof',node.span);
    requireBorrowedString(object.type.element,node.span);
    if(!checker.instantiations?.option)throw unsupported('Iterator::next result','requires a canonical checked standard Option declaration',node.span);
    return {k:'routerStringNext',object,type:checker.instantiations.option(object.type.element,node.span),stringIteratorProof:proof('next',node.span,{consumption:'fresh-cursor-once'}),constEligible:false,span:node.span};
  }
  if(node.operation==='join') {
    const type=object.type,owner=type.rustOwnership,reference=type.rustReference;
    if(type.kind!=='array'||!((owner?.kind==='owned'&&owner.source==='Vec'&&!reference)||(owner?.kind==='borrowed'&&owner.source==='slice'&&reference?.kind==='shared'&&reference.pointee?.kind==='array')))throw unsupported('slice str join','requires an actual checked Vec<&str> or shared slice of borrowed str',node.span);
    requireBorrowedString(type.element,node.span);
    if(reference){requireBorrowedString(reference.pointee.element,node.span);checker.expectedOwnership?.(type.element,reference.pointee.element,path,node.span);}
    const separator=checker.expr(node.args[0],env,path);requireBorrowedString(separator.type,node.span);
    return {k:'routerStringJoin',object,separator,type:{kind:'string',rustSourceType:true,rustOwnership:{kind:'owned',source:'String'}},stringIteratorProof:proof('join',node.span,{elementType:structuredClone(type.element)}),constEligible:false,span:node.span};
  }
  throw unsupported('string iterator operation','has no registered standard source contract',node.span);
}
