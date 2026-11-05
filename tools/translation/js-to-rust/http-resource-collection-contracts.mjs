// Actual matching library ABI DATA. Whole source checks issue callback flows.
import {JSON_ITERATION_CONTRACTS} from '../json-iteration-contracts.mjs';
import {ownedCollectionOperation} from './owned-collections-contracts.mjs';
const domains=Object.freeze({'shared-json':'json-ref','shared-json-list':'json-list-ref','owned-json':'json','owned-json-list':'json-list-owned','owned-json-option':'optional:json',bool:'bool'});
const callback=(args,ret)=>Object.freeze({args:Object.freeze([...args]),ret});
export function httpResourceCollectionContracts(){
 const common={family:'json-collection',async:false,borrowedResult:false,rootArgument:null,release:null,sourceAuthority:false,semanticAuthority:false},rows=[];
 for(const name of ['router_core_json_map','router_core_json_filter_map']){const original=ownedCollectionOperation(name);if(!original)throw new TypeError('Actual original collection operation required');rows.push({...common,javascriptName:name,rustName:original.rust,rustPath:'crate::translation_core::'+original.rust,runtimeModule:'json-collections-runtime.mjs',args:['json-list-ref','json-callback'],ret:'json-list-owned',callbackContract:callback(['json-ref'],name==='router_core_json_map'?'json':'optional:json')});}
 for(const row of JSON_ITERATION_CONTRACTS){const args=row.parameters.map(type=>type==='callback'?'json-callback':domains[type]),parameters=row.callbackParameters.map(type=>domains[type]),ret=domains[row.returns],callbackReturn=domains[row.callbackReturns];if(args.some(type=>!type)||parameters.some(type=>!type)||!ret||!callbackReturn)throw new TypeError('Every actual collection domain needs an explicit mapping');rows.push({...row,...common,args,ret,rustPath:'crate::translation_collections_core::'+row.rustName,callbackContract:callback(parameters,callbackReturn)});}
 return rows;
}
