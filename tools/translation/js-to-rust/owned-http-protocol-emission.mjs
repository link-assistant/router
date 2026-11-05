import {ownedHttpProtocolOperation as ownedOutcomeOperation} from './owned-http-protocol-contracts.mjs';
export function emitOwnedHttpProtocolCall(value,{rust,expr,imports,sequence}){
 const row=ownedOutcomeOperation(value.name);if(!row||row.ret!==value.type||value.args.length!==row.args.length)throw new TypeError('Actual checked carrier call differs');imports.add(value.name);
 if(!rust)return '__ro_'+value.name+'('+value.args.map(argument=>expr(argument)).join(', ')+')';
 const names=value.args.map(()=> '__ro_carrier_'+sequence()),bindings=value.args.map((argument,index)=>{
  const role=row.args[index],owned=['json-text-result','json-owned-option'].includes(role)||role==='json-ref'&&argument.type==='json'||role==='str'&&argument.type==='text-owned';
  return 'let '+names[index]+' = '+(owned?'&'+expr(argument):expr(argument))+';';
 });
 row.args.forEach((role,index)=>{if(role==='json-ref')bindings.push('__ro_domain('+names[index]+');');if(role==='json-owned-option')bindings.push('if let Some(value) = '+names[index]+' { __ro_domain(value); }');if(role==='json-text-result')bindings.push('if let Ok(value) = '+names[index]+' { __ro_domain(value); }');});
 const result='__ro_carrier_'+sequence(),check=row.ret==='json'?'__ro_domain(&'+result+');':row.ret==='json-owned-option'?'if let Some(value) = &'+result+' { __ro_domain(value); }':row.ret==='json-text-result'?'if let Ok(value) = &'+result+' { __ro_domain(value); }':'';
 return '{ '+bindings.join(' ')+' let '+result+' = '+row.rustPath+'('+names.join(', ')+'); '+check+' '+result+' }';
}
export function evaluateOwnedHttpProtocolCall(value,{state,scope,get}){
 const row=ownedOutcomeOperation(value.name);if(!row||!state.modules.httpProtocol)throw new TypeError('Unissued owned carrier runtime');return Reflect.apply(state.modules.httpProtocol[value.name],undefined,value.args.map(argument=>get(argument,scope)));
}
