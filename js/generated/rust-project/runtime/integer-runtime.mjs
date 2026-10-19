// Pure Rust 1.89 fixed integer FromStr behavior. No compiler dependencies.
const scalar=value=>typeof value === 'string' && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(value);
const messages=Object.freeze({Empty:'cannot parse integer from empty string',InvalidDigit:'invalid digit found in string',PosOverflow:'number too large to fit in target type',NegOverflow:'number too small to fit in target type',Zero:'number would be zero for non-zero type'});
const kinds=new Map(Object.keys(messages).map(kind=>[kind,Object.freeze({$:kind})]));
const failure=kind=>Object.freeze({$:'Err',field0:Object.freeze({$:'ParseIntError',kind:kinds.get(kind)})});
const own=(object,key)=>{
  const descriptor=Object.getOwnPropertyDescriptor(object,key);
  if(!descriptor || !Object.hasOwn(descriptor,'value'))throw new TypeError('Invalid checked ParseIntError layout');
  return descriptor.value;
};
function checkedError(value) {
  if(!value || typeof value !== 'object' || ![Object.prototype,null].includes(Object.getPrototypeOf(value)) || Reflect.ownKeys(value).length !== 2 || own(value,'$') !== 'ParseIntError')throw new TypeError('Invalid checked ParseIntError layout');
  const kind=own(value,'kind');
  if(!kind || typeof kind !== 'object' || ![Object.prototype,null].includes(Object.getPrototypeOf(kind)) || Reflect.ownKeys(kind).length !== 1 || !kinds.has(own(kind,'$')))throw new TypeError('Invalid checked IntErrorKind layout');
  return kind;
}
export const std_num_parse_int_error_kind=value=>checkedError(value);
export const std_num_parse_int_error_to_string=value=>messages[own(checkedError(value),'$')];
export function createIntegerRuntime(type) {
  if(type?.kind !== 'fixed' || ![8,16,32,64,128].includes(type.bits) || typeof type.signed !== 'boolean')throw new TypeError('Integer parser requires its checked fixed target');
  const signed=type.signed,bits=BigInt(type.bits),min=signed?-(1n<<(bits-1n)):0n,max=signed?(1n<<(bits-1n))-1n:(1n<<bits)-1n;
  const parse=(source,radix)=>{
    if(!scalar(source))throw new TypeError('Integer parse argument is outside the checked Rust string domain');
    if(typeof radix !== 'bigint' || radix < 0n || radix > 4294967295n)throw new TypeError('Integer radix is outside the checked u32 domain');
    if(radix < 2n || radix > 36n)throw new RangeError('Rust integer radix must lie in [2, 36]');
    if(source.length === 0)return failure('Empty');
    let offset=0,negative=false;
    if(source[0] === '+' || source[0] === '-' && signed) {negative=source[0] === '-';offset=1;}
    if(offset === source.length || source === '-')return failure('InvalidDigit');
    const base=Number(radix);let value=0n;
    for(;offset<source.length;offset++) {
      const code=source.charCodeAt(offset),digit=code >= 48 && code <= 57?code-48:code >= 65 && code <= 90?code-55:code >= 97 && code <= 122?code-87:-1;
      if(digit < 0 || digit >= base)return failure('InvalidDigit');
      const multiplied=value*radix;
      if(multiplied < min || multiplied > max)return failure(negative?'NegOverflow':'PosOverflow');
      value=multiplied+(negative?-BigInt(digit):BigInt(digit));
      if(value < min || value > max)return failure(negative?'NegOverflow':'PosOverflow');
    }
    return Object.freeze({$:'Ok',field0:value});
  };
  return Object.freeze({rust_integer_parse:source=>parse(source,10n),rust_integer_from_str_radix:parse});
}
