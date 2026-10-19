// Test source data only. Ordinary project parsing and checking retain authority.
import assert from 'node:assert/strict';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';

const facadePath='src/translation_core.rs',childPath='src/translation_core/json_collections.rs';
export function completeCoreSourceFixture(input){
  const facade=Object.getOwnPropertyDescriptor(input,facadePath);
  if(!facade||!Object.hasOwn(facade,'value')||facade.value!==ROUTER_FORMATTING_FACADE_SOURCE||Object.hasOwn(input,childPath))return input;
  const descriptors=Object.getOwnPropertyDescriptors(input);
  descriptors[childPath]={value:ROUTER_CORE_JSON_COLLECTIONS_SOURCE,writable:true,enumerable:true,configurable:true};
  return Object.create(Object.getPrototypeOf(input),descriptors);
}

// Bounded initialization controls protect explicit negative fixture inputs.
// These establish data-preservation behavior, not source or semantic admission.
const original={'src/lib.rs':'pub mod translation_core;',[facadePath]:ROUTER_FORMATTING_FACADE_SOURCE};
const completed=completeCoreSourceFixture(original);
assert.notStrictEqual(completed,original);
assert.equal(Object.hasOwn(original,childPath),false);
assert.equal(completed[childPath],ROUTER_CORE_JSON_COLLECTIONS_SOURCE);
for(const key of Reflect.ownKeys(original))assert.deepEqual(Object.getOwnPropertyDescriptor(completed,key),Object.getOwnPropertyDescriptor(original,key));
assert.deepEqual(Object.keys(completed),[...Object.keys(original),childPath]);
for(const input of [{...original,[facadePath]:ROUTER_FORMATTING_FACADE_SOURCE+' '},{'src/lib.rs':'pub fn value(){}'},{...original,[childPath]:undefined},{...original,[childPath]:ROUTER_CORE_JSON_COLLECTIONS_SOURCE+' '},{...original,[childPath]:ROUTER_CORE_JSON_COLLECTIONS_SOURCE}])assert.strictEqual(completeCoreSourceFixture(input),input);
let callbacks=0;
const accessorFacade={'src/lib.rs':original['src/lib.rs']};
Object.defineProperty(accessorFacade,facadePath,{enumerable:true,get(){callbacks++;return ROUTER_FORMATTING_FACADE_SOURCE;}});
assert.strictEqual(completeCoreSourceFixture(accessorFacade),accessorFacade);
const accessorChild={...original};
Object.defineProperty(accessorChild,childPath,{enumerable:true,get(){callbacks++;return ROUTER_CORE_JSON_COLLECTIONS_SOURCE;}});
assert.strictEqual(completeCoreSourceFixture(accessorChild),accessorChild);
const otherAccessor={...original};
Object.defineProperty(otherAccessor,'src/other.rs',{enumerable:true,get(){callbacks++;return 'pub fn other(){}';}});
const copiedAccessor=completeCoreSourceFixture(otherAccessor);
assert.deepEqual(Object.getOwnPropertyDescriptor(copiedAccessor,'src/other.rs'),Object.getOwnPropertyDescriptor(otherAccessor,'src/other.rs'));
assert.equal(callbacks,0);
