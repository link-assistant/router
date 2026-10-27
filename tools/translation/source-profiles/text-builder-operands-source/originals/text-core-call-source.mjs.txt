// Shared text result source candidates across real core and callback syntax.
// Encoded lexical roles grant no binding, type, lifetime or executable authority.
import {readCoreCarrierCallSource} from './core-carrier-call-source.mjs';
import {readCoreCallbackCallSource} from './core-callback-call-source.mjs';
import {readPrimitiveSourceBindingRole} from './primitive-core-call-source.mjs';
import {readJsonFieldCallSource} from './json-field-call-source.mjs';
export function readTextCoreCallSource(rows,bindings){
 if(!Array.isArray(rows)||!rows.length||rows.length>128)return null;const scope={get:name=>readPrimitiveSourceBindingRole(bindings.get(name))},role=readCoreCarrierCallSource(rows,scope)??readCoreCallbackCallSource(rows,scope)??readJsonFieldCallSource(rows,bindings);if(role?.kind!=='payload'||!['str','text-owned'].includes(role.domain))return null;
 return {kind:role.domain,binding:role.binding??null,bridge:'complete-shared-text-carrier-call-source',tryProjection:role.tryProjection===true,tryTypeProved:false,sourceBindingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
