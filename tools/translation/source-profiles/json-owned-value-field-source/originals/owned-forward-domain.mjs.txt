// Finite field/carrier language rules. Original full function issuers are reused.
import {sameType,fixed,BOOL} from './checked-types.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {checkForwardPrimitiveOption} from './primitive-option-forward-domain.mjs';
import {checkForwardPrimitiveOptionCallback} from './primitive-option-callback-forward-domain.mjs';
import {checkForwardPrimitiveResult} from './primitive-result-forward-domain.mjs';
import {JSON_TYPES} from './extensions/json-contracts.mjs';
import {SOURCE_STRING,SOURCE_STR,sourceShared} from './extensions/source-contract-types.mjs';
import {canonicalResult} from './extensions/result-iterators.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';

export const forwardOwnedString=type=>type?.kind==='string'&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String'&&[undefined,'ownership-bearing String type','owned String source type','owned String formatting'].includes(type.patternOwnershipRefusal);
function compatible(checker,actual,wanted,path,span){
 if(!sameType(actual,wanted))throw typeError('owned field/carrier native type differs',span);checker.expectedOwnership(actual,wanted,path,span);checker.expectedPrimitiveIdentity(actual,wanted,path,span);
}
export function forwardOwnedCarrier(checker,type,kind,path,span,canonical){
 if(!type||type.rustReference||type.rustOwnership||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned carrier source type','requires a complete by-value canonical standard carrier',span);
 const owner=type.kind==='data'?checker.items.get(type.name):null,source=type.rustStandardGeneric??owner?.standardGeneric;
 if(owner?.k!=='data'||owner.fullName!==type.name||!Array.isArray(owner.modulePath)||owner.standardGeneric?.kind!==kind||source?.kind!==kind)throw unsupported('owned carrier source identity','requires its real registered standard generic owner',span);
 if(kind==='Result'){
  const result=canonicalResult(checker,type,path,span);canonical(checker,result.success,span,false);if(!forwardOwnedString(result.error))throw unsupported('owned carrier error','requires actual owned standard String',span);return {kind,success:result.success,error:result.error};
 }
 if(kind!=='Option'||source.arguments?.length!==1||owner.standardGeneric.arguments?.length!==1||owner.ctors?.length!==2)throw typeError('actual standard Option layout differs',span);
 const some=owner.ctors.filter(row=>row.name==='Some'),none=owner.ctors.filter(row=>row.name==='None');if(some.length!==1||none.length!==1||some[0].fields?.length!==1||some[0].fields[0].name!=='field0'||none[0].fields?.length!==0)throw typeError('actual standard Option constructors differ',span);
 const payload=checker.resolveType(source.arguments[0],owner.modulePath,span);canonical(checker,payload,span,false);for(const written of [owner.standardGeneric.arguments[0],some[0].fields[0].type])compatible(checker,checker.resolveType(written,owner.modulePath,span),payload,path,span);return {kind,payload};
}
export function isForwardOwnedCarrier(checker,type,path,span,canonical){
 const owner=type?.kind==='data'?checker.items.get(type.name):null,kind=owner?.standardGeneric?.kind;if(!['Option','Result'].includes(kind))return false;
 forwardOwnedCarrier(checker,type,kind,path,span,canonical);return true;
}
function carrierInput(checker,type,kind,path,span,canonical,borrow){
 let pointee=type;if(type.rustReference){const reference=type.rustReference;pointee=reference.pointee;
  if(reference.kind!=='shared'||!pointee||pointee.rustReference||type.patternOwnershipRefusal!=='shared source reference'||reference.tokens?.[0]?.value!=='&'||!Number.isInteger(reference.span?.start)||!Number.isInteger(reference.span?.end)||reference.span.start<0||reference.span.end<reference.span.start||!sameType(type,pointee))throw unsupported('owned carrier reference','requires the complete actual shared source reference',span);
 }else if(!borrow)throw unsupported('owned carrier argument','requires an actual written shared borrow or shared input',span);
 forwardOwnedCarrier(checker,pointee,kind,path,span,canonical);
}
export function checkForwardOwnedExtra(checker,node,env,path,expected,row,{canonical,current}){
 if(row.family==='http-protocol')return checkForwardPrimitiveResult(checker,node,env,path,expected,row,{current,carrier:forwardOwnedCarrier,ownedString:forwardOwnedString,canonical});
 if(row.family==='primitive-result')return checkForwardPrimitiveResult(checker,node,env,path,expected,row,{current,carrier:forwardOwnedCarrier,ownedString:forwardOwnedString});
 if(row.family==='primitive-option-callback')return checkForwardPrimitiveOptionCallback(checker,node,env,path,expected,row,{current,carrier:forwardOwnedCarrier});
 if(row.family==='primitive-option')return checkForwardPrimitiveOption(checker,node,env,path,expected,row,{current,carrier:forwardOwnedCarrier});
 requireOriginalPrimitiveTryFromChecker(checker);current();if(node.args.length!==row.parameters.length)throw typeError('actual owned field/carrier arity differs',node.span);
 const args=node.args.map((syntax,index)=>{
  const role=row.parameters[index],shared=role==='shared-json'||role==='shared-json-result'||role==='shared-json-option',borrow=shared&&syntax.k==='routerTextReference',primitive=(row.family==='integer'||['u64','i64'].includes(role))?primitiveBitwiseType(role):null,wanted=primitive?{...fixed(primitive.bits,primitive.signed),rustPrimitiveName:role,rustSourceType:true}:role==='bool'?BOOL:undefined,value=checker.expr(borrow?syntax.value:syntax,env,path,wanted);current();
  if(role==='shared-json'){canonical(checker,value.type,syntax.span,true);if(!borrow&&!value.type.rustReference)throw unsupported('owned field/carrier JSON input','requires the actual shared source borrow',syntax.span);}
  else if(role==='shared-json-result'||role==='shared-json-option')carrierInput(checker,value.type,role==='shared-json-result'?'Result':'Option',path,syntax.span,canonical,borrow);
  else if(role==='str'){requireBorrowedString(value.type,syntax.span);if(value.type.patternOwnershipRefusal)throw unsupported('owned field/carrier text','requires actual unrefused borrowed str',syntax.span);}
  else if(role==='bool'){const type=value.type;if(type.kind!=='bool'||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned JSON field fallback','requires actual by-value bool',syntax.span);checker.expectedOwnership(type,BOOL,path,syntax.span);}
  else if(primitive){const type=value.type;if(type.kind!=='fixed'||type.bits!==primitive.bits||type.signed!==primitive.signed||type.rustPrimitiveName!==role||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('owned JSON field index','requires the actual matching by-value native fixed primitive',syntax.span);checker.expectedPrimitiveIdentity(type,wanted,path,syntax.span);}
  else throw typeError('unknown owned field/carrier argument domain',syntax.span);return value;
 });
 if(row.family==='text'){
  const outputs={str:SOURCE_STR,'text-owned':{...SOURCE_STRING,rustSourceType:true},bool:BOOL,u64:{...fixed(64,false),rustPrimitiveName:'u64',rustSourceType:true}},payload=row.returns==='u64-option'?outputs.u64:row.returns==='str-option-ref'?SOURCE_STR:null,type=payload?checker.instantiations.option(payload,node.span):outputs[row.returns];if(!type)throw typeError('unknown actual UTF-8 text return domain',node.span);if(expected)compatible(checker,type,expected,path,node.span);requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
 }
 if(row.family==='integer'){
  const domain=row.returns.endsWith('-option')?row.returns.slice(0,-7):row.returns,primitive=primitiveBitwiseType(domain);if(!primitive)throw typeError('unknown actual fixed-width return',node.span);const payload={...fixed(primitive.bits,primitive.signed),rustPrimitiveName:domain,rustSourceType:true},type=row.returns.endsWith('-option')?checker.instantiations.option(payload,node.span):payload;
  if(expected)compatible(checker,type,expected,path,node.span);requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
 }
 const json={...checker.hostType(JSON_TYPES.value,path,node.span),rustSourceType:true};canonical(checker,json,node.span,false);let type;
 if(row.returns==='str')type=SOURCE_STR;
 else if(row.returns==='text-owned')type={...SOURCE_STRING,rustSourceType:true};
 else if(row.returns==='bool')type=BOOL;
 else if(['u64','i64'].includes(row.returns))type={...fixed(64,row.returns==='i64'),rustPrimitiveName:row.returns,rustSourceType:true};
 else if(row.returns==='json')type=json;
 else if(row.returns==='json-text-result')type=checker.instantiations.result(json,{...SOURCE_STRING,rustSourceType:true},node.span);
 else if(row.returns==='json-owned-option')type=checker.instantiations.option(json,node.span);
 else{
  const scalars={'text-owned-option':{...SOURCE_STRING,rustSourceType:true},'json-option-ref':sourceShared(json),'str-option-ref':SOURCE_STR,'bool-option':BOOL,'u64-option':{...fixed(64,false),rustPrimitiveName:'u64',rustSourceType:true},'i64-option':{...fixed(64,true),rustPrimitiveName:'i64',rustSourceType:true}},payload=scalars[row.returns];if(!payload)throw typeError('unknown owned field/carrier output domain',node.span);type=checker.instantiations.option(payload,node.span);
 }
 if(expected)compatible(checker,type,expected,path,node.span);requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
}
