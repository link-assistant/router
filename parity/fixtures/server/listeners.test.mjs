import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouter} from '../../../packages/javascript/native/server.mjs';
const req=(path,token='admin',method='GET')=>new Request('http://router'+path,{method,headers:{authorization:`Bearer ${token}`,'x-forwarded-for':'127.0.0.1'}});
test('management requires actual peer, rejects remote combined ingress and enforces protected method before authentication',async()=>{
  const core={config:{admin_token:'admin'},admin:{status:()=>({claimed:false})},tokens:{list:()=>[]}};
  assert.equal((await createNativeRouter({core}).fetch(req('/api/management/admin/status'))).status,403);
  assert.equal((await createNativeRouter({core,peer:'203.0.113.9'}).fetch(req('/api/management/admin/status'))).status,403);
  assert.equal((await createNativeRouter({core,peer:'203.0.113.9',listenerKind:'admin'}).fetch(req('/api/management/admin/status'))).status,200);
  assert.equal((await createNativeRouter({core,peer:'::ffff:127.0.0.1'}).fetch(req('/api/management/tokens'))).status,200);
  assert.equal((await createNativeRouter({core,peer:'127.0.0.1'}).fetch(req('/api/management/admin/status','admin','POST'))).status,405);
  assert.equal((await createNativeRouter({core,peer:'127.0.0.1',listenerKind:'inference-only'}).fetch(req('/api/management/admin/status'))).status,404);
});
test('management counts failures once, blocks active bans before credential success and clears successful nonbanned failures',async()=>{
  let failures=0,successes=0;const core={config:{admin_token:'admin'},tokens:{list:()=>[]},managementAccess:{config:()=>({allow_remote:true}),check:()=>failures>=2?60:undefined,failure:async()=>{failures++;},success:()=>{successes++;failures=0;}}};
  const router=createNativeRouter({core,peer:'203.0.113.9'});
  assert.equal((await router.fetch(req('/api/management/tokens','wrong'))).status,401);assert.equal(failures,1);
  assert.equal((await router.fetch(req('/api/management/tokens'))).status,200);assert.equal(failures,0);assert.equal(successes,1);
  assert.equal((await router.fetch(req('/api/management/tokens','wrong'))).status,401);let response=await router.fetch(req('/api/management/tokens','wrong'));assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');
  assert.equal((await router.fetch(req('/api/management/tokens'))).status,429);assert.equal(successes,1);
});
test('localhost server sets peer independently of forwarded headers and HEAD has no body',async t=>{
  const router=createNativeRouter({core:{config:{admin_token:'admin'},admin:{status:()=>({claimed:false})}}});await router.listen({port:0});t.after(()=>router.close());
  let response=await fetch(`http://127.0.0.1:${router.address.port}/api/management/admin/status`,{headers:{'x-forwarded-for':'203.0.113.9'}});assert.equal(response.status,200);assert.deepEqual(await response.json(),{claimed:false});
  response=await fetch(`http://127.0.0.1:${router.address.port}/api/health`,{method:'HEAD'});assert.equal(response.status,200);assert.equal(await response.text(),'');
});
