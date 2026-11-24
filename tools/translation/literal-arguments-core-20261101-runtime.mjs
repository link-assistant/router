// Portable static-piece carrier; not std::fmt::Arguments or an output sink.
const apply=Reflect.apply,freeze=Object.freeze,code=String.prototype.charCodeAt;
const Store=WeakMap,store=new Store(),set=Store.prototype.set,get=Store.prototype.get,remove=Store.prototype.delete;
const bigint=BigInt,MAX_BYTES=2097152;
function utf8Length(value){
 if(typeof value!=='string'||value.length>MAX_BYTES)throw new TypeError('Bounded literal text required');
 let bytes=0;for(let at=0;at<value.length;at++){
  const unit=apply(code,value,[at]);
  if(unit>=0xd800&&unit<=0xdbff){const low=apply(code,value,[++at]);if(!(low>=0xdc00&&low<=0xdfff))throw new TypeError('Literal text requires valid Unicode');bytes+=4;}
  else if(unit>=0xdc00&&unit<=0xdfff)throw new TypeError('Literal text requires valid Unicode');
  else bytes+=unit<0x80?1:unit<0x800?2:3;
  if(bytes>MAX_BYTES)throw new RangeError('Literal piece byte bound');
 }return bytes;
}
function create(pieces,bytes){const carrier=freeze({$: 'ml_LiteralArgumentsCoreStatic'});apply(set,store,[carrier,freeze({pieces:freeze(pieces),bytes})]);return carrier;}
function consume(value){
 if(value===null||typeof value!=='object')throw new TypeError('Actual unconsumed literal carrier required');
 const state=apply(get,store,[value]);if(!state)throw new TypeError('Actual unconsumed literal carrier required');apply(remove,store,[value]);return state;
}
export function literal_arguments_empty(){if(arguments.length!==0)throw new TypeError('Empty literal constructor takes no operands');return create([],0);}
export function literal_arguments_literal(value){if(arguments.length!==1)throw new TypeError('Literal constructor takes one operand');return create([value],utf8Length(value));}
export function literal_arguments_piece_count(value){if(arguments.length!==1)throw new TypeError('One literal carrier required');return bigint(consume(value).pieces.length);}
export function literal_arguments_byte_len(value){if(arguments.length!==1)throw new TypeError('One literal carrier required');return bigint(consume(value).bytes);}
export function literal_arguments_is_empty(value){if(arguments.length!==1)throw new TypeError('One literal carrier required');return consume(value).bytes===0;}
