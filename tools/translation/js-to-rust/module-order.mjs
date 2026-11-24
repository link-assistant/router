// Graph scheduling DATA only. Native source classification and the complete
// semantic checker remain mandatory consumers; this module issues no permit.
import {types} from 'node:util';
const fail=message=>{throw new TypeError('Portable module initialization: '+message);};
function data(value,key){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary graph data required');
 const field=Object.getOwnPropertyDescriptor(value,key);if(!field||!Object.hasOwn(field,'value'))fail('own graph data field required');return field.value;
}
function array(value){
 if(!value||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary graph array required');
 const length=Object.getOwnPropertyDescriptor(value,'length')?.value;
 if(!Number.isSafeInteger(length)||length>128||Reflect.ownKeys(value).length!==length+1)fail('bounded dense graph array required');
 return Array.from({length},(_,index)=>{const field=Object.getOwnPropertyDescriptor(value,String(index));if(!field||!Object.hasOwn(field,'value'))fail('own graph array element required');return field.value;});
}
export function portableModuleOrder(input){
 const entry=data(input,'entry'),nodes=array(data(input,'nodes')),byName=new Map();
 for(const value of nodes){
  const name=data(value,'path'),targets=array(data(value,'targets')),initializers=data(value,'hasRuntimeInitializers');
  if(typeof name!=='string'||!name||byName.has(name)||typeof initializers!=='boolean'||targets.some(target=>typeof target!=='string'||!target))fail('unique named complete graph nodes required');
  byName.set(name,{targets,hasRuntimeInitializers:initializers});
 }
 if(typeof entry!=='string'||!byName.has(entry))fail('complete entry graph node required');
 for(const node of byName.values())for(const target of node.targets)if(!byName.has(target))fail('missing dependency graph node');
 const indices=new Map(),low=new Map(),stack=[],active=new Set(),components=[];let next=0;
 function visit(name){
  indices.set(name,next);low.set(name,next++);stack.push(name);active.add(name);
  for(const target of byName.get(name).targets){
   if(!indices.has(target)){visit(target);low.set(name,Math.min(low.get(name),low.get(target)));}
   else if(active.has(target))low.set(name,Math.min(low.get(name),indices.get(target)));
  }
  if(low.get(name)!==indices.get(name))return;
  const paths=[];let current;do{current=stack.pop();active.delete(current);paths.push(current);}while(current!==name);
  paths.sort((a,b)=>indices.get(a)-indices.get(b));
  const cyclic=paths.length>1||byName.get(paths[0]).targets.includes(paths[0]);
  if(cyclic&&paths.some(path=>byName.get(path).hasRuntimeInitializers))fail('cyclic module initialization requires live-binding lowering');
  components.push({paths,cyclic,mode:cyclic?'source-hoisted-functions-and-types-only':'source-dependency-order'});
 }
 visit(entry);if(indices.size!==byName.size)fail('unreachable supplied modules are not silently excluded');
 return {order:components.flatMap(component=>component.paths),components,sourceAuthority:false,semanticAuthority:false};
}
