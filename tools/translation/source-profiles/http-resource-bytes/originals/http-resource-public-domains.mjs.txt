// Signature DATA only. Actual source bindings, full bodies and current matching
// libraries must independently establish every use and complete outcome.
import {httpResourceCallerContract,httpResourceCallerOperationNames,httpResourceResult,httpResourceResultOwnsDisposal} from './http-resource-caller-contracts.mjs';
import {httpResourceOption} from './http-resource-options.mjs';

function ownedValue(type,depth=0){
 if(typeof type!=='string'||depth>8)return false;
 if(['unit','bool','u64','text-owned','json','json-list-owned'].includes(type))return true;
 const optional=httpResourceOption(type),result=httpResourceResult(type);
 return !!optional&&ownedValue(optional.value,depth+1)||!!result&&ownedValue(result.value,depth+1);
}
export function httpResourcePublicInputDomain(type,{guarded=false}={}){
 if(typeof type!=='string'||type==='u64'&&!guarded)return false;
 if(['str','bool','u64','cancel-ref','sender-ref','receiver-mut','http-client-ref','http-client-mut','http-stream-ref','http-stream-mut','json-ref','json-list-ref'].includes(type))return true;
 return ownedValue(type)&&!httpResourceResultOwnsDisposal(type);
}
export function httpResourceOwnedSignatureDomain(type){return ownedValue(type)&&!httpResourceResultOwnsDisposal(type);}
export function httpResourcePublicInputType(type,operation){
 const primitive={str:'string',bool:'boolean',u64:'bigint'}[type];if(primitive)return primitive;
 const reference={'cancel-ref':['router_cancel_is_set',0],'sender-ref':['router_async_send',0],'receiver-mut':['router_async_receive',0],'http-client-ref':['router_http_transport_open',0],'http-client-mut':['router_http_transport_client_dispose',0],'http-stream-ref':['router_http_transport_head',0],'http-stream-mut':['router_http_transport_read',0],'json-ref':['router_http_status',0],'json-list-ref':['router_state_json_values_copy',0]}[type];
 if(reference)return 'Parameters<typeof '+operation(reference[0])+'>['+reference[1]+']';
 if(!httpResourceOwnedSignatureDomain(type))throw new TypeError('Actual public input needs an independent source domain rule');
 const preferred={'text-owned':'router_text_repeat',json:'router_core_json_copy','json-list-owned':'router_state_json_values_copy'}[type],rows=httpResourceCallerOperationNames().map(httpResourceCallerContract),selected=preferred?rows.find(row=>row.javascriptName===preferred&&row.ret===type):rows.find(row=>row.ret===type&&!row.borrowedResult&&!row.nativeForm);
 if(!selected)throw new TypeError('Public owned domain needs an actual complete matching operation signature');
 const query='ReturnType<typeof '+operation(selected.javascriptName)+'>';return selected.async?'Awaited<'+query+'>':query;
}
