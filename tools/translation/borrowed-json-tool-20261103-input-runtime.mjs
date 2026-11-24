// Observed input shape only; not whole JSON validation or an owner certificate.
import {types} from 'node:util';
const proxy=types.isProxy,descriptor=Object.getOwnPropertyDescriptor;
export function borrowedJsonToolInput(value){
 if(value===null||typeof value!=='object'||proxy(value))throw TypeError('Original canonical JSON input must be a nonproxy object');const tag=descriptor(value,'$');if(!tag||!Object.hasOwn(tag,'value')||!['Null','Bool','Number','String','Array','Object'].includes(tag.value))throw TypeError('Own original JSON constructor tag required');return true;
}
