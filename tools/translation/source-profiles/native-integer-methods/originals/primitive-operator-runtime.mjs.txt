const shape=(bits,signed)=>{
  if(![8,16,32,64,128].includes(bits)||typeof signed!=='boolean')throw new TypeError('Invalid Rust primitive integer domain');
};
const bound=(value,bits,signed)=>{
  shape(bits,signed);
  const limit=1n<<BigInt(signed?bits-1:bits),minimum=signed?-limit:0n;
  if(typeof value!=='bigint'||value<minimum||value>=limit)throw new TypeError('Value outside Rust primitive integer domain');
};
export function integerCast(value,inputBits,inputSigned,targetBits,targetSigned){
  bound(value,inputBits,inputSigned);shape(targetBits,targetSigned);
  return targetSigned?BigInt.asIntN(targetBits,value):BigInt.asUintN(targetBits,value);
}
export function integerShift(value,count,bits,signed,countBits,countSigned,operation){
  bound(value,bits,signed);bound(count,countBits,countSigned);
  if(count<0n||count>=BigInt(bits))throw new RangeError('Rust integer shift count overflow');
  if(!['<<','>>'].includes(operation))throw new TypeError('Invalid Rust primitive shift');
  const result=operation==='<<'?value<<count:value>>count;
  return signed?BigInt.asIntN(bits,result):BigInt.asUintN(bits,result);
}

export function primitiveBitwise(left,right,operation,bits,signed){
 if(!['&','|','^'].includes(operation))throw new TypeError('Invalid Rust primitive bitwise operation');
 if(bits===null&&signed===null){if(typeof left!=='boolean'||typeof right!=='boolean')throw new TypeError('Rust bool bitwise operands must be booleans');return operation==='&'?left&&right:operation==='|'?left||right:left!==right;}
 bound(left,bits,signed);bound(right,bits,signed);const result=operation==='&'?left&right:operation==='|'?left|right:left^right;return signed?BigInt.asIntN(bits,result):BigInt.asUintN(bits,result);
}

export function primitiveNot(value,bits,signed){
 bound(value,bits,signed);const result=~value;return signed?BigInt.asIntN(bits,result):BigInt.asUintN(bits,result);
}
