// Storage-only bytes for authenticated owners' immutable comparison operands.
// This helper grants no source/checker/namespace authority. Callers must perform
// their private owner join first; every ineligible case runs normal stringify.
import {types} from 'node:util';
import {originalNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
import {completedDataTraversalExceedsBudget,completedDataJsonWithinBudget} from './private-data-freeze.mjs';
const enabled=originalNamespaceTraversalIntrinsicsUnchanged()&&originalLexingIntrinsicsUnchanged();
const descriptor=enabled?Object.getOwnPropertyDescriptor:null,prototype=enabled?Object.getPrototypeOf:null,own=enabled?Object.hasOwn:null,keys=enabled?Reflect.ownKeys:null,apply=enabled?Reflect.apply:null,isProxy=enabled?types.isProxy:null,isArray=enabled?Array.isArray:null;
const functionPrototype=enabled?prototype(function(){}):null,textField=enabled?descriptor(functionPrototype,'toString'):null;
const frozenField=enabled?descriptor(Object,'isFrozen'):null;
const native=(value,name)=>typeof value==='function'&&!isProxy(value)&&apply(textField.value,value,[])===`function ${name}() { [native code] }`;
const qualified=!!(enabled&&textField&&own(textField,'value')&&frozenField&&own(frozenField,'value')&&native(frozenField.value,'isFrozen'));
const objectPrototype=qualified?Object.prototype:null,arrayPrototype=qualified?Array.prototype:null;
const weakGet=qualified?WeakMap.prototype.get:null,weakSet=qualified?WeakMap.prototype.set:null,mapGet=qualified?Map.prototype.get:null,mapSet=qualified?Map.prototype.set:null,mapDelete=qualified?Map.prototype.delete:null,mapEntries=qualified?Map.prototype.entries:null,setHas=qualified?Set.prototype.has:null,setAdd=qualified?Set.prototype.add:null,setDelete=qualified?Set.prototype.delete:null;
const weakConstructor=qualified?WeakMap:null,setConstructor=qualified?Set:null;
const storage=qualified?new Map():null,iteratorPrototype=qualified?prototype(apply(mapEntries,storage,[])):null,next=qualified?descriptor(iteratorPrototype,'next').value:null;
const ENTRY_BYTES=4194304,TOTAL_BYTES=8388608,ENTRIES=16,CELLS=200000,DEPTH=160;
let retainedBytes=0,entries=0,hits=0,misses=0,captures=0,evictions=0,completedBudgetRefusals=0,completedEligibilityHits=0;
// Eligibility only: weak keys never retain an original owner. Rotation bounds
// the number of positive scalar records without keeping a strong key list.
// Completed roots have an independent partition, so a large AST walk cannot
// evict every previously validated comparison operand with tiny descendants.
// A separate large-subtree partition also protects shared source recipes from
// token/span churn; all three partitions together still hold at most4096 rows.
const SUBTREES=1024,LARGE_SUBTREES=2048,OWNERS=1024,LARGE_CELLS=64;
let owners=qualified?new weakConstructor():null,ownerEntries=0,ownerHits=0,largeSubtrees=qualified?new weakConstructor():null,largeEntries=0,largeHits=0,smallHits=0,subtrees=qualified?new weakConstructor():null,subtreeEntries=0,subtreeHits=0,subtreeMisses=0,subtreeCaptures=0,subtreeRotations=0,subtreeBudgetRefusals=0;
function intrinsics(){
 if(!qualified||!originalNamespaceTraversalIntrinsicsUnchanged()||!originalLexingIntrinsicsUnchanged())return false;
 const actual=descriptor(Object,'isFrozen');return !!actual&&own(actual,'value')&&actual.value===frozenField.value&&actual.writable===frozenField.writable&&actual.enumerable===frozenField.enumerable&&actual.configurable===frozenField.configurable;
}
function immutableJson(value){
 let stack={value,depth:0,exit:false,parent:null,next:null},cells=CELLS;const active=new setConstructor();
 const charge=(parent,count,height)=>{if(parent){parent.cells+=count;if(height+1>parent.height)parent.height=height+1;}};
 while(stack){const frame=stack;stack=frame.next;const value=frame.value;
  if(frame.exit){
   apply(setDelete,active,[value]);
   const record={cells:frame.total.cells,height:frame.total.height};
   if(frame.parent===null){
    if(ownerEntries>=OWNERS){owners=new weakConstructor();ownerEntries=0;if(subtreeRotations<9007199254740991)subtreeRotations++;}
    apply(weakSet,owners,[value,record]);ownerEntries++;
   }else if(record.cells>=LARGE_CELLS){
    if(largeEntries>=LARGE_SUBTREES){largeSubtrees=new weakConstructor();largeEntries=0;if(subtreeRotations<9007199254740991)subtreeRotations++;}
    apply(weakSet,largeSubtrees,[value,record]);largeEntries++;
   }else{
    if(subtreeEntries>=SUBTREES){subtrees=new weakConstructor();subtreeEntries=0;if(subtreeRotations<9007199254740991)subtreeRotations++;}
    apply(weakSet,subtrees,[value,record]);subtreeEntries++;
   }
   if(subtreeCaptures<9007199254740991)subtreeCaptures++;
   charge(frame.parent,frame.total.cells,frame.total.height);continue;
  }
  if(--cells<0||frame.depth>DEPTH)return false;
  if(value===null||value===undefined||typeof value==='string'||typeof value==='number'||typeof value==='boolean'){charge(frame.parent,1,0);continue;}
  if(typeof value!=='object'||isProxy(value)||apply(setHas,active,[value]))return false;
  const owner=apply(weakGet,owners,[value]),large=owner?null:apply(weakGet,largeSubtrees,[value]),saved=owner||large||apply(weakGet,subtrees,[value]);
  if(saved){if(saved.cells-1>cells||saved.height>DEPTH-frame.depth){if(subtreeBudgetRefusals<9007199254740991)subtreeBudgetRefusals++;return false;}cells-=saved.cells-1;charge(frame.parent,saved.cells,saved.height);if(subtreeHits<9007199254740991)subtreeHits++;if(owner){if(ownerHits<9007199254740991)ownerHits++;}else if(large){if(largeHits<9007199254740991)largeHits++;}else if(smallHits<9007199254740991)smallHits++;continue;}
  if(subtreeMisses<9007199254740991)subtreeMisses++;
  if(!apply(frozenField.value,Object,[value]))return false;
  const proto=prototype(value),array=isArray(value);if(proto!==objectPrototype&&proto!==null&&!(array&&proto===arrayPrototype))return false;
  const names=keys(value);if(own(value,'toJSON'))return false;
  if(array){const field=descriptor(value,'length');if(!field||!own(field,'value'))return false;const length=field.value;if(length<0||length>cells||names.length!==length+1)return false;for(let at=0;at<length;at++)if(!own(value,at))return false;}
  const total={cells:1,height:0};let first=null,last=null;
  for(let at=0;at<names.length;at++){const key=names[at];if(typeof key!=='string')return false;const field=descriptor(value,key);if(!field||!own(field,'value')||!field.enumerable&&!(array&&key==='length'))return false;if(!(array&&key==='length')){const child={value:field.value,depth:frame.depth+1,exit:false,parent:total,next:null};if(last)last.next=child;else first=child;last=child;}}
  apply(setAdd,active,[value]);const exit={value,depth:frame.depth,exit:true,parent:frame.parent,total,next:stack};
  if(last){last.next=exit;stack=first;}else stack=exit;
 }
 return true;
}
function retire(state){if(!state.active)return;apply(mapDelete,storage,[state]);retainedBytes-=state.bytes;entries--;state.active=false;state.encoded=null;if(evictions<9007199254740991)evictions++;}
function remember(state){apply(mapSet,storage,[state,state]);retainedBytes+=state.bytes;entries++;}
export function createPrivateFrozenJsonCache(){
 const values=qualified?new weakConstructor():null;
 return value=>{
  if(!intrinsics()||value===null||typeof value!=='object')return JSON.stringify(value);
  const prior=apply(weakGet,values,[value]);if(prior?.active){apply(mapDelete,storage,[prior]);apply(mapSet,storage,[prior,prior]);if(hits<9007199254740991)hits++;return prior.encoded;}
  if(misses<9007199254740991)misses++;
  if(completedDataTraversalExceedsBudget(value,CELLS)){if(completedBudgetRefusals<9007199254740991)completedBudgetRefusals++;return JSON.stringify(value);}
  // This skips eligibility traversal only, never serialization or owner joins.
  // The old traversal and its descendant warming remain the uncertain path.
  if(completedDataJsonWithinBudget(value,CELLS,DEPTH)){if(completedEligibilityHits<9007199254740991)completedEligibilityHits++;}
  else if(!immutableJson(value))return JSON.stringify(value);
  const encoded=JSON.stringify(value);if(typeof encoded!=='string'||encoded.length*2+128>ENTRY_BYTES||!intrinsics())return encoded;
  // No issuer/root is held by global bookkeeping. Weak owner keys may vanish;
  // bounded encoded bytes survive at most until ordinary global eviction.
  const state={encoded,bytes:encoded.length*2+128,active:true};let removed=0;
  while(entries>=ENTRIES||retainedBytes+state.bytes>TOTAL_BYTES){if(removed++>=ENTRIES)return encoded;const cursor=apply(mapEntries,storage,[]),first=apply(next,cursor,[]);if(first.done)return encoded;const before=entries;retire(first.value[0]);if(entries>=before)return encoded;}
  remember(state);apply(weakSet,values,[value,state]);if(captures<9007199254740991)captures++;return encoded;
 };
}
// Bounded scalar diagnostics only; mutating this returned copy grants nothing.
export function privateFrozenJsonCacheFacts(){return {available:intrinsics(),entries,retainedBytes,hits,misses,captures,evictions,limits:{entryBytes:ENTRY_BYTES,bytes:TOTAL_BYTES,entries:ENTRIES,cells:CELLS,depth:DEPTH},eligibilityMemo:{completedBudgetRefusals,completedEligibilityHits,entries:ownerEntries+subtreeEntries+largeEntries,maximumEntries:OWNERS+SUBTREES+LARGE_SUBTREES,owners:{entries:ownerEntries,maximumEntries:OWNERS,hits:ownerHits},subtrees:{entries:subtreeEntries+largeEntries,maximumEntries:SUBTREES+LARGE_SUBTREES,small:{entries:subtreeEntries,maximumEntries:SUBTREES,hits:smallHits},large:{entries:largeEntries,maximumEntries:LARGE_SUBTREES,hits:largeHits,minimumCells:LARGE_CELLS}},hits:subtreeHits,misses:subtreeMisses,captures:subtreeCaptures,rotations:subtreeRotations,budgetRefusals:subtreeBudgetRefusals}};}
