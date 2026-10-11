// Standalone immutable Rust Vec/slice readers. The generated caller closes
// the factory over a checked array-domain validator for one actual type.
const NONE=Object.freeze({$:'None'}),MAX_USIZE=(1n<<64n)-1n;
const own=(value,key)=>{
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor || !Object.hasOwn(descriptor,'value'))throw new TypeError('Rust vector layout has a missing element or accessor');
  return descriptor.value;
};
export function createVectorRuntime(validateArray) {
  if(typeof validateArray !== 'function')throw new TypeError('Rust vector requires its registered checked-domain validator');
  const check=values=>{
    if(!Array.isArray(values))throw new TypeError('Rust vector requires a dense array');
    const length=own(values,'length'),keys=Reflect.ownKeys(values);
    if(keys.length !== length+1)throw new TypeError('Rust vector has holes or extra properties');
    for(const key of keys) {
      if(key === 'length')continue;
      if(typeof key !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(key) || Number(key) >= length)throw new TypeError('Rust vector has holes or extra properties');
      own(values,key);
    }
    if(validateArray(values) !== true)throw new TypeError('Rust vector registered validation did not establish its domain');
    return length;
  };
  const at=(values,index,length)=>index >= BigInt(length)?NONE:Object.freeze({$:'Some',field0:own(values,String(index))});
  return Object.freeze({
    rust_vec_get(values,index) {
      const length=check(values);
      if(typeof index !== 'bigint' || index < 0n || index > MAX_USIZE)throw new TypeError('Rust vector index is outside the checked usize domain');
      return at(values,index,length);
    },
    rust_vec_first(values) {const length=check(values);return at(values,0n,length);},
    rust_vec_last(values) {const length=check(values);return length === 0?NONE:at(values,BigInt(length)-1n,length);},
  });
}
