import {primitiveOptionCallbackContract} from '../primitive-option-callback-contracts.mjs';
const fail=()=>{throw new TypeError('Unissued primitive Option callback call');};
export function emitOwnedPrimitiveOptionCallback(value,{rust,expr,body,rustName,imports,typeScriptType}){
 const row=primitiveOptionCallbackContract(value.name);if(!row||value.type!==row.returns||value.callback.returns!==row.callbackReturns||value.callback.parameters.length!==row.callbackParameters.length)fail();imports.add(value.name);const names=value.callback.parameters.map(name=>rust?rustName(name):name),parameters=names.map((name,index)=>name+(rust?'':': '+typeScriptType(row.callbackParameters[index]))).join(', '),callback=rust?'|'+parameters+'|':'('+parameters+') =>';return (rust?row.rustPath:'__ro_'+row.javascriptName)+'('+expr(value.receiver)+', '+callback+' {\n'+body(value.callback.body,4)+'\n})';
}
export function evaluateOwnedPrimitiveOptionCallback(value,{state,scope,get,run}){
 const row=primitiveOptionCallbackContract(value.name);if(!row||!state.modules.primitiveOptionCallback)fail();const receiver=get(value.receiver,scope),callback=(...args)=>{if(args.length!==value.callback.parameters.length)fail();const local=new Map(scope);value.callback.parameters.forEach((name,index)=>local.set(name,args[index]));return run(value.callback.body,local);};return Reflect.apply(state.modules.primitiveOptionCallback[row.javascriptName],undefined,[receiver,callback]);
}
