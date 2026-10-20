// Native-only allocation/control-flow reuse, never original-source authority.
// A completed record contains scalar traversal costs only, with weak keys.
import {types} from 'node:util';
import {originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const originalDataFreezeIntrinsicsUnchanged=originalBatchedDataFreezeIntrinsicsUnchanged;
const MIN_COMPLETED_CHILDREN=64;
const ROOT_LIMIT=1024,LARGE_LIMIT=2048,SMALL_LIMIT=1024,LARGE_CELLS=256,NODE_LIMIT=32768,CELL_LIMIT=200000,DEPTH_LIMIT=160,RECORD_BASE=CELL_LIMIT+2;
// Shared scalar-only weak records; no owner or proof root is retained.
// The low two bits retain safe-scalar/no-own-toJSON subtree facts. The other
// bits encode height * RECORD_BASE + cells; the full number stays below 2**27.
// cells saturates at CELL_LIMIT+1; height is in 1..DEPTH_LIMIT.
let roots=null,large=null,small=null,rootSlots=0,largeSlots=0,smallSlots=0;
const lookup=value=>roots?.get(value)??large?.get(value)??small?.get(value);
function remember(value,record,isRoot){
 const encoded=(record.height*RECORD_BASE+record.cells)*4+record.jsonFlags;
 if(isRoot){if(!roots||rootSlots>=ROOT_LIMIT){roots=new WeakMap();rootSlots=0;}roots.set(value,encoded);rootSlots++;}
 else if(record.cells>=LARGE_CELLS){if(!large||largeSlots>=LARGE_LIMIT){large=new WeakMap();largeSlots=0;}large.set(value,encoded);largeSlots++;}
 else{if(!small||smallSlots>=SMALL_LIMIT){small=new WeakMap();smallSlots=0;}small.set(value,encoded);smallSlots++;}
}
function plan(value,lookup){
 const states=new Map(),order=[];let uniqueCells=0;
 // A bounded native-only DFS returns each child's completed scalar cost to
 // its parent directly. It avoids the pending triples and second child-map
 // walk; states still detect cycles and retain shared-edge multiplicity.
 function visit(value,depth){
  if(value===null||typeof value!=='object')return typeof value==='function'?null:0;
  if(types.isProxy(value))return null;
  const known=states.get(value)??lookup(value);
  if(known)return typeof known!=='number'&&!known.done||depth+(typeof known==='number'?((known>>>2)/RECORD_BASE)|0:known.height)>DEPTH_LIMIT?null:known;
  if(depth>=DEPTH_LIMIT||states.size>=NODE_LIMIT)return null;
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  if(prototype!==(array?Array.prototype:Object.prototype)&&!(prototype===null&&!array))return null;
  if(array&&value.length>=CELL_LIMIT)return null;
  const keys=Reflect.ownKeys(value);uniqueCells+=1+keys.length;if(uniqueCells>CELL_LIMIT)return null;
  if(array&&(keys.length!==value.length+1||keys.at(-1)!=='length'))return null;
  // Finish the same complete own-descriptor census before visiting children.
  const children=keys;let objectChildren=0,scalarCells=1,jsonFlags=3;
  for(let index=0;index<keys.length;index++){
   const key=keys[index];if(typeof key!=='string')return null;
   const field=Object.getOwnPropertyDescriptor(value,key);
   if(!field||!Object.hasOwn(field,'value'))return null;
   if(array&&key==='length'){if(field.enumerable||field.value!==value.length)return null;continue;}
   if(!field.enumerable||array&&key!==''+index||typeof field.value==='function')return null;
   if(key==='toJSON')jsonFlags&=1;
   if(field.value!==null&&typeof field.value==='object')children[objectChildren++]=field.value;
   else{scalarCells++;if(typeof field.value==='bigint'||typeof field.value==='symbol')jsonFlags&=2;}
  }
  children.length=objectChildren;
  let completedCells=scalarCells,completedHeight=1,completedFlags=jsonFlags;
  let allCompleted=objectChildren>=MIN_COMPLETED_CHILDREN&&originalDataFreezeIntrinsicsUnchanged();
  if(allCompleted)for(let index=0;index<children.length;index++){
   const cost=states.get(children[index])??lookup(children[index]);
   if(typeof cost!=='number'||depth+1+(((cost>>>2)/RECORD_BASE)|0)>DEPTH_LIMIT){allCompleted=false;break;}
   const packed=cost>>>2;completedCells+=packed%RECORD_BASE;
   if(completedCells>CELL_LIMIT)completedCells=CELL_LIMIT+1;
   const nextHeight=1+((packed/RECORD_BASE)|0);if(nextHeight>completedHeight)completedHeight=nextHeight;
   completedFlags&=cost&3;
  }
  const selected={value,cells:allCompleted?completedCells:scalarCells,height:allCompleted?completedHeight:1,jsonFlags:allCompleted?completedFlags:jsonFlags,done:allCompleted||objectChildren===0};states.set(value,selected);
  if(!selected.done){
   for(let index=0;index<children.length;index++){
    const cost=visit(children[index],depth+1);if(cost===null)return null;
    const packed=typeof cost==='number'?cost>>>2:0;
    selected.cells+=typeof cost==='number'?packed%RECORD_BASE:cost.cells;
    if(selected.cells>CELL_LIMIT)selected.cells=CELL_LIMIT+1;
    const nextHeight=1+(typeof cost==='number'?(packed/RECORD_BASE)|0:cost.height);if(nextHeight>selected.height)selected.height=nextHeight;
    selected.jsonFlags&=typeof cost==='number'?cost&3:cost.jsonFlags;
   }
   if(depth+selected.height>DEPTH_LIMIT)return null;
   selected.done=true;
  }
  order.push(selected);return selected;
 }
 const selected=visit(value,0);if(selected===null)return null;
 const root=lookup(value)??selected;
 return root&&(typeof root==='number'||root.done)?{order,root:typeof root==='number'?{height:((root>>>2)/RECORD_BASE)|0,cells:(root>>>2)%RECORD_BASE,jsonFlags:root&3,done:true}:root}:null;
}
// Invocation-local storage only. The unchanged planner above remains the exact
// route for native lazy stack descriptors and its observer-capable continuation.
// No completed weak record is issued until the entire packed plan succeeds.
const RETRY_ORIGINAL_PLAN={};
function packedPlan(value,lookup){
 const states=new Map(),records=[],order=[];let uniqueCells=0,resultCells=0,resultHeight=0,resultFlags=0;
 function visit(value,depth){
  if(value===null||typeof value!=='object'){resultCells=0;resultHeight=0;resultFlags=0;return typeof value==='function'?null:0;}
  if(types.isProxy(value))return null;
  const previous=states.get(value);
  if(previous!==undefined){const known=records[previous+1];if(known===0)return null;const packed=known>>>2,height=(packed/RECORD_BASE)|0;if(depth+height>DEPTH_LIMIT)return null;resultCells=packed%RECORD_BASE;resultHeight=height;resultFlags=typeof known==='number'?known&3:0;return known;}
  const known=lookup(value);
  if(known){if(typeof known!=='number')return null;const packed=known>>>2,height=(packed/RECORD_BASE)|0;if(depth+height>DEPTH_LIMIT)return null;resultCells=packed%RECORD_BASE;resultHeight=height;resultFlags=known&3;return known;}
  if(depth>=DEPTH_LIMIT||states.size>=NODE_LIMIT)return null;
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  if(prototype!==(array?Array.prototype:Object.prototype)&&!(prototype===null&&!array))return null;
  if(array&&value.length>=CELL_LIMIT)return null;
  const keys=Reflect.ownKeys(value);uniqueCells+=1+keys.length;if(uniqueCells>CELL_LIMIT)return null;
  if(array&&(keys.length!==value.length+1||keys.at(-1)!=='length'))return null;
  // Stock Error.captureStackTrace can attach a lazy descriptor to an ordinary
  // object. Inspect the complete key list before the FIRST descriptor: an old
  // retry can then reproduce every formatter/getter/intrinsic observation.
  // Other prefix operations see only nonproxy ordinary data and native owners.
  for(let index=0;index<keys.length;index++)if(keys[index]==='stack')return RETRY_ORIGINAL_PLAN;
  // Finish the same complete own-descriptor census before visiting children.
  const children=keys;let objectChildren=0,scalarCells=1,jsonFlags=3;
  for(let index=0;index<keys.length;index++){
   const key=keys[index];if(typeof key!=='string')return null;
   const field=Object.getOwnPropertyDescriptor(value,key);
   if(!field||!Object.hasOwn(field,'value'))return null;
   if(array&&key==='length'){if(field.enumerable||field.value!==value.length)return null;continue;}
   if(!field.enumerable||array&&key!==''+index||typeof field.value==='function')return null;
   if(key==='toJSON')jsonFlags&=1;
   if(field.value!==null&&typeof field.value==='object')children[objectChildren++]=field.value;
   else{scalarCells++;if(typeof field.value==='bigint'||typeof field.value==='symbol')jsonFlags&=2;}
  }
  children.length=objectChildren;
  let completedCells=scalarCells,completedHeight=1,completedFlags=jsonFlags;
  let allCompleted=objectChildren>=MIN_COMPLETED_CHILDREN&&originalDataFreezeIntrinsicsUnchanged();
  if(allCompleted)for(let index=0;index<children.length;index++){
   // A local completed record was an object in the old planner. It must still
   // select the ordinary DFS rather than acquire an external-cache fast lane.
   const local=states.get(children[index]),cost=local===undefined?lookup(children[index]):null;
   if(typeof cost!=='number'||depth+1+(((cost>>>2)/RECORD_BASE)|0)>DEPTH_LIMIT){allCompleted=false;break;}
   const packed=cost>>>2;completedCells+=packed%RECORD_BASE;
   if(completedCells>CELL_LIMIT)completedCells=CELL_LIMIT+1;
   const nextHeight=1+((packed/RECORD_BASE)|0);if(nextHeight>completedHeight)completedHeight=nextHeight;
   completedFlags&=cost&3;
  }
  const selected=records.length;records.push(value,0);states.set(value,selected);
  let cells=allCompleted?completedCells:scalarCells,height=allCompleted?completedHeight:1,flags=allCompleted?completedFlags:jsonFlags;
  if(!allCompleted&&objectChildren!==0){
   for(let index=0;index<children.length;index++){
    const cost=visit(children[index],depth+1);if(cost===null||cost===RETRY_ORIGINAL_PLAN)return cost;
    if(typeof cost==='number'){
     cells+=resultCells;if(cells>CELL_LIMIT)cells=CELL_LIMIT+1;
     const nextHeight=1+resultHeight;if(nextHeight>height)height=nextHeight;
     flags&=resultFlags;
    }else{
     // A late collection observer can replace a private stored cost. Preserve
     // every legacy numeric coercion for that uncertain nonnumber result.
     const packed=cost>>>2;cells+=packed%RECORD_BASE;
     if(cells>CELL_LIMIT)cells=CELL_LIMIT+1;
     const nextHeight=1+((packed/RECORD_BASE)|0);if(nextHeight>height)height=nextHeight;
     flags&=cost&3;
    }
   }
   if(depth+height>DEPTH_LIMIT)return null;
  }
  const encoded=(height*RECORD_BASE+cells)*4+flags;records[selected+1]=encoded;
  order.push(selected);resultCells=cells;resultHeight=height;resultFlags=flags;return encoded;
 }
 const selected=visit(value,0);if(selected===null||selected===RETRY_ORIGINAL_PLAN)return selected;
 const root=lookup(value)??selected;
 return root?{order,records,root:{height:((root>>>2)/RECORD_BASE)|0,cells:(root>>>2)%RECORD_BASE,jsonFlags:root&3,done:true}}:null;
}

// The caller supplies its unchanged legacy recursive closure, not a callback
// that participates in the eligible native algorithm. This factory issues no
// token and is used only by the original private builtin proof construction.
export function createCompletedDataFreezer(originalFreeze){
 return function completedDataFreeze(value){
  if(!value||typeof value!=='object'||!originalDataFreezeIntrinsicsUnchanged())return originalFreeze(value);
  if(lookup(value))return value;
  const selected=packedPlan(value,lookup);
  if(selected===RETRY_ORIGINAL_PLAN){
   const original=plan(value,lookup);if(!original)return originalFreeze(value);
   for(let index=0;index<original.order.length;index++){
    const state=original.order[index];Object.freeze(state.value);
    remember(state.value,state,state.value===value);
   }
   return value;
  }
  if(!selected)return originalFreeze(value);
  const state={value:null,cells:0,height:0,jsonFlags:0,done:true};
  for(let index=0;index<selected.order.length;index++){
   const id=selected.order[index],encoded=selected.records[id+1],cost=encoded>>>2;
   state.value=selected.records[id];state.cells=cost%RECORD_BASE;state.height=(cost/RECORD_BASE)|0;state.jsonFlags=encoded&3;
   Object.freeze(state.value);remember(state.value,state,state.value===value);
  }
  return value;
 };
}

// Negative-only storage hint, never source or positive JSON eligibility.
export function completedDataTraversalExceedsBudget(value,budget){
 if(!value||typeof value!=='object'||typeof budget!=='number'||budget<0||budget%1!==0||!originalDataFreezeIntrinsicsUnchanged())return false;
 const encoded=lookup(value);
 return typeof encoded==='number'&&(encoded>>>2)%RECORD_BASE>budget;
}

// Positive storage eligibility only. These flags were joined across every
// occurrence before native deep freezing completed; no source owner is issued.
export function completedDataJsonWithinBudget(value,budget,depth){
 if(!value||typeof value!=='object'||typeof budget!=='number'||budget<0||budget>CELL_LIMIT||budget%1!==0||typeof depth!=='number'||depth<0||depth>DEPTH_LIMIT||depth%1!==0||!originalDataFreezeIntrinsicsUnchanged())return false;
 const encoded=lookup(value);if(typeof encoded!=='number'||(encoded&3)!==3)return false;
 const cost=encoded>>>2;
 return cost%RECORD_BASE<=budget&&((cost/RECORD_BASE)|0)<=depth;
}
