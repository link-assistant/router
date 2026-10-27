// Actual caller checking supplies authority; these finite type equations do not.
import {BOOL,fixed,sameType} from './checked-types.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
import {SOURCE_STR,SOURCE_STRING} from './extensions/source-contract-types.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {typeError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
const payload=domain=>{if(domain==='text-owned')return {...SOURCE_STRING,rustSourceType:true};if(domain==='str')return SOURCE_STR;if(domain==='bool')return BOOL;const row=primitiveBitwiseType(domain);return row?{...fixed(row.bits,row.signed),rustPrimitiveName:domain,rustSourceType:true}:null;};
export function checkForwardPrimitiveOption(checker,node,env,path,expected,row,{current,carrier,ownedString}){
 requireOriginalPrimitiveTryFromChecker(checker);current();const base=payload(row.domain);if(!base||node.args.length!==row.parameters.length)throw typeError('Actual primitive Option operation domain or arity differs',node.span);
 const requirePayload=(type,span)=>{
  if(row.domain==='text-owned'){if(!ownedString(type))throw unsupported('owned Option String payload','requires the complete actual standard owning String type',span);}
  else if(row.domain==='str'){requireBorrowedString(type,span);if(type.patternOwnershipRefusal)throw unsupported('primitive Option str payload','requires its actual unrefused borrowed str',span);}
  else if(!sameType(type,base)||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved||row.domain!=='bool'&&type.rustPrimitiveName!==row.domain)throw unsupported('primitive Option payload','requires its complete actual Copy primitive source type',span);
  checker.expectedOwnership(type,base,path,span);checker.expectedPrimitiveIdentity(type,base,path,span);
 };
 const optional=role=>role===(row.domain==='str'?'str-option-ref':row.domain+'-option'),wantedOption=()=>checker.instantiations.option(base,node.span);
 const args=node.args.map((syntax,index)=>{
  const role=row.parameters[index],wanted=optional(role)?wantedOption():role==='str'?SOURCE_STR:payload(role);if(!wanted)throw typeError('Unknown primitive Option operand role',syntax.span);const value=checker.expr(syntax,env,path,wanted);current();
  if(optional(role))carrier(checker,value.type,'Option',path,syntax.span,(_checker,type,span)=>requirePayload(type,span));
  else if(role==='str'){requireBorrowedString(value.type,syntax.span);if(value.type.patternOwnershipRefusal)throw unsupported('primitive Option message/fallback','requires an actual borrowed str',syntax.span);}
  else if(role==='bool'&&row.domain!=='bool'){const type=value.type;if(!sameType(type,BOOL)||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved)throw unsupported('optional text filter mode','requires actual by-value bool',syntax.span);checker.expectedOwnership(type,BOOL,path,syntax.span);}
  else requirePayload(value.type,syntax.span);return value;
 });
 const type=optional(row.returns)?wantedOption():row.returns==='text-owned'?{...SOURCE_STRING,rustSourceType:true}:row.returns==='bool'?BOOL:payload(row.returns);if(!type)throw typeError('Unknown primitive Option result',node.span);
 if(expected){if(!sameType(type,expected))throw typeError('Actual primitive Option return differs',node.span);checker.expectedOwnership(type,expected,path,node.span);checker.expectedPrimitiveIdentity(type,expected,path,node.span);}requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
}
