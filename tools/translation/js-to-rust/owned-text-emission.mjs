import {ownedTextOperation} from './owned-text-contracts.mjs';
const fail=()=>{throw new TypeError('Unissued bounded UTF-8 operation');};
export function emitOwnedTextCall(value,{rust,expr,imports}){
 const row=ownedTextOperation(value.name);if(!row)fail();imports.add(value.name);const args=value.args.map((argument,index)=>{if(!rust)return expr(argument);if(row.args[index]==='str'&&argument.type==='text-owned')return argument.kind==='variable'?expr(argument,true):'&('+expr(argument)+')';return expr(argument);});return (rust?row.rustPath:'__ro_'+row.javascriptName)+'('+args.join(', ')+')';
}
export function evaluateOwnedTextCall(value,{state,scope,get}){const row=ownedTextOperation(value.name);if(!row||!state.modules.text)fail();return Reflect.apply(state.modules.text[row.javascriptName],undefined,value.args.map(argument=>get(argument,scope)));}
