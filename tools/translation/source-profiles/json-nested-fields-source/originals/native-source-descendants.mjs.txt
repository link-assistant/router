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
  if(identicalNativeSourceHistory(previous,next))continue;
  if(end(previous)===end(next)&&previous.current===next.current&&identicalNativeSourceHistory(previous,previous)&&identicalNativeSourceHistory(next,next)&&nativeSourceHistoryBoundary(previous,next.before)){
   const equation=transportConcreteSourceEquations([{before:next.before,after:end(next),language:nativeSourceHistoryLanguage(next.path)}])[0];need(equation.inverse===next.before,'complete overlapping descendant CST inverse');selected.set(next.path,{...previous,parallelHistories:[...(previous.parallelHistories??[]),next]});continue;
  }
  const before=end(previous),after=end(next);need(next.before===before&&next.inverse===before&&previous.current===next.current,'complete adjacent descendant source history join');
  const equation=transportConcreteSourceEquations([{before,after,language:nativeSourceHistoryLanguage(next.path)}])[0];need(equation.inverse===before,'complete adjacent descendant CST inverse');
  selected.set(next.path,{...previous,currentAfter:after,laterHistories:[...(previous.laterHistories??[]),{id:plan.id,before,after,equation,stages:next.stages,laterHistories:next.laterHistories??[],parallelHistories:next.parallelHistories??[],path:next.path,...(next.originalPath?{originalPath:next.originalPath,originalSource:next.before}:{}),sourceAuthority:false,semanticAuthority:false}]});
 }
 let retained=0;for(const value of selected.values()){retained+=Buffer.byteLength(value.before)+Buffer.byteLength(end(value));need(retained<=134217728,'complete descendant original/output raw-source bound');}return [...selected.values()];
}

// Complete inert source-history equality only. Do not invoke nested getters,
// proxy traps or toJSON hooks supplied in public source DATA. No permit is saved.
function identicalNativeSourceHistory(left,right){
 const leftActive=new WeakSet(),rightActive=new WeakSet();let cells=0;
 function same(left,right,depth){
  if(++cells>2000000||depth>512)return false;const kind=typeof left;if(kind!==typeof right)return false;if(left===null||right===null)return left===right;if(['string','number','boolean','undefined'].includes(kind))return Object.is(left,right);if(kind!=='object'||types.isProxy(left)||types.isProxy(right)||leftActive.has(left)||rightActive.has(right))return false;
  const prototype=Object.getPrototypeOf(left);if(prototype!==Object.getPrototypeOf(right)||prototype!==Object.prototype&&prototype!==Array.prototype)return false;const leftFields=Object.getOwnPropertyDescriptors(left),rightFields=Object.getOwnPropertyDescriptors(right),keys=Reflect.ownKeys(leftFields),other=Reflect.ownKeys(rightFields);if(keys.length!==other.length||keys.some((key,index)=>typeof key!=='string'||key!==other[index]))return false;leftActive.add(left);rightActive.add(right);
  try{for(const key of keys){const a=leftFields[key],b=rightFields[key];if(!Object.hasOwn(a,'value')||!Object.hasOwn(b,'value')||a.enumerable!==b.enumerable||a.configurable!==b.configurable||a.writable!==b.writable||!same(a.value,b.value,depth+1))return false;}return true;}finally{leftActive.delete(left);rightActive.delete(right);}
 }return same(left,right,0);
}
function nativeSourceHistoryBoundary(value,source){
 let cells=0;function visit(value,depth){need(++cells<=2000000&&depth<=512,'bounded complete source-history boundary');ordinary(value,['before','after']);need(typeof value.before==='string'&&typeof value.after==='string','complete source-history boundary values');if(value.before===source||value.after===source||Object.hasOwn(value,'currentAfter')&&value.currentAfter===source||Object.hasOwn(value,'language')&&value.language===source)return true;for(const key of ['laterHistories','parallelHistories'])if(Object.hasOwn(value,key))for(const child of array(value[key],4096))if(visit(child,depth+1))return true;return false;}return visit(value,0);
}
export function nativeSourceHistoryOverlap(previous,next){
 ordinary(previous,['before','after']);row(next);if(!identicalNativeSourceHistory(previous,previous)||!identicalNativeSourceHistory(next,next)||end(previous)!==end(next)||!nativeSourceHistoryBoundary(previous,next.before))return null;const equation=transportConcreteSourceEquations([{before:next.before,after:end(next),language:nativeSourceHistoryLanguage(next.path)}])[0];need(equation.inverse===next.before,'complete overlapping source-history CST inverse');return {before:next.before,after:end(next),equation,sourceAuthority:false,semanticAuthority:false};
}
export function nativeSourceHistoryOriginalGuards(plan){
 const guards=new Map();let cells=0;function visit(value,depth){need(++cells<=2000000&&depth<=512,'bounded complete source-history originals');ordinary(value,['before','after']);need(typeof value.before==='string'&&typeof value.after==='string','complete source-history originals required');if(Object.hasOwn(value,'originalPath')&&value.originalPath){ordinary(value,['path']);const original=path(value.originalPath),target=path(value.path),source=Object.hasOwn(value,'originalSource')?value.originalSource:value.before;need(typeof source==='string'&&Buffer.byteLength(source)<=8388608,'complete bounded source-history original');if(target!==original){need(!guards.has(original)||guards.get(original)===source,'consistent complete source-history original');guards.set(original,source);}}for(const key of ['laterHistories','parallelHistories'])if(Object.hasOwn(value,key))for(const child of array(value[key],4096))visit(child,depth+1);}
 for(const value of nativeSourceHistoryFiles(plan))visit(value,0);return [...guards].map(([path,source])=>({path,source}));
}

function nativeSourceHistoryLanguage(path){return path.endsWith('.rs')?'Rust':/\.(?:ts|mts|cts)$/u.test(path)?'TypeScript':'JavaScript';}
