import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeRouter} from '../../../packages/javascript/native/server.mjs';
const request=(path,method='GET',body,token='admin')=>new Request(`http://router${path}`,{method,headers:token?{authorization:`Bearer ${token}`}:{},...(body===undefined?{}:{body:JSON.stringify(body)})});
test('canonical token management list/issuance/revoke/rotation preserve Rust wire shapes and numeric budgets',async()=>{
  let input,rotated,revoked;const core={config:{admin_token:'admin'},tokens:{list:()=>[{id:'t',max_tokens:7,used_tokens:2,token:'hidden'}],issue:options=>{input=options;return {token:'new',record:{label:'l',client_kind:'claude',model_policy:options.model_policy}};},get:id=>({id,scope:id==='admin-id'?'admin':''}),revoke:id=>{revoked=id;return true;},rotate:(id,body)=>{rotated=[id,body];return {token:'replacement'};}}};
  const router=createNativeRouter({core});let response=await router.fetch(request('/api/management/tokens'));assert.deepEqual(await response.json(),{data:[{id:'t',max_tokens:7,used_tokens:2,token:'[REDACTED]'}]});
  response=await router.fetch(request('/api/management/tokens/client','POST',{client_kind:'claude',allowed_models:['m'],ephemeral:true,run_lease:true}));assert.equal(response.status,200);const issued=await response.json();assert.equal(issued.token,'new');assert.equal(issued.principal_id,'primary');assert.equal(input.account,'primary');assert.equal(input.run_lease_seconds,120);assert.deepEqual(input.model_policy.allowed_models,['m']);
  response=await router.fetch(request('/api/management/tokens/revoke','POST',{id:'t'}));assert.deepEqual(await response.json(),{revoked:'t'});assert.equal(revoked,'t');
  response=await router.fetch(request('/api/management/tokens/rotate-client','POST',{id:'t',ttl_hours:2}));assert.deepEqual(await response.json(),{token:'replacement',revoked:'t'});assert.deepEqual(rotated,['t',{id:'t',ttl_hours:2}]);
  assert.equal((await router.fetch(request('/api/management/tokens/rotate-client','POST',{id:'admin-id'}))).status,400);assert.equal((await router.fetch(request('/api/management/tokens/rotate','POST',{}))).status,400);
});
test('admin bootstrap is open but delegated login operations require administrator authority and exact code',async()=>{
  let confirmed,code;const core={config:{admin_token:'admin'},admin:{status:()=>({claimed:false}),beginWithTtl:ttl=>({claim_id:'c',token:'candidate',ttl_hours:ttl}),confirm:(id,token)=>{confirmed=[id,token];}},login:{begin:body=>({login_id:'l',provider:body.provider,status:'awaiting_code'}),status:id=>id==='l'?{status:'awaiting_code'}:null,submitCode:(id,value)=>{code=[id,value];return {status:'authorized'};},cancel:()=>true}};
  const router=createNativeRouter({core});assert.deepEqual(await (await router.fetch(request('/api/management/admin/status','GET',undefined,null))).json(),{claimed:false});
  assert.equal((await router.fetch(request('/api/management/admin/bootstrap','POST',{ttl_hours:2},null))).status,200);
  assert.equal((await router.fetch(request('/api/management/admin/bootstrap/confirm','POST',{claim_id:'c'},null))).status,401);
  assert.deepEqual(await (await router.fetch(request('/api/management/admin/bootstrap/confirm','POST',{claim_id:'c'},'candidate'))).json(),{claimed:true});assert.deepEqual(confirmed,['c','candidate']);
  assert.equal((await router.fetch(request('/api/management/login','POST',{},'ordinary'))).status,401);
  assert.equal((await router.fetch(request('/api/management/login','POST',{provider:'bad'}))).status,400);
  assert.equal((await router.fetch(request('/api/management/login/l/code','POST',{code:'  '}))).status,400);
  assert.equal((await router.fetch(request('/api/management/login/l/code','POST',{code:'exact#state'}))).status,200);assert.deepEqual(code,['l','exact#state']);
  assert.equal((await router.fetch(request('/api/management/login/missing'))).status,404);
});
