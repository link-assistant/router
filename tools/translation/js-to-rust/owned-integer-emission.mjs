import {ownedIntegerOperation} from './owned-integer-contracts.mjs';
const fail=()=>{throw new TypeError('Unissued fixed-width operation');};
export function emitOwnedIntegerCall(value,{rust,expr,imports}){
 const row=ownedIntegerOperation(value.name);if(!row)fail();imports.add(value.name);return (rust?row.rustPath:'__ro_'+row.javascriptName)+'('+value.args.map(argument=>expr(argument)).join(', ')+')';
}
export function evaluateOwnedIntegerCall(value,{state,scope,get}){
 const row=ownedIntegerOperation(value.name);if(!row||!state.modules.integer)fail();return Reflect.apply(state.modules.integer[row.javascriptName],undefined,value.args.map(argument=>get(argument,scope)));
}
