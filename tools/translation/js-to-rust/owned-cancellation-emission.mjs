// Emission consumes freshly reissued original caller facts, never declaration data alone.
import {ownedCancellationOperation,CANCELLATION_OWNED,CANCELLATION_SHARED} from './owned-cancellation-contracts.mjs';
export const OWNED_CANCELLATION_RUST_TYPES=Object.freeze({[CANCELLATION_OWNED]:'crate::translation_async_control_core::Cancellation',[CANCELLATION_SHARED]:"&'a crate::translation_async_control_core::Cancellation"});
export function emitOwnedCancellationCall(value,{rust,expr,imports,rustName}){
 if(value.kind==='cancellation-borrow'){
  if(value.type!==CANCELLATION_SHARED||typeof value.name!=='string'||typeof value.owned!=='boolean')throw new TypeError('Checked cancellation borrow differs');return rust?(value.owned?'&':'')+rustName(value.name):value.name;
 }
 const operation=ownedCancellationOperation(value.name);if(!operation||value.kind!=='cancellation-call'||value.type!==operation.ret||value.args.length!==operation.args.length||value.args.some((argument,index)=>argument.type!==operation.args[index]))throw new TypeError('Checked cancellation call differs');
 if(!rust)imports.add(operation.javascriptName);return (rust?operation.rustPath:'__ro_'+operation.javascriptName)+'('+value.args.map(argument=>expr(argument)).join(', ')+')';
}
export function evaluateOwnedCancellationCall(value,{state,scope}){
 if(value.kind==='cancellation-borrow'){if(!scope.has(value.name))throw new TypeError('Missing actual cancellation resource');return scope.get(value.name);}
 const operation=ownedCancellationOperation(value.name);if(!operation||value.kind!=='cancellation-call'||value.type!==operation.ret||value.args.length!==operation.args.length||!state.modules.cancellation)throw new TypeError('Checked cancellation runtime differs');
 const args=value.args.map(argument=>{if(argument.kind!=='cancellation-borrow'||!scope.has(argument.name))throw new TypeError('Actual synchronous cancellation borrow required');return scope.get(argument.name);});return state.modules.cancellation[operation.javascriptName](...args);
}
