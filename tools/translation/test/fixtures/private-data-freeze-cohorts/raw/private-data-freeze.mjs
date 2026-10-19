// Native-only allocation/control-flow reuse, never original-source authority.
// A completed record contains scalar traversal costs only, with weak keys.
import {types} from 'node:util';
import {originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const SLOT_LIMIT=4096,NODE_LIMIT=32768,CELL_LIMIT=200000,DEPTH_LIMIT=160;
function plan(value,completed){
 const states=new Map(),order=[],pending=[{value,depth:0,exit:false}];let uniqueCells=0;
 while(pending.length){
  const frame=pending.pop(),value=frame.value;
  if(frame.exit){
   const state=frame.state;let cells=1,height=1;
   for(let index=0;index<state.children.length;index++){
    const child=state.children[index];
    if(child!==null&&typeof child==='object'){
     const cost=completed?.get(child)??states.get(child);
     if(!cost||!cost.done)return null;
     cells+=cost.cells;const nextHeight=1+cost.height;if(nextHeight>height)height=nextHeight;
    }else cells++;
    if(cells>CELL_LIMIT)cells=CELL_LIMIT+1;
   }
   if(frame.depth+height>DEPTH_LIMIT)return null;
   state.cells=cells;state.height=height;state.done=true;order.push(state);continue;
  }
  if(value===null||typeof value!=='object'){if(typeof value==='function')return null;continue;}
  if(types.isProxy(value))return null;
  const known=completed?.get(value)??states.get(value);
  if(known){if(!known.done||frame.depth+known.height>DEPTH_LIMIT)return null;continue;}
  if(frame.depth>=DEPTH_LIMIT||states.size>=NODE_LIMIT)return null;
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  if(prototype!==(array?Array.prototype:Object.prototype)&&!(prototype===null&&!array))return null;
  if(array&&value.length>=CELL_LIMIT)return null;
  const keys=Reflect.ownKeys(value);uniqueCells+=1+keys.length;if(uniqueCells>CELL_LIMIT)return null;
  if(array&&(keys.length!==value.length+1||keys.at(-1)!=='length'))return null;
  const children=[];
  for(let index=0;index<keys.length;index++){
   const key=keys[index];if(typeof key!=='string')return null;
   const field=Object.getOwnPropertyDescriptor(value,key);
   if(!field||!Object.hasOwn(field,'value'))return null;
   if(array&&key==='length'){if(field.enumerable||field.value!==value.length)return null;continue;}
   if(!field.enumerable||array&&key!==''+index||typeof field.value==='function')return null;
   children.push(field.value);
  }
  const state={value,children,cells:0,height:0,done:false};states.set(value,state);
  pending.push({value,depth:frame.depth,exit:true,state});
  for(let index=children.length-1;index>=0;index--){const child=children[index];if(child!==null&&typeof child==='object')pending.push({value:child,depth:frame.depth+1,exit:false});}
 }
 const root=completed?.get(value)??states.get(value);
 return root&&root.done?{order,root}:null;
}
// The caller supplies its unchanged legacy recursive closure, not a callback
// that participates in the eligible native algorithm. This factory issues no
// token and is used only by the original private builtin proof construction.
export function createCompletedDataFreezer(originalFreeze){
 let completed=null,slots=0;
 return function completedDataFreeze(value){
  if(!value||typeof value!=='object'||!originalDataFreezeIntrinsicsUnchanged())return originalFreeze(value);
  if(completed?.get(value))return value;
  const selected=plan(value,completed);if(!selected)return originalFreeze(value);
  for(let index=0;index<selected.order.length;index++){
   const state=selected.order[index];Object.freeze(state.value);
   if(!completed||slots>=SLOT_LIMIT){completed=new WeakMap();slots=0;}
   completed.set(state.value,{height:state.height,cells:state.cells,done:true});slots++;
  }
  return value;
 };
}
