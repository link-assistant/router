// Type-directed plans only. The frontend still checks the original callback,
// owns its evaluation/ownership obligations, and emits the checked semantic IR.
import {typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {typeKey} from '../vendor/meta-language/translation/types.js';
const freeze=value=>{if(value && typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export const STANDARD_METHOD_PROFILE=freeze({
  version:'1.89.0',
  option:{path:'library/core/src/option.rs',url:'https://github.com/rust-lang/rust/blob/1.89.0/library/core/src/option.rs#L1141',sha256:'4c172731ebf0ef2ae6fc3e9b5127096d3c5c400c3757cfe5e38223de91bc3efd',method:'map',line:1141},
  result:{path:'library/core/src/result.rs',url:'https://github.com/rust-lang/rust/blob/1.89.0/library/core/src/result.rs#L686',sha256:'9166f16035d67e4b42b9439b3f2400a07866a8ff111d7d544584c593d39e2ecc',method:'ok',line:686},
  bool:{path:'library/core/src/bool.rs',url:'https://github.com/rust-lang/rust/blob/1.89.0/library/core/src/bool.rs#L61',sha256:'d88d8511eb134f8efc2cdcb6a24c7f888abfb2c03588d7db3f304657e19b83b3',method:'then',line:61},
});
const checkedType=(type,span)=>{
  if(!type || typeof type!=='object')throw typeError('standard method requires a checked type',span);
  if(['bool','string','unit','float','nat','int'].includes(type.kind))return type;
  if(type.kind==='fixed' && [8,16,32,64,128].includes(type.bits) && typeof type.signed==='boolean')return type;
  if(type.kind==='array'){checkedType(type.element,span);return type;}
  if(type.kind==='data' && typeof type.name==='string' && type.name.length)return type;
  throw typeError('standard method requires a resolved checked type',span);
};
function standard(type,kind,context,required=false) {
  const {declarations,resolveType,span}=context;
  const resolved=checkedType(resolveType(type,span),span),entry=resolved.kind==='data'?declarations.get(resolved.name):null;
  if(entry?.standardGeneric?.kind!==kind) {
    if(required)throw typeError(`expected actual standard ${kind} provenance`,span);
    return null;
  }
  if(entry.k!=='data' || entry.fullName!==resolved.name || !Array.isArray(entry.modulePath))throw typeError(`unchecked standard ${kind} declaration`,span);
  const names=kind==='Option'?['Some','None']:['Ok','Err'];
  if(!Array.isArray(entry.ctors) || entry.ctors.length!==2 || names.some(name=>entry.ctors.filter(ctor=>ctor.name===name).length!==1))throw typeError(`invalid standard ${kind} constructor layout`,span);
  const fields=names.map(name=>entry.ctors.find(ctor=>ctor.name===name).fields);
  if(fields.some((fields,index)=>!Array.isArray(fields) || fields.length!==(kind==='Option' && index===1?0:1) || fields.length && fields[0].name!=='field0'))throw typeError(`invalid standard ${kind} field layout`,span);
  const arguments_=entry.standardGeneric.arguments;
  if(!Array.isArray(arguments_) || arguments_.length!==(kind==='Option'?1:2))throw typeError(`missing standard ${kind} argument provenance`,span);
  const types=fields.filter(fields=>fields.length).map(fields=>checkedType(resolveType(fields[0].type,span),span));
  for(const [index,type] of types.entries())if(typeKey(type)!==typeKey(checkedType(resolveType(arguments_[index],span),span)))throw typeError(`standard ${kind} arguments disagree with checked fields`,span);
  return {type:resolved,types};
}

export function planStandardMethod(receiverType,method,{declarations,resolveType,expected,span={start:0,end:0},argumentCount}={}) {
  if(!['map','ok','then'].includes(method))return null;
  if(!(declarations instanceof Map) || typeof resolveType!=='function')throw new TypeError('Standard method plans require checked declarations and type resolution');
  const context={declarations,resolveType,span},receiver=checkedType(resolveType(receiverType,span),span);
  let operation,parameters,element=null;
  if(method==='then' && receiver.kind==='bool'){operation='bool_then';parameters=[];}
  else if(method==='map') {
    const input=standard(receiver,'Option',context);if(!input)return null;
    operation='option_map';element=input.types[0];parameters=[element];
  } else if(method==='ok') {
    const input=standard(receiver,'Result',context);if(!input)return null;
    operation='result_ok';element=input.types[0];parameters=[];
  } else return null;
  const count=operation==='result_ok'?0:1;
  if(argumentCount!==count)throw typeError(`standard ${method} expects ${count} argument${count===1?'':'s'}`,span);
  const output=expected==null?null:standard(expected,'Option',context,true);
  if(operation==='result_ok' && output && typeKey(output.types[0])!==typeKey(element))throw typeError('Result.ok expected Option element disagrees with checked success type',span);
  return freeze(structuredClone({operation,receiver,callbackParameters:parameters,callbackExpected:operation==='result_ok'?null:output?.types[0]??null,element,expectedResult:output?.type??null,constEligible:false,span,sourceProfile:STANDARD_METHOD_PROFILE.version}));
}

export function completeStandardMethod(plan,callbackResult,{optionType,span=plan?.span}={}) {
  if(!plan || !['option_map','result_ok','bool_then'].includes(plan.operation))throw new TypeError('Invalid checked standard method plan');
  if(typeof optionType!=='function')throw new TypeError('Standard method completion requires the checked canonical Option instantiator');
  let element;
  if(plan.operation==='result_ok') {
    if(callbackResult!=null)throw typeError('Result.ok does not take a callback',span);
    element=checkedType(plan.element,span);
  } else {
    element=checkedType(callbackResult,span);
    if(plan.callbackExpected && typeKey(plan.callbackExpected)!==typeKey(element))throw typeError('standard method callback result disagrees with checked expected element',span);
  }
  const result=checkedType(optionType(element,span),span);
  if(result.kind!=='data')throw typeError('canonical Option instantiator must return a resolved checked data type',span);
  if(plan.expectedResult && typeKey(plan.expectedResult)!==typeKey(result))throw typeError('canonical Option result disagrees with checked expected type',span);
  return freeze(structuredClone(result));
}
