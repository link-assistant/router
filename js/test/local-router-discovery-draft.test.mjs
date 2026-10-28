// Independent production discovery/lifecycle cases. SOURCE ONLY; ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {discoverLocalRouter,publishedLocalRouterPorts} from '../src/local-router-discovery.mjs';
import {withNativeManagedConfigureTarget,executeManagedOperation} from '../src/managed-server.mjs';
import {executeNativeConfigure} from '../src/client-configure.mjs';
const limits={timeout:60000};
async function listener(t,handler){const server=createServer(handler);await new Promise(done=>server.listen(0,'127.0.0.1',done));t.after(()=>new Promise(done=>{server.close(done);server.closeAllConnections();}));return server.address().port;}
async function managed(t){const directory=await mkdtemp(join(tmpdir(),'router-discovery-managed-')),config={data_dir:directory,providers:[],accounts:[]},state=join(directory,'native-managed/state.json');t.after(async()=>{try{const row=JSON.parse(await readFile(state,'utf8'));if(row.pid)await executeManagedOperation({name:'server.stop',config});}finally{await rm(directory,{recursive:true,force:true});}});return {directory,config,state};}
test('published candidates accept exact loopback bindings deduplicate and bound their output without substring-host admission',limits,()=>{
 assert.deepEqual(publishedLocalRouterPorts('127.0.0.1:18878->8080/tcp, 0.0.0.0:18878->8080/tcp\n[::]:18879->8080/tcp, :18880->8080/tcp'),[18878,18879,18880]);
 for(const source of ['8080/tcp','->8080/tcp','127.0.0.1.evil:42->8080/tcp','192.0.2.1:42->8080/tcp','127.0.0.1:0->8080/tcp','127.0.0.1:65536->8080/tcp','127.0.0.1:-1->8080/tcp','127.0.0.1:42->8080/udp'])assert.deepEqual(publishedLocalRouterPorts(source),[],source);
 assert.equal(publishedLocalRouterPorts(Array.from({length:80},(_,i)=>'127.0.0.1:'+(10000+i)+'->8080/tcp').join(',')).length,64);assert.deepEqual(publishedLocalRouterPorts(' '.repeat(65537)),[]);
});
test('actual accepting Router identity selects the candidate without sending the available administrator credential',limits,async t=>{
 const requests=[],port=await listener(t,(request,response)=>{requests.push({url:request.url,authorization:request.headers.authorization});response.end('ok');}),token='private-admin-not-for-health',target=await discoverLocalRouter({candidatePorts:[port],dockerListing:'invalid',env:{LINK_ASSISTANT_ROUTER_TOKEN:token}});
 assert.equal(target.server,'http://127.0.0.1:'+port);assert.equal(target.managementServer,target.server);assert.equal(target.token,token);assert.equal(target.source,'already-running local server');assert.deepEqual(requests,[{url:'/api/health',authorization:undefined}]);
});
test('an accepting non-Router port is rejected and a separately published real Router is checked',limits,async t=>{
 let rejected=0,accepted=0;const other=await listener(t,(_,response)=>{rejected++;response.end('{"status":"other"}');}),router=await listener(t,(_,response)=>{accepted++;response.end('{"version":"source-fixture"}');}),target=await discoverLocalRouter({candidatePorts:[other,other],dockerListing:'127.0.0.1:'+router+'->8080/tcp'});assert.equal(target.server,'http://127.0.0.1:'+router);assert.equal(rejected,1);assert.equal(accepted,1);
});
test('TCP acceptance alone and an already-cancelled invocation cannot select a deployment',limits,async t=>{
 let count=0;const port=await listener(t,(_,response)=>{count++;response.end('{"service":"unrelated"}');});assert.equal(await discoverLocalRouter({candidatePorts:[port],dockerListing:''}),null);const abort=new AbortController();abort.abort();assert.equal(await discoverLocalRouter({candidatePorts:[port],dockerListing:'',invocation:{signal:abort.signal}}),null);assert.equal(count,1);await assert.rejects(discoverLocalRouter({candidatePorts:Array(65).fill(port)}),/Bounded/);
});
test('health never inherits an unlimited stall and discovery releases its stalled HTTP request',limits,async t=>{
 const port=await listener(t,()=>{}),started=performance.now();assert.equal(await discoverLocalRouter({candidatePorts:[port],dockerListing:''}),null);assert.ok(performance.now()-started<3500,'fixed overall budget with scheduler margin');
});
test('absent managed state is read-only and --local cannot create a daemon implicitly',limits,async t=>{
 const input=await managed(t);let called=false;assert.equal(await withNativeManagedConfigureTarget({...input,options:{local:true}},async()=>{called=true;}),null);assert.equal(called,false);await assert.rejects(readFile(input.state),{code:'ENOENT'});
});
test('successful managed configure retains its verified daemon and removes only its own operation reference',limits,async t=>{
 const input=await managed(t),answer=await withNativeManagedConfigureTarget({...input,create:true},async target=>{assert.match(target.server,/^http:\/\/127\.0\.0\.1:\d+$/u);assert.equal(target.managementServer,target.server);assert.equal(typeof target.token,'string');const response=await fetch(target.server+'/api/health');assert.equal(response.status,200);return 'configured';});assert.equal(answer,'configured');const state=JSON.parse(await readFile(input.state,'utf8'));assert.ok(state.pid>0);assert.equal(state.keep_running,true);assert.deepEqual(state.references,[]);
});
test('failure before any client was configured stops a newly acquired daemon while preserving its volume',limits,async t=>{
 const input=await managed(t);await assert.rejects(withNativeManagedConfigureTarget({...input,create:true},async()=>{throw Error('before-persistence');}),/before-persistence/);const state=JSON.parse(await readFile(input.state,'utf8'));assert.equal(state.pid,null);assert.equal(state.keep_running,false);assert.deepEqual(state.references,[]);
});
test('partial --all success retains the managed Router needed by already configured clients',limits,async t=>{
 const input=await managed(t);await assert.rejects(withNativeManagedConfigureTarget({...input,create:true},async target=>{target.retainManagedServer();throw Error('later-client-failed');}),/later-client-failed/);const state=JSON.parse(await readFile(input.state,'utf8'));assert.ok(state.pid>0);assert.equal(state.keep_running,true);assert.deepEqual(state.references,[]);
});
test('pre-existing managed daemon and foreign registry are preserved on a failed operation',limits,async t=>{
 const input=await managed(t);await executeManagedOperation({name:'server.start',config:input.config});const before=JSON.parse(await readFile(input.state,'utf8'));await assert.rejects(withNativeManagedConfigureTarget(input,async()=>{throw Error('failed');}),/failed/);const after=JSON.parse(await readFile(input.state,'utf8'));assert.equal(after.pid,before.pid);assert.equal(after.keep_running,true);assert.deepEqual(after.references,[]);const bytes=await readFile(input.state);try{await writeFile(input.state,JSON.stringify({...after,schema:'foreign-engine'}));await assert.rejects(withNativeManagedConfigureTarget(input,async()=>assert.fail('must not adopt')),/another engine/);}finally{await writeFile(input.state,bytes);}
});
test('contradictory temporary and managed targets refuse before selection or discovery',limits,async()=>{
 const core={config:{}};await assert.rejects(executeNativeConfigure({name:'with',options:{client:'claude',isolated_config:true,extend_global_config:true},core}),/conflict/);await assert.rejects(executeNativeConfigure({options:{client:'claude',managed:true,server:'https://example.invalid'},core}),/conflicts/);
});
