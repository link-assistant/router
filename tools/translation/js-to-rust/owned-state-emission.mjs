import {ownedStateOperation} from './owned-state-contracts.mjs';
const fail=message=>{throw new TypeError('Owned state emission: '+message);};
export function emitOwnedStateCall(value,{rust,expr,imports,sequence}){
 const row=ownedStateOperation(value.name);if(!row||row.ret!==value.type||row.args.length!==value.args.length)fail('actual checked operation differs');imports.add(value.name);
 if(!rust)return '__ro_'+value.name+'('+value.args.map(argument=>expr(argument)).join(', ')+')';
 const names=value.args.map(()=> '__ro_state_'+sequence()),bindings=[];
 value.args.forEach((argument,index)=>{
  const role=row.parameters[index],source=expr(argument);let selected=source;
  if(role==='owned-json'&&argument.type==='json-ref')selected='__ro_copy('+source+')';
  if(role==='shared-json'&&argument.type==='json')selected=argument.kind==='variable'?expr(argument,true):'&'+source;
  if(role==='shared-json-list'&&argument.type==='json-list-owned')selected=argument.kind==='variable'?expr(argument,true):'&'+source;
  if(role==='owned-json-list')selected='crate::translation_state_core::json_values_copy('+(argument.type==='json-list-owned'?(argument.kind==='variable'?expr(argument,true):'&'+source):source)+')';
  if(role==='str'&&argument.type==='text-owned')selected=argument.kind==='variable'?expr(argument,true):'&'+source;
  bindings.push('let '+names[index]+' = '+selected+';');
 });
 // Domain checks follow the actual source's once-only argument evaluations.
 value.args.forEach((argument,index)=>{
  const role=row.parameters[index],name=names[index];
  if(role==='shared-json')bindings.push('__ro_domain('+name+');');
  if(role==='shared-json-list')bindings.push('assert!('+name+'.len() <= 4096, "owned JSON state list bound"); for value in '+name+'.iter() { __ro_domain(value); }');
 });
 const result='__ro_state_'+sequence(),check=row.ret==='json'?'__ro_domain(&'+result+');':row.ret==='json-list-owned'?'__ro_domain(&::serde_json::Value::Array('+result+'.clone()));':'';
 return '{ '+bindings.join(' ')+' let '+result+' = '+row.rustPath+'('+names.join(', ')+'); '+check+' '+result+' }';
}
export function evaluateOwnedStateCall(value,{state,scope,get}){
 const row=ownedStateOperation(value.name);if(!row||!state.modules.state)fail('unissued actual state runtime');return Reflect.apply(state.modules.state[value.name],undefined,value.args.map(argument=>get(argument,scope)));
}
