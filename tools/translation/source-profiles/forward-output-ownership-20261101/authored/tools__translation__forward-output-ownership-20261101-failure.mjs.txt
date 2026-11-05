// Failure inspection DATA only; never invoke a foreign getter/proxy and never
// turn an exact falsy/frozen primary into a property-access TypeError.
import {types} from 'node:util';
export function forwardFailureField(error,name){
 if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;
 const field=Object.getOwnPropertyDescriptor(error,name);return field&&Object.hasOwn(field,'value')?field.value:undefined;
}
