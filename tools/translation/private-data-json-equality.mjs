// A sufficient equality check for native JSON, never a source or owner proof.
// All uncertain inputs retain the caller's original serializer comparison.
import {types} from 'node:util';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';

const baseQualified=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&originalLexingIntrinsicsUnchanged();
const descriptor=baseQualified?Object.getOwnPropertyDescriptor:null,prototype=baseQualified?Object.getPrototypeOf:null,own=baseQualified?Object.hasOwn:null,keys=baseQualified?Reflect.ownKeys:null,isArray=baseQualified?Array.isArray:null,isProxy=baseQualified?types.isProxy:null;
const objectPrototype=baseQualified?Object.prototype:null,arrayPrototype=baseQualified?Array.prototype:null;
const isFrozen=baseQualified?Object.isFrozen:null;
const native=(field,name)=>!!field&&own(field,'value')&&originalCapturedFunctionSource(field.value)==='function '+name+'() { [native code] }';
const errorField=baseQualified?descriptor(types,'isNativeError'):null,boxedField=baseQualified?descriptor(types,'isBoxedPrimitive'):null,arrayBufferField=baseQualified?descriptor(globalThis,'ArrayBuffer'):null;
const arrayBufferNative=baseQualified&&native(arrayBufferField,'ArrayBuffer');
const viewField=arrayBufferNative?descriptor(arrayBufferField.value,'isView'):null;
const qualified=baseQualified&&native(errorField,'isNativeError')&&native(boxedField,'isBoxedPrimitive')&&arrayBufferNative&&native(viewField,'isView');
const sameField=(actual,prior)=>!!actual&&own(actual,'value')&&actual.value===prior.value&&actual.enumerable===prior.enumerable&&actual.configurable===prior.configurable&&actual.writable===prior.writable;
const NODE_PAIRS=32768,CELLS=200000,DEPTH=160,STRINGS=8388608,JSON_UNITS=67108864,COUNTER_MAX=9007199254740991;
let attempts=0,equalities=0,deferrals=0;
const unchanged=()=>qualified&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&originalLexingIntrinsicsUnchanged()&&sameField(descriptor(types,'isNativeError'),errorField)&&sameField(descriptor(types,'isBoxedPrimitive'),boxedField)&&sameField(descriptor(globalThis,'ArrayBuffer'),arrayBufferField)&&sameField(descriptor(arrayBufferField.value,'isView'),viewField);
const same=(left,right)=>left===right?(left!==0||1/left===1/right):left!==left&&right!==right;

export function privateDataJsonEquality(left,right){
 if(attempts<COUNTER_MAX)attempts++;
 if(!unchanged()){if(deferrals<COUNTER_MAX)deferrals++;return null;}
 // Invocation-local strong references die with this check. No result, owner,
 // observer, public token or mutable input is cached across invocations.
 const done=new Map(),activeLeft=new Set(),activeRight=new Set(),strings=new Map();
 let pairs=0,cells=0,stringUnits=0;
 function stringLength(value){
  const prior=strings.get(value);if(prior!==undefined)return prior;
  stringUnits+=value.length;if(stringUnits>STRINGS)return -1;
  let length=2;
  for(let at=0;at<value.length;at++){
   const unit=value.charCodeAt(at);
   if(unit===34||unit===92||unit===8||unit===9||unit===10||unit===12||unit===13)length+=2;
   else if(unit<32)length+=6;
   else if(unit>=55296&&unit<=56319){
    const next=value.charCodeAt(at+1);
    if(next>=56320&&next<=57343){length+=2;at++;}else length+=6;
   }else length+=unit>=56320&&unit<=57343?6:1;
   if(length>JSON_UNITS)return -1;
  }
  strings.set(value,length);return length;
 }
 function scalarLength(value){
  if(value===null)return 4;if(value===undefined)return 0;
  if(typeof value==='string')return stringLength(value);
  if(typeof value==='boolean')return value?4:5;
  // Native JSON uses primitive Number::toString for finite numbers, including
  // zero for -0. Primitive concatenation invokes no user conversion method.
  if(typeof value==='number')return value!==value||value===Infinity||value===-Infinity?4:(''+value).length;
  return -1;
 }
 function visit(a,b,depth){
  if(depth>DEPTH)return null;
  if(a===null||typeof a!=='object'){
   if(!same(a,b))return null;
   const length=scalarLength(a);return length<0?null:{height:0,length,omitted:a===undefined};
  }
  if(b===null||typeof b!=='object'||isProxy(a)||isProxy(b)||activeLeft.has(a)||activeRight.has(b))return null;
  // A changed prototype does not remove exotic internal slots. Native Error
  // stack descriptors can format user stacks; views can read shared memory;
  // boxed primitives have native JSON conversions independent of prototypes.
  const isError=errorField.value,isBoxed=boxedField.value,isView=viewField.value;
  if(isError(a)||isError(b)||isBoxed(a)||isBoxed(b)||isView(a)||isView(b))return null;
  const completed=done.get(a)?.get(b);
  if(completed)return depth+completed.height<=DEPTH?completed:null;
  if(++pairs>NODE_PAIRS)return null;
  const array=isArray(a);if(array!==isArray(b))return null;
  const ap=prototype(a),bp=prototype(b);
  if(array?(ap!==arrayPrototype||bp!==arrayPrototype):(ap!==null&&ap!==objectPrototype||bp!==null&&bp!==objectPrototype))return null;
  const names=keys(a),other=keys(b);cells+=1+names.length;
  if(cells>CELLS||names.length!==other.length)return null;
  // Module namespaces retain a nonremovable symbol even with null prototype.
  // Reject the entire key shape before a TDZ descriptor could throw.
  for(let at=0;at<names.length;at++)if(typeof names[at]!=='string'||names[at]!==other[at]||names[at]==='toJSON')return null;
  // Native host interceptors can look plain while their backing data changes
  // outside this turn. Only immutable own data enters the positive domain.
  // Shape checks precede this native integrity query to avoid TDZ namespaces.
  if(!isFrozen(a)||!isFrozen(b))return null;
  if(array){
   const al=descriptor(a,'length'),bl=descriptor(b,'length');
   if(!al||!bl||!own(al,'value')||!own(bl,'value')||al.enumerable||bl.enumerable||al.value!==bl.value||names.length!==al.value+1||names[names.length-1]!=='length')return null;
  }
  activeLeft.add(a);activeRight.add(b);let height=1,length=2,fields=0;
  for(let at=0;at<names.length;at++){
   const key=names[at];
   if(array&&key==='length')continue;
   if(array&&key!==''+at)return null;
   const field=descriptor(a,key),prior=descriptor(b,key);
   if(!field||!prior||!own(field,'value')||!own(prior,'value')||!field.enumerable||!prior.enumerable)return null;
   const child=visit(field.value,prior.value,depth+1);if(!child)return null;
   if(!array&&child.omitted)continue;
   const keyLength=array?0:stringLength(key);if(keyLength<0)return null;
   length+=(fields++?1:0)+(child.omitted?4:child.length)+(array?0:keyLength+1);
   if(length>JSON_UNITS)return null;
   if(child.height+1>height)height=child.height+1;
  }
  if(depth+height>DEPTH)return null;
  activeLeft.delete(a);activeRight.delete(b);
  const result={height,length,omitted:false};let rightMap=done.get(a);if(!rightMap){rightMap=new Map();done.set(a,rightMap);}rightMap.set(b,result);return result;
 }
 const result=visit(left,right,0);
 // Every visited data object is natively frozen. Recheck all skipped native
 // serializer operations at exit; no mutable host data is a positive input.
 if(result&&unchanged()){if(equalities<COUNTER_MAX)equalities++;return {equal:true,logicalJsonCodeUnits:result.length,serialized:!result.omitted};}
 if(deferrals<COUNTER_MAX)deferrals++;return null;
}

export function samePrivateDataJson(left,right){return privateDataJsonEquality(left,right)!==null;}

// Do not evaluate a caller's right operand ahead of the original serializer's
// left operand. Only already-owned data fields of plain containers may enter
// the simultaneous comparison; accessors, proxies and namespaces fall back.
export function privateDataJsonFieldEquality(left,right,name){
 if(!unchanged()||typeof name!=='string')return null;
 for(const value of [left,right]){
  if(!value||typeof value!=='object'||isProxy(value))return null;
  const isError=errorField.value,isBoxed=boxedField.value,isView=viewField.value;
  if(isError(value)||isBoxed(value)||isView(value))return null;
  const parent=prototype(value);if(parent!==null&&parent!==objectPrototype)return null;
  const names=keys(value);for(let at=0;at<names.length;at++)if(typeof names[at]!=='string')return null;
  if(!isFrozen(value))return null;
 }
 const a=descriptor(left,name),b=descriptor(right,name);
 if(!a||!b||!own(a,'value')||!own(b,'value'))return null;
 const comparison=privateDataJsonEquality(a.value,b.value);
 return comparison?{...comparison,operand:b.value}:null;
}

export function privateDataJsonEqualityFacts(){return {available:!!unchanged(),attempts,equalities,deferrals,limits:{nodePairs:NODE_PAIRS,uniqueCells:CELLS,depth:DEPTH,uniqueStringCodeUnits:STRINGS,logicalJsonCodeUnits:JSON_UNITS},invocationLocal:true,sourceAuthority:false};}
