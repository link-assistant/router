// A fresh Pattern<char> Split is DoubleEnded; only checked pure str trim maps
// are preserved here. This is not substring rfind or a blanket iterator trait.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {BOOL} from '../checked-types.mjs';
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {requireBorrowedString} from './string-iterators.mjs';
import {requireCsvEmitterProof} from './csv-strings.mjs';
const root=new URL('../source-profiles/reverse-string-iterators/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const source of manifest.sources){const gz=readFileSync(new URL(source.file,root)),raw=gunzipSync(gz,{maxOutputLength:150_000});if(hash(gz)!==source.compressedSha256||hash(raw)!==source.sha256||raw.length!==source.bytes)throw new Error('Reverse split source differs from its pinned original bytes');}
export const REVERSE_STRING_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,constEligible:false});
function pureTrim(callback,span){
  const binding=callback?.binding,body=binding?.body;
  if(callback?.k!=='routerLambda'||callback.arity!==1||binding?.k!=='let'||binding.value?.k!=='routerLambdaInput'||binding.value.position!==0||body?.k!=='routerStringOperation'||!['trim','trim_start','trim_end'].includes(body.op)||body.args?.length!==0||body.string?.k!=='var'||body.string.name!==binding.name)throw unsupported('reverse Map callback','only actual checked pure borrowed-str trim adapters preserve this bounded DoubleEnded profile',span);
  requireBorrowedString(binding.value.type,span);requireBorrowedString(body.string.type,span);requireBorrowedString(body.type,span);
}
export function reverseSplitPlan(object,span){
  if(object?.type?.kind!=='routerIterator')throw unsupported('rfind receiver','requires a fresh checked double-ended literal-character Split pipeline',span);
  const maps=[];let base=object;
  while(base.k==='routerIteratorOperation'&&base.op==='map'){
    if(maps.length>=32||base.args?.length!==1)throw unsupported('reverse Map chain','requires at most 32 unary checked trim adapters',span);
    pureTrim(base.args[0],span);maps.unshift(base.args[0]);base=base.object;
  }
  if(base.k!=='routerStringSplit')throw unsupported('rfind receiver','stored, filtered, owned and arbitrary iterator reverse protocols are unsupported',span);
  requireCsvEmitterProof(base);requireBorrowedString(object.type.element,span);
  return {base,maps};
}
export function checkedReverseSplitFind(checker,node,object,env,path){
  if(node.args.length!==1)throw typeError('DoubleEndedIterator::rfind expects one predicate',node.span);
  const {base,maps}=reverseSplitPlan(object,node.span),element=object.type.element;
  const shared={...element,rustSourceType:true,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:structuredClone(element),source:'DoubleEndedIterator::rfind',span:{...node.span}}};delete shared.rustBorrowLifetime;
  const predicate=checker.hostLambda(node.args[0],[shared],env,path,BOOL,{source:'iterator',receiverType:object.type});
  if(!checker.instantiations?.option)throw unsupported('rfind result','requires the actual standard Option instantiator',node.span);
  return {k:'routerReverseSplitFind',object,base,maps,predicate,type:checker.instantiations.option(element,node.span),reverseStringProof:{profile:REVERSE_STRING_PROFILE.id,verified:true,operation:'rfind',traversal:'reverse-scalar-boundaries',mapOrder:'source-order-per-field',predicateArgument:'shared-Item',consumption:'fresh-pipeline-once',constEligible:false,span:{...node.span}},constEligible:false,span:node.span};
}
export function requireReverseStringProof(node){
  if(node.reverseStringProof?.profile!==REVERSE_STRING_PROFILE.id||node.reverseStringProof.verified!==true||node.reverseStringProof.operation!=='rfind'||node.constEligible!==false)throw new Error('missing checked standard reverse Split proof');
  const plan=reverseSplitPlan(node.object,node.span);
  if(!isDeepStrictEqual(plan.base,node.base)||!isDeepStrictEqual(plan.maps,node.maps))throw new Error('reverse Split plan differs from its actual checked pipeline');
}
