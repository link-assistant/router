// Original standard Bytes supplies an actual primitive u8 Item. The caller's
// body and callbacks still use the common typed iterator compiler.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {rustFixedType} from '../checked-types.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const root=new URL('../source-profiles/string-bytes/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
for(const source of manifest.sources) {
  const encoded=readFileSync(new URL(source.file,root)),raw=gunzipSync(encoded,{maxOutputLength:128_000});
  if(hash(encoded)!==source.compressedSha256||raw.length!==source.bytes||hash(raw)!==source.sha256||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==source.gitBlobSha)throw new Error('Bytes source differs from its full original');
  const lines=raw.toString('utf8').split('\n');
  for(const anchor of source.anchors)if(lines.slice(anchor.startLine-1,anchor.endLine).join('\n')!==anchor.text)throw new Error('Bytes source anchor differs from its original');
}
const inputs=()=>manifest.sources.map(({url,sha256})=>({url,sha256}));
const item=()=>({...rustFixedType('u8'),rustPrimitiveName:'u8',rustSourceType:true});
const borrowed=type=>type?.kind==='string'&&type.rustSourceType===true&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&!type.patternOwnershipRefusal&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str';
export const STRING_BYTES_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,item:'u8',constEligible:false,namespaceComplete:false,traitComplete:false});
export function checkedStringBytes(object,span) {
  if(!borrowed(object.type))throw unsupported('str::bytes source receiver','requires actual checked borrowed str; custom/Deref/owned or erased-reference receivers need separate contracts',span);
  return {k:'routerStringBytes',object,type:{kind:'routerIterator',element:item()},constEligible:false,stringBytesProof:{profile:manifest.profile,sourceInputs:inputs(),sourceOwner:structuredClone(object.type),itemType:item(),evaluationOrder:'written-receiver-once-then-lazy-u8-items',constEligible:false,namespaceComplete:false,traitComplete:false,span:{...span}},span};
}
export function requireStringBytesProof(node) {
  const proof=node.stringBytesProof;
  if(node.k!=='routerStringBytes'||!borrowed(node.object?.type)||node.type?.kind!=='routerIterator'||!isDeepStrictEqual(node.type.element,item())||node.constEligible!==false||proof?.profile!==manifest.profile||!isDeepStrictEqual(proof.sourceInputs,inputs())||!isDeepStrictEqual(proof.sourceOwner,node.object.type)||!isDeepStrictEqual(proof.itemType,item())||!isDeepStrictEqual(proof.span,node.span)||proof.evaluationOrder!=='written-receiver-once-then-lazy-u8-items'||proof.constEligible!==false||proof.namespaceComplete!==false||proof.traitComplete!==false)throw new Error('missing actual checked str Bytes source proof');
}
