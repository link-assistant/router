// Generated from the linked source-text byte model. Do not edit.
/** @param {number[]} units @param {number} index @returns {number} */
export function readSourceTextScalar(units,index){
 if(!Number.isInteger(index)||index<0||index>=units.length||units.length>4294967295)return -1;
 const first=units[index]??-1;
 if(!Number.isInteger(first)||first<0||first>65535)return -1;
 if(first>=55296&&first<=56319){
  if(index+1>=units.length)return -1;
  const second=units[index+1]??-1;
  if(!Number.isInteger(second)||second<56320||second>57343)return -1;
  return 65536+(first-55296)*1024+second-56320;
 }
 if(first>=56320&&first<=57343)return -1;
 return first;
}
/** @param {number} scalar @returns {number} */
export function readSourceTextScalarByteWidth(scalar){
 if(!Number.isInteger(scalar)||scalar<0||scalar>1114111||scalar>=55296&&scalar<=57343)return -1;
 if(scalar<128)return 1;
 if(scalar<2048)return 2;
 if(scalar<65536)return 3;
 return 4;
}
/** @param {number[]} units @returns {number} */
export function readSourceTextByteLength(units){
 if(units.length>4294967295)return -1;
 let index=0;let bytes=0;
 while(index<units.length){
  const scalar=readSourceTextScalar(units,index);
  const width=readSourceTextScalarByteWidth(scalar);
  if(width<0)return -1;
  bytes=bytes+width;index=index+(scalar>=65536?2:1);
 }
 return bytes;
}
/** @param {number[]} units @returns {boolean} */
export function acceptSourceTextScalarUnits(units){return readSourceTextByteLength(units)>=0;}
/** @param {number[]} units @param {number} offset @returns {number} */
export function readSourceTextCodeUnitOffset(units,offset){
 const length=readSourceTextByteLength(units);
 if(length<0||!Number.isInteger(offset)||offset<0||offset>length)return -1;
 let index=0;let bytes=0;
 while(bytes<offset){
  const scalar=readSourceTextScalar(units,index);
  bytes=bytes+readSourceTextScalarByteWidth(scalar);
  index=index+(scalar>=65536?2:1);
 }
 return bytes===offset?index:-1;
}
/** @param {number[]} units @param {number} start @param {number} end @returns {boolean} */
export function acceptSourceTextByteSlice(units,start,end){
 return start<=end&&readSourceTextCodeUnitOffset(units,start)>=0&&readSourceTextCodeUnitOffset(units,end)>=0;
}
/** @param {number[]} units @param {number} offset @returns {number} */
export function readSourceTextByte(units,offset){
 const length=readSourceTextByteLength(units);
 if(length<0||!Number.isInteger(offset)||offset<0||offset>=length)return -1;
 let index=0;let bytes=0;
 while(index<units.length){
  const scalar=readSourceTextScalar(units,index);
  const width=readSourceTextScalarByteWidth(scalar);
  const position=offset-bytes;
  if(position<width){
   if(width===1)return scalar;
   if(position===0){
    if(width===2)return 192+Math.floor(scalar/64);
    if(width===3)return 224+Math.floor(scalar/4096);
    return 240+Math.floor(scalar/262144);
   }
   if(position===width-1)return 128+scalar%64;
   if(width===4&&position===1)return 128+Math.floor(scalar/4096)%64;
   return 128+Math.floor(scalar/64)%64;
  }
  bytes=bytes+width;index=index+(scalar>=65536?2:1);
 }
 return -1;
}

/** @param {number} count @returns {boolean} */
export function acceptSourceTextUnitCount(count){return Number.isInteger(count)&&count>=0&&count<=4294967295;}
