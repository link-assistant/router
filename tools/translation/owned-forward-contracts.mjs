// Shared DATA catalog. Actual original source/type/loan issuers remain required.
import {JSON_STATE_CONTRACTS} from './json-state-contracts.mjs';
import {JSON_FIELD_CONTRACTS} from './json-field-contracts.mjs';
import {OWNED_OUTCOME_CONTRACTS} from './owned-outcome-contracts.mjs';
import {JSON_STATE_NATIVE_SOURCE} from './json-state-native-source.mjs';
import {JSON_FIELDS_NATIVE_SOURCE} from './json-fields-native-source.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from './owned-outcome-native-source.mjs';
import {INTEGER_CONTRACTS} from './integer-contracts.mjs';
import {INTEGER_NATIVE_SOURCE} from './integer-native-source.mjs';
export const FORWARD_OWNED_CONTRACTS=Object.freeze([
 ...INTEGER_CONTRACTS.map(row=>Object.freeze({...row,family:'integer',source:INTEGER_NATIVE_SOURCE})),
 ...JSON_STATE_CONTRACTS.map(row=>Object.freeze({...row,family:'state',rustPath:'crate::translation_state_core::'+row.rustName,source:JSON_STATE_NATIVE_SOURCE})),
 ...JSON_FIELD_CONTRACTS.map(row=>Object.freeze({...row,family:'field',rustModule:'translation_json_fields_core',rustSource:row.nativeSource,returns:row.ret,source:JSON_FIELDS_NATIVE_SOURCE})),
 ...OWNED_OUTCOME_CONTRACTS.map(row=>Object.freeze({...row,family:'carrier',rustModule:'translation_carriers_core',rustSource:'src/translation_carriers_core.rs',runtimeModule:'owned-outcome-runtime.mjs',source:OWNED_OUTCOME_NATIVE_SOURCE,parameters:Object.freeze(row.parameters.map(role=>role==='json-text-result'?'shared-json-result':role==='json-owned-option'?'shared-json-option':role)),returns:row.returns})),
]);
export const forwardOwnedContract=name=>FORWARD_OWNED_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name)??null;
export {FORWARD_OWNED_CONTRACTS as JSON_STATE_CONTRACTS,forwardOwnedContract as jsonStateContract};
export function forwardOwnedImports(runtimeModule='./runtime/effects.mjs'){
 const groups=new Map();for(const row of FORWARD_OWNED_CONTRACTS){if(!groups.has(row.runtimeModule))groups.set(row.runtimeModule,[]);groups.get(row.runtimeModule).push(row.javascriptName);}
 return [...groups].map(([module,names])=>'import { '+names.map(name=>name+' as ml_host_'+name).join(', ')+' } from '+JSON.stringify(runtimeModule.replace(/effects\.mjs$/u,module))+';');
}
