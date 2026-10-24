import {ownedPrimitiveResultOperation} from './owned-primitive-result-contracts.mjs';
const fail=()=>{throw new TypeError('Actual checked primitive Result operation required');};
export function emitOwnedPrimitiveResult(value,{rust,expr,body,rustName,imports,typeScriptType}){
 const row=ownedPrimitiveResultOperation(value.name);if(!row||row.returns!==value.type||value.args.length!==row.parameters.filter(role=>role!=='callback').length||Boolean(value.callback)!==row.parameters.includes('callback'))fail();imports.add(row.javascriptName);const args=value.args.map((value,index)=>rust&&row.parameters[index]==='str'&&value.type==='text-owned'?'&'+expr(value):expr(value));
 if(value.callback){const callback=value.callback;if(callback.returns!==row.callbackReturns||callback.parameters.length!==row.callbackParameters.length)fail();const parameters=callback.parameters.map((name,index)=>(rust?rustName(name):name)+(rust?'':': '+typeScriptType(row.callbackParameters[index]))).join(', ');args.push((rust?'|'+parameters+'|':'('+parameters+') =>')+' {\n'+body(callback.body,4)+'\n}');}
 return (rust?row.rustPath:'__ro_'+row.javascriptName)+'('+args.join(', ')+')';
}
export function evaluateOwnedPrimitiveResult(value,{state,scope,get,run}){
 const row=ownedPrimitiveResultOperation(value.name);if(!row||!state.modules.primitiveResult)fail();const args=value.args.map(value=>get(value,scope));if(value.callback)args.push((...values)=>{if(values.length!==value.callback.parameters.length)fail();const local=new Map(scope);value.callback.parameters.forEach((name,index)=>local.set(name,values[index]));return run(value.callback.body,local);});return Reflect.apply(state.modules.primitiveResult[row.javascriptName],undefined,args);
}
