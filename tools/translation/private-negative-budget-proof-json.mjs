// Generated from complete actual native census; prepare-negative-budget-proof-json.mjs owns this file.
// Explicit stateless proof-DATA serialization; never source/owner authority.
// The legacy composer and its caches, counters and defaults remain unchanged.
import {types} from 'node:util';
import {createPrivateFrozenJsonComposer} from './private-frozen-json.mjs';
import {originalBatchedNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalBatchedLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';

// This NEW internal format uses fixed ordinary intrinsic owners. It neither
// reflects on the mutable globalThis binding nor assumes Bun's global is plain.
// Bootstrap remains conservative; no captured owner or native function escapes.
const initiallyNative=originalBatchedNamespaceTraversalIntrinsicsUnchanged()&&originalBatchedLexingIntrinsicsUnchanged();
const get=initiallyNative?Object.getOwnPropertyDescriptor:null,has=initiallyNative?Object.hasOwn:null,ownKeys=initiallyNative?Reflect.ownKeys:null,apply=initiallyNative?Reflect.apply:null,parent=initiallyNative?Object.getPrototypeOf:null;
const objectOwner=initiallyNative?Object:null,arrayOwner=initiallyNative?Array:null,jsonOwner=initiallyNative?JSON:null,bufferOwner=initiallyNative?ArrayBuffer:null,setOwner=initiallyNative?Set:null,weakOwner=initiallyNative?WeakMap:null,mapOwner=initiallyNative?Map:null,typeOwner=initiallyNative?types:null;
const isProxy=initiallyNative?types.isProxy:null,isArray=initiallyNative?Array.isArray:null;
const ownersOrdinary=!!(initiallyNative&&objectOwner&&arrayOwner&&jsonOwner&&bufferOwner&&setOwner&&weakOwner&&mapOwner&&typeOwner&&!isProxy(mapOwner)&&!isProxy(weakOwner)&&!isProxy(typeOwner)&&!isProxy(objectOwner)&&!isProxy(arrayOwner)&&!isProxy(jsonOwner)&&!isProxy(bufferOwner)&&!isProxy(setOwner));
const data=field=>field&&has(field,'value')?field.value:undefined;
const objectPrototypeField=ownersOrdinary?get(objectOwner,'prototype'):null,arrayPrototypeField=ownersOrdinary?get(arrayOwner,'prototype'):null,setPrototypeField=ownersOrdinary?get(setOwner,'prototype'):null;
const objectPrototype=data(objectPrototypeField),arrayPrototype=data(arrayPrototypeField),setPrototype=data(setPrototypeField),functionPrototype=ownersOrdinary?parent(function(){}):null;
const textField=ownersOrdinary?get(functionPrototype,'toString'):null,boxedField=ownersOrdinary?get(typeOwner,'isBoxedPrimitive'):null,isViewField=ownersOrdinary?get(bufferOwner,'isView'):null;
const stringifyField=ownersOrdinary?get(jsonOwner,'stringify'):null,isArrayField=ownersOrdinary?get(arrayOwner,'isArray'):null,proxyField=ownersOrdinary?get(typeOwner,'isProxy'):null;
const native=(field,name)=>!!(field&&has(field,'value')&&typeof field.value==='function'&&!isProxy(field.value)&&parent(field.value)===functionPrototype&&apply(textField.value,field.value,[])===`function ${name}() { [native code] }`);
const weakPrototypeField=ownersOrdinary?get(weakOwner,'prototype'):null,weakPrototype=data(weakPrototypeField),stringPrototype=ownersOrdinary?parent(''):null,regexpPrototype=ownersOrdinary?parent(/(?:)/):null;
const weakGetField=weakPrototype&&!isProxy(weakPrototype)?get(weakPrototype,'get'):null,weakSetField=weakPrototype&&!isProxy(weakPrototype)?get(weakPrototype,'set'):null,charCodeField=stringPrototype&&!isProxy(stringPrototype)?get(stringPrototype,'charCodeAt'):null;
const mapPrototypeField=ownersOrdinary?get(mapOwner,'prototype'):null,mapPrototype=data(mapPrototypeField);
const mapGetField=mapPrototype&&!isProxy(mapPrototype)?get(mapPrototype,'get'):null,mapSetField=mapPrototype&&!isProxy(mapPrototype)?get(mapPrototype,'set'):null;
const execField=regexpPrototype&&!isProxy(regexpPrototype)?get(regexpPrototype,'exec'):null;
const setHasField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'has'):null,setAddField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'add'):null,setDeleteField=setPrototype&&!isProxy(setPrototype)?get(setPrototype,'delete'):null;
const qualified=!!(ownersOrdinary&&objectPrototype&&arrayPrototype&&setPrototype&&!isProxy(objectPrototype)&&!isProxy(arrayPrototype)&&!isProxy(setPrototype)&&textField&&has(textField,'value')&&native({value:get},'getOwnPropertyDescriptor')&&native({value:has},'hasOwn')&&native({value:ownKeys},'ownKeys')&&native({value:apply},'apply')&&native({value:parent},'getPrototypeOf')&&native({value:setOwner},'Set')&&native(boxedField,'isBoxedPrimitive')&&native(isViewField,'isView')&&native(stringifyField,'stringify')&&native(isArrayField,'isArray')&&native(proxyField,'isProxy')&&native(setHasField,'has')&&native(setAddField,'add')&&native(setDeleteField,'delete')&&native({value:weakOwner},'WeakMap')&&native(weakGetField,'get')&&native(weakSetField,'set')&&native(charCodeField,'charCodeAt')&&native(execField,'exec')&&native({value:mapOwner},'Map')&&native(mapGetField,'get')&&native(mapSetField,'set'));
const setHas=data(setHasField),setAdd=data(setAddField),setDelete=data(setDeleteField),weakGet=data(weakGetField),weakSet=data(weakSetField),charCode=data(charCodeField),exec=data(execField),mapGet=data(mapGetField),mapSet=data(mapSetField);
const CELLS=200000,DEPTH=160,UNITS=8388608;
function sameField(actual,expected){return !!(actual&&expected&&has(actual,'value')&&has(expected,'value')&&actual.value===expected.value&&actual.writable===expected.writable&&actual.enumerable===expected.enumerable&&actual.configurable===expected.configurable);}
function nativeReady(){
 // Identity inspection of the live util import precedes all owner reflection.
 // All reflected receivers below are fixed ordinary captured native owners.
 if(!qualified||types!==typeOwner)return false;
 if(!sameField(get(typeOwner,'isProxy'),proxyField)||!sameField(get(typeOwner,'isBoxedPrimitive'),boxedField)||!sameField(get(bufferOwner,'isView'),isViewField)||!sameField(get(jsonOwner,'stringify'),stringifyField)||!sameField(get(arrayOwner,'isArray'),isArrayField))return false;
 if(!sameField(get(objectOwner,'prototype'),objectPrototypeField)||!sameField(get(arrayOwner,'prototype'),arrayPrototypeField)||!sameField(get(setOwner,'prototype'),setPrototypeField))return false;
 if(!sameField(get(mapOwner,'prototype'),mapPrototypeField)||!sameField(get(mapPrototype,'get'),mapGetField)||!sameField(get(mapPrototype,'set'),mapSetField))return false;
 if(parent(objectPrototype)!==null||parent(arrayPrototype)!==objectPrototype||get(objectPrototype,'toJSON')||get(arrayPrototype,'toJSON'))return false;
 if(!sameField(get(weakOwner,'prototype'),weakPrototypeField)||!sameField(get(weakPrototype,'get'),weakGetField)||!sameField(get(weakPrototype,'set'),weakSetField)||!sameField(get(stringPrototype,'charCodeAt'),charCodeField)||parent(regexpPrototype)!==objectPrototype||!sameField(get(regexpPrototype,'exec'),execField))return false;
 return sameField(get(setPrototype,'has'),setHasField)&&sameField(get(setPrototype,'add'),setAddField)&&sameField(get(setPrototype,'delete'),setDeleteField);
}
const scopedFrozenField=qualified?get(objectOwner,'isFrozen'):null;
const scopedFrozenQualified=!!(qualified&&native(scopedFrozenField,'isFrozen'));
function withinNegativeBudget(value,scope,witness){
 let scopeCells=0,scopeUnits=0,scopeResultHeight=0,scopeResultReusable=true;
 const scopeShared=scope.memo??(scope.memo=new weakOwner());
 const scopeNativeDescriptorData=parent(objectPrototypeField)===objectPrototype&&!get(objectPrototype,'writable');
 // Private dense native-call argument storage; both arrays have existing own
 // writable slots. Only slot values reach qualified natives, never the arrays.
 const scopeUnaryArgs=[null],scopeBinaryArgs=[null,null];
 // Fresh scalar measurements only; neither this map nor a record escapes the
 // callback-free scan. Logical occurrence costs are always charged again.
 const scopeCosts=new weakOwner(),scopeUnitBase=UNITS+1,scopeHeightBase=DEPTH+1;
 // Exact short-string costs only, bounded and discarded with this scan. Every
 // occurrence still pays its complete cost; no input/source verdict is stored.
 const scopeQuotedCosts=new mapOwner();let scopeQuotedEntries=0;
 const scopeCharge=count=>{if(count>UNITS-scopeUnits)return false;scopeUnits+=count;return true;};
 function scopeQuoted(value){
  if(value.length>UNITS-scopeUnits-2)return false;
  const short=value.length<=128;
  if(short){const known=(scopeUnaryArgs[0]=value,apply(mapGet,scopeQuotedCosts,scopeUnaryArgs));if(known!==undefined)return scopeCharge(known);}
  // Native exec scans ordinary spans without a JS call per source unit.
  // Each fresh literal owns lastIndex; no regex or match array can escape.
  const scopeSpecial=/["\\\u0000-\u001f\ud800-\udfff]/g;let count=value.length+2,match;
  while((match=(scopeUnaryArgs[0]=value,apply(exec,scopeSpecial,scopeUnaryArgs)))!==null){
   const at=match.index,code=(scopeUnaryArgs[0]=at,apply(charCode,value,scopeUnaryArgs));
   if(code===34||code===92||code===8||code===9||code===10||code===12||code===13)count++;
   else if(code<32)count+=5;
   else if(code>=55296&&code<=56319){
    const next=at+1<value.length?(scopeUnaryArgs[0]=at+1,apply(charCode,value,scopeUnaryArgs)):-1;
    if(next>=56320&&next<=57343)scopeSpecial.lastIndex=at+2;else count+=5;
   }else count+=5;
   if(count>UNITS-scopeUnits)return false;
  }
  if(!scopeCharge(count))return false;
  if(short&&scopeQuotedEntries<4096){(scopeBinaryArgs[0]=value,scopeBinaryArgs[1]=count,apply(mapSet,scopeQuotedCosts,scopeBinaryArgs));scopeQuotedEntries++;}
  return true;
 }
 function scopeVisit(value,depth){
  scopeResultHeight=0;scopeResultReusable=true;
  if(++scopeCells>CELLS||depth>DEPTH){witness.failed=true;return false;}
  if(value===null)return scopeCharge(4);
  const kind=typeof value;
  if(kind==='string')return scopeQuoted(value);
  if(kind==='boolean')return scopeCharge(5);
  // Undefined object properties/dense-array slots remain conservatively
  // charged, and root undefined still selects the original composer.
  if(kind==='undefined')return depth>0&&scopeCharge(4);
  if(kind==='number')return scopeCharge(32);
  if(kind!=='object'||isProxy(value)||(scopeUnaryArgs[0]=value,apply(boxedField.value,typeOwner,scopeUnaryArgs))||(scopeUnaryArgs[0]=value,apply(isViewField.value,bufferOwner,scopeUnaryArgs)))return false;
  let known=(scopeUnaryArgs[0]=value,apply(weakGet,scopeCosts,scopeUnaryArgs));
  if(known===0)return false;
  if(known===undefined){const reusable=(scopeUnaryArgs[0]=value,apply(weakGet,scopeShared,scopeUnaryArgs));if(reusable!==undefined)known=2*reusable+1;}
  if(known!==undefined){
   const reusable=known%2,cost=(known-reusable)/2,packed=cost-1,height=packed%scopeHeightBase,quotient=(packed-height)/scopeHeightBase,knownUnits=quotient%scopeUnitBase,knownCells=(quotient-knownUnits)/scopeUnitBase;
   if(knownCells-1>CELLS-scopeCells||height>DEPTH-depth){witness.failed=true;return false;}
   if(knownUnits>UNITS-scopeUnits)return false;
   scopeCells+=knownCells-1;scopeUnits+=knownUnits;scopeResultHeight=height;scopeResultReusable=reusable===1;return true;
  }
  const cellsBefore=scopeCells-1,unitsBefore=scopeUnits;
  const array=isArray(value),owner=parent(value);
  if(owner!==(array?arrayPrototype:objectPrototype)&&!(owner===null&&!array))return false;
  const scopeNames=ownKeys(value);if(scopeNames.length>CELLS+1)return false;
  // A native lazy stack must be rejected before ANY descriptor materializes it.
  for(let at=0;at<scopeNames.length;at++)if(typeof scopeNames[at]!=='string'||scopeNames[at]==='stack'||scopeNames[at]==='toJSON'||scopeNames[at]==='rawJSON')return false;
  let length=scopeNames.length,reusable=true;
  if(array){const field=get(value,'length');if(!field||(scopeNativeDescriptorData?field.writable===undefined:!has(field,'value'))||field.enumerable||field.value<0||field.value%1||field.value>CELLS||scopeNames.length!==field.value+1||scopeNames[scopeNames.length-1]!=='length')return false;if(field.writable||field.configurable)reusable=false;length=field.value;for(let at=0;at<length;at++)if(scopeNames[at]!==''+at)return false;}
  if(!scopeCharge(2+(length?length-1:0)))return false;
  // Every descriptor precedes descent. Captured native ownKeys supplies a
  // fresh private array whose existing own slots can safely hold child values.
  for(let at=0;at<length;at++){
   const name=scopeNames[at],field=get(value,name);
   if(!field||(scopeNativeDescriptorData?field.writable===undefined:!has(field,'value'))||!field.enumerable||!array&&(!scopeQuoted(name)||!scopeCharge(1)))return false;
   if(field.writable||field.configurable)reusable=false;
   scopeNames[at]=field.value;
  }
  (scopeBinaryArgs[0]=value,scopeBinaryArgs[1]=0,apply(weakSet,scopeCosts,scopeBinaryArgs));let height=0;
  for(let at=0;at<length;at++){
   if(!scopeVisit(scopeNames[at],depth+1))return false;
   if(!scopeResultReusable)reusable=false;
   if(scopeResultHeight+1>height)height=scopeResultHeight+1;
  }
  if(reusable)reusable=(scopeUnaryArgs[0]=value,apply(scopedFrozenField.value,objectOwner,scopeUnaryArgs));
  const cost=((scopeCells-cellsBefore)*scopeUnitBase+(scopeUnits-unitsBefore))*scopeHeightBase+height+1;
  (scopeBinaryArgs[0]=value,scopeBinaryArgs[1]=2*cost+(reusable?1:0),apply(weakSet,scopeCosts,scopeBinaryArgs));
  if(reusable&&scopeCells-cellsBefore>=64&&scope.budget.admissions<4096){
   (scopeBinaryArgs[0]=value,scopeBinaryArgs[1]=cost,apply(weakSet,scopeShared,scopeBinaryArgs));scope.budget.admissions++;
  }
  scopeResultHeight=height;scopeResultReusable=reusable;return true;
 }
 return scopeVisit(value,0);
}

import {createScopedPrivateNativeProofJsonSerializer as createOriginalScopedProofJsonSerializer,createRetainedPrivateScalarCostStore} from './private-native-proof-json.mjs';

// NEW internal format. Only a callback-free, fresh-guarded CELLS/DEPTH
// counterexample skips the necessarily failing legacy plan/measurement. It
// certifies no unseen tail. The original dynamic root JSON call still visits
// every getter, proxy, toJSON and lazy stack, and throws the original exception.
// Legacy APIs are unchanged. Internal census/cache warming may differ here.
// All scalar records belong to the existing current synchronous retained frame.
export function createNegativeBudgetPrivateProofJsonSerializer(legacyOutsideScope=createOriginalScopedProofJsonSerializer()){
 if(typeof legacyOutsideScope!=='function')throw new TypeError('Negative budget format requires its original outside-scope serializer');
 const uncertainFallback=createPrivateFrozenJsonComposer();
 const currentCosts=createRetainedPrivateScalarCostStore();
 return function serializeNegativeBudgetProof(value){
  if(!nativeReady())return uncertainFallback(value);
  const costs=currentCosts();
  if(!costs)return legacyOutsideScope(value);
  if(!scopedFrozenQualified||!sameField(get(objectOwner,'isFrozen'),scopedFrozenField))return uncertainFallback(value);
  const witness={failed:false},frame={memo:costs.values,budget:{admissions:costs.entries}};
  let selected=false;
  try{selected=withinNegativeBudget(value,frame,witness);}catch{}
  costs.entries=frame.budget.admissions;
  if(selected)return apply(stringifyField.value,jsonOwner,[value]);
  // This lookup must stay dynamic: nativeReady pins captured ordinary owners,
  // whereas a global JSON accessor can still observe the original fallback.
  if(witness.failed)return JSON.stringify(value);
  return uncertainFallback(value);
 };
}
