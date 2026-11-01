// Whole actual-library additive probes. Descriptions select syntax, never authority.
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Actual ClientKind static callers: '+message);};
export const CLIENT_STATIC_MODULE='__client_static_producer_20261101';
export const CLIENT_STATIC_OPERATIONS=Object.freeze([
 ['integration',"&'static crate::clients::ClientIntegration"],['command',"&'static str"],['display_name',"&'static str"],['dialect',"&'static str"],['token_env',"Option<&'static str>"],['base_url_env',"Option<&'static str>"],['setup_limitation',"Option<&'static str>"],['canonical_name',"&'static str"],['legacy_name',"&'static str"],
].map(([name,returnSource])=>Object.freeze({name,returnSource,qualifiedName:CLIENT_STATIC_MODULE+'.'+name})));
export function proposeClientStaticCallers(entry,before,options={}){
 accountData({entry,before,options});if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>key!=='commandCallee'))fail('own closed operation options required');const commandCallee=Object.hasOwn(options,'commandCallee')?options.commandCallee:'command';if(!['rust/src/lib.rs','src/lib.rs'].includes(entry)||typeof before!=='string'||before.length>8388608||Buffer.byteLength(before)>8388608||before.includes(CLIENT_STATIC_MODULE)||!['command','display_name'].includes(commandCallee))fail('whole bounded original library and closed caller edit required');
 const selections=CLIENT_STATIC_OPERATIONS.map(row=>{const callee=row.name==='command'?commandCallee:row.name,body='pub fn '+row.name+'(input:crate::clients::ClientKind)->'+row.returnSource+'{input.'+callee+'()}';return {...row,callee,body};});
 const after=before+'\n// Whole-owner static accessor receiving proposals; original declarations unchanged.\npub mod '+CLIENT_STATIC_MODULE+' {\n'+selections.map(row=>row.body).join('\n')+'\n}\n';if(after.length>8388608||Buffer.byteLength(after)>8388608)fail('original whole-library source bound');
 const history=transportConcreteSourceEquations([{before,after,language:'Rust'}])[0];if(history.inverse!==before||transportConcreteSyntaxMeta(history.beforeMeta).source!==before||transportConcreteSyntaxMeta(history.afterMeta).source!==after||history.trace.map(row=>row.phase).join(',')!=='language,repository')fail('full original source/CST/inverse differs');
 const result={schema:'whole-client-static-callers-v1',path:entry,before,after,history,selections,originalOwnersExtracted:false,sourceAuthority:false,semanticAuthority:false};accountData(result);return result;
}
