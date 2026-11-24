// Independent native HTTP caller SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-sources.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
import {HTTP_PROTOCOL_NATIVE_SOURCE} from '../http-protocol-native-source.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../owned-result-native-source.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../owned-outcome-native-source.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {json_macro_array as array,json_macro_string as text,json_macro_object as object,json_macro_u64 as integer} from '../json-macro-runtime.mjs';
import {verifyTypedTargets} from './text-typed-targets.mjs';
const limits={timeout:60000},H='crate::translation_http_protocol_core::',J='crate::translation_core::Json',inputs={manifest:readFileSync(new URL('../../../rust/Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')};
const caller=`pub fn normalized(value:&${J})->Result<${J},String>{${H}http_headers_normalize(value)}
pub fn values(value:&${J},name:&str)->Result<${J},String>{${H}http_headers_get_all(value,name)}
pub fn appended(value:&${J},name:&str,bytes:&str)->Result<${J},String>{${H}http_headers_append(value,name,bytes)}
pub fn replaced(value:&${J},name:&str,bytes:&str)->Result<${J},String>{${H}http_headers_set(value,name,bytes)}
pub fn removed(value:&${J},name:&str)->Result<${J},String>{${H}http_headers_remove(value,name)}
pub fn requested(method:&str,url:&str,headers:&${J},body:&str)->Result<${J},String>{${H}http_request(method,url,headers,body)}
pub fn responded(code:u64,headers:&${J},body:&str)->Result<${J},String>{${H}http_response(code,headers,body)}
pub fn code(value:&${J})->Result<u64,String>{${H}http_status(value)}
pub fn successful(value:&${J})->Result<bool,String>{${H}http_is_success(value)}
pub fn bytes(value:&${J})->Result<&str,String>{${H}http_body_base64(value)}
pub fn body_text(value:&${J})->Result<String,String>{${H}http_body_text(value)}
pub fn body_json(value:&${J})->Result<${J},String>{${H}http_body_json(value)}
`;
function project(source=caller,changes={}){const files={'src/lib.rs':'pub mod translation_core;\npub mod translation_text_core;\npub mod translation_owned_results_core;\npub mod translation_carriers_core;\npub mod translation_http_protocol_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_text_core.rs':TEXT_NATIVE_SOURCE,'src/translation_owned_results_core.rs':OWNED_RESULT_NATIVE_SOURCE,'src/translation_carriers_core.rs':OWNED_OUTCOME_NATIVE_SOURCE,'src/translation_http_protocol_core.rs':HTTP_PROTOCOL_NATIVE_SOURCE,...changes};return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(inputs),deriveDependencies:loadDeriveDependencyProof(inputs),cargoManifest:inputs.manifest,compilationProfile:PRODUCTION_PROFILE});}
test('all twelve actual native HTTP callers preserve values in JavaScript and strict TypeScript',limits,async()=>{const result=project();for(const name of ['normalized','values','appended','replaced','removed','requested','responded','code','successful','bytes','body_text','body_json'])assert.ok(result.meta.executable.some(row=>row.name===name),JSON.stringify(result.meta.refused));await verifyTypedTargets(result,api=>{const empty=array([]),headers=array([array([text('X-A'),text('YQ==')]),array([text('x-a'),text('')])]),response=object([['kind',text('response')],['status',integer(206n)],['headers',empty],['body_base64',text('bnVsbA==')]]);assert.deepEqual(api.values(headers,'X-A'),{$:'Ok',field0:array([text('YQ=='),text('')])});assert.deepEqual(api.removed(headers,'x-a'),{$:'Ok',field0:empty});assert.deepEqual(api.appended(empty,'x',''),{$:'Ok',field0:array([array([text('x'),text('')])])});assert.deepEqual(api.code(response),{$:'Ok',field0:206n});assert.deepEqual(api.successful(response),{$:'Ok',field0:true});assert.deepEqual(api.bytes(response),{$:'Ok',field0:'bnVsbA=='});assert.deepEqual(api.body_text(response),{$:'Ok',field0:'null'});assert.deepEqual(api.body_json(response),{$:'Ok',field0:{$:'Null'}});assert.deepEqual(api.requested('GET','https://@example.test',empty,''),{$:'Err',field0:'invalid HTTP URL'});assert.deepEqual(api.responded(99n,empty,''),{$:'Err',field0:'invalid HTTP status'});},{childTimeoutMs:20000});});
test('HTTP actual JSON domains complete source and retained loan identity remain mandatory',limits,()=>{for(const source of [`pub fn wrong(value:bool)->Result<u64,String>{${H}http_status(value)}`,`pub fn wrong<'a,'b>(left:&'a ${J},right:&'b ${J})->Result<&'a str,String>{${H}http_body_base64(right)}`,`pub fn wrong(value:&${J})->Result<bool,String>{${H}http_status(value)}`])assert.equal(project(source).meta.executable.some(row=>row.name==='wrong'),false);for(const name of ['translation_http_protocol_core','translation_owned_results_core','translation_carriers_core','translation_text_core'])assert.equal(project(caller,{['src/'+name+'.rs']:'// changed complete source\n'}).meta.executable.some(row=>row.name==='code'),false);});
