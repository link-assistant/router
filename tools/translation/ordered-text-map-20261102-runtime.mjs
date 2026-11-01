// Bounded compatibility ABI. Values and names grant no compiler authority.
import {types} from 'node:util';
import {Buffer} from 'node:buffer';
const MAX_ENTRIES=4096,MAX_BYTES=1048576;
const fail=message=>{throw TypeError('Ordered text map: '+message);};
function own(object,key){const field=Object.getOwnPropertyDescriptor(object,key);if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('ordinary enumerable own data required');return field.value;}
function dense(value,limit){
 if(!value||typeof value!=='object'||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary dense array required');
 const size=Object.getOwnPropertyDescriptor(value,'length');if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<0||size.value>limit||Reflect.ownKeys(value).length!==size.value+1)fail('bounded dense array required');
 const result=[];for(let index=0;index<size.value;index++)result.push(own(value,String(index)));return result;
}
function text(value){if(typeof value!=='string'||value.length>MAX_BYTES||/\p{Surrogate}/u.test(value))fail('Unicode scalar string required');if(Buffer.byteLength(value,'utf8')>MAX_BYTES)fail('text byte bound');return value;}
function pair(value){const row=dense(value,2);if(row.length!==2)fail('two-element text pair required');const key=text(row[0]),entry=text(row[1]);if(Buffer.byteLength(key)+Buffer.byteLength(entry)>MAX_BYTES)fail('pair byte bound');return [key,entry];}
// UTF-8 order on valid scalar strings equals scalar order, not UTF-16 order.
function compare(left,right){let a=0,b=0;while(a<left.length&&b<right.length){const x=left.codePointAt(a),y=right.codePointAt(b);if(x!==y)return x<y?-1:1;a+=x>65535?2:1;b+=y>65535?2:1;}return a===left.length?(b===right.length?0:-1):1;}
function bounded(rows){let bytes=0;if(rows.length>MAX_ENTRIES)fail('entry bound');for(const [key,value]of rows){bytes+=Buffer.byteLength(key)+Buffer.byteLength(value);if(bytes>MAX_BYTES)fail('aggregate byte bound');}return rows;}
function make(rows){bounded(rows);return Object.freeze({$:'OrderedTextMap',entries:Object.freeze(rows.map(row=>Object.freeze([row[0],row[1]])))});}
function entries(value){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary text map required');
 const keys=Reflect.ownKeys(value);if(keys.length!==2||!keys.includes('$')||!keys.includes('entries')||own(value,'$')!=='OrderedTextMap')fail('complete text map shape required');
 const rows=dense(own(value,'entries'),MAX_ENTRIES).map(pair);bounded(rows);for(let index=1;index<rows.length;index++)if(compare(rows[index-1][0],rows[index][0])>=0)fail('unique native ordered keys required');return rows;
}
function search(rows,key){let low=0,high=rows.length;while(low<high){const middle=low+Math.floor((high-low)/2);if(compare(rows[middle][0],key)<0)low=middle+1;else high=middle;}return low;}
export function router_text_map_new(){return make([]);}
export function router_text_map_from_pairs(value){
 const input=dense(value,MAX_ENTRIES).map(pair);bounded(input);const selected=new Map();for(const [key,entry]of input)selected.set(key,entry);
 return make([...selected].sort((left,right)=>compare(left[0],right[0])));
}
export function router_text_map_insert(value,key,entry){
 const rows=entries(value),incoming=pair([key,entry]),index=search(rows,incoming[0]);if(index<rows.length&&rows[index][0]===incoming[0])rows[index]=incoming;else rows.splice(index,0,incoming);return make(rows);
}
export function router_text_map_remove(value,key){const rows=entries(value),name=text(key),index=search(rows,name);if(index<rows.length&&rows[index][0]===name)rows.splice(index,1);return make(rows);}
export function router_text_map_get(value,key){const rows=entries(value),name=text(key),index=search(rows,name);return index<rows.length&&rows[index][0]===name?Object.freeze({$:'Some',field0:rows[index][1]}):Object.freeze({$:'None'});}
export function router_text_map_contains(value,key){const rows=entries(value),name=text(key),index=search(rows,name);return index<rows.length&&rows[index][0]===name;}
export function router_text_map_len(value){return BigInt(entries(value).length);}
export function router_text_map_copy(value){return make(entries(value));}
export function router_text_map_pairs(value){return Object.freeze(entries(value).map(row=>Object.freeze([row[0],row[1]])));}
export function router_text_map_keys(value){return Object.freeze(entries(value).map(row=>row[0]));}
