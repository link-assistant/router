// Snapshot source Copy arrays before user code can observe or mutate aliases.
import {types} from 'node:util';
import {assertImmutableCopy} from './copy-runtime.mjs';
export function copyFixedArray(value,type) {
  const active=new Set();let cells=16000;
  function copy(current,expected,depth) {
    if(--cells<0||depth>32)throw new TypeError('Copy array exceeds the checked value bound');
    if(expected?.kind==='data'){if(!current||typeof current!=='object'||types.isProxy(current)||Array.isArray(current)||Object.getPrototypeOf(current)!==Object.prototype)throw new TypeError('Copy nominal array requires ordinary immutable records');assertImmutableCopy(current);return current;}
    if(expected?.kind!=='array') {
      let valid=false;
      if(expected?.kind==='unit')valid=current===null;
      else if(expected?.kind==='bool')valid=typeof current==='boolean';
      else if(expected?.kind==='float')valid=typeof current==='number';
      else if(expected?.kind==='string')valid=typeof current==='string'&&!/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(current);
      else if(expected?.kind==='fixed'&&[8,16,32,64,128].includes(expected.bits)&&typeof expected.signed==='boolean'&&typeof current==='bigint') {
        const width=BigInt(expected.bits),minimum=expected.signed?-(1n<<(width-1n)):0n,maximum=expected.signed?(1n<<(width-1n))-1n:(1n<<width)-1n;
        valid=current>=minimum&&current<=maximum;
      }
      if(!valid)throw new TypeError('Copy array element requires a checked scalar value');
      return current;
    }
    const length=expected.rustFixedArray?.length;
    if(!Number.isSafeInteger(length)||length<0||length>4096)throw new TypeError('Copy array has no checked fixed length');
    if(!current||typeof current!=='object'||types.isProxy(current)||!Array.isArray(current))throw new TypeError('Copy array requires an ordinary array');
    if(active.has(current))throw new TypeError('Copy array cannot contain a cycle');
    if(Object.getPrototypeOf(current)!==Array.prototype)throw new TypeError('Copy array has an unsupported prototype');
    const actual=Object.getOwnPropertyDescriptor(current,'length');
    if(!actual||!Object.hasOwn(actual,'value')||actual.value!==length)throw new TypeError('Copy array length differs from the checked source type');
    const keys=Reflect.ownKeys(current);
    if(keys.length!==length+1||keys.some(key=>key!=='length'&&(typeof key!=='string'||!/^(?:0|[1-9][0-9]*)$/u.test(key)||Number(key)>=length)))throw new TypeError('Copy array has holes or extra fields');
    active.add(current);const result=[];
    try {
      for(let index=0;index<length;index++) {
        const field=Object.getOwnPropertyDescriptor(current,String(index));
        if(!field||!Object.hasOwn(field,'value'))throw new TypeError('Copy array requires own data elements');
        result.push(copy(field.value,expected.element,depth+1));
      }
    } finally {active.delete(current);}
    return Object.freeze(result);
  }
  return copy(value,type,0);
}
