// Mixed lexical argument roles for scalar source proposals only.
import {readCoreCarrierCallSource} from './core-carrier-call-source.mjs';
import {readJsonFieldCallSource} from './json-field-call-source.mjs';
import {readJsonReceiverWrittenSourceRole} from './json-receiver-source.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
export function readPrimitiveCoreParameterSourceRole(rows,scoped=null){
 const text=rows.map(row=>row.text).join(''),primitive=/^(?:(?:::)?(?:std|core)::primitive::)?([iu](?:8|16|32|64|128))$/u.exec(text);if(primitive&&primitiveBitwiseType(primitive[1]))return primitive[1];const json=readJsonReceiverWrittenSourceRole(rows,{jsonNames:scoped?.jsonNames??null});if(json)return json;if(/^&(?:'[A-Za-z_][A-Za-z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(text))return 'str';if(/^(?:(?:::)?std::string::)?String$/u.test(text))return 'text-owned';if(text==='bool')return 'bool';
 const option=/^(?:(?:::)?(?:std|core)::option::Option|Option|crate::translation_core::Maybe)<([\s\S]+)>$/u.exec(text);if(option){const payload=option[1]==='String'?'text-owned':primitiveBitwiseType(option[1])?option[1]:option[1]==='bool'?'bool':null;return payload?'option:'+payload:null;}
 const result=/^(?:(?:::)?(?:std|core)::result::Result|Result)<([^>]+),(?:(?:::)?std::string::)?String>$/u.exec(text);if(result){const payload=result[1]==='String'?'text':primitiveBitwiseType(result[1])?result[1]:result[1]==='bool'?'bool':null;return payload?'result:'+payload:null;}return null;
}
export function readPrimitiveCoreCallSource(rows,bindings){
 if(!Array.isArray(rows)||rows.length>128||rows[0]?.text!=='crate'||rows[1]?.text!=='::')return null;const scope={get(name){const domain=bindings.get(name);if(primitiveBitwiseType(domain)||['str','text-owned','bool'].includes(domain))return {kind:'payload',domain};if(typeof domain!=='string')return null;const found=/^(option|result):([a-z0-9-]+)$/u.exec(domain);return found?{kind:found[1],domain:found[2]}:null;}},core=readCoreCarrierCallSource(rows,scope)??readPrimitiveOptionCallbackCallSource(rows,scope),selected=core??readJsonFieldCallSource(rows,bindings);return selected?.kind==='payload'&&primitiveBitwiseType(selected.domain)?{kind:selected.domain,binding:null,operation:selected.operation,bridge:'complete-qualified-core-scalar-source',sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:null;
}

import {readPrimitiveOptionCallbackCallSource} from './primitive-option-callback-call-source.mjs';
