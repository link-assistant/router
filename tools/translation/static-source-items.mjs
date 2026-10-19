// Allocation-only syntax reuse. Callers still authenticate their complete
// original source, dependencies, namespaces and every resulting obligation.
import {types} from 'node:util';
import {sourceItems} from './rust-structure.mjs';
import {originalStaticSourceIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
export {STATIC_SOURCE_ITEM_LIMITS} from './original-json-intrinsics.mjs';
// Lexical budgets do not depend on the diagnostic export or a rebound freeze.
const ENTRY_LIMIT=16,SOURCE_CHAR_LIMIT=128000,ENTRY_CELL_LIMIT=200000,CELL_LIMIT=400000,CHAR_LIMIT=1000000;
function inspect(items,source){
 const nodes=[],pending=[items];let cells=0,chars=source.length;
 while(pending.length){
  const value=pending.pop();if(++cells>ENTRY_CELL_LIMIT)return null;
  if(typeof value==='string'){chars+=value.length;if(chars>CHAR_LIMIT)return null;}
  else if(value&&typeof value==='object'){
   if(types.isProxy(value))return null;
   const array=Array.isArray(value);if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))return null;
   const descriptors=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(descriptors);
   if(array&&(names.length!==value.length+1||names.at(-1)!=='length'))return null;
   for(let index=0;index<names.length;index++){
    const key=names[index],field=descriptors[key];if(typeof key!=='string'||!Object.hasOwn(field,'value'))return null;
    if(array&&key==='length'){if(field.value!==value.length||field.enumerable||field.configurable||!field.writable)return null;continue;}
    if(array&&key!==''+index||!field.writable||!field.enumerable||!field.configurable)return null;
    pending.push(field.value);
   }
   nodes.push(value);
  }
 }
 return {nodes,cells,chars};
}
function fresh(value){
 if(!value||typeof value!=='object')return value;
 const result=Array.isArray(value)?[]:{},names=Object.keys(value);
 for(let index=0;index<names.length;index++)Object.defineProperty(result,names[index],{__proto__:null,value:fresh(value[names[index]]),writable:true,enumerable:true,configurable:true});
 return result;
}
// Each consumer receives independent bounded private storage. The exported
// utility parses syntax only; neither a frozen record nor cached AST grants
// original-source identity or an authorization token.
export function createStaticSourceItemReader(){
 let entries=[],cells=0,chars=0;
 return function staticSourceItems(pin){
  // Preserve the old source read, including its ordering/exception behavior.
  const source=pin.source;
  if(!originalStaticSourceIntrinsicsUnchanged()||typeof source!=='string'||source.length>SOURCE_CHAR_LIMIT||source[source.length-1]!=='\n'||types.isProxy(pin)||Object.getPrototypeOf(pin)!==Object.prototype||!Object.isFrozen(pin))return sourceItems(source);
  const descriptor=Object.getOwnPropertyDescriptor(pin,'source');
  if(!descriptor||!Object.hasOwn(descriptor,'value')||descriptor.value!==source)return sourceItems(source);
  for(let index=0;index<entries.length;index++)if(entries[index].source===source){
   // The complete unchanged lexer ends an LF-terminated source with exactly
   // this operation. Replay its native legacy RegExp state, not just AST bytes.
   /\s/u.test('\n');return fresh(entries[index].items);
  }
  const items=sourceItems(source),state=inspect(items,source);if(!state)return items;
  for(let index=state.nodes.length-1;index>=0;index--)Object.freeze(state.nodes[index]);
  if(entries.length>=ENTRY_LIMIT||cells+state.cells>CELL_LIMIT||chars+state.chars>CHAR_LIMIT){entries=[];cells=0;chars=0;}
  entries.push({source,items,cells:state.cells,chars:state.chars});cells+=state.cells;chars+=state.chars;return fresh(items);
 };
}
