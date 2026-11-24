// Rust Unicode scalars become lazy u16 code units. Validate before returning
// the iterator; JavaScript unpaired surrogate strings are outside Rust str.
const codeUnit=Function.call.bind(String.prototype.charCodeAt);
export function encodeUtf16(value) {
  if(typeof value!=='string')throw new TypeError('UTF16 encoding requires a Rust Unicode scalar string');
  for(let index=0;index<value.length;index++) {
    const unit=codeUnit(value,index);
    if(unit>=0xd800&&unit<=0xdbff) {
      const low=codeUnit(value,++index);
      if(!(low>=0xdc00&&low<=0xdfff))throw new TypeError('UTF16 encoding rejects unpaired surrogates');
    } else if(unit>=0xdc00&&unit<=0xdfff)throw new TypeError('UTF16 encoding rejects unpaired surrogates');
  }
  return (function*(){
    for(let index=0;index<value.length;index++) {
      const unit=codeUnit(value,index);
      if(unit>=0xd800&&unit<=0xdbff) {
        const scalar=0x10000+((unit-0xd800)<<10)+(codeUnit(value,++index)-0xdc00),code=scalar-0x10000;
        yield BigInt(0xd800+(code>>10));yield BigInt(0xdc00+(code&0x3ff));
      } else yield BigInt(unit);
    }
  })();
}
const domains=new Map();
for(const bits of [8,16,32,64,128])for(const signed of [false,true])domains.set((signed?'i':'u')+bits,{bits,signed});
domains.set('usize',{bits:64,signed:false});domains.set('isize',{bits:64,signed:true});
export function fixedToF64(value,source) {
  const domain=domains.get(source);
  if(typeof value!=='bigint'||!domain)throw new TypeError('Integer f64 cast requires an actual registered BigInt primitive');
  const limit=1n<<BigInt(domain.bits-(domain.signed?1:0)),min=domain.signed?-limit:0n,max=limit-1n;
  if(value<min||value>max)throw new RangeError('Integer f64 cast source is outside its Rust primitive domain');
  const negative=value<0n,magnitude=negative?-value:value,bits=magnitude.toString(2).length;
  let result;
  if(bits<=53)result=Number(magnitude); // All significand integers fit exactly.
  else {
    const shift=BigInt(bits-53),half=1n<<(shift-1n),remainder=magnitude&((1n<<shift)-1n);
    let significand=magnitude>>shift;
    if(remainder>half||remainder===half&&(significand&1n)===1n)significand++;
    result=Number(significand)*2**Number(shift);
  }
  return negative?-result:result;
}
