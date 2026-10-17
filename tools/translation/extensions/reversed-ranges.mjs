// Actual fresh fixed Range/RangeInclusive through Rev::next -> next_back.
// No custom DoubleEndedIterator, stored cursor or specialized consumer proof.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {rustFixedType} from '../checked-types.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';

const root=new URL('../source-profiles/reversed-ranges/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const source of manifest.sources) {
  const encoded=readFileSync(new URL(source.file,root)),original=gunzipSync(encoded,{maxOutputLength:150_000});
  if(hash(encoded)!==source.compressedSha256||original.length!==source.bytes||hash(original)!==source.sha256||source.gitBlobSha&&createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${original.length}\0`),original])).digest('hex')!==source.gitBlobSha)throw new Error('Reverse range source differs from its full pinned original');
}
export const REVERSED_RANGE_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,constEligible:false,namespaceComplete:false,advancedMethodsComplete:false});
const inputs=()=>manifest.sources.map(({url,sha256})=>({url,sha256}));
function requireFixedRange(object,span) {
  const type=object?.type?.element,primitive=rustFixedType(type?.rustPrimitiveName);
  if(object?.k!=='routerRange'||object.type?.kind!=='routerIterator'||typeof object.inclusive!=='boolean'||!primitive)throw unsupported('Iterator::rev range receiver','requires an actual fresh checked standard fixed-integer Range or RangeInclusive',span);
  for(const actual of [type,object.start?.type,object.end?.type])if(actual?.kind!=='fixed'||actual.rustPrimitiveName!==type.rustPrimitiveName||actual.bits!==primitive.bits||actual.signed!==primitive.signed||actual.rustReference||actual.rustOwnership||actual.patternOwnershipRefusal||actual.rustGenericIdentityUnresolved||actual.rustBorrowingUnresolved)throw unsupported('Iterator::rev range Item','requires actual by-value fixed TrustedStep identities without reference or owner erasure',span);
  return type;
}
export function checkedReversedRange(node,object) {
  if(node.explicit)throw unsupported('Iterator::rev generic arguments','the pinned Iterator::rev has no method type parameters',node.span);
  const itemType=requireFixedRange(object,node.span);
  return {k:'routerIteratorOperation',op:'rev',object,args:[],type:object.type,span:node.span,constEligible:false,
    sourceIteratorReverse:{profile:manifest.profile,rangeKind:object.inclusive?'RangeInclusive':'Range',itemType:structuredClone(itemType),receiverType:structuredClone(object.type),rangeSourceSpan:structuredClone(object.span),sourceInputs:inputs(),evaluationOrder:[...manifest.evaluationOrder],namespaceComplete:false,advancedMethodsComplete:false}};
}
export function hasNextBasedReversedRange(node) {
  for(let depth=0;node?.k==='routerIteratorOperation';depth++,node=node.object) {
    if(depth>128)throw unsupported('Iterator::rev consumption','requires a bounded checked forward adapter chain',node.span);
    if(node.op==='rev'&&node.sourceIteratorReverse?.profile===manifest.profile)return true;
  }
  return false;
}
export function requireReversedRange(node) {
  const proof=node.sourceIteratorReverse,type=requireFixedRange(node.object,node.span);
  if(node.op!=='rev'||!Array.isArray(node.args)||node.args.length||node.constEligible!==false||proof?.profile!==manifest.profile||proof.namespaceComplete!==false||proof.advancedMethodsComplete!==false||proof.rangeKind!==(node.object.inclusive?'RangeInclusive':'Range')||!isDeepStrictEqual(proof.itemType,type)||!isDeepStrictEqual(proof.receiverType,node.object.type)||!isDeepStrictEqual(node.type,node.object.type)||!isDeepStrictEqual(proof.rangeSourceSpan,node.object.span)||!isDeepStrictEqual(proof.sourceInputs,inputs())||!isDeepStrictEqual(proof.evaluationOrder,manifest.evaluationOrder))throw new Error('missing actual checked fresh fixed reverse range profile');
}
