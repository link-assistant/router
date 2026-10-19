import {requireScalarString} from './string-iterator-runtime.mjs';
const unit=Function.call.bind(String.prototype.charCodeAt),slice=Function.call.bind(String.prototype.slice);
const cursors=new WeakMap(),none=Object.freeze({$:'None'});
export function stringSplitCharacter(value,delimiter){
  requireScalarString(value);requireScalarString(delimiter);
  const width=delimiter.length;
  if(width!==1&&width!==2||width===2&&!(unit(delimiter,0)>=0xd800&&unit(delimiter,0)<=0xdbff))throw new TypeError('split requires one Rust scalar character');
  let at=0,done=false,advances=0;
  const advance=()=>{
    advances++;
    if(done)return {done:true,value:undefined};
    const start=at;
    while(at<value.length){
      if(unit(value,at)===unit(delimiter,0)&&(width===1||unit(value,at+1)===unit(delimiter,1))){const end=at;at+=width;return {done:false,value:slice(value,start,end)};}
      const first=unit(value,at);at+=first>=0xd800&&first<=0xdbff?2:1;
    }
    done=true;return {done:false,value:slice(value,start)};
  };
  const iterator=Object.freeze({next:advance,[Symbol.iterator](){return this;}});
  cursors.set(iterator,{advance,get advances(){return advances;},consumed:false});return iterator;
}
export function stringSplitNext(value){
  const cursor=cursors.get(value);
  if(!cursor||cursor.consumed||cursor.advances!==0)throw new TypeError('next requires one fresh private checked split cursor');
  cursor.consumed=true;const result=cursor.advance();return result.done?none:Object.freeze({$:'Some',field0:result.value});
}
export function allocateStringItem(value){return requireScalarString(value);}
