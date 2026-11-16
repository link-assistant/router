// Independent bounded remote health source cases. SOURCE ONLY; ALL CASES UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {verifyRemoteClientHealth} from '../src/client-remote-health.mjs';
import {prepareRemoteClientCredential} from '../src/client-remote.mjs';
import {sendRemoteManagement} from '../src/remote-operations.mjs';
const limits={timeout:60000},server='https://inference.invalid',managementServer='https://admin.invalid',target={server,managementServer,token:'private-admin'};
for(const body of ['ok','  ok\n','{"status":"ok"}','{"version":"1.0.0"}'])test('Router health identity '+JSON.stringify(body)+' is authenticated by origin without sending administrative authority',limits,async()=>{
 const calls=[];await verifyRemoteClientHealth({fetch:async(url,options)=>{calls.push({url,options});return new Response(body);}},target);assert.equal(calls.length,1);assert.equal(calls[0].url,server+'/api/health');assert.equal(calls[0].options.headers.authorization,undefined);assert.equal(calls[0].options.redirect,'error');
});
for(const body of ['','null','[]','{"status":"wrong"}','{"version":1}','not JSON'])test('unidentified health response '+JSON.stringify(body)+' never establishes Router identity',limits,async()=>{await assert.rejects(verifyRemoteClientHealth({fetch:async()=>new Response(body)},target));});
test('health-specific plain text acceptance preserves every ordinary management JSON contract',limits,async()=>{
 await assert.rejects(sendRemoteManagement(target,{method:'GET',path:'/api/management/tokens'},{fetch:async()=>new Response('ok')}),/invalid JSON/);await assert.rejects(verifyRemoteClientHealth({fetch:async()=>new Response('ok',{status:503})},target),/503/);
});
test('health origin changes byte overflow and cancellation remain fatal before any client issuance',limits,async t=>{
 const directory=await mkdtemp(join(tmpdir(),'router-remote-health-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 for(const kind of ['origin','overflow','cancelled']){const calls=[],controller=new AbortController();if(kind==='cancelled')controller.abort();await assert.rejects(prepareRemoteClientCredential({client:'claude',origin:server,managementServer,suppliedToken:'private-admin',config:{data_dir:join(directory,'.router')},env:{HOME:directory},invocation:{signal:controller.signal},fetch:async(url,options)=>{calls.push(url);const response=new Response(kind==='overflow'?'x'.repeat(65537):'{"status":"ok"}');if(kind==='origin')Object.defineProperty(response,'url',{value:'https://other.invalid/api/health'});return response;}}));assert.equal(calls.some(url=>url.includes('/api/management/')),false);}
});
test('bounded health transport deadline does not wait for an injected uncooperative response',limits,async()=>{
 await assert.rejects(sendRemoteManagement({server,managementServer:server},{method:'GET',path:'/api/health',response:'router-health'},{deadlineMs:25,maxOutputBytes:65536,fetch:()=>new Promise(()=>{})}),/cancelled|deadline/);
});
