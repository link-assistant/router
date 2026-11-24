import {ownedSseOperation} from './owned-sse-contracts.mjs';
export function emitOwnedSseCall(value,{rust,expr,imports}){
 const row=ownedSseOperation(value.name);if(!row)throw new TypeError('Unissued SSE call');imports.add(row.javascriptName);return (rust?row.rustPath:'__ro_'+row.javascriptName)+'('+value.args.map(argument=>rust&&argument.type==='text-owned'?(argument.kind==='variable'?expr(argument,true):'&'+expr(argument)):expr(argument)).join(', ')+')';
}
export function evaluateOwnedSseCall(value,{state,scope,get}){
 const row=ownedSseOperation(value.name);if(!row||!state.modules.sse)throw new TypeError('Unissued SSE runtime call');return Reflect.apply(state.modules.sse[row.javascriptName],undefined,value.args.map(argument=>get(argument,scope)));
}
