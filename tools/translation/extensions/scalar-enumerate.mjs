// The next-based scalar/product profile keeps the actual usize and Item
// identities; portable tuple shape does not prove references, Drop or owners.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sameType} from '../checked-types.mjs';
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';

const root=new URL('../source-profiles/scalar-enumerate/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const source of manifest.sources){
  const compressed=readFileSync(new URL(source.file,root));
  const original=gunzipSync(compressed,{maxOutputLength:150_000});
  if(hash(compressed)!==source.compressedSha256||original.length!==source.bytes||hash(original)!==source.sha256)throw new Error('Enumerate source differs from its pinned original bytes');
}
export const SCALAR_ENUMERATE_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,usizeBits:manifest.usizeBits,overflowChecks:manifest.overflowChecks,constEligible:false});

export function hasNextBasedEnumerate(node){
  for(let depth=0;node?.k==='routerIteratorOperation';depth++,node=node.object){
    if(depth>128)throw unsupported('Iterator::enumerate consumption','requires a bounded checked forward adapter chain',node.span);
    if(node.op==='enumerate'&&node.sourceIteratorEnumerate?.profile===manifest.profile)return true;
  }
  return false;
}

export function checkedScalarEnumerate(checker,node,object,indexType){
  if(object.type.kind!=='routerIterator'||typeof checker.inferTuple!=='function')throw unsupported('Iterator::enumerate','requires an actual checked iterator and bounded inferred product layout',node.span);
  if(indexType.rustPrimitiveName!=='usize'||indexType.bits!==manifest.usizeBits||indexType.signed||indexType.rustReference||indexType.rustGenericIdentityUnresolved)throw unsupported('Iterator::enumerate index','requires the original by-value usize of the selected checked-overflow profile',node.span);
  // inferTuple validates every original Item field, retaining references,
  // nominal owners and ownership-bearing fields as unresolved requirements.
  const itemType=object.type.element;
  const {entry,type}=checker.inferTuple([{type:indexType},{type:itemType}],node.span);
  return {k:'routerIteratorOperation',op:'enumerate',object,args:[],type:{kind:'routerIterator',element:type},span:node.span,constEligible:false,
    sourceIteratorEnumerate:{profile:manifest.profile,operation:'next',indexType:structuredClone(indexType),itemType:structuredClone(itemType),tupleType:structuredClone(type),tupleConstructor:entry.ctors[0].name,sourceInputs:manifest.sources.map(({url,sha256})=>({url,sha256})),evaluationOrder:[...manifest.evaluationOrder],advancedMethodsComplete:false,namespaceComplete:false}};
}

export function requireScalarEnumerate(node,indexType){
  const receipt=node.sourceIteratorEnumerate;
  if(node.op!=='enumerate'||node.object?.type?.kind!=='routerIterator'||node.args.length!==0||node.constEligible!==false||receipt?.profile!==manifest.profile||receipt.operation!=='next'||receipt.tupleConstructor!=='Tuple'||!sameType(receipt.indexType,indexType)||receipt.indexType.rustPrimitiveName!=='usize'||receipt.indexType.rustReference||!sameType(receipt.itemType,node.object.type.element)||!sameType(receipt.tupleType,node.type.element)||JSON.stringify(receipt.sourceInputs)!==JSON.stringify(manifest.sources.map(({url,sha256})=>({url,sha256})))||JSON.stringify(receipt.evaluationOrder)!==JSON.stringify(manifest.evaluationOrder))throw new Error('missing actual checked scalar Enumerate next profile');
}
