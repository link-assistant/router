// Reusable declaration discovery/order only. Rule metadata issues no source,
// namespace, type, ownership, body, execution or repository-write authority.
import {types} from 'node:util';
import {createRulePipeline,RULE_PHASES} from './rule-pipeline.mjs';
export const RULE_REGISTRY_LIMITS=Object.freeze({rules:4096,references:32768,labels:32768,idUnits:160});
const fail=message=>{throw TypeError('Translation rule registry: '+message);};
const fields=new Set(['id','phase','apply','discover','requires','before','after','conflicts','exclusive']);
function own(object,key,optional=false){
 if(!object||typeof object!=='object'||types.isProxy(object))fail('ordinary own declaration fields required');
 const value=Object.getOwnPropertyDescriptor(object,key);if(!value){if(optional)return undefined;fail('missing own field '+key);}
 if(!Object.hasOwn(value,'value'))fail('declaration accessors are unsupported');return value.value;
}
function list(value,max){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary dense declaration array required');
 const size=own(value,'length');if(!Number.isSafeInteger(size)||size<0||size>max||Reflect.ownKeys(value).length!==size+1)fail('bounded complete declaration array required');
 return Array.from({length:size},(_,index)=>own(value,String(index)));
}
function label(value){if(typeof value!=='string'||!value||value.length>RULE_REGISTRY_LIMITS.idUnits)fail('bounded nonempty rule identity required');return value;}
function labels(value){if(value===undefined)return [];const result=list(value,RULE_REGISTRY_LIMITS.rules).map(label);if(new Set(result).size!==result.length)fail('duplicate rule references or exclusive labels');return result;}
function declaration(value,index){
 if(!value||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('ordinary declaration object required');
 for(const key of Reflect.ownKeys(value))if(typeof key!=='string'||!fields.has(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))fail('unknown, symbolic or accessor declaration field');
 const id=label(own(value,'id')),phase=own(value,'phase'),apply=own(value,'apply');
 if(!RULE_PHASES.includes(phase)||typeof apply!=='function'||types.isProxy(apply)||types.isAsyncFunction(apply))fail('fixed language/repository phase and synchronous rule function required');
 const discover=own(value,'discover',true);if(discover!==undefined&&(typeof discover!=='function'||types.isProxy(discover)||types.isAsyncFunction(discover)))fail('source discovery requires a synchronous inspection function');
 const row={id,phase,apply,discover,index};for(const name of ['requires','before','after','conflicts','exclusive'])row[name]=Object.freeze(labels(own(value,name,true)));
 return Object.freeze(row);
}
function heap(){
 const rows=[];
 return {push(value){let at=rows.length;rows.push(value);while(at){const parent=(at-1)>>1;if(rows[parent]<value)break;rows[at]=rows[parent];at=parent;}rows[at]=value;},
  pop(){const first=rows[0],last=rows.pop();if(rows.length){let at=0;while(at*2+1<rows.length){let next=at*2+1;if(next+1<rows.length&&rows[next+1]<rows[next])next++;if(rows[next]>=last)break;rows[at]=rows[next];at=next;}rows[at]=last;}return first;},get size(){return rows.length;}};
}
/** Registry definitions may be reused. They retain no input, source context,
 * private proof, checked result or per-run verdict. Original runner unchanged. */
export function createRuleRegistry(input){
 const declarations=list(input,RULE_REGISTRY_LIMITS.rules).map(declaration),byId=new Map();let references=0,exclusiveLabels=0;
 for(const row of declarations){
  if(byId.has(row.id))fail('duplicate rule identity '+row.id);byId.set(row.id,row);
  references+=row.requires.length+row.before.length+row.after.length+row.conflicts.length;exclusiveLabels+=row.exclusive.length;
  if(references>RULE_REGISTRY_LIMITS.references||exclusiveLabels>RULE_REGISTRY_LIMITS.labels)fail('aggregate rule-reference/label bound');
 }
 for(const row of declarations)for(const id of [...row.requires,...row.before,...row.after,...row.conflicts])if(!byId.has(id))fail('unregistered reference '+id+' in '+row.id);
 const description=Object.freeze(declarations.map(({apply,discover,index,...row})=>Object.freeze({...row,hasDiscovery:discover!==undefined})));
 function compile(selection=declarations.map(row=>row.id)){
  const requested=list(selection,RULE_REGISTRY_LIMITS.rules).map(label),roots=new Set(requested);if(roots.size!==requested.length)fail('duplicate selected rule');
  const active=new Set(),pending=[...requested];
  while(pending.length){const id=pending.pop(),row=byId.get(id);if(!row)fail('selected rule is unregistered: '+id);if(active.has(id))continue;active.add(id);for(const dependency of row.requires)pending.push(dependency);}
  const selected=declarations.filter(row=>active.has(row.id)),exclusive=new Map();
  for(const row of selected){
   for(const other of row.conflicts)if(active.has(other))fail('selected rules conflict: '+row.id+' / '+other);
   for(const key of row.exclusive){if(exclusive.has(key))fail('selected rules claim the same exclusive substitution: '+key+' ('+exclusive.get(key)+' / '+row.id+')');exclusive.set(key,row.id);}
  }
  const successors=new Map(selected.map(row=>[row.id,new Set()])),indegrees=new Map(selected.map(row=>[row.id,0])),edges=[];
  function edge(from,to,reason){
   if(!active.has(from)||!active.has(to))return;const left=byId.get(from),right=byId.get(to);
   if(left.phase==='repository'&&right.phase==='language')fail('dependency/order would run a repository rule before language checking: '+from+' -> '+to);
   edges.push(Object.freeze({from,to,reason}));
   // The original fixed phase boundary already orders language -> repository;
   // no quadratic all-language/all-repository barrier edges are needed.
   if(left.phase!==right.phase||successors.get(from).has(to))return;
   successors.get(from).add(to);indegrees.set(to,indegrees.get(to)+1);
  }
  for(const row of selected){for(const id of row.requires)edge(id,row.id,'requires');for(const id of row.after)edge(id,row.id,'after');for(const id of row.before)edge(row.id,id,'before');}
  const ordered=[];
  for(const phase of RULE_PHASES){
   const ready=heap(),members=selected.filter(row=>row.phase===phase);for(const row of members)if(indegrees.get(row.id)===0)ready.push(row.index);
   let visited=0;while(ready.size){const row=declarations[ready.pop()];ordered.push(row);visited++;for(const target of successors.get(row.id)){const count=indegrees.get(target)-1;indegrees.set(target,count);if(count===0)ready.push(byId.get(target).index);}}
   if(visited!==members.length)fail('selected dependency/order cycle: '+members.filter(row=>indegrees.get(row.id)>0).slice(0,32).map(row=>row.id).join(', '));
  }
  const pipeline=createRulePipeline(RULE_PHASES.map(phase=>({phase,rules:ordered.filter(row=>row.phase===phase).map(({id,apply})=>({id,apply}))})));
  const discovery=Object.freeze({roots:Object.freeze(selected.filter(row=>roots.has(row.id)).map(row=>row.id)),selected:Object.freeze(ordered.map(row=>row.id)),dependencies:Object.freeze(selected.filter(row=>!roots.has(row.id)).map(row=>row.id)),edges:Object.freeze(edges),sourceAuthority:false,semanticAuthority:false});
  return Object.freeze({description:pipeline.description,discovery,run:pipeline.run});
 }
 function discover(input,context){
  const roots=[];for(const row of declarations)if(row.discover!==undefined){const selected=row.discover(input,context);if(typeof selected!=='boolean')fail('source discovery must return a boolean without thenable assimilation');if(selected)roots.push(row.id);}
  const pipeline=compile(roots);return Object.freeze({...pipeline,discovery:Object.freeze({...pipeline.discovery,sourceDiscovered:true})});
 }
 function runDiscovered(input,context){const pipeline=discover(input,context),result=pipeline.run(input,context);return Object.freeze({...result,description:pipeline.description,discovery:pipeline.discovery});}
 return Object.freeze({description,compile,discover,runDiscovered});
}
/** Additive convenience API; the existing two-phase pipeline is not patched. */
export function createDiscoveredRulePipeline(registrations,selection){return createRuleRegistry(registrations).compile(selection);}
