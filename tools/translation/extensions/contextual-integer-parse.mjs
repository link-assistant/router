// A language type constraint, not another parser or runtime implementation.
// The original `str.parse().ok()` call may consume the success type of its
// actual expected Option. Every operation still goes through normal checking.
import {sameType,rustFixedType} from '../checked-types.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {hasOriginalStandardCall,requireOriginalStandardCall} from './original-standard-calls.mjs';
import {canonicalResult} from './result-iterators.mjs';
const constraints=new WeakMap();
const scalar=type=>type?.kind==='fixed'&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&rustFixedType(type.rustPrimitiveName)?.bits===type.bits&&rustFixedType(type.rustPrimitiveName)?.signed===type.signed;

function primitive(checker,type,expected,path,span) {
  const fixed=rustFixedType(expected?.rustPrimitiveName);
  if(!fixed||expected.kind!=='fixed'||expected.bits!==fixed.bits||expected.signed!==fixed.signed||expected.rustReference||expected.rustOwnership||expected.patternOwnershipRefusal||expected.rustGenericIdentityUnresolved||expected.rustBorrowingUnresolved)throw unsupported('contextual integer parse payload','requires an actual by-value fixed Rust primitive in the expected standard Option',span);
  if(!sameType(type,expected))throw typeError('contextual integer parse payload differs from its registered Option field',span);
  checker.expectedOwnership(type,expected,path,span);
  checker.expectedPrimitiveIdentity(type,expected,path,span);
}

function optionPayload(checker,expected,path,span) {
  const entry=expected?.kind==='data'?checker.items.get(expected.name):null;
  if(!entry||entry.standardGeneric?.kind!=='Option')return null;
  if(expected.rustReference||expected.rustOwnership||expected.patternOwnershipRefusal||expected.rustGenericIdentityUnresolved||expected.rustBorrowingUnresolved||entry.k!=='data'||entry.fullName!==expected.name||!Array.isArray(entry.modulePath)||entry.standardGeneric.arguments?.length!==1||entry.ctors?.length!==2)throw unsupported('contextual integer parse Option','requires an actual by-value registered standard Option and its complete layout',span);
  const some=entry.ctors.filter(ctor=>ctor.name==='Some'),none=entry.ctors.filter(ctor=>ctor.name==='None');
  if(some.length!==1||none.length!==1||some[0].fields?.length!==1||some[0].fields[0].name!=='field0'||none[0].fields?.length)throw typeError('contextual integer parse Option has a different constructor layout',span);
  const payload=checker.resolveType(entry.standardGeneric.arguments[0],entry.modulePath,span);
  // Unrelated user-defined methods keep the old path, even when their result
  // is noninteger. This rule supplies no target for standard float parsing.
  if(!scalar(payload))return null;
  primitive(checker,checker.resolveType(some[0].fields[0].type,entry.modulePath,span),payload,path,span);
  if(expected.rustStandardGeneric){
    const source=expected.rustStandardGeneric;
    if(source.kind!=='Option'||source.arguments?.length!==1)throw typeError('contextual integer parse Option source arguments differ',span);
    primitive(checker,checker.resolveType(source.arguments[0],path,span),payload,path,span);
  }
  return payload;
}

// The checker-only private source-call table rejects copied syntax before any
// new target is consumed. This rule never manufactures an Option from shape,
// guesses a parse target, changes explicit turbofish, or supplies generic E.
export function contextualIntegerParseReceiver(checker,node,env,path,expected) {
  if(!hasOriginalStandardCall(checker,node))return null;
  if(node.k!=='routerDispatchMethod'||node.method!=='ok'||node.args.length!==0||node.object?.k!=='routerIntegerParse'||node.object.instantiation!==null||node.object.args.length!==0||expected===undefined||expected===null)return null;
  const payload=optionPayload(checker,expected,path,node.span);
  if(!payload)return null;
  const previous=constraints.get(checker),state={node,payload,used:false};let receiver;
  constraints.set(checker,state);
  try{receiver=checker.expr(node.object,env,path);}
  finally{if(previous)constraints.set(checker,previous);else constraints.delete(checker);}
  // Existing inherent parse selection ran first. Its existing ok route stays
  // ordinary; neither its source body nor its receiver is evaluated again.
  if(!state.used)return receiver;
  // The hint is not overload selection. Rejoin the actual parse contract and
  // registered Result after the original receiver and method were checked.
  requireOriginalStandardCall(checker,node);
  if(checker.resolvedMethod(receiver.type,'ok','shared'))throw unsupported('contextual integer parse method','an inherent ok implementation cannot borrow the standard Result constraint',node.span);
  const instance=checker.instantiations.integer(payload,node.span),hint=checker.resolveType(instance.ret,path,node.span);
  const contract=instance.contracts.find(contract=>contract.id.startsWith('rust_integer_parse_'));
  if(receiver.k!=='routerHostCall'||receiver.id!==contract?.id||!receiver.contract||receiver.contract.rustPath?.join('::')!=='std::primitive::str::parse'||receiver.contract.family!=='integer'||!sameType(receiver.type,hint)||!sameType(receiver.contract.instantiation,payload))throw unsupported('contextual integer parse receiver','requires the independently checked original fixed-integer parse operation',node.span);
  const result=canonicalResult(checker,receiver.type,path,node.span),error=checker.items.get(result.error.name);
  primitive(checker,result.success,payload,path,node.span);
  if(result.error.kind!=='data'||result.error.name!=='std.num.ParseIntError'||error?.hostTypePath?.join('::')!=='std::num::ParseIntError'||error.generated!=='router-integer-contract')throw unsupported('contextual integer parse error','requires the existing registered standard ParseIntError family',node.span);
  return receiver;
}

// Called only after the normal parse receiver/inherent-method checks. No
// expected type or syntax object supplied by a caller can mint this interval.
export function contextualIntegerParseTarget(checker,node) {
  const state=constraints.get(checker);
  if(!state||state.node.object!==node)return null;
  requireOriginalStandardCall(checker,state.node);
  state.used=true;
  return state.payload;
}
