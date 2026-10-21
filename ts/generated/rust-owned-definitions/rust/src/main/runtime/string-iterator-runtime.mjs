import {types} from 'node:util';
import {isRustWhitespaceCodeUnit} from './whitespace-data.mjs';
const codeUnit=Function.call.bind(String.prototype.charCodeAt);
const slice=Function.call.bind(String.prototype.slice);
const cursors=new WeakMap();
const none=Object.freeze({$:'None'});
export function requireScalarString(value) {
  if(typeof value!=='string')throw new TypeError('Line and join operations require Rust Unicode scalar strings');
  for(let at=0;at<value.length;at++) {
    const unit=codeUnit(value,at);
    if(unit>=0xd800&&unit<=0xdbff) {
      const low=codeUnit(value,++at);
      if(!(low>=0xdc00&&low<=0xdfff))throw new TypeError('Line and join operations reject unpaired surrogates');
    } else if(unit>=0xdc00&&unit<=0xdfff)throw new TypeError('Line and join operations reject unpaired surrogates');
  }
  return value;
}
function cursorFor(step){
  let advances=0;
  const advance=()=>{advances++;return step();};
  const iterator=Object.freeze({next:advance,[Symbol.iterator](){return this;}});
  cursors.set(iterator,{advance,get advances(){return advances;},consumed:false});return iterator;
}
export function stringLines(value) {
  requireScalarString(value);
  let at=0;
  return cursorFor(()=>{
    if(at>=value.length)return {done:true,value:undefined};
    const start=at;
    while(at<value.length&&codeUnit(value,at)!==10)at++;
    let end=at;
    if(at<value.length){at++;if(end>start&&codeUnit(value,end-1)===13)end--;}
    return {done:false,value:slice(value,start,end)};
  });
}
export function stringWhitespace(value){
  requireScalarString(value);
  let at=0;
  return cursorFor(()=>{
    while(at<value.length&&isRustWhitespaceCodeUnit(codeUnit(value,at)))at++;
    if(at>=value.length)return {done:true,value:undefined};
    const start=at;
    while(at<value.length&&!isRustWhitespaceCodeUnit(codeUnit(value,at)))at++;
    return {done:false,value:slice(value,start,at)};
  });
}
export function stringNext(value) {
  // WeakMap lookup reads no caller property, including proxy traps.
  const cursor=cursors.get(value);
  if(!cursor||cursor.consumed||cursor.advances!==0)throw new TypeError('next requires one fresh private checked str cursor');
  cursor.consumed=true;
  const result=cursor.advance();return result.done?none:Object.freeze({$:'Some',field0:result.value});
}
export function stringJoin(values,separator) {
  requireScalarString(separator);
  if(types.isProxy(values)||!Array.isArray(values)||Object.getPrototypeOf(values)!==Array.prototype)throw new TypeError('join requires an ordinary checked string array');
  const length=Object.getOwnPropertyDescriptor(values,'length');
  if(!length||!('value'in length)||!Number.isSafeInteger(length.value)||length.value<0)throw new TypeError('join requires a dense checked string array');
  let result='';
  for(let at=0;at<length.value;at++) {
    const field=Object.getOwnPropertyDescriptor(values,String(at));
    if(!field||!('value'in field))throw new TypeError('join rejects holes and accessors');
    const value=requireScalarString(field.value);result+=(at===0?'':separator)+value;
  }
  return result;
}

// Owned library contract: scalar count only, without exposing an iterator.
export function router_core_unicode_scalar_count(value) {
  requireScalarString(value);
  // Each scalar uses at least one UTF-16 unit. Primitive string length is an
  // exact integer <= Number.MAX_SAFE_INTEGER, so one final conversion is exact.
  let count=0;
  for(let at=0;at<value.length;at++) {
    count++;
    // Validation above proved each leading surrogate has its low partner.
    if(codeUnit(value,at)>=0xd800&&codeUnit(value,at)<=0xdbff)at++;
  }
  return BigInt(count);
}
