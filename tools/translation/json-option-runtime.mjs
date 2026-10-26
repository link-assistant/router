// NEW optional borrowed-Json ABI: stock primordial initialization. Captured
// operations resist late replacement; they do not certify hostile cold import.
// No source, type, trait, owner or compiler authority is issued by this module.
import {types} from 'node:util';
const proxy=types.isProxy,array=Array.isArray,prototype=Object.getPrototypeOf;
const keys=Reflect.ownKeys,descriptor=Object.getOwnPropertyDescriptor;
const has=Object.hasOwn,create=Object.create,define=Object.defineProperty;
const freeze=Object.freeze,frozen=Object.isFrozen,apply=Reflect.apply;
const plain=Object.prototype,arrayPrototype=Array.prototype,TypeErrorValue=TypeError;
const SetValue=Set,setHas=Set.prototype.has,setAdd=Set.prototype.add,setDelete=Set.prototype.delete;
const charCode=String.prototype.charCodeAt,finite=Number.isFinite;
const MAX_CELLS=65536,MAX_DEPTH=1024,MAX_TEXT=1048576;
const U64_MAX=18446744073709551615n,I64_MIN=-9223372036854775808n,I64_MAX=9223372036854775807n;
const toFloat=Number;
const fail=message=>{throw new TypeErrorValue('Optional Json input: '+message);};
const code=(text,at)=>apply(charCode,text,[at]);
const append=(items,value)=>define(items,items.length,{__proto__:null,value,writable:true,enumerable:true,configurable:true});
function own(value,key){const field=descriptor(value,key);if(!field||!has(field,'value')||!field.enumerable)fail('enumerable own data required');return field.value;}
function ordinary(value){if(!value||typeof value!=='object'||proxy(value)||array(value))fail('ordinary nonproxy record required');const parent=prototype(value);if(parent!==plain&&parent!==null)fail('foreign record prototype');}
function fields(value,wanted){
 ordinary(value);const names=keys(value);
 if(names.length!==wanted.length)fail('closed record fields required');
 for(let at=0;at<names.length;at++){let found=false;for(let j=0;j<wanted.length;j++)if(names[at]===wanted[j])found=true;if(!found)fail('closed record fields required');}
 const result=create(null);for(let at=0;at<wanted.length;at++){const key=wanted[at];define(result,key,{__proto__:null,value:own(value,key),writable:false,enumerable:true,configurable:false});}return result;
}
function result(tag,value){const row=create(plain);define(row,'$',{__proto__:null,value:tag,enumerable:true,writable:false,configurable:false});if(tag==='Some')define(row,'field0',{__proto__:null,value,enumerable:true,writable:false,configurable:false});return freeze(row);}
function scalar(text){
 for(let at=0;at<text.length;at++){const unit=code(text,at);if(unit>=0xd800&&unit<=0xdbff){const low=at+1<text.length?code(text,++at):-1;if(low<0xdc00||low>0xdfff)fail('Unicode scalar text required');}else if(unit>=0xdc00&&unit<=0xdfff)fail('Unicode scalar text required');}
}
// UTF8 lexicographic order equals Unicode scalar order for valid scalar text.
function compare(left,right){
 let a=0,b=0;while(a<left.length&&b<right.length){let x=code(left,a++),y=code(right,b++);if(x>=0xd800&&x<=0xdbff)x=0x10000+((x-0xd800)<<10)+(code(left,a++)-0xdc00);if(y>=0xd800&&y<=0xdbff)y=0x10000+((y-0xd800)<<10)+(code(right,b++)-0xdc00);if(x!==y)return x<y?-1:1;}return a===left.length?(b===right.length?0:-1):1;
}
function immutable(value){
 const active=new SetValue(),pending=[];append(pending,{value,depth:0,exit:false});let cells=0,text=0,queued=1;
 while(pending.length){const task=pending[pending.length-1];pending.length--;
  if(task.exit){apply(setDelete,active,[task.value]);continue;}
  queued--;const current=task.value;if(++cells>MAX_CELLS||task.depth>MAX_DEPTH)fail('immutable view exceeds depth or occurrence cells');
  if(typeof current==='string'){text+=current.length;if(text>MAX_TEXT)fail('scalar text work exceeds 1048576 UTF16 units');scalar(current);continue;}
  if(current===null||typeof current==='boolean'||typeof current==='number'||typeof current==='bigint')continue;
  if(!current||typeof current!=='object'||proxy(current))fail('immutable Json rejects nondata and proxy values');
  const list=array(current),parent=prototype(current);if(list?parent!==arrayPrototype:parent!==plain&&parent!==null)fail('immutable Json requires ordinary containers');
  if(apply(setHas,active,[current]))fail('immutable Json rejects cycles');
  const names=keys(current);let length;
  if(list){const field=descriptor(current,'length');if(!field||!has(field,'value')||field.enumerable||field.writable||field.configurable)fail('frozen array length required');length=field.value;if(typeof length!=='number'||length<0||length>MAX_CELLS||length%1!==0||names.length!==length+1)fail('dense bounded array required');for(let at=0;at<length;at++)if(names[at]!==''+at)fail('array holes or extra fields');if(names[length]!=='length')fail('array field order');}
  else for(let at=0;at<names.length;at++)if(names[at]!=='$'&&names[at]!=='field0'&&names[at]!=='entries'&&names[at]!=='key'&&names[at]!=='value')fail('unknown Json field');
  // Integrity inspection follows the closed key census as well: a rejected
  // native lazy stack must not be materialized by an integrity operation.
  if(!frozen(current))fail('immutable Json requires frozen containers');
  // Reserve outstanding occurrences before allocating child tasks. A deep,
  // wide invalid input cannot grow private pending storage past the cell cap.
  const children=list?length:names.length;if(children>MAX_CELLS-cells-queued)fail('immutable view exceeds occurrence cells');queued+=children;
  // All names, including the native lazy stack refusal, precede descriptors.
  apply(setAdd,active,[current]);append(pending,{value:current,exit:true});
  for(let at=names.length-1;at>=0;at--){const name=names[at];if(list&&name==='length')continue;const field=descriptor(current,name);if(!field||!has(field,'value')||!field.enumerable||field.writable||field.configurable)fail('frozen enumerable own data required');append(pending,{value:field.value,depth:task.depth+1,exit:false});}
 }
}
function canonical(value){
 immutable(value);const pending=[];append(pending,value);
 while(pending.length){const current=pending[pending.length-1];pending.length--;ordinary(current);const tag=own(current,'$'),row=fields(current,tag==='Null'?['$']:['$','field0']);
  if(tag==='Null')continue;
  if(tag==='Bool'){if(typeof row.field0!=='boolean')fail('Bool domain');continue;}
  if(tag==='String'){if(typeof row.field0!=='string')fail('String domain');continue;}
  if(tag==='Number'){const number=fields(row.field0,['$','field0']),kind=number.$,n=number.field0;if(kind==='PosInt'&&typeof n==='bigint'&&n>=0n&&n<=U64_MAX||kind==='NegInt'&&typeof n==='bigint'&&n>=I64_MIN&&n<0n||kind==='Float'&&typeof n==='number'&&finite(n))continue;fail('Number i64 u64 finite-f64 domain');}
  if(tag==='Array'){if(!array(row.field0))fail('Array domain');for(let at=row.field0.length-1;at>=0;at--)append(pending,own(row.field0,''+at));continue;}
  if(tag==='Object'){const map=fields(row.field0,['$','entries']);if(map.$!=='Map'||!array(map.entries))fail('Map domain');let previous;
   for(let at=0;at<map.entries.length;at++){const entry=fields(own(map.entries,''+at),['$','key','value']);if(entry.$!=='MapEntry'||typeof entry.key!=='string'||previous!==undefined&&compare(previous,entry.key)>=0)fail('unique UTF8 ordered MapEntry keys required');previous=entry.key;append(pending,entry.value);}continue;}
  fail('unknown Json constructor');
 }
 return value;
}
/** Fully checked opaque carrier -> optional borrowed text. None has no Json. */
function optionalJsonReader(input,member){
 ordinary(input);const names=keys(input);
 if(names.length<1||names.length>2)fail('closed optional carrier required');
 for(let at=0;at<names.length;at++)if(names[at]!=='$'&&names[at]!=='field0')fail('closed optional carrier required');
 const tag=own(input,'$');
 if(tag==='None'){fields(input,['$']);return result('None');}
 if(tag!=='Some')fail('Some or None required');
 const carrier=fields(input,['$','field0']),value=canonical(carrier.field0);
 const kind=own(value,'$');
 if(member==='as_str')return kind==='String'?result('Some',own(value,'field0')):result('None');
 if(member==='as_bool')return kind==='Bool'?result('Some',own(value,'field0')):result('None');
 if(member==='as_null')return kind==='Null'?result('Some',null):result('None');
 if(member==='as_number')return kind==='Number'?result('Some',own(value,'field0')):result('None');
 if(member==='as_array')return kind==='Array'?result('Some',own(value,'field0')):result('None');
 if(member==='as_object')return kind==='Object'?result('Some',own(value,'field0')):result('None');
 if(member==='as_u64'||member==='as_i64'||member==='as_f64'){
  if(kind!=='Number')return result('None');const number=own(value,'field0'),tag=own(number,'$'),n=own(number,'field0');
  if(member==='as_f64')return result('Some',toFloat(n));
  if(member==='as_u64')return tag==='PosInt'?result('Some',n):result('None');
  return tag==='NegInt'||tag==='PosInt'&&n<=I64_MAX?result('Some',n):result('None');
 }
 fail('unknown fixed optional reader');
}

export function router_core_json_option_as_str(input){return optionalJsonReader(input,'as_str');}
export function router_core_json_option_as_bool(input){return optionalJsonReader(input,'as_bool');}
export function router_core_json_option_as_u64(input){return optionalJsonReader(input,'as_u64');}
export function router_core_json_option_as_i64(input){return optionalJsonReader(input,'as_i64');}
export function router_core_json_option_as_f64(input){return optionalJsonReader(input,'as_f64');}
export function router_core_json_option_as_null(input){return optionalJsonReader(input,'as_null');}
export function router_core_json_option_as_number(input){return optionalJsonReader(input,'as_number');}
export function router_core_json_option_as_array(input){return optionalJsonReader(input,'as_array');}
export function router_core_json_option_as_object(input){return optionalJsonReader(input,'as_object');}
