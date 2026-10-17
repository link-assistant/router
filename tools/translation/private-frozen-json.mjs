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
function immutableJson(value,noStack=false){
 let stack={value,depth:0,exit:false,parent:null,next:null},cells=CELLS;const active=new setConstructor();
 const charge=(parent,count,height)=>{if(parent){parent.cells+=count;if(height+1>parent.height)parent.height=height+1;}};
 while(stack){const frame=stack;stack=frame.next;const value=frame.value;
  if(frame.exit){
   apply(setDelete,active,[value]);
   const record=(frame.total.height*(CELLS+1)+frame.total.cells)*2+(noStack?1:0);
   if(frame.parent===null){
    if(ownerEntries>=OWNERS){owners=new weakConstructor();ownerEntries=0;if(subtreeRotations<9007199254740991)subtreeRotations++;}
    apply(weakSet,owners,[value,record]);ownerEntries++;
   }else if(frame.total.cells>=LARGE_CELLS){
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
  if(noStack&&apply(compositionBoxedField.value,compositionTypes,[value]))return false;
  const owner=apply(weakGet,owners,[value]),large=owner?null:apply(weakGet,largeSubtrees,[value]),saved=owner||large||apply(weakGet,subtrees,[value]);
  if(saved&&(!noStack||(saved&1)===1)){const cost=saved>>>1,savedCells=cost%(CELLS+1),savedHeight=(cost/(CELLS+1))|0;if(savedCells-1>cells||savedHeight>DEPTH-frame.depth){if(subtreeBudgetRefusals<9007199254740991)subtreeBudgetRefusals++;return false;}cells-=savedCells-1;charge(frame.parent,savedCells,savedHeight);if(subtreeHits<9007199254740991)subtreeHits++;if(owner){if(ownerHits<9007199254740991)ownerHits++;}else if(large){if(largeHits<9007199254740991)largeHits++;}else if(smallHits<9007199254740991)smallHits++;continue;}
  if(subtreeMisses<9007199254740991)subtreeMisses++;
  let earlyNames=null;
  if(noStack){const parent=prototype(value),array=isArray(value);if(parent!==objectPrototype&&parent!==null&&!(array&&parent===arrayPrototype))return false;if(array){const length=descriptor(value,'length');if(!length||!own(length,'value')||length.value>CELLS)return false;}earlyNames=keys(value);for(let at=0;at<earlyNames.length;at++)if(earlyNames[at]==='stack')return false;}
  if(!apply(frozenField.value,Object,[value]))return false;
  const proto=prototype(value),array=isArray(value);if(proto!==objectPrototype&&proto!==null&&!(array&&proto===arrayPrototype))return false;
  const names=earlyNames??keys(value);if(own(value,'toJSON'))return false;
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
// Protect only genuine repeated byte hits from one-use encoding streams.
// The same bounded Map holds no owner/root keys; each state adds one own bit.
function touch(state){
 const promote=!state.protected;state.protected=true;apply(mapDelete,storage,[state]);apply(mapSet,storage,[state,state]);
 if(!promote)return;
 let count=0,oldest=null;const cursor=apply(mapEntries,storage,[]);
 for(let at=0;at<ENTRIES;at++){const row=apply(next,cursor,[]);if(row.done)break;const current=row.value[0];if(current.protected){count++;if(oldest===null)oldest=current;}}
 if(count>ENTRIES/2)oldest.protected=false;
}
function probationaryVictim(){
 let oldest=null;const cursor=apply(mapEntries,storage,[]);
 for(let at=0;at<ENTRIES;at++){const row=apply(next,cursor,[]);if(row.done)break;const current=row.value[0];if(oldest===null)oldest=current;if(!current.protected)return current;}
 return oldest;
}
export function createPrivateFrozenJsonCache(){
 const values=qualified?new weakConstructor():null;
 return value=>{
  if(!intrinsics()||value===null||typeof value!=='object')return JSON.stringify(value);
  const prior=apply(weakGet,values,[value]);if(prior?.active){touch(prior);if(hits<9007199254740991)hits++;return prior.encoded;}
  if(misses<9007199254740991)misses++;
  if(completedDataTraversalExceedsBudget(value,CELLS)){if(completedBudgetRefusals<9007199254740991)completedBudgetRefusals++;return JSON.stringify(value);}
  // This skips eligibility traversal only, never serialization or owner joins.
  // The old traversal and its descendant warming remain the uncertain path.
  if(completedDataJsonWithinBudget(value,CELLS,DEPTH)){if(completedEligibilityHits<9007199254740991)completedEligibilityHits++;}
  else if(!immutableJson(value))return JSON.stringify(value);
  const encoded=JSON.stringify(value);if(typeof encoded!=='string'||encoded.length*2+128>ENTRY_BYTES||!intrinsics())return encoded;
  // No issuer/root is held by global bookkeeping. Weak owner keys may vanish;
  // bounded encoded bytes survive at most until ordinary global eviction.
  const state={encoded,bytes:encoded.length*2+128,active:true,protected:false};let removed=0;
  while(entries>=ENTRIES||retainedBytes+state.bytes>TOTAL_BYTES){if(removed++>=ENTRIES)return encoded;const victim=probationaryVictim();if(victim===null)return encoded;const before=entries;retire(victim);if(entries>=before)return encoded;}
  remember(state);apply(weakSet,values,[value,state]);if(captures<9007199254740991)captures++;return encoded;
 };
}
// Bounded scalar diagnostics only; mutating this returned copy grants nothing.
export function privateFrozenJsonCacheFacts(){return {available:intrinsics(),entries,retainedBytes,hits,misses,captures,evictions,limits:{entryBytes:ENTRY_BYTES,bytes:TOTAL_BYTES,entries:ENTRIES,cells:CELLS,depth:DEPTH},eligibilityMemo:{completedBudgetRefusals,completedEligibilityHits,entries:ownerEntries+subtreeEntries+largeEntries,maximumEntries:OWNERS+SUBTREES+LARGE_SUBTREES,owners:{entries:ownerEntries,maximumEntries:OWNERS,hits:ownerHits},subtrees:{entries:subtreeEntries+largeEntries,maximumEntries:SUBTREES+LARGE_SUBTREES,small:{entries:subtreeEntries,maximumEntries:SUBTREES,hits:smallHits},large:{entries:largeEntries,maximumEntries:LARGE_SUBTREES,hits:largeHits,minimumCells:LARGE_CELLS}},hits:subtreeHits,misses:subtreeMisses,captures:subtreeCaptures,rotations:subtreeRotations,budgetRefusals:subtreeBudgetRefusals}};}


// Fixed syntax-substrate composition only. Fresh wrappers are never retained;
// every call first checks the entire logical graph without invoking user code.
// Existing immutable eligibility/cost records and byte limits are shared with
// the original byte helper. A stored substring grants no source/owner fact.
// Boxed primitives keep native internal unboxing even after prototype changes.
// An unavailable/changed optional native predicate disables composition only;
// the existing byte-cache API and complete native fallback remain available.
const compositionTypes=qualified?types:null;
const compositionBoxedField=qualified&&!isProxy(compositionTypes)?descriptor(compositionTypes,'isBoxedPrimitive'):null;
const compositionBoxedNative=!!(compositionBoxedField&&own(compositionBoxedField,'value')&&native(compositionBoxedField.value,'isBoxedPrimitive')&&prototype(compositionBoxedField.value)===functionPrototype);
function compositionIntrinsics(){
 if(!intrinsics()||!compositionBoxedNative||types!==compositionTypes)return false;
 const field=descriptor(compositionTypes,'isBoxedPrimitive');return !!field&&own(field,'value')&&field.value===compositionBoxedField.value&&field.writable===compositionBoxedField.writable&&field.enumerable===compositionBoxedField.enumerable&&field.configurable===compositionBoxedField.configurable&&prototype(field.value)===functionPrototype;
}
const compositionReceiver=qualified?JSON:null;
const compositionStringify=qualified?descriptor(compositionReceiver,'stringify').value:null;
// One existing bounded byte-store instance serves both proof consumers.
// Separate per-factory stores would duplicate shared chunks and evict them.
const encodeSyntaxSubstrate=createPrivateFrozenJsonCache();
const COMPOSITION_UNITS=8388608;
function syntaxSubstrateKey(key){return key==='recipes'||key==='compilerMeta'||key==='schemas'||key==='positiveSchemas'||key==='parserFieldSpans'||key==='descriptor'||key==='method'||key==='entry'||key==='callbackRecipes'||key==='positiveSchema'||key==='constructionSink'||key==='descriptors';}
function existingSyntaxCost(value){const record=apply(weakGet,owners,[value])||apply(weakGet,largeSubtrees,[value])||apply(weakGet,subtrees,[value]);return record&&(record&1)===1?record:null;}
function immutableCost(value){const saved=existingSyntaxCost(value);if(saved)return saved;if(!immutableJson(value,true))return null;return existingSyntaxCost(value);}
export function createPrivateFrozenJsonComposer(){
 return value=>{
  if(!compositionIntrinsics())return JSON.stringify(value);
  let cells=0;const active=new setConstructor();
  function inspect(value,depth,key,arraySubstrate=false){
   if(depth>DEPTH)return null;
   const kind=typeof value;
   if(value===null||kind==='string'||kind==='boolean'||kind==='number')return ++cells>CELLS||kind==='string'&&value.length>COMPOSITION_UNITS?null:{kind:0,value};
   // BigInt, symbols, undefined, functions and nonordinary prototypes keep the
   // complete native operation, including its omissions, hooks and errors.
   if(kind!=='object'||isProxy(value)||apply(compositionBoxedField.value,compositionTypes,[value]))return null;
   const substrate=arraySubstrate||syntaxSubstrateKey(key),saved=substrate?existingSyntaxCost(value):null;
   if(saved&&!isArray(value)){const cost=saved>>>1,savedCells=cost%(CELLS+1),savedHeight=(cost/(CELLS+1))|0;if(savedCells>CELLS-cells||savedHeight>DEPTH-depth)return null;cells+=savedCells;return {kind:1,value};}
   if(apply(setHas,active,[value]))return null;
   const array=isArray(value),parent=prototype(value);
   if(parent!==(array?arrayPrototype:objectPrototype)&&!(parent===null&&!array))return null;
   let arrayLength=null;if(array){const field=descriptor(value,'length');if(!field||!own(field,'value')||field.enumerable||field.value<0||field.value%1!==0||field.value>CELLS)return null;arrayLength=field.value;}
   const names=keys(value);if(names.length>CELLS+1)return null;
   // Native captured stacks can be lazy data descriptors on ordinary objects.
   // Reject their key before any descriptor could invoke a formatter.
   for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||names[at]==='toJSON'||names[at]==='rawJSON'||names[at].length>COMPOSITION_UNITS)return null;
   if(substrate&&!array&&apply(frozenField.value,Object,[value])){const cost=immutableCost(value);if(!cost)return null;const packed=cost>>>1,costCells=packed%(CELLS+1),costHeight=(packed/(CELLS+1))|0;if(costCells>CELLS-cells||costHeight>DEPTH-depth)return null;cells+=costCells;return {kind:1,value};}
   if(++cells>CELLS)return null;
   let length=names.length;
   if(array){if(names.length!==arrayLength+1||names[names.length-1]!=='length')return null;length=arrayLength;for(let at=0;at<length;at++)if(names[at]!==''+at)return null;}
   const fields=[];
   // Finish the whole own descriptor census before descending into children.
   for(let at=0;at<length;at++){const name=names[at],field=descriptor(value,name);if(!field||!own(field,'value')||!field.enumerable)return null;fields[at]={name,value:field.value};}
   apply(setAdd,active,[value]);const children=[];
   for(let at=0;at<fields.length;at++){const field=fields[at],child=inspect(field.value,depth+1,field.name,substrate&&array);if(!child){apply(setDelete,active,[value]);return null;}children[at]={name:field.name,child};}
   apply(setDelete,active,[value]);return {kind:array?2:3,children,substrate:array&&substrate&&apply(frozenField.value,Object,[value])?value:null};
  }
  let plan;try{plan=inspect(value,0,null);}catch{return JSON.stringify(value);}
  if(!plan)return JSON.stringify(value);
  // Choose byte granularity only after the WHOLE logical preflight succeeded.
  // These per-call work counters retain no size/owner facts and cannot admit
  // anything the original cell, depth, descriptor or output checks refused.
  let measureCells=CELLS,measureText=COMPOSITION_UNITS;
  const entryUnits=(ENTRY_BYTES-128)/2;
  function quotedUnits(value,limit){
   if(value.length+2>limit||value.length>measureText)return -1;measureText-=value.length;let units=2;
   for(let at=0;at<value.length;at++){
    const char=value[at];
    if(char==='"'||char==='\\')units+=2;
    else if(char<='\u001f')units+=char==='\b'||char==='\f'||char==='\n'||char==='\r'||char==='\t'?2:6;
    else if(char>='\ud800'&&char<='\udbff'){const low=at+1<value.length?value[at+1]:'';if(low>='\udc00'&&low<='\udfff'){units+=2;at++;}else units+=6;}
    else units+=char>='\udc00'&&char<='\udfff'?6:1;
    if(units>limit)return -1;
   }return units;
  }
  function scalarUnits(value,limit){
   if(typeof value==='string')return quotedUnits(value,limit);
   const units=value===undefined?4:apply(compositionStringify,compositionReceiver,[value]).length;return units<=limit?units:-1;
  }
  function frozenUnits(value,limit,depth){
   if(--measureCells<0||depth>DEPTH||limit<0)return -1;
   if(value===null||typeof value!=='object')return scalarUnits(value,limit);
   const array=isArray(value),names=keys(value);let length=names.length,units=2,count=0;
   if(array){const field=descriptor(value,'length');if(!field||!own(field,'value')||names.length!==field.value+1||names[names.length-1]!=='length')return -1;length=field.value;}
   // Keep the full key census before descriptors, even on already checked data.
   for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||names[at]==='toJSON'||names[at]==='rawJSON'||array&&at<length&&names[at]!==''+at)return -1;
   for(let at=0;at<length;at++){
    const name=names[at],field=descriptor(value,name);if(!field||!own(field,'value')||!field.enumerable)return -1;
    if(!array&&field.value===undefined)continue;
    if(count++)units++;if(!array){const quoted=quotedUnits(name,limit-units-1);if(quoted<0)return -1;units+=quoted+1;}
    const child=frozenUnits(field.value,limit-units,depth+1);if(child<0)return -1;units+=child;
   }return units<=limit?units:-1;
  }
  function planUnits(node,limit,depth){
   if(node.kind===1)return frozenUnits(node.value,limit,depth);
   if(--measureCells<0||depth>DEPTH||limit<0)return -1;
   if(node.kind===0)return scalarUnits(node.value,limit);
   let units=2;for(let at=0;at<node.children.length;at++){
    const row=node.children[at];if(at)units++;if(node.kind===3){const quoted=quotedUnits(row.name,limit-units-1);if(quoted<0)return -1;units+=quoted+1;}
    const child=planUnits(row.child,limit-units,depth+1);if(child<0)return -1;units+=child;
   }return units<=limit?units:-1;
  }
  function granularity(node,depth){
   if(node.kind<2)return node;
   if(node.substrate&&planUnits(node,entryUnits,depth)>=0)return {kind:1,value:node.substrate};
   for(let at=0;at<node.children.length;at++)node.children[at].child=granularity(node.children[at].child,depth+1);
   return node;
  }
  try{plan=granularity(plan,0);}catch{return JSON.stringify(value);}
  const pieces=[];let units=0,overflow=false;
  function append(text){units+=text.length;if(units>COMPOSITION_UNITS){overflow=true;return;}pieces[pieces.length]=text;}
  function emit(node){
   if(overflow)return;
   if(node.kind===0){append(apply(compositionStringify,compositionReceiver,[node.value]));return;}
   if(node.kind===1){append(encodeSyntaxSubstrate(node.value));return;}
   const array=node.kind===2;append(array?'[':'{');
   for(let at=0;at<node.children.length;at++){if(at)append(',');const row=node.children[at];if(!array){append(apply(compositionStringify,compositionReceiver,[row.name]));append(':');}emit(row.child);if(overflow)return;}
   append(array?']':'}');
  }
  emit(plan);return overflow?JSON.stringify(value):pieces.join('');
 };
}
