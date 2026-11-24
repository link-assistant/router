// Checked-IR lexical emission DATA. This module issues no source/type permits.
const fail=message=>{throw new TypeError('Resource original declaration list: '+message);};
export function httpResourceHeaderBindingNames(initializer){
 const names=[];let cells=0;function visit(row,depth=0){if(++cells>100000||depth>160)fail('complete original header binding bound');if(!row)return;if(row.kind==='let')names.push(row.name);else if(row.kind==='header-sequence')for(const child of row.steps)visit(child,depth+1);}visit(initializer);return names;
}
export function httpResourceHeaderMutationNames(row){
 const bindings=new Set(httpResourceHeaderBindingNames(row.initializer)),mutations=new Set();let cells=0;
 function visit(value,depth=0,hidden=new Set()){
  if(++cells>100000||depth>160)fail('complete actual header mutation bound');if(!value||typeof value!=='object')return;
  if(['inline-callback','inline-deadline-callback'].includes(value.kind)){hidden=new Set(hidden);for(const parameter of value.parameters)hidden.add(parameter.name);}
  if(value.kind==='scalar-for'&&value!==row){hidden=new Set(hidden);for(const name of httpResourceHeaderBindingNames(value.initializer))hidden.add(name);}
  if(value.kind==='assign'&&bindings.has(value.name)&&!hidden.has(value.name))mutations.add(value.name);
  for(const [key,child]of Object.entries(value)){if(['resourceExits','loopExits','scopeFallthroughs','functionReturns','propagatedErrors'].includes(key))continue;if(child&&typeof child==='object'){if(Array.isArray(child))for(const item of child)visit(item,depth+1,hidden);else visit(child,depth+1,hidden);}}
 }visit(row);return mutations;
}
