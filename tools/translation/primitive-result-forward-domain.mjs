// Actual source and standard-layout checks supply every callable/type permit.
import {BOOL,fixed,sameType} from './checked-types.mjs';
import {JSON_TYPES} from './extensions/json-contracts.mjs';
import {SOURCE_STR,SOURCE_STRING} from './extensions/source-contract-types.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {typeError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
const primitive=domain=>domain==='str'?SOURCE_STR:domain==='text-owned'?{...SOURCE_STRING,rustSourceType:true}:domain==='bool'?BOOL:['u64','i64'].includes(domain)?{...fixed(64,domain==='i64'),rustPrimitiveName:domain,rustSourceType:true}:null;
const resultDomain=role=>['bool-text-result','u64-text-result','i64-text-result','str-text-result','text-text-result'].includes(role)?role==='text-text-result'?'text-owned':role.slice(0,-12):null;
export function checkForwardPrimitiveResult(checker,node,env,path,expected,row,{current,carrier,ownedString,canonical}){
 requireOriginalPrimitiveTryFromChecker(checker);current();if(node.args.length!==row.parameters.length)throw typeError('Actual primitive Result arity differs',node.span);
 const wanted=role=>{if(role==='json-text-result')return checker.instantiations.result({...checker.hostType(JSON_TYPES.value,path,node.span),rustSourceType:true},primitive('text-owned'),node.span);const domain=resultDomain(role);if(domain)return checker.instantiations.result(primitive(domain),primitive('text-owned'),node.span);if(role==='text-owned-option')return checker.instantiations.option(primitive('text-owned'),node.span);if(role==='str-option-ref')return checker.instantiations.option(SOURCE_STR,node.span);if(['bool-option','u64-option','i64-option'].includes(role))return checker.instantiations.option(primitive(role.slice(0,-7)),node.span);return primitive(role);};
 const assertPrimitive=(type,domain,span)=>{
  const actual=primitive(domain);if(!actual)throw typeError('Unknown native Result payload',span);
  if(domain==='str'){requireBorrowedString(type,span);if(type.patternOwnershipRefusal)throw unsupported('Result borrowed success','requires actual unrefused source str',span);}
  else if(domain==='text-owned'){if(!ownedString(type))throw unsupported('Result owned error','requires actual native owned String',span);}
  else if(!sameType(type,actual)||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustBorrowingUnresolved||type.rustGenericIdentityUnresolved||domain!=='bool'&&type.rustPrimitiveName!==domain)throw unsupported('Result primitive payload','requires its actual native Copy primitive identity',span);
  checker.expectedOwnership(type,actual,path,span);checker.expectedPrimitiveIdentity(type,actual,path,span);
 };
 const assertRole=(type,role,span)=>{const domain=resultDomain(role);if(domain)return carrier(checker,type,'Result',path,span,(_checker,success,at)=>assertPrimitive(success,domain,at));return assertPrimitive(type,role,span);};
 const args=[];for(let index=0;index<row.parameters.length;index++){
  const role=row.parameters[index];if(role==='json-ref'){const syntax=node.args[index],borrow=syntax.k==='routerTextReference',value=checker.expr(borrow?syntax.value:syntax,env,path);current();if(!canonical)throw typeError('Actual HTTP JSON source qualifier required',syntax.span);canonical(checker,value.type,syntax.span,true);if(!borrow&&!value.type.rustReference)throw unsupported('HTTP JSON operand','requires its actual written shared borrow or shared input',syntax.span);args.push(value);continue;}if(role==='callback'){
   const syntax=node.args[index];if(syntax?.k!=='routerLambda'||syntax.params?.length!==row.callbackParameters.length||syntax.params.some(parameter=>parameter.pattern))throw unsupported('Result callback','requires its actual inline fixed parameter list',syntax?.span??node.span);
   const output=wanted(row.callbackReturns),callback=checker.hostLambda(syntax,row.callbackParameters.map(wanted),checker.callbackEnvironment(new Map(env),output),path,output,{source:'primitive-result',receiverType:args[0].type});current();assertRole(callback.type.result,row.callbackReturns,syntax.span);args.push(callback);
  }else{const value=checker.expr(node.args[index],env,path,wanted(role));current();assertRole(value.type,role,node.args[index].span);args.push(value);}
 }
 const type=wanted(row.returns);if(!type)throw typeError('Unknown actual native Result return domain',node.span);if(expected){if(!sameType(type,expected))throw typeError('Actual Result operation return differs',node.span);checker.expectedOwnership(type,expected,path,node.span);checker.expectedPrimitiveIdentity(type,expected,path,node.span);}requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
}
