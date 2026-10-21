// Unadopted owned JSON edit-slot ABI. No parser/checker/owner permission.
import {types} from 'node:util';
import {json_macro_value,json_macro_object} from './json-macro-runtime.mjs';
import {string,some,NONE} from './extensions/json-values.mjs';
const slots=new WeakMap(),loans=new WeakMap(),apply=Reflect.apply;
const get=WeakMap.prototype.get,set=WeakMap.prototype.set,remove=WeakMap.prototype.delete;
const freeze=Object.freeze,descriptor=Object.getOwnPropertyDescriptor,parent=Object.getPrototypeOf,proxy=types.isProxy;
const invalid=message=>{throw new TypeError('JSON edit candidate: '+message);};
function slotState(slot){const state=apply(get,slots,[slot]);if(!state)invalid('unissued owned slot');return state;}
function loanState(loan){const state=apply(get,loans,[loan]);if(!state||!state.open||state.root.active!==state)invalid('closed, foreign or suspended loan');return state;}
function synchronous(value){
 let cursor=value;for(let depth=0;cursor!==null&&(typeof cursor==='object'||typeof cursor==='function');depth++){
  if(depth>=160||proxy(cursor))invalid('ordinary synchronous result required');
  if(descriptor(cursor,'then'))invalid('Promise or thenable result refused');cursor=parent(cursor);
 }
 return value;
}
function runLoan(root,previous,run){
 if(typeof run!=='function'||proxy(run))invalid('ordinary synchronous callback required');
 const handle=freeze({schema:'owned-json-edit-loan-candidate-v1'}),state={root,open:true};apply(set,loans,[handle,state]);root.active=state;
 try{return synchronous(run(handle));}
 finally{state.open=false;apply(remove,loans,[handle]);root.active=previous;state.root=null;}
}
// A JS snapshot is copied; it never exposes a shared alias to the slot storage.
export function createJsonEditSlot(value){const root={value:json_macro_value(value),active:null},handle=freeze({schema:'owned-json-edit-slot-candidate-v1'});apply(set,slots,[handle,root]);return handle;}
export function jsonEditSnapshot(slot){const root=slotState(slot);if(root.active)invalid('slot is exclusively borrowed');return json_macro_value(root.value);}
export function withJsonEdit(slot,run){const root=slotState(slot);if(root.active)invalid('slot is already exclusively borrowed');return runLoan(root,null,run);}
export function withJsonEditReborrow(loan,run){const state=loanState(loan);return runLoan(state.root,state,run);}
export function jsonEditRemoveIfObject(loan,key){
 const state=loanState(loan),name=string(key),value=state.root.value;if(value.$!=='Object')return NONE;
 const found=value.field0.entries.find(entry=>entry.key===name);if(!found)return NONE;
 const next=json_macro_object(value.field0.entries.filter(entry=>entry.key!==name).map(entry=>[entry.key,entry.value]));
 // Commit immediately, before returning. Err/throw from a later callback keeps
 // every completed edit; scope cleanup revokes access without rolling back.
 state.root.value=next;return some(json_macro_value(found.value));
}
