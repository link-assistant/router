// Operational error inspection only. Never source/type/namespace authority.
import {types} from 'node:util';
export function ownSourceFailureField(value,name){
 if(typeof name!=='string'&&typeof name!=='symbol')return undefined;
 if(value===null||!['object','function'].includes(typeof value)||types.isProxy(value))return undefined;
 const field=Object.getOwnPropertyDescriptor(value,name);return field&&Object.hasOwn(field,'value')?field.value:undefined;
}
