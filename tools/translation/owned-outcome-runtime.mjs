// Bounded immutable carrier implementations. Native internals stay native.
import {types} from 'node:util';
import {json_macro_value,json_macro_string} from './json-macro-runtime.mjs';
const fail=message=>{throw new TypeError('Owned JSON carrier: '+message);};
const text=value=>{json_macro_string(value);return value;};
const none=Object.freeze({$:'None'}),some=value=>Object.freeze({$:'Some',field0:json_macro_value(value)});
const ok=value=>Object.freeze({$:'Ok',field0:json_macro_value(value)}),err=value=>Object.freeze({$:'Err',field0:text(value)});
function carrier(value,tags){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary carrier data required');
 const fields=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(fields),tag=fields.$;
 if(!tag||!Object.hasOwn(tag,'value')||!tag.enumerable||!tags.includes(tag.value))fail('actual closed variant required');
 const payload=tag.value!=='None';if(names.length!==(payload?2:1)||names.some(name=>name!=='$'&&name!=='field0'))fail('exact carrier fields required');
 if(payload){const field=fields.field0;if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('ordinary payload required');return tag.value==='Err'?err(field.value):tag.value==='Ok'?ok(field.value):some(field.value);}
 return none;
}
export const router_carrier_json_ok=ok;
export const router_carrier_json_err=err;
export const router_carrier_json_result_copy=value=>carrier(value,['Ok','Err']);
export function router_carrier_json_result_or(value,fallback){const result=carrier(value,['Ok','Err']),otherwise=json_macro_value(fallback);return result.$==='Ok'?json_macro_value(result.field0):otherwise;}
export function router_carrier_json_option_to_result(value,error){const result=carrier(value,['Some','None']),message=text(error);return result.$==='Some'?ok(result.field0):err(message);}
export function router_carrier_json_result_to_option(value){const result=carrier(value,['Ok','Err']);return result.$==='Ok'?some(result.field0):none;}
export const router_carrier_json_some=some;
export const router_carrier_json_none=()=>none;
export function router_carrier_json_option_or(value,fallback){const result=carrier(value,['Some','None']),otherwise=json_macro_value(fallback);return result.$==='Some'?json_macro_value(result.field0):otherwise;}
