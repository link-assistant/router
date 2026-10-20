// Storage-only bytes for authenticated owners' immutable comparison operands.
// This helper grants no source/checker/namespace authority. Callers must perform
// their private owner join first; every ineligible case runs normal stringify.
import {types} from 'node:util';
import {originalBatchedNamespaceTraversalIntrinsicsUnchanged,originalBatchedDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalBatchedLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
const originalNamespaceTraversalIntrinsicsUnchanged=originalBatchedNamespaceTraversalIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged=originalBatchedDataFreezeIntrinsicsUnchanged,originalLexingIntrinsicsUnchanged=originalBatchedLexingIntrinsicsUnchanged;
import {completedDataTraversalExceedsBudget,completedDataJsonWithinBudget} from './private-data-freeze.mjs';
const enabled=originalNamespaceTraversalIntrinsicsUnchanged()&&originalLexingIntrinsicsUnchanged();
const descriptor=enabled?Object.getOwnPropertyDescriptor:null,prototype=enabled?Object.getPrototypeOf:null,own=enabled?Object.hasOwn:null,keys=enabled?Reflect.ownKeys:null,apply=enabled?Reflect.apply:null,isProxy=enabled?types.isProxy:null,isArray=enabled?Array.isArray:null;
// The existing fresh namespace guard also pins this native own-enumeration.
const enumerableKeys=enabled?Object.keys:null;
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
 let depth=0,parent=null,stack=null,cells=CELLS;const active=new setConstructor();
 const charge=(parent,count,height)=>{if(parent){parent.cells+=count;if(height+1>parent.height)parent.height=height+1;}};
 while(true){
  if(--cells<0||depth>DEPTH)return false;
  if(value===null||value===undefined||typeof value==='string'||typeof value==='number'||typeof value==='boolean')charge(parent,1,0);
  else{
   if(typeof value!=='object'||isProxy(value)||apply(setHas,active,[value]))return false;
   if(noStack&&apply(compositionBoxedField.value,compositionTypes,[value]))return false;
   const owner=apply(weakGet,owners,[value]),large=owner?null:apply(weakGet,largeSubtrees,[value]),saved=owner||large||apply(weakGet,subtrees,[value]);
   if(saved&&(!noStack||(saved&1)===1)){const cost=saved>>>1,savedCells=cost%(CELLS+1),savedHeight=(cost/(CELLS+1))|0;if(savedCells-1>cells||savedHeight>DEPTH-depth){if(subtreeBudgetRefusals<9007199254740991)subtreeBudgetRefusals++;return false;}cells-=savedCells-1;charge(parent,savedCells,savedHeight);if(subtreeHits<9007199254740991)subtreeHits++;if(owner){if(ownerHits<9007199254740991)ownerHits++;}else if(large){if(largeHits<9007199254740991)largeHits++;}else if(smallHits<9007199254740991)smallHits++;}
   else{
    if(subtreeMisses<9007199254740991)subtreeMisses++;
    let earlyNames=null;
    if(noStack){const parent=prototype(value),array=isArray(value);if(parent!==objectPrototype&&parent!==null&&!(array&&parent===arrayPrototype))return false;if(array){const length=descriptor(value,'length');if(!length||!own(length,'value')||length.value>CELLS)return false;}earlyNames=keys(value);for(let at=0;at<earlyNames.length;at++)if(earlyNames[at]==='stack')return false;}
    if(!apply(frozenField.value,Object,[value]))return false;
    const proto=prototype(value),array=isArray(value);if(proto!==objectPrototype&&proto!==null&&!(array&&proto===arrayPrototype))return false;
    const names=earlyNames??keys(value);if(own(value,'toJSON'))return false;
    if(array){const field=descriptor(value,'length');if(!field||!own(field,'value'))return false;const length=field.value;if(length<0||length>cells||names.length!==length+1)return false;for(let at=0;at<length;at++)if(!own(value,at))return false;}
    const total={cells:1,height:0};let length=0;
    // Native ownKeys returns a fresh private dense array. Replace only existing
    // own writable slots, after reading each original key. No slot is added,
    // no inherited numeric setter runs, and every descriptor precedes descent.
    for(let at=0;at<names.length;at++){const key=names[at];if(typeof key!=='string')return false;const field=descriptor(value,key);if(!field||!own(field,'value')||!field.enumerable&&!(array&&key==='length'))return false;if(!(array&&key==='length'))names[length++]=field.value;}
    apply(setAdd,active,[value]);stack={value,depth,parent,total,children:names,length,at:0,next:stack};
   }
  }
  // Only object continuations remain pending; scalar and saved-cost children
  // use locals. Keep the same postorder weak records and partial warming.
  let pending=false;
  while(stack){
   const frame=stack;
   if(frame.at<frame.length){value=frame.children[frame.at++];depth=frame.depth+1;parent=frame.total;pending=true;break;}
   stack=frame.next;
   apply(setDelete,active,[frame.value]);
   const record=(frame.total.height*(CELLS+1)+frame.total.cells)*2+(noStack?1:0);
   if(frame.parent===null){
    if(ownerEntries>=OWNERS){owners=new weakConstructor();ownerEntries=0;if(subtreeRotations<9007199254740991)subtreeRotations++;}
    apply(weakSet,owners,[frame.value,record]);ownerEntries++;
   }else if(frame.total.cells>=LARGE_CELLS){
    if(largeEntries>=LARGE_SUBTREES){largeSubtrees=new weakConstructor();largeEntries=0;if(subtreeRotations<9007199254740991)subtreeRotations++;}
    apply(weakSet,largeSubtrees,[frame.value,record]);largeEntries++;
   }else{
    if(subtreeEntries>=SUBTREES){subtrees=new weakConstructor();subtreeEntries=0;if(subtreeRotations<9007199254740991)subtreeRotations++;}
    apply(weakSet,subtrees,[frame.value,record]);subtreeEntries++;
   }
   if(subtreeCaptures<9007199254740991)subtreeCaptures++;
   charge(frame.parent,frame.total.cells,frame.total.height);
  }
  if(!pending)return true;
 }
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
// Primitive property lookup uses the realm intrinsic String prototype, not
// the mutable global String binding. These private native captures never escape.
const shortQuotationStringPrototype=qualified?prototype(''):null;
const shortQuotationChar=qualified?descriptor(shortQuotationStringPrototype,'charCodeAt'):null;
const shortQuotationNative=!!(qualified&&shortQuotationChar&&own(shortQuotationChar,'value')&&native(shortQuotationChar.value,'charCodeAt'));
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
   if(saved&&!isArray(value)){const cost=saved>>>1,savedCells=cost%(CELLS+1),savedHeight=(cost/(CELLS+1))|0;if(savedCells>CELLS-cells||savedHeight>DEPTH-depth)return null;cells+=savedCells;return {kind:1,value,measurement:null};}
   if(apply(setHas,active,[value]))return null;
   const array=isArray(value),parent=prototype(value);
   if(parent!==(array?arrayPrototype:objectPrototype)&&!(parent===null&&!array))return null;
   let arrayLength=null;if(array){const field=descriptor(value,'length');if(!field||!own(field,'value')||field.enumerable||field.value<0||field.value%1!==0||field.value>CELLS)return null;arrayLength=field.value;}
   const names=keys(value);if(names.length>CELLS+1)return null;
   // Native captured stacks can be lazy data descriptors on ordinary objects.
   // Reject their key before any descriptor could invoke a formatter.
   for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||names[at]==='toJSON'||names[at]==='rawJSON'||names[at].length>COMPOSITION_UNITS)return null;
   if(substrate&&!array&&apply(frozenField.value,Object,[value])){const cost=immutableCost(value);if(!cost)return null;const packed=cost>>>1,costCells=packed%(CELLS+1),costHeight=(packed/(CELLS+1))|0;if(costCells>CELLS-cells||costHeight>DEPTH-depth)return null;cells+=costCells;return {kind:1,value,measurement:null};}
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
  let measureCells=CELLS,measureText=COMPOSITION_UNITS,measurementRecords=0;
  const entryUnits=(ENTRY_BYTES-128)/2;
  // Successful primitive sizes live only through this one completed plan.
  const quotedSizes=new Map();let quotedEntries=0,quotedKeyUnits=0;
  const sharedMeasurements=new weakConstructor();let sharedMeasurementRecords=0,measurementDeepest=0;
  function quotedUnits(value,limit){
   if(value.length+2>limit||value.length>measureText)return -1;measureText-=value.length;let units=2;
   const saved=apply(mapGet,quotedSizes,[value]);if(saved!==undefined&&saved<=limit)return saved;
   if(typeof value==='string'&&value.length>256&&value.length<=65536){
    const nativeUnits=apply(compositionStringify,compositionReceiver,[value]).length;
    return nativeUnits<=limit?nativeUnits:-1;
   }
   let nativeShort=false;
   if(shortQuotationNative&&typeof value==='string'&&value.length>0&&value.length<=256&&typeof limit==='number'&&limit>=0&&limit<=COMPOSITION_UNITS){
    // Recheck the actual primitive owner after all earlier observed work.
    // Native stringify of a primitive has no toJSON/property callbacks and
    // at most 256*6+2 temporary UTF16 units; retain the old warming tail.
    const field=descriptor(shortQuotationStringPrototype,'charCodeAt');
    nativeShort=!!(field&&own(field,'value')&&field.value===shortQuotationChar.value&&field.writable===shortQuotationChar.writable&&field.enumerable===shortQuotationChar.enumerable&&field.configurable===shortQuotationChar.configurable);
   }
   if(nativeShort){units=apply(compositionStringify,compositionReceiver,[value]).length;if(units>limit)return -1;}
   else for(let at=0;at<value.length;at++){
    // charCodeAt is already pinned by the fresh lexical intrinsic guard.
    const code=value.charCodeAt(at);
    if(code===34||code===92)units+=2;
    else if(code<32)units+=code===8||code===12||code===10||code===13||code===9?2:6;
    else if(code>=55296&&code<=56319){const low=at+1<value.length?value.charCodeAt(at+1):-1;if(low>=56320&&low<=57343){units+=2;at++;}else units+=6;}
    else units+=code>=56320&&code<=57343?6:1;
    if(units>limit)return -1;
   }
   if(saved===undefined&&value.length<=256&&quotedEntries<1024&&quotedKeyUnits+value.length<=65536){apply(mapSet,quotedSizes,[value,units]);quotedEntries++;quotedKeyUnits+=value.length;}
   return units;
  }
  function scalarUnits(value,limit){
   if(typeof value==='string')return quotedUnits(value,limit);
   const units=value===undefined?4:apply(compositionStringify,compositionReceiver,[value]).length;return units<=limit?units:-1;
  }
  function frozenUnits(value,limit,depth,descendant=false){
   let descendantMeasurement=null;
   if(descendant&&value!==null&&typeof value==='object'){const saved=apply(weakGet,sharedMeasurements,[value]);descendantMeasurement=saved;if(saved&&depth+saved.height<=DEPTH&&saved.units<=limit&&saved.cells<=measureCells&&saved.text<=measureText){measurementDeepest=depth+saved.height;measureCells-=saved.cells;measureText-=saved.text;return saved.units;}}
   if(--measureCells<0||depth>DEPTH||limit<0)return -1;
   if(value===null||typeof value!=='object'){measurementDeepest=depth;return scalarUnits(value,limit);}
   // The invocation-local scalar returns each successful child's absolute
   // peak. Parents retain their own maximum; failed debits stay unchanged.
   const cellsBefore=measureCells+1,textBefore=measureText;let height=0;
   // Private immutable/noStack eligibility already proved every own field
   // enumerable, except the dense array's immutable own data length. This
   // native enumeration still covers the complete logical key domain.
   const array=isArray(value),names=enumerableKeys(value);let length=names.length,units=2,count=0;
   if(array){length=value.length;if(names.length!==length)return -1;}
   for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]==='stack'||names[at]==='toJSON'||names[at]==='rawJSON'||array&&at<length&&names[at]!==''+at)return -1;
   for(let at=0;at<length;at++){
    const name=names[at],childValue=value[name];
    if(!array&&childValue===undefined)continue;
    if(count++)units++;if(!array){const quoted=quotedUnits(name,limit-units-1);if(quoted<0)return -1;units+=quoted+1;}
    const child=frozenUnits(childValue,limit-units,depth+1,true);if(child<0)return -1;units+=child;
    const childHeight=measurementDeepest-depth;if(childHeight>height)height=childHeight;
   }
   if(!(units<=limit))return -1;
   if(descendant&&!descendantMeasurement&&sharedMeasurementRecords<1024&&cellsBefore-measureCells>=64){apply(weakSet,sharedMeasurements,[value,{depth,units,cells:cellsBefore-measureCells,text:textBefore-measureText,height}]);sharedMeasurementRecords++;}
   measurementDeepest=depth+height;return units;
  }
  // Successful measurements belong only to these fresh private plan nodes.
  // Equal depth and exact logical charges preserve every old partial failure.
  function measuredFrozenUnits(node,limit,depth){
   const prior=node.measurement;
   if(prior&&prior.depth===depth&&prior.units<=limit&&prior.cells<=measureCells&&prior.text<=measureText){measureCells-=prior.cells;measureText-=prior.text;return prior.units;}
   const cellsBefore=measureCells,textBefore=measureText,shared=apply(weakGet,sharedMeasurements,[node.value]);let units;
   if(shared&&shared.depth===depth&&shared.units<=limit&&shared.cells<=measureCells&&shared.text<=measureText){measureCells-=shared.cells;measureText-=shared.text;units=shared.units;}
   else{measurementDeepest=depth;units=frozenUnits(node.value,limit,depth);}
   if(units>=0&&measurementRecords<1024&&cellsBefore-measureCells>=64){node.measurement={depth,units,cells:cellsBefore-measureCells,text:textBefore-measureText};measurementRecords++;}
   if(!shared&&units>=0&&sharedMeasurementRecords<1024&&cellsBefore-measureCells>=64){apply(weakSet,sharedMeasurements,[node.value,{depth,units,cells:cellsBefore-measureCells,text:textBefore-measureText,height:measurementDeepest-depth}]);sharedMeasurementRecords++;}
   return units;
  }
  function planUnits(node,limit,depth){
   if(node.kind===1)return measuredFrozenUnits(node,limit,depth);
   if(--measureCells<0||depth>DEPTH||limit<0)return -1;
   if(node.kind===0)return scalarUnits(node.value,limit);
   let units=2;for(let at=0;at<node.children.length;at++){
    const row=node.children[at];if(at)units++;if(node.kind===3){const quoted=quotedUnits(row.name,limit-units-1);if(quoted<0)return -1;units+=quoted+1;}
    const child=planUnits(row.child,limit-units,depth+1);if(child<0)return -1;units+=child;
   }return units<=limit?units:-1;
  }
  function granularity(node,depth){
   if(node.kind<2)return node;
   if(node.substrate&&planUnits(node,entryUnits,depth)>=0)return {kind:1,value:node.substrate,measurement:null};
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

// Optional JSON equality only, never source/proof authority. A true result
// avoids comparison serialization; its byte-cache warming/counters therefore
// reflect less actual work. Diagnostic counter observers are not an equivalence
// contract. Every difference or uncertainty retains the complete old fallback.
// No hash calls, eligibility issuance, new cache or across-call state occur.
export function privateFrozenJsonEqualHint(left,right){
 if(!compositionIntrinsics()||!originalDataFreezeIntrinsicsUnchanged())return null;
 let leftCells=CELLS,rightCells=CELLS,fieldCells=CELLS;
 function equal(a,b,depth){
  if(depth>DEPTH)return false;
  const ak=typeof a,bk=typeof b;
  if(a===null||b===null||ak!=='object'||bk!=='object'){
   if(--leftCells<0||--rightCells<0)return false;
   if(a===null||b===null)return a===null&&b===null;
   if(ak!==bk)return false;
   if(ak==='string'||ak==='boolean')return a===b;
   return ak==='number'&&a===b&&a===a&&a!==1/0&&a!==-1/0;
  }
  if(isProxy(a)||isProxy(b)||apply(compositionBoxedField.value,compositionTypes,[a])||apply(compositionBoxedField.value,compositionTypes,[b]))return false;
  if(a===b){
   // No immutableCost call: a miss issues NO eligibility records or counters.
   const saved=existingSyntaxCost(a);
   if(saved){
    const packed=saved>>>1,cells=packed%(CELLS+1),height=(packed/(CELLS+1))|0;
    if(cells>leftCells||cells>rightCells||height>DEPTH-depth)return false;
    leftCells-=cells;rightCells-=cells;return true;
   }
  }
  if(--leftCells<0||--rightCells<0)return false;
  const array=isArray(a),parent=prototype(a);
  if(array!==isArray(b)||parent!==prototype(b)||parent!==(array?arrayPrototype:objectPrototype)&&!(parent===null&&!array))return false;
  const an=keys(a),bn=keys(b);
  if(an.length!==bn.length||an.length>CELLS+1)return false;
  // Both complete key censuses precede ANY descriptor, including length or
  // native freeze checks that could encounter a captured lazy stack cell.
  for(let at=0;at<an.length;at++){
   const name=an[at];if(name!==bn[at]||typeof name!=='string'||name==='stack'||name==='toJSON'||name==='rawJSON')return false;
  }
  if(!apply(frozenField.value,Object,[a])||!apply(frozenField.value,Object,[b]))return false;
  let count=an.length;
  if(array){
   const al=descriptor(a,'length'),bl=descriptor(b,'length');
   if(!al||!bl||!own(al,'value')||!own(bl,'value')||al.enumerable||bl.enumerable||al.value!==bl.value||an.length!==al.value+1||an[an.length-1]!=='length')return false;
   count=al.value;for(let at=0;at<count;at++)if(an[at]!==''+at)return false;
  }
  // Bound all temporary continuations independently of logical subtree costs.
  if(count>fieldCells)return false;fieldCells-=count;
  // Own literal fields and a linked continuation avoid numeric array writes.
  // All descriptors are validated before visiting any child pair.
  let first=null,last=null;
  for(let at=0;at<count;at++){
   const af=descriptor(a,an[at]),bf=descriptor(b,bn[at]);
   if(!af||!bf||!own(af,'value')||!own(bf,'value')||!af.enumerable||!bf.enumerable)return false;
   const child={left:af.value,right:bf.value,next:null};if(last)last.next=child;else first=child;last=child;
  }
  for(let child=first;child;child=child.next)if(!equal(child.left,child.right,depth+1))return false;
  return true;
 }
 try{if(!equal(left,right,0))return null;}catch{return null;}
 return compositionIntrinsics()&&originalDataFreezeIntrinsicsUnchanged()?true:null;
}

// Optional JSON equality only; source, owner and body checks remain mandatory.
// Reuse existing bounded immutable scalar costs for the original operand.
// Public array carriers may be mutable: their complete own fields are checked
// afresh and must alias that original's deeply immutable cells. No public
// carrier eligibility, byte result, source or compiler verdict is cached.
export function privateFrozenJsonOwnFieldsAliasHint(left,right,names){
 if(!compositionIntrinsics()||!originalDataFreezeIntrinsicsUnchanged()||left===null||right===null||typeof left!=='object'||typeof right!=='object'||isProxy(left)||isProxy(right)||!isArray(names)||isProxy(names))return null;
 const length=descriptor(names,'length');
 if(!length||!own(length,'value')||length.value>64)return null;
 try{
  for(let at=0;at<length.value;at++){
   const name=descriptor(names,''+at);if(!name||!own(name,'value')||typeof name.value!=='string')return null;
   const field=descriptor(left,name.value);if(!field)continue;
   const actual=descriptor(right,name.value);
   if(!own(field,'value')||!actual||!own(actual,'value')||actual.value===null||typeof actual.value!=='object'||!immutableCost(actual.value))return null;
   if(field.value!==actual.value&&!sameImmutableArrayCells(field.value,actual.value))return null;
  }
 }catch{return null;}
 return compositionIntrinsics()&&originalDataFreezeIntrinsicsUnchanged()?true:null;
}

// The right side has just passed the existing immutable/no-stack planner.
// Both complete own-key/descriptor censuses stay fresh on the public side.
function sameImmutableArrayCells(left,right){
 if(!isArray(left)||isProxy(left)||prototype(left)!==arrayPrototype||!isArray(right))return false;
 const a=descriptor(left,'length'),b=descriptor(right,'length');
 if(!a||!own(a,'value')||a.value>CELLS||a.value!==b.value)return false;
 const names=keys(left);if(names.length!==a.value+1||names[a.value]!=='length')return false;
 for(let at=0;at<a.value;at++){
  if(names[at]!==''+at)return false;
  const field=descriptor(left,names[at]),actual=descriptor(right,names[at]);
  if(!field||!own(field,'value')||!field.enumerable||field.value!==actual.value)return false;
 }
 return true;
}
