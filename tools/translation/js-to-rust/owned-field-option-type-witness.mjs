// Type-source selection DATA only. Callers supply their freshly privately
// reissued complete program/context. This cannot issue an item or a namespace.
import {ownedJsonFieldOperation,requireOwnedJsonFieldSources} from './owned-json-fields.mjs';
export function ownedFieldTextOptionTypeWitness(program,data){
 const target=data.runtimeRoot+'/json-fields-runtime.mjs';let candidate=null,cells=0,items=0;
 if(program.length>4096)throw new TypeError('Complete field type witness program bound');search:for(const item of program){if(++items>4096)throw new TypeError('Complete field type witness program bound');for(const call of item.hostCalls){if(++cells>100000)throw new TypeError('Complete field type witness call bound');if(call.target===target&&ownedJsonFieldOperation(call.name)?.ret==='text-owned-option'){candidate=call.name;break search;}}}
 if(candidate===null)return null;requireOwnedJsonFieldSources(new Map(data.files.map(row=>[row.path,row.source])),data);return candidate;
}
export function ownedFieldTextOptionTypeLibrary(files,data){requireOwnedJsonFieldSources(files,data);return 'json-fields';}
