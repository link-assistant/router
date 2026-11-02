// Observed read-only projection of the canonical serde_json tagged ABI.
// This module never validates a whole JSON tree and never issues type/owner facts.
import {types} from 'node:util';
const isProxy=types.isProxy,descriptor=Object.getOwnPropertyDescriptor;
const arrayIsArray=Array.isArray,Missing=Symbol('missing JSON field');
const Failure=TypeError,floor=Math.floor,toText=String;
function field(value,key){
 if(value===null||typeof value!=='object'||isProxy(value))throw new Failure('Observed JSON node must be an ordinary nonproxy object');
 const entry=descriptor(value,key);
 if(!entry||!('value' in entry))throw new Failure('Observed JSON ABI field must be own data');
 return entry.value;
}
function tag(value){
 const kind=field(value,'$');
 if(kind!=='Null'&&kind!=='Bool'&&kind!=='Number'&&kind!=='String'&&kind!=='Array'&&kind!=='Object')throw new Failure('Unknown observed JSON constructor');
 return kind;
}
function get(value,key){
 if(tag(value)!=='Object')return Missing;
 const map=field(value,'field0');if(field(map,'$')!=='Map')throw new Failure('Observed JSON object must contain its canonical map');
 const entries=field(map,'entries');if(isProxy(entries)||!arrayIsArray(entries))throw new Failure('Observed JSON map entries must be a real array');
 const length=field(entries,'length');let low=0,high=length;
 // Canonical constructor ordering is an INPUT ABI, not established by this search.
 // Keys queried here are ASCII; scalar/UTF8 and UTF16 order agree against them.
 while(low<high){
  const index=low+floor((high-low)/2),entry=field(entries,toText(index));
  if(field(entry,'$')!=='MapEntry')throw new Failure('Observed JSON map entry required');
  const found=field(entry,'key');if(typeof found!=='string')throw new Failure('Observed JSON map key must be text');
  if(found===key)return field(entry,'value');
  if(found<key)low=index+1;else high=index;
 }
 return Missing;
}
function text(value){
 if(value===Missing||tag(value)!=='String')return Missing;
 const result=field(value,'field0');if(typeof result!=='string')throw new Failure('Observed JSON string must be text');return result;
}
export function borrowedJsonToolIsTranslatable(tool){
 const observed=text(get(tool,'type')),kind=observed===Missing?'function':observed;
 if(kind==='web_search'||kind==='web_fetch')return true;
 if(kind!=='function')return false;
 const nested=get(tool,'function'),owner=nested===Missing?tool:nested;
 const name=text(get(owner,'name'));return name!==Missing&&name.length!==0;
}
