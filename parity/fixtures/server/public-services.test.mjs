import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createNativeRouter} from '../../../packages/javascript/native/server.mjs';
import {githubConfiguration,githubDecision,destructiveGraphql} from '../../../packages/javascript/native/github-proxy.mjs';
const activity='/api/services/activitypub';
const req=(path,method='GET',body,headers={})=>new Request(`http://router${path}`,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
test('ActivityPub documents and inbound validation match source contracts including HEAD and private listener isolation',async()=>{
  const core={config:{activitypub_actor_base_url:'https://router.example/',activitypub_public_key_pem:'operator-public-key'}};
  const router=createNativeRouter({core});let response=await router.fetch(req(activity+'/actor/code'));
  assert.equal(response.headers.get('content-type'),'application/activity+json');assert.equal(response.headers.get('accept'),'application/activity+json');
  const actor=await response.json();assert.equal(actor.id,'https://router.example'+activity+'/actor/code');assert.equal(actor.publicKey.publicKeyPem,'operator-public-key');assert.deepEqual(actor.aliases,['urn:link-assistant:router:code',actor.id]);
  for(const path of ['/outbox/code','/actors/code/followers'])assert.deepEqual((await (await router.fetch(req(activity+path))).json()).orderedItems,[]);
  assert.equal((await (await router.fetch(req(activity+'/activities/follow-problemsets-code-001'))).json()).object,'https://problemsets.lefine.pro/actor/code');
  response=await router.fetch(req(activity+'/actor/code','HEAD'));assert.equal(response.status,200);assert.equal(await response.text(),'');
  for(const [body,message] of [[{},'activity id is required'],[{id:'x'},'activity type is required'],[{id:'x',type:'Create'},'activity must include actor or attributedTo']]){response=await router.fetch(req(activity+'/inbox/code','POST',body));assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'invalid_activity',message});}
  const incoming={id:'x',type:'Create',attributedTo:'actor',object:{arbitrary:'body'}};response=await router.fetch(req(activity+'/inbox/code','POST',incoming));assert.equal(response.status,202);assert.deepEqual((await response.json()).object,incoming);
  for(const listenerKind of ['admin','inference-only','github-adapter'])assert.equal((await createNativeRouter({core,listenerKind}).fetch(req(activity+'/actor/code'))).status,404);
});
test('GitHub policy covers destructive REST and GraphQL effects with ordered operator overrides',()=>{
  const body=value=>Buffer.from(JSON.stringify(value));
  for(const [method,path,value] of [['DELETE','/repos/a/b/issues/1',{}],['PATCH','/repos/a/b/git/refs/heads/main',{force:true}],['PUT','/repos/a/b/branches/feature/x/protection/required_signatures',{}],['POST','/orgs/a/rulesets',{}],['POST','/repos/a/b/transfer',{}],['PATCH','/repos/a/b/',{Visibility:'public'}]])assert.equal(githubDecision({},method,path,body(value)),'deny');
  assert.equal(githubDecision({},'PATCH','/repos/a/b',body({description:'allowed'})),'allow');
  const policy={rules:[{effect:'deny',path:'/repos/a/**',method:'GET'},{effect:'allow',path:'/repos/a/b/transfer',method:'POST'}]};assert.equal(githubDecision(policy,'GET','/repos/a/b/issues'),'deny');assert.equal(githubDecision(policy,'POST','/repos/a/b/transfer'),'allow');
  for(const value of [{query:'fragment F on Repository {id} mutation Remove { alias: deleteRepository(input:{repositoryId:"r"}) {clientMutationId}}'},{query:'mutation { updateRefs(input:$input) {clientMutationId}}',variables:{input:{updates:[{afterOid:'0'.repeat(40)}]}}},{query:'mutation {updateRef(input:$input){clientMutationId}}',variables:{input:{force:true}}},{query:'mutation {createBranchProtectionRule(input:{}){clientMutationId}}'}])assert.equal(destructiveGraphql(body(value)),true);
  assert.equal(destructiveGraphql(body({query:'query {repository(owner:"mutation deleteRepository",name:"b"){id}} # mutation deleteRepository'})),false);
});
test('GitHub localhost relay enforces credential boundary, repository scope, byte/status/query fidelity and adapter isolation',async t=>{
  const received=[];const upstream=createServer(async(request,response)=>{const chunks=[];for await(const chunk of request)chunks.push(chunk);received.push({url:request.url,headers:request.headers,body:Buffer.concat(chunks)});response.writeHead(418,{'content-type':'application/octet-stream','x-github-request-id':'upstream-id','set-cookie':'credential','x-router-secret':'hidden'});response.end(Buffer.from([0,255,7]));});
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>upstream.close(resolve)));
  const core={config:{github:{token:'operator-secret',base_url:`http://127.0.0.1:${upstream.address().port}`}}};
  const router=createNativeRouter({core,authenticate:()=>({github_repos:['A/B']})});let response=await router.fetch(req('/api/services/github/api/v3/repos/a/b/issues?q=1','POST',{title:'exact'},{authorization:'Bearer caller','x-api-key':'caller','cookie':'caller=1','accept':'vendor/type','x-github-api-version':'2022-11-28','x-forwarded-for':'forged'}));
  assert.equal(response.status,418);assert.deepEqual(Buffer.from(await response.arrayBuffer()),Buffer.from([0,255,7]));assert.equal(response.headers.get('x-github-request-id'),'upstream-id');assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('x-router-secret'),null);
  assert.equal(received[0].url,'/repos/a/b/issues?q=1');assert.equal(received[0].headers.authorization,'Bearer operator-secret');assert.equal(received[0].headers.cookie,undefined);assert.equal(received[0].headers['x-api-key'],undefined);assert.equal(received[0].headers['x-forwarded-for'],undefined);assert.deepEqual(JSON.parse(received[0].body),{title:'exact'});
  response=await router.fetch(req('/api/services/github/api/v3/repos/a/other'));assert.equal(response.status,403);assert.equal(response.headers.get('x-link-assistant-policy'),'blocked');
  response=await router.fetch(req('/api/services/github/api/graphql','POST',{query:'query {viewer {login}}'}));assert.equal(response.status,403);assert.equal(received.length,1);
  assert.equal((await router.fetch(req('/api/v3/repos/a/b'))).status,404);
  const adapter=createNativeRouter({core,listenerKind:'github-adapter',authenticate:()=>({})});assert.equal((await adapter.fetch(req('/api/v3/repos/a/b'))).status,418);assert.equal((await adapter.fetch(req('/api/health'))).status,404);
  assert.equal((await createNativeRouter({core:{config:{}}}).fetch(req('/api/services/github/api/v3/user'))).status,404);
});
test('GitHub credential precedence uses invocation environment and exact configured gh host, policy schema fails closed',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'router-github-'));t.after(()=>rm(dir,{recursive:true,force:true}));await writeFile(join(dir,'github-credential'),'stored');await mkdir(join(dir,'gh'));await writeFile(join(dir,'gh','hosts.yml'),'github.com:\n    oauth_token: unrelated\nenterprise.example:\n    oauth_token: matched\n');
  let config=await githubConfiguration({data_dir:dir},{GITHUB_PROXY_TOKEN:'explicit'});assert.equal(config.token,'explicit');
  await writeFile(join(dir,'token'),' file-token \n');config=await githubConfiguration({data_dir:dir},{GITHUB_PROXY_TOKEN_FILE:join(dir,'token'),GITHUB_PROXY_TOKEN_ENV:'SECRET',SECRET:'env-token'});assert.equal(config.token,'file-token');
  config=await githubConfiguration({},{GITHUB_PROXY_BASE_URL:'https://enterprise.example/api/v3',GH_CONFIG_DIR:join(dir,'gh')});assert.equal(config.token,'matched');
  await assert.rejects(githubConfiguration({github:{policy:{rules:[],unexpected:true}}}),/Invalid GitHub policy/);
});
