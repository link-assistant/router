// Independent HTTP caller SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {TEXT_NATIVE_SOURCE} from '../../text-native-source.mjs';
import {OWNED_RESULT_NATIVE_SOURCE} from '../../owned-result-native-source.mjs';
import {OWNED_OUTCOME_NATIVE_SOURCE} from '../../owned-outcome-native-source.mjs';
import {HTTP_PROTOCOL_NATIVE_SOURCE} from '../../http-protocol-native-source.mjs';
import {json_macro_array as array,json_macro_string as text,json_macro_object as object,json_macro_u64 as integer} from '../../json-macro-runtime.mjs';
import {createOwnedOutcomeContext,ownedOutcomeRuntimeSources,translateOwnedOutcomeJavaScript,translateOwnedOutcomeTypeScript,prepareOwnedOutcomeRuntime,evaluateOwnedOutcome,evaluateOwnedOutcomeBatch} from '../owned-outcome.mjs';
import {translateOwnedOutcomeRust} from '../owned-outcome-rust.mjs';
import {prepareOwnedHttpProtocolSources} from '../../prepare-owned-http-protocol-sources.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../../',import.meta.url));
const source=`import {router_http_headers_normalize as normalize,router_http_headers_get_all as all,router_http_headers_append as append,router_http_headers_set as set,router_http_headers_remove as remove,router_http_request as request,router_http_response as response,router_http_status as status,router_http_is_success as success,router_http_body_base64 as encoded,router_http_body_text as decoded,router_http_body_json as parsed} from './runtime/http-protocol-runtime.mjs';
/** @param {Parameters<typeof normalize>[0]} value */
export function normalized(value){return normalize(value);}
/** @param {Parameters<typeof all>[0]} value @param {string} name */
export function values(value,name){return all(value,name);}
/** @param {Parameters<typeof append>[0]} value @param {string} name @param {string} bytes */
export function appended(value,name,bytes){return append(value,name,bytes);}
/** @param {Parameters<typeof set>[0]} value @param {string} name @param {string} bytes */
export function replaced(value,name,bytes){return set(value,name,bytes);}
/** @param {Parameters<typeof remove>[0]} value @param {string} name */
export function removed(value,name){return remove(value,name);}
/** @param {string} method @param {string} url @param {Parameters<typeof request>[2]} headers @param {string} body */
export function requested(method,url,headers,body){return request(method,url,headers,body);}
/** @param {Parameters<typeof response>[0]} code @param {Parameters<typeof response>[1]} headers @param {string} body */
export function responded(code,headers,body){return response(code,headers,body);}
/** @param {Parameters<typeof status>[0]} value */
export function code(value){return status(value);}
/** @param {Parameters<typeof success>[0]} value */
export function successful(value){return success(value);}
/** @param {Parameters<typeof encoded>[0]} value */
export function bytes(value){return encoded(value);}
/** @param {Parameters<typeof decoded>[0]} value */
export function bodyText(value){return decoded(value);}
/** @param {Parameters<typeof parsed>[0]} value */
export function bodyJson(value){return parsed(value);}
`;
function input(caller=source,path='caller.mjs'){
 const data=ownedStateReceivingData([{path,source:caller}]);data.files=data.files.filter(row=>!row.path.startsWith('runtime/')).concat(ownedOutcomeRuntimeSources());for(const [name,source]of [['translation_text_core',TEXT_NATIVE_SOURCE],['translation_owned_results_core',OWNED_RESULT_NATIVE_SOURCE],['translation_carriers_core',OWNED_OUTCOME_NATIVE_SOURCE],['translation_http_protocol_core',HTTP_PROTOCOL_NATIVE_SOURCE]]){data.files.find(row=>row.path==='src/lib.rs').source+='pub mod '+name+';\n';data.files.push({path:'src/'+name+'.rs',source});}return data;
}
const ok=field0=>({$:'Ok',field0}),err=field0=>({$:'Err',field0}),empty=array([]),headers=array([array([text('X-A'),text('YQ==')]),array([text('x-a'),text('')])]);
const response=(code,bytes)=>object([['kind',text('response')],['status',integer(code)],['headers',empty],['body_base64',text(bytes)]]);
const cases=[['normalized',[headers],ok(array([array([text('x-a'),text('YQ==')]),array([text('x-a'),text('')])]))],['values',[headers,'X-A'],ok(array([text('YQ=='),text('')]))],['values',[headers,'absent'],ok(empty)],['appended',[empty,'X-Empty',''],ok(array([array([text('x-empty'),text('')])]))],['replaced',[headers,'X-A','Yg=='],ok(array([array([text('x-a'),text('Yg==')])]))],['removed',[headers,'X-A'],ok(empty)],['requested',['GET','https://user@example.test',empty,''],err('invalid HTTP URL')],['responded',[200n,empty,''],ok(response(200n,''))],['code',[response(999n,'')],ok(999n)],['successful',[response(299n,'')],ok(true)],['successful',[response(300n,'')],ok(false)],['bytes',[response(200n,'AAE=')],ok('AAE=')],['bodyText',[response(200n,'')],ok('')],['bodyText',[response(200n,'77u/w6nwn5iA')],ok('\ufeffé😀')],['bodyText',[response(200n,'/w==')],err('invalid HTTP UTF8 body')],['bodyJson',[response(200n,'bnVsbA==')],ok({$:'Null'})],['bodyJson',[response(200n,'MTg0NDY3NDQwNzM3MDk1NTE2MTU=')],ok(integer(18446744073709551615n))]];
test('HTTP actual JS strict TS and both checked interpreters preserve independent value cases',limits,async t=>{
 const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),directory=mkdtempSync(join(tmpdir(),'router-http-callers-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};for(const file of data.files.filter(row=>/\.(mjs|mts|ts)$/u.test(row.path)))write(file.path,file.source);write('typed.mts',result.typescript);execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'typed.mts')],{cwd:root,stdio:'pipe',timeout:20000});for(const file of data.files.filter(row=>row.path.startsWith('runtime/')))write('out/'+file.path,file.source);
 for(const path of ['caller.mjs','out/typed.mjs']){const api=await import(pathToFileURL(join(directory,path)).href);for(const [name,args,expected]of cases)assert.deepEqual(api[name](...args),expected);}const token=await prepareOwnedOutcomeRuntime(result.program);for(const [name,args,expected]of cases)assert.deepEqual(evaluateOwnedOutcome(result.program,name,args,token),expected);assert.deepEqual(evaluateOwnedOutcomeBatch(result.program,cases.map(([name,args])=>[name,args]),token),cases.map(row=>row[2]));
});
test('HTTP typed and canonical Rust sources independently reproduce all checked caller bodies',limits,()=>{
 const data=input(),result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}),typed=translateOwnedOutcomeTypeScript(result.typescript,{context:createOwnedOutcomeContext(input(result.typescript,'caller.mts')),sourcePath:'caller.mts'});assert.ok(sameRustSourceSyntax(result.rust,typed.rust));const inverse=translateOwnedOutcomeRust(result.rust,{context:createOwnedOutcomeContext({...data,files:[...data.files,{path:'caller.rs',source:result.rust}]}),sourcePath:'caller.rs',javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,inverse.rust));assert.equal(inverse.ownedRustSourceHistory.equation.inverse,result.rust);
});
test('HTTP source dependency and borrow forgery cannot gain executable authority',limits,async()=>{
 for(const path of ['src/translation_http_protocol_core.rs','src/translation_owned_results_core.rs','src/translation_carriers_core.rs','runtime/http-protocol-runtime.mjs','runtime/http-protocol-runtime.d.mts']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(data),sourcePath:'caller.mjs'}));}const dependency=input();dependency.files.find(row=>row.path==='Cargo.lock').source=dependency.files.find(row=>row.path==='Cargo.lock').source.replace('version = "0.13.5"','version = "0.13.4"');assert.throws(()=>translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(dependency),sourcePath:'caller.mjs'}));const wrong=source.replace('return status(value);','return status(false);');assert.throws(()=>translateOwnedOutcomeJavaScript(wrong,{context:createOwnedOutcomeContext(input(wrong)),sourcePath:'caller.mjs'}));const dangling=source.replace('return encoded(value);',"return encoded(response(200n,value,''));");assert.throws(()=>translateOwnedOutcomeJavaScript(dangling,{context:createOwnedOutcomeContext(input(dangling)),sourcePath:'caller.mjs'}));const result=translateOwnedOutcomeJavaScript(source,{context:createOwnedOutcomeContext(input()),sourcePath:'caller.mjs'});await assert.rejects(()=>prepareOwnedOutcomeRuntime(JSON.parse(JSON.stringify(result.program))));
});
test('complete HTTP source substitutions keep originals inverses and both ordered phases',limits,()=>{const plan=prepareOwnedHttpProtocolSources();assert.ok(plan.files.some(row=>row.path.endsWith('/owned-http-protocol-emission.mjs')));for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);});
