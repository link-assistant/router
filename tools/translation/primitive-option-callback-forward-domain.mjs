// Substitution rules consume actual source-bound operands and inline closures.
// This module grants no authority to catalog rows or detached callback nodes.
import {BOOL,fixed,sameType} from './checked-types.mjs';
import {SOURCE_STR,SOURCE_STRING} from './extensions/source-contract-types.mjs';
import {requireBorrowedString} from './extensions/string-iterators.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {typeError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
const primitive=domain=>domain==='text-owned'?{...SOURCE_STRING,rustSourceType:true}:domain==='str'?SOURCE_STR:domain==='bool'?BOOL:['u64','i64'].includes(domain)?{...fixed(64,domain==='i64'),rustPrimitiveName:domain,rustSourceType:true}:null;
export function checkForwardPrimitiveOptionCallback(checker,node,env,path,expected,row,{current,carrier,ownedString}){
 requireOriginalPrimitiveTryFromChecker(checker);current();
 if(node.args.length!==2||node.args[1]?.k!=='routerLambda'||node.args[1].params?.length!==row.callbackParameters.length||node.args[1].params.some(parameter=>parameter.pattern))throw unsupported('primitive Option callback','requires its actual inline fixed-arity closure',node.span);
 const assertPrimitive=(actual,domain,span)=>{
  const wanted=primitive(domain);if(!wanted)throw typeError('Unknown callback payload',span);
  if(domain==='text-owned'){if(!ownedString(actual))throw unsupported('owning Option callback text','requires the complete actual standard owning String type',span);}
  else if(domain==='str'){requireBorrowedString(actual,span);if(actual.patternOwnershipRefusal)throw unsupported('primitive Option callback text','requires actual unrefused borrowed str',span);}
  else if(!sameType(actual,wanted)||actual.rustReference||actual.rustOwnership||actual.patternOwnershipRefusal||actual.rustBorrowingUnresolved||actual.rustGenericIdentityUnresolved||domain!=='bool'&&actual.rustPrimitiveName!==domain)throw unsupported('primitive Option callback payload','requires its actual Copy primitive identity',span);
  checker.expectedOwnership(actual,wanted,path,span);checker.expectedPrimitiveIdentity(actual,wanted,path,span);
 };
 const resultType=domain=>['bool-text-result','u64-text-result','i64-text-result','str-text-result','text-text-result'].includes(domain)?checker.instantiations.result(primitive(domain==='text-text-result'?'text-owned':domain.slice(0,-12)),primitive('text-owned'),node.span):domain.endsWith('-option')||domain==='str-option-ref'?checker.instantiations.option(primitive(domain==='str-option-ref'?'str':domain.slice(0,-7)),node.span):domain==='text-owned'?{...SOURCE_STRING,rustSourceType:true}:primitive(domain);
 const receiver=checker.expr(node.args[0],env,path,checker.instantiations.option(primitive(row.input),node.span));current();
 carrier(checker,receiver.type,'Option',path,node.args[0].span,(_checker,type,span)=>assertPrimitive(type,row.input,span));
 const wanted=resultType(row.callbackReturns);if(!wanted)throw typeError('Unknown callback result domain',node.span);
 const callback=checker.hostLambda(node.args[1],row.callbackParameters.map(primitive),checker.callbackEnvironment(new Map(env),wanted),path,wanted,{source:'primitive-option-callback',receiverType:receiver.type});current();
 if(!callback?.type?.result||!sameType(callback.type.result,wanted))throw typeError('Actual complete callback result differs',node.span);
 if(['and_then','or_else'].includes(row.method))carrier(checker,callback.type.result,'Option',path,node.span,(_checker,type,span)=>assertPrimitive(type,row.output,span));else assertPrimitive(callback.type.result,row.output,node.span);
 const type=resultType(row.returns);if(!type)throw typeError('Unknown callback operation return',node.span);
 if(expected){if(!sameType(type,expected))throw typeError('Actual callback operation return differs',node.span);checker.expectedOwnership(type,expected,path,node.span);checker.expectedPrimitiveIdentity(type,expected,path,node.span);}
 requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args:[receiver,callback],type,span:node.span,constEligible:false};
}
