// Native-only allocation/control-flow reuse, never original-source authority.
// A completed record contains scalar traversal costs only, with weak keys.
import {types} from 'node:util';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const MIN_COMPLETED_CHILDREN=64;
const ROOT_LIMIT=1024,LARGE_LIMIT=2048,SMALL_LIMIT=1024,LARGE_CELLS=64,NODE_LIMIT=32768,CELL_LIMIT=200000,DEPTH_LIMIT=160,RECORD_BASE=CELL_LIMIT+2;
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
 const states=new Map(),order=[],pending=[value,0,null];let uniqueCells=0;
 while(pending.length){
  const state=pending.pop(),depth=pending.pop(),value=pending.pop();
  if(state!==null){
   let cells=state.cells,height=1,jsonFlags=state.jsonFlags;
   for(let index=0;index<state.children.length;index++){
    const child=state.children[index];
    const cost=states.get(child)??lookup(child);
    if(!cost||typeof cost!=='number'&&!cost.done)return null;
    const packed=typeof cost==='number'?cost>>>2:0;
    cells+=typeof cost==='number'?packed%RECORD_BASE:cost.cells;const nextHeight=1+(typeof cost==='number'?(packed/RECORD_BASE)|0:cost.height);if(nextHeight>height)height=nextHeight;
    jsonFlags&=typeof cost==='number'?cost&3:cost.jsonFlags;
    if(cells>CELL_LIMIT)cells=CELL_LIMIT+1;
   }
   if(depth+height>DEPTH_LIMIT)return null;
   state.cells=cells;state.height=height;state.jsonFlags=jsonFlags;state.done=true;order.push(state);continue;
  }
  if(value===null||typeof value!=='object'){if(typeof value==='function')return null;continue;}
  if(types.isProxy(value))return null;
  const known=states.get(value)??lookup(value);
  if(known){if(typeof known!=='number'&&!known.done||depth+(typeof known==='number'?((known>>>2)/RECORD_BASE)|0:known.height)>DEPTH_LIMIT)return null;continue;}
  if(depth>=DEPTH_LIMIT||states.size>=NODE_LIMIT)return null;
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  if(prototype!==(array?Array.prototype:Object.prototype)&&!(prototype===null&&!array))return null;
  if(array&&value.length>=CELL_LIMIT)return null;
  const keys=Reflect.ownKeys(value);uniqueCells+=1+keys.length;if(uniqueCells>CELL_LIMIT)return null;
  if(array&&(keys.length!==value.length+1||keys.at(-1)!=='length'))return null;
  // Reuse the private own-key array; only object edges need a later cost join.
  // Scalar occurrences still count once each, including repeated values.
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
  // Only an entirely completed child set has no later cold descriptor walk.
  // A miss keeps the exact original pending order, including callback effects.
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
  const selected={value,children,cells:allCompleted?completedCells:scalarCells,height:allCompleted?completedHeight:objectChildren===0?1:0,jsonFlags:allCompleted?completedFlags:jsonFlags,done:allCompleted||objectChildren===0};states.set(value,selected);
  if(selected.done){order.push(selected);continue;}
  pending.push(value,depth,selected);
  for(let index=children.length-1;index>=0;index--)pending.push(children[index],depth+1,null);
 }
 const root=lookup(value)??states.get(value);
 return root&&(typeof root==='number'||root.done)?{order,root:typeof root==='number'?{height:((root>>>2)/RECORD_BASE)|0,cells:(root>>>2)%RECORD_BASE,jsonFlags:root&3,done:true}:root}:null;
}
// The caller supplies its unchanged legacy recursive closure, not a callback
// that participates in the eligible native algorithm. This factory issues no
// token and is used only by the original private builtin proof construction.
export function createCompletedDataFreezer(originalFreeze){
 return function completedDataFreeze(value){
  if(!value||typeof value!=='object'||!originalDataFreezeIntrinsicsUnchanged())return originalFreeze(value);
  if(lookup(value))return value;
  const selected=plan(value,lookup);if(!selected)return originalFreeze(value);
  for(let index=0;index<selected.order.length;index++){
   const state=selected.order[index];Object.freeze(state.value);
   remember(state.value,state,state.value===value);
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
