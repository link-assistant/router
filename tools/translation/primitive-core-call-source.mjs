// Mixed lexical argument roles for scalar source proposals only.
import {readCoreCarrierCallSource} from './core-carrier-call-source.mjs';
import {readJsonFieldCallSource} from './json-field-call-source.mjs';
import {readJsonReceiverWrittenSourceRole} from './json-receiver-source.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
export function readPrimitiveCoreParameterSourceRole(rows,scoped=null){
 function scalar(source){const integer=/^(?:(?:::)?(?:std|core)::primitive::)?([iu](?:8|16|32|64|128))$/u.exec(source);if(integer&&primitiveBitwiseType(integer[1]))return integer[1];if(/^&(?:'[A-Za-z_][A-Za-z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(source))return 'str';if(/^(?:(?:::)?std::string::)?String$/u.test(source))return 'text-owned';return /^(?:(?:::)?(?:std|core)::primitive::)?bool$/u.test(source)?'bool':null;}
 const text=rows.map(row=>row.text).join(''),primitive=/^(?:(?:::)?(?:std|core)::primitive::)?([iu](?:8|16|32|64|128))$/u.exec(text);if(primitive&&primitiveBitwiseType(primitive[1]))return primitive[1];const json=readJsonReceiverWrittenSourceRole(rows,{jsonNames:scoped?.jsonNames??null});if(json)return json;if(/^&(?:'[A-Za-z_][A-Za-z0-9_]*)?(?:str|crate::translation_core::Str)$/u.test(text))return 'str';if(/^(?:(?:::)?std::string::)?String$/u.test(text))return 'text-owned';if(/^(?:(?:::)?(?:std|core)::primitive::)?bool$/u.test(text))return 'bool';
 const option=/^(?:(?:::)?(?:std|core)::option::Option|Option|crate::translation_core::Maybe)<([\s\S]+)>$/u.exec(text);if(option){const payload=scalar(option[1]);return payload?'option:'+payload:null;}
 const result=/^(?:(?:::)?(?:std|core)::result::Result|Result)<([^>]+),(?:(?:::)?std::string::)?String>$/u.exec(text);if(result){const actual=scalar(result[1]),payload=actual==='text-owned'?'text':actual;return payload?'result:'+payload:null;}return null;
}
export function readPrimitiveCoreCallSource(rows,bindings){
 if(!Array.isArray(rows)||!rows.length||rows.length>128)return null;const scope={get:name=>readPrimitiveSourceBindingRole(bindings.get(name))},core=readCoreCarrierCallSource(rows,scope)??readCoreCallbackCallSource(rows,scope),selected=core??readJsonFieldCallSource(rows,bindings);return selected?.kind==='payload'&&primitiveBitwiseType(selected.domain)?{kind:selected.domain,binding:null,operation:selected.operation,bridge:'complete-qualified-core-scalar-source',sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:null;
}

import {readCoreCallbackCallSource} from './core-callback-call-source.mjs';

// Closed encoded lexical source roles only; no current binding/type permission.
export function readPrimitiveSourceBindingRole(domain){
 if(primitiveBitwiseType(domain)||['str','text-owned','bool'].includes(domain))return {kind:'payload',domain};if(typeof domain!=='string')return null;const found=/^(option|result):([a-z0-9-]+)$/u.exec(domain);if(!found)return null;const [,kind,payload]=found;if(!primitiveBitwiseType(payload)&&!['bool','str','text-owned',...(kind==='result'?['text']:[])].includes(payload))return null;return {kind,domain:payload};
}

// Mixed immutable local source roles preserve prerequisites for scalar callers.
// A role remains DATA and supplies no native/source/semantic permission.
export function readPrimitiveCoreRoleSource(rows,bindings){
 if(!Array.isArray(rows)||!rows.length||rows.length>128)return null;const scope={get:name=>readPrimitiveSourceBindingRole(bindings.get(name))};let selected=readCoreCarrierCallSource(rows,scope)??readCoreCallbackCallSource(rows,scope)??readJsonFieldCallSource(rows,bindings),binding=null;
 if(!selected&&rows.length===1){const row=rows[0];if(row.type==='ident'){selected=scope.get(row.text);if(selected)binding=row.text;}if(!selected&&row.type==='string'&&/^(?:"|r#{0,255}")/u.test(row.text))selected={kind:'payload',domain:'str'};if(!selected&&['true','false'].includes(row.text))selected={kind:'payload',domain:'bool'};}
 if(!selected)return null;const encoded=selected.kind==='payload'?selected.domain:['option','result'].includes(selected.kind)?selected.kind+':'+selected.domain:null;if(!readPrimitiveSourceBindingRole(encoded))return null;return {kind:encoded,binding:selected.binding??binding,operation:selected.operation??null,bridge:'complete-mixed-immutable-core-role-source',sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
