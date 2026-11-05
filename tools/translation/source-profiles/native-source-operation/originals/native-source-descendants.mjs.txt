// Complete source-equation DATA only. Descendant forwarding grants no owner,
// type or executable permit and retains no cross-invocation result cache.
import {types} from 'node:util';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Native source descendants: '+message);};
function ordinary(value,required=[]){need(value&&typeof value==='object'&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype,'ordinary complete source row required');const fields=Object.getOwnPropertyDescriptors(value);for(const key of Reflect.ownKeys(fields))need(typeof key==='string'&&Object.hasOwn(fields[key],'value'),'symbol/accessor source fields are unsupported');for(const key of required)need(Object.hasOwn(fields,key),'complete own source field required: '+key);return value;}
function array(value,max){need(Array.isArray(value)&&!types.isProxy(value)&&Object.getPrototypeOf(value)===Array.prototype&&value.length<=max,'bounded dense source array required');const fields=Object.getOwnPropertyDescriptors(value);need(Reflect.ownKeys(fields).length===value.length+1,'dense source array required');for(let index=0;index<value.length;index++)need(fields[index]&&Object.hasOwn(fields[index],'value'),'own source row required');return value;}
const path=value=>{need(typeof value==='string'&&value.length>0&&!/[\\\0:]/u.test(value)&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'),'repository-relative descendant source path required');return value;};
function row(value){
 ordinary(value,['path','before','after','inverse','current','stages']);path(value.path);need(typeof value.before==='string'&&typeof value.after==='string'&&typeof end(value)==='string'&&value.inverse===value.before,'full descendant original/output/inverse required');need(value.current===null||typeof value.current==='string','complete captured physical source required');const stages=array(value.stages,2);need(stages.length===2,'both original source substitution sequences required');ordinary(stages[0],['phase']);ordinary(stages[1],['phase']);need(stages[0].phase==='language'&&stages[1].phase==='repository','original language/repository sequence order');
 for(const text of [value.before,value.after,end(value)])need(Buffer.byteLength(text)<=8388608,'original descendant per-file byte limit');if(Object.hasOwn(value,'originalPath'))path(value.originalPath);return value;
}
const end=value=>Object.hasOwn(value,'currentAfter')?value.currentAfter:value.after;
export function nativeSourceHistoryFiles(plan){
 ordinary(plan,['schema','files','sourceAuthority','semanticAuthority']);need(plan.schema==='native-substitution-source-copy-plan-v1'&&plan.sourceAuthority===false&&plan.semanticAuthority===false,'actual source-equation plan DATA required');const direct=array(plan.files,64),descendants=Object.hasOwn(plan,'descendantFiles')?array(plan.descendantFiles,4096):[],seen=new Set();
 return [...direct,...descendants].map(value=>{row(value);need(!seen.has(value.path)&&seen.size<4096,'unique bounded direct/descendant source paths required');seen.add(value.path);return value;});
}
export function collectNativeSourceDescendants(plans,ownPaths){
 array(plans,16);need(ownPaths instanceof Set,'explicit current-plan source set required');const selected=new Map();
 for(const plan of plans)for(const next of nativeSourceHistoryFiles(plan)){
  if(ownPaths.has(next.path))continue;const previous=selected.get(next.path);
  if(!previous){selected.set(next.path,next);need(selected.size<=4096,'complete descendant source-count bound');continue;}
  const before=end(previous),after=end(next);need(next.before===before&&next.inverse===before&&previous.current===next.current,'complete adjacent descendant source history join');
  const equation=transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0];need(equation.inverse===before,'complete adjacent descendant CST inverse');
  selected.set(next.path,{...previous,currentAfter:after,laterHistories:[...(previous.laterHistories??[]),{id:plan.id,before,after,equation,stages:next.stages,laterHistories:next.laterHistories??[],sourceAuthority:false,semanticAuthority:false}]});
 }
 let retained=0;for(const value of selected.values()){retained+=Buffer.byteLength(value.before)+Buffer.byteLength(end(value));need(retained<=134217728,'complete descendant original/output raw-source bound');}return [...selected.values()];
}
