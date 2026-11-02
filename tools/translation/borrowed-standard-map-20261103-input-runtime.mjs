// Shared-map INPUT shape guard only. It never certifies unobserved entries.
import {types} from 'node:util';
const isMap=types.isMap,isProxy=types.isProxy;
export function borrowedStandardMapInput(value){
 if(isProxy(value)||!isMap(value))throw TypeError('Original shared standard-map input requires native Map slots');
 return true;
}
