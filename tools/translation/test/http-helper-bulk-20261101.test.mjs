// Independent source/receiving/outcome-sensitive resource cases. Entirely UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpHelperBulkJavaScript,translateHttpHelperBulkTypeScript} from '../http-helper-bulk-20261101.mjs';
import {translateHttpResourceCallerJavaScript} from '../js-to-rust/http-resource-callers.mjs';
import {httpHelperReceivingInput,verifyHttpHelperTargets,requireHttpHelperCompilerVersion} from './http-helper-bulk-20261101-fixture.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
const limits={timeout:60000};
const imports=`import {router_http_transport_client_dispose as dispose} from './runtime/http-transport-runtime.mjs';
import {router_cancel_set as signal,router_cancel_is_set as isSet} from './runtime/async-control-runtime.mjs';
import {deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';\n`;
const helper=`/** @param {Parameters<typeof dispose>[0]} client @param {Parameters<typeof signal>[0]} token @param {boolean} immediate */
function releaseIf(client,token,immediate){if(immediate){signal(token);dispose(client);return true;}return false;}\n`;
const caller=`/** @param {Parameters<typeof dispose>[0]} client @param {Parameters<typeof signal>[0]} token @param {boolean} immediate */
export function release(client,token,immediate){return defer(async()=>{if(releaseIf(client,token,immediate)){return isSet(token);}else{dispose(client);return isSet(token);}});}\n`;
const source=imports+helper+caller;
function input(text=source,sourcePath='caller.mjs'){return {sourcePath,rustPath:'caller.rs',...httpHelperReceivingInput(sourcePath,text).data,helpers:['releaseIf']};}
const translate=text=>translateHttpHelperBulkJavaScript(text,input(text));
test('actual conservative helper summary refusal becomes a complete source-checked outcome expansion',limits,()=>{
 const {rustPath,helpers,...original}=input();assert.throws(()=>translateHttpResourceCallerJavaScript(source,original),/partial helper input release/u);
 const result=translate(source);assert.equal(result.projection.sites.length,1);assert.equal(result.projection.sites[0].helper,'releaseIf');
 assert.ok(result.projection.helperSource.includes(helper.trim()));assert.ok(!result.projection.helperSource.includes('export function release('));
 for(const equation of result.equations)assert.equal(equation.inverse,source);
 assert.equal(result.reverse.httpResourceRustSourceHistory.equation.inverse,result.sources.Rust);
 assert.deepEqual([...new Set(result.trace.map(row=>row.phase))],['language','repository']);
 for(const key of ['sourceAuthority','semanticAuthority','runtimeParity','receivingExecuted','rustExecuted','crossInvocationCache','wholeRouterSynchronization','asynchronousHelperInlining'])assert.equal(result[key],false);
 const written=result.sources.TypeScript.replace(result.projection.sites[0].replacement,result.projection.sites[0].original);assert.notEqual(written,result.sources.TypeScript);
 const paired=translateHttpHelperBulkTypeScript(written,input(written,'caller.mts'));assert.equal(paired.equations[1].inverse,written);
});
test('original canonical strict TypeScript and native-inverse callers preserve cold cleanup and cancellation order',limits,async()=>{
 const result=translate(source),receipts=[];
 for(const target of [{javascript:source,typescript:result.sources.TypeScript},{javascript:result.sources.JavaScript,typescript:result.sources.TypeScript},result.reverse])await verifyHttpHelperTargets(target,async(api,{transport,control})=>{
  for(const immediate of [false,true]){
   const created=transport.router_http_transport_client_new(0n,0n,0n,'');assert.equal(created.$,'Ok');const client=created.field0,token=control.router_cancel_new();
   const cold=api.release(client,token,immediate);assert.equal(control.router_cancel_is_set(token),false);
   assert.equal(await cold,immediate);assert.equal(control.router_cancel_is_set(token),immediate);
   assert.equal(transport.router_http_transport_client_clone(client).$,'Err');
  }
 },{record:row=>receipts.push(row)});
 assert.ok(receipts.every(row=>row.version==='5.9.3'&&row.passed));
});
test('wrong ignored-argument domains repeated exclusive aliases and effectful argument expressions refuse',limits,()=>{
 for(const changed of [
  source.replace('releaseIf(client,token,immediate)){','releaseIf(client,token,true && immediate)){'),
  source.replace('releaseIf(client,token,immediate)){','releaseIf(client,client,immediate)){'),
  source.replace('releaseIf(client,token,immediate)){','releaseIf(client,token,"true")){'),
 ]){
  assert.notEqual(changed,source);assert.throws(()=>translate(changed));
 }
 // The unused token still has its genuine original signature checked.
 const ignored=source.replace('signal(token);','').replace('releaseIf(client,token,immediate)){','releaseIf(client,immediate,true)){');assert.throws(()=>translate(ignored),/argument domains differ/u);
});
test('cycles cold helpers captures locals partial continuations and property arguments stay refused',limits,()=>{
 for(const changed of [
  source.replace('function releaseIf(client,token,immediate){','async function releaseIf(client,token,immediate){'),
  source.replace('if(immediate){','if(isSet(outside)){'),
  source.replace('if(immediate){','const local=immediate;if(local){'),
  source.replace('if(immediate){','if(releaseIf(client,token,immediate)){'),
  source.replace('return isSet(token);}else','signal(token);}else'),
  source.replace('releaseIf(client,token,immediate)){','releaseIf(client.value,token,immediate)){'),
 ])assert.throws(()=>translate(changed));
 assert.throws(()=>translateHttpHelperBulkJavaScript(source,{...input(),helpers:['missing']}));
});
test('complete current native/runtime/declaration source and shared failure protocol remain mandatory',limits,()=>{
 for(const path of ['runtime/http-transport-runtime.mjs','runtime/http-transport-runtime.d.mts','src/translation_http_transport_core.rs']){const data=input();data.files.find(row=>row.path===path).source+='\n// changed\n';assert.throws(()=>translateHttpHelperBulkJavaScript(source,data));}
 assert.throws(()=>withSourceFailureOperation(()=>{try{translate(source.replace('return true;','return unknown;'));}catch{}return true;}),/invalidated.*source-input failure/u);
 assert.equal(requireHttpHelperCompilerVersion('Version 5.9.3\n'),'5.9.3');assert.throws(()=>requireHttpHelperCompilerVersion('Version 6.0.0\n'));
});
