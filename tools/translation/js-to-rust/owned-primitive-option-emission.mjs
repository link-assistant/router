import {ownedPrimitiveOptionOperation} from './owned-primitive-option-contracts.mjs';
const fail=()=>{throw new TypeError('Unissued primitive Option call');};
export function emitOwnedPrimitiveOptionCall(value,{rust,expr,imports}){
 const row=ownedPrimitiveOptionOperation(value.name);if(!row||row.ret!==value.type||row.args.length!==value.args.length)fail();imports.add(value.name);const args=value.args.map((argument,index)=>{if(rust&&row.args[index]==='str'&&argument.type==='text-owned')return argument.kind==='variable'?expr(argument,true):'&('+expr(argument)+')';return expr(argument);});return (rust?row.rustPath:'__ro_'+row.javascriptName)+'('+args.join(', ')+')';
}
export function evaluateOwnedPrimitiveOptionCall(value,{state,scope,get}){const row=ownedPrimitiveOptionOperation(value.name);if(!row||!state.modules.primitiveOption)fail();return Reflect.apply(state.modules.primitiveOption[row.javascriptName],undefined,value.args.map(argument=>get(argument,scope)));}
