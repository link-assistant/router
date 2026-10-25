// Explicit nested-result adaptation. Qualified callers prove by-value moves.
import {types} from 'node:util';
const messages=Object.freeze({Cancelled:'HTTP operation cancelled',Timeout:'HTTP operation timed out',Closed:'HTTP operation channel closed',Resource:'HTTP operation resource limit',InvalidInput:'HTTP operation invalid input'});
function fields(value,expected){
 if(!value||typeof value!=='object'||types.isProxy(value)||![null,Object.prototype].includes(Object.getPrototypeOf(value)))throw new TypeError('Ordinary deadline result variant required');
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);if(keys.length!==expected.length||keys.some(key=>typeof key!=='string'||!expected.includes(key)||!Object.hasOwn(fields[key],'value')))throw new TypeError('Complete own deadline result data required');return fields;
}
function flattened(value){
 const outer=fields(value,['$','field0']),tag=outer.$.value;
 if(tag==='Err'){const error=fields(outer.field0.value,['$']),kind=error.$.value;if(typeof kind!=='string'||!Object.hasOwn(messages,kind))throw new TypeError('Actual complete control error variant required');return Object.freeze({$:'Err',field0:messages[kind]});}
 if(tag!=='Ok')throw new TypeError('Actual nested deadline Result required');const result=outer.field0.value,inner=fields(result,['$','field0']);if(inner.$.value!=='Ok'&&inner.$.value!=='Err'||inner.$.value==='Err'&&typeof inner.field0.value!=='string')throw new TypeError('Actual transport Result required');return result;
}
export const router_http_deadline_flatten_open=value=>flattened(value);
export const router_http_deadline_flatten_read=value=>flattened(value);
export const router_http_deadline_flatten_send=value=>flattened(value);
