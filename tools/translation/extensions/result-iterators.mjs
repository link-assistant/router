// Canonical Result collection only. Arbitrary FromIterator/destructors are not
// inferred from a tagged shape or the JavaScript representation of a payload.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {sameType,rustFixedType} from '../checked-types.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
const root=new URL('../source-profiles/result-iterators/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const source of manifest.sources){const compressed=readFileSync(new URL(source.file,root)),raw=gunzipSync(compressed,{maxOutputLength:100_000});if(hash(compressed)!==source.compressedSha256||raw.length!==source.bytes||hash(raw)!==source.sha256)throw new Error('Result collection source differs from its pinned original bytes');}
export const RESULT_ITERATOR_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,constEligible:false});
const proof=(operation,span,extra={})=>({profile:RESULT_ITERATOR_PROFILE.id,verified:true,operation,constEligible:false,span:{...span},...extra});
export function canonicalResult(checker,type,path,span,required=true){
  const entry=type?.kind==='data'?checker.items.get(type.name):null;
  if(entry?.standardGeneric?.kind!=='Result'){if(required)throw unsupported('standard Result pipeline','requires actual resolved standard Result identity',span);return null;}
  if(entry.k!=='data'||entry.fullName!==type.name||!Array.isArray(entry.modulePath)||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||entry.ctors?.length!==2||entry.standardGeneric.arguments?.length!==2)throw unsupported('standard Result pipeline','requires an actual by-value unerased Result with both checked arguments',span);
  const source=type.rustStandardGeneric??entry.standardGeneric;
  if(source.kind!=='Result'||source.arguments?.length!==2)throw typeError('Result source arguments are missing',span);
  const types=['Ok','Err'].map((name,index)=>{
    const ctors=entry.ctors.filter(ctor=>ctor.name===name),fields=ctors[0]?.fields;
    if(ctors.length!==1||fields?.length!==1||fields[0].name!=='field0')throw typeError('Result constructor layout is not canonical',span);
    const actual=checker.resolveType(source.arguments[index],entry.modulePath,span),layout=checker.resolveType(fields[0].type,entry.modulePath,span),registered=checker.resolveType(entry.standardGeneric.arguments[index],entry.modulePath,span);
    for(const other of [layout,registered]){if(!sameType(actual,other))throw typeError('Result payload differs from its registered checked layout',span);checker.expectedOwnership?.(actual,other,path,span);checker.expectedPrimitiveIdentity?.(actual,other,path,span);}
    return actual;
  });
  return {type,success:types[0],error:types[1]};
}
export function knownResultDrop(type,span){
  if(type?.rustReference||type?.rustGenericIdentityUnresolved||type?.rustBorrowingUnresolved)return false;
  if(['bool','unit'].includes(type?.kind))return true;
  if(type?.kind==='fixed'){const fixed=rustFixedType(type.rustPrimitiveName);return !!fixed&&fixed.bits===type.bits&&fixed.signed===type.signed;}
  if(type?.kind==='float')return type.rustPrimitiveName==='f64';
  return type?.kind==='string'&&['owned:String','borrowed:str'].includes(`${type.rustOwnership?.kind}:${type.rustOwnership?.source}`);
}
function registeredParseError(checker,type){
  if(type?.kind!=='data'||type.name!=='std.num.ParseIntError'||type.rustReference)return false;
  const entry=checker.items.get(type.name),fields=entry?.ctors?.[0]?.fields,kind=checker.items.get('std.num.IntErrorKind');
  return entry?.hostTypePath?.join('.')==='std.num.ParseIntError'&&entry.ctors.length===1&&entry.ctors[0].name==='ParseIntError'&&fields?.length===1&&fields[0].name==='kind'&&checker.resolveType(fields[0].type,entry.modulePath,entry.span).name==='std.num.IntErrorKind'&&kind?.hostTypePath?.join('.')==='std.num.IntErrorKind'&&kind.ctors?.length===5&&['Empty','InvalidDigit','PosOverflow','NegOverflow','Zero'].every(tag=>kind.ctors.filter(ctor=>ctor.name===tag&&ctor.fields.length===0).length===1);
}
function errorDrop(checker,type,span){return knownResultDrop(type,span)||registeredParseError(checker,type);}
function compatible(checker,actual,expected,path,span){if(!sameType(actual,expected))throw typeError('Result pipeline has a distinct checked payload identity',span);checker.expectedOwnership?.(actual,expected,path,span);checker.expectedPrimitiveIdentity?.(actual,expected,path,span);}
export function resultCollectionContext(checker,wanted,path,span){
  const result=canonicalResult(checker,wanted,path,span,false);if(!result)return null;
  const vector=result.success;
  if(vector.kind!=='array'||vector.rustReference||vector.rustFixedArray||vector.rustOwnership?.kind!=='owned'||vector.rustOwnership.source!=='Vec')throw unsupported('Result::from_iter target','only the actual checked standard owned Vec collection is supported',span);
  if(!knownResultDrop(vector.element,span))throw unsupported('Result::from_iter partial success destruction','requires actual standard scalar or String payloads without unproved destructor effects',span);
  if(!errorDrop(checker,result.error,span))throw unsupported('Result::from_iter error destruction','nominal error destructors require a separate source-certified no-Drop profile',span);
  const item=checker.instantiations.result(vector.element,result.error,span);
  return {kind:'routerIterator',element:item,resultCollectionContext:{profile:RESULT_ITERATOR_PROFILE.id,span:{...span}}};
}
export function checkResultMapItem(checker,type,itemExpected,path,span){
  if(itemExpected?.resultCollectionContext?.profile!==RESULT_ITERATOR_PROFILE.id)throw unsupported('Result iterator map','requires a direct checked standard Result<Vec<T>,E> collection context',span);
  const result=canonicalResult(checker,type,path,span),wanted=canonicalResult(checker,itemExpected.element,path,span);
  if(!knownResultDrop(result.success,span))throw unsupported('Result iterator success destruction','requires the checked standard scalar/String profile',span);
  compatible(checker,result.success,wanted.success,path,span);compatible(checker,result.error,wanted.error,path,span);
  return proof('map-result',span);
}
export function checkResultCollect(checker,node,object,wanted,path){
  const context=resultCollectionContext(checker,wanted,path,node.span);
  if(!context)throw unsupported('Result::from_iter target','requires an actual expected canonical Result<Vec<T>,E>',node.span);
  const item=canonicalResult(checker,object.type.element,path,node.span),expected=canonicalResult(checker,context.element,path,node.span);
  compatible(checker,item.success,expected.success,path,node.span);compatible(checker,item.error,expected.error,path,node.span);
  return {k:'routerResultCollect',object,type:wanted,resultIteratorProof:proof('collect-result',node.span,{evaluation:'forward-until-first-error',successType:structuredClone(item.success),errorType:structuredClone(item.error)}),constEligible:false,span:node.span};
}
export function checkResultMapError(checker,node,receiver,env,path,expected){
  const input=canonicalResult(checker,receiver.type,path,node.span);
  if(node.args.length!==1)throw typeError('Result::map_err expects one callback',node.span);
  // The old Err is consumed by the callback. Its eventual destruction cannot
  // be granted for an arbitrary source data type (including a user Drop impl).
  if(!errorDrop(checker,input.error,node.span))throw unsupported('Result::map_err consumed error','requires a standard scalar/String or registered ParseIntError destruction profile',node.span);
  const output=canonicalResult(checker,expected,path,node.span,false);
  if(output)compatible(checker,input.success,output.success,path,node.span);
  const callback=checker.hostLambda(node.args[0],[input.error],env,path,output?.error,{source:'standard-result',receiverType:receiver.type});
  if(!errorDrop(checker,callback.type.result,node.span))throw unsupported('Result::map_err output error destruction','nominal error destructors require a separate source-certified no-Drop profile',node.span);
  const type=output?.type??checker.instantiations.result(input.success,callback.type.result,node.span);
  if(output)compatible(checker,callback.type.result,output.error,path,node.span);
  return {k:'routerResultMapErr',object:receiver,callback,type,resultIteratorProof:proof('map-error',node.span,{evaluationOrder:['receiver','callback-capture'],callbackCondition:'Err',callbackInvocation:'once'}),constEligible:false,span:node.span};
}
export function requireResultIteratorProof(node){if(node.resultIteratorProof?.profile!==RESULT_ITERATOR_PROFILE.id||node.resultIteratorProof.verified!==true||node.constEligible!==false)throw new Error('missing checked standard Result iterator proof');}
