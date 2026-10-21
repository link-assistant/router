import {types} from 'node:util';
import {requireScalarString} from './string-iterator-runtime.mjs';
const unit=Function.call.bind(String.prototype.charCodeAt),slice=Function.call.bind(String.prototype.slice),none=Object.freeze({$:'None'});
function transforms(maps){
  if(types.isProxy(maps)||!Array.isArray(maps)||Object.getPrototypeOf(maps)!==Array.prototype||!Object.isFrozen(maps))throw new TypeError('reverse Split maps require an internal immutable array');
  const length=Object.getOwnPropertyDescriptor(maps,'length').value;
  if(length>32||Reflect.ownKeys(maps).length!==length+1)throw new TypeError('reverse Split maps exceed the dense bounded profile');
  const result=[];for(let i=0;i<length;i++){const field=Object.getOwnPropertyDescriptor(maps,String(i));if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='function'||types.isProxy(field.value))throw new TypeError('reverse Split maps require ordinary checked callbacks');result.push(field.value);}return result;
}
export function reverseFindCharacterSplit(value,delimiter,maps,predicate){
  requireScalarString(value);requireScalarString(delimiter);
  const width=delimiter.length;if(width!==1&&width!==2||width===2&&!(unit(delimiter,0)>=0xd800&&unit(delimiter,0)<=0xdbff))throw new TypeError('reverse Split requires one scalar character');
  const operations=transforms(maps);if(typeof predicate!=='function'||types.isProxy(predicate))throw new TypeError('rfind requires an ordinary checked predicate');
  let end=value.length,finished=false;
  while(!finished){
    let at=end,start=0,found=false;
    while(at>0){const last=unit(value,at-1);at-=last>=0xdc00&&last<=0xdfff?2:1;if(unit(value,at)===unit(delimiter,0)&&(width===1||unit(value,at+1)===unit(delimiter,1))){start=at+width;found=true;break;}}
    let field=slice(value,start,end);if(found)end=at;else finished=true;
    for(const operation of operations)field=requireScalarString(operation(field));
    const accepted=predicate(field);if(typeof accepted!=='boolean')throw new TypeError('rfind predicate must return its actual checked bool');
    if(accepted)return Object.freeze({$:'Some',field0:field});
  }
  return none;
}
