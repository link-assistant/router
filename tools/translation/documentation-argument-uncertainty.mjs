// Conservative source DATA only; no original owner or executable permission.
import {types} from 'node:util';
/** Conservative uncertainty only; this classifier cannot grant authority. */
export function documentationArgumentMayExportMacros(attribute){
 if(!attribute||typeof attribute!=='object'||types.isProxy(attribute))return true;
 const name=Object.getOwnPropertyDescriptor(attribute,'name');if(!name||!Object.hasOwn(name,'value'))return true;if(name.value!=='doc')return false;
 const field=Object.getOwnPropertyDescriptor(attribute,'tokens'),tokens=field&&Object.hasOwn(field,'value')?field.value:null;if(!Array.isArray(tokens)||types.isProxy(tokens)||Object.getPrototypeOf(tokens)!==Array.prototype)return true;
 const size=Object.getOwnPropertyDescriptor(tokens,'length');if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<1||size.value>32000)return true;
 const read=index=>{const row=Object.getOwnPropertyDescriptor(tokens,String(index));return row&&Object.hasOwn(row,'value')?row.value:null;};
 let first=0,last=size.value;if(read(0)==='#'){first=read(1)==='!'?3:2;if(read(first-1)!=='['||read(last-1)!==']')return true;last--;}if(read(first)!=='doc')return true;const width=last-first;if(width===1||read(first+1)==='(')return false;if(read(first+1)!=='=')return true;
 const literal=read(first+2);return !(width===3&&typeof literal==='string'&&literal.startsWith('"')&&literal.endsWith('"'));
}

