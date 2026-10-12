/** Canonical census: exact configured handler outcomes, never a full parity claim. */
import assert from 'node:assert/strict';
import { readFile, mkdtemp, realpath, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRouterCore } from '../native/core.mjs';
import { ResponsesStore, responseOwner, normalizeResponseInput } from '../native/responses.mjs';
import { createNativeRouter } from '../native/server.mjs';
const methods = new Set(['get','post','put','patch','delete','options','head','trace']);
export const nativeRouteOutcomes = Object.freeze(JSON.parse(await readFile(new URL('./native-route-outcomes.json',import.meta.url),'utf8')));
export const nativeRouteSubset = Object.freeze(new Set(nativeRouteOutcomes.filter(row=>row.status >= 200 && row.status < 300).map(row=>row.route)));
const chat = {id:'fixture',object:'chat.completion',model:'fixture-model',choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:'hello'}}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2}};
const responseDocument = {id:'fixture',object:'response',model:'fixture-model',status:'completed',output:[{id:'message-fixture',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'hello',annotations:[]}]}],usage:{input_tokens:1,output_tokens:1,total_tokens:2}};
const audio = Buffer.from([0x52,0x49,0x46,0x46,0,1,2,255]);
function upstreamFixture(contract) {
  switch(contract) {
    case 'chat-inference': case 'anthropic-inference': case 'bridged-response-create': return {body:chat};
    case 'native-response-create': case 'native-response-compact': return {body:responseDocument};
    case 'native-conversation-create': return {body:{id:'fixture',object:'conversation',metadata:{fixture:true}}};
    case 'native-chat-list': return {body:{object:'list',data:[{...chat,id:'foreign-unowned'}],has_more:false,first_id:'foreign-unowned',last_id:'foreign-unowned'}};
    case 'native-input-tokens': return {body:{object:'response.input_tokens',input_tokens:2}};
    case 'native-call-create': return {status:201,body:{id:'fixture',object:'realtime.call'},headers:{location:'/upstream/private/fixture'}};
    case 'native-audio-bytes': return {body:audio,headers:{'content-type':'audio/wav'}};
    case 'native-audio-text': return {body:{text:'hello'}};
    case 'native-image': return {body:{created:1,data:[{b64_json:'aGVsbG8='}]}};
    case 'native-upgrade-required': return {status:426,body:{error:{message:'WebSocket upgrade required'}},headers:{upgrade:'websocket'}};
    default: assert.fail(`No upstream fixture for ${contract}`);
  }
}
function fixtureBody(contract,issued,baseURL) {
  if(['chat-inference','anthropic-inference'].includes(contract))return {model:'fixture-model',messages:[{role:'user',content:'hello'}],max_tokens:10};
  if(['native-response-create','bridged-response-create','native-response-compact','native-input-tokens'].includes(contract))return {model:'fixture-model',input:'hello'};
  if(contract==='native-provider-unavailable')return {model:'fixture-model',messages:[{role:'user',content:'hello'}]};
  if(contract==='token-revoke' || contract==='token-rotate-client')return {id:issued.id};
  if(contract==='client-token-issue')return {client_kind:'codex',label:'route-issued'};
  if(contract==='account-policy')return {weight:2};
  if(contract==='routing')return {strategy:'priority'};
  if(contract==='provider-upsert')return {name:'fixture-new',kind:'openai-compatible',base_url:baseURL,models:['fixture-model'],supported_clients:['codex']};
  if(contract==='activity-inbox')return {id:'urn:fixture:activity',type:'Create',actor:'urn:fixture:actor'};
  if(contract==='login-invalid-provider')return {provider:'unsupported-fixture'};
  if(contract==='logging-hook-unavailable')return {debug:true};
  return {label:'route-issued',reason:'route-fixture'};
}
function clientFor(path) {
  if(path.startsWith('/api/services/anthropic/') || path.startsWith('/api/services/bedrock/') || path.includes('/publishers/anthropic/'))return 'claude';
  if(path.startsWith('/api/services/gemini/') || path.startsWith('/api/services/vertex/'))return 'gemini';
  if(path.startsWith('/api/services/qwen/'))return 'qwen';
  return 'codex';
}
function assertSuccess(contract,data,{core,issued,cancelled}) {
  switch(contract) {
    case 'accounts': assert.equal(data.accounts[0].name,'fixture'); break;
    case 'account-policy': assert.equal(data.weight,core.accounts.records.get('fixture').policy.weight); break;
    case 'account-pause': assert.ok(core.accounts.limits.get('fixture').pause); break;
    case 'account-resume': assert.equal(core.accounts.limits.get('fixture')?.pause ?? null,null); break;
    case 'admin-status': assert.equal(data.claimed,true); break;
    case 'admin-summary': assert.equal(data.accounts,1); assert.equal(data.admin.claimed,true); break;
    case 'auth-diagnostics': assert.ok(data.diagnostics); assert.equal(data.emergency_auth.active,false); break;
    case 'credential-status': assert.equal(data.credentials.length,4); assert.ok(data.credentials.every(row=>row.state==='absent')); assert.equal(data.api_key_providers[0].name,'fixture'); break;
    case 'emergency-status': assert.equal(data.active,false); break;
    case 'emergency-disable': assert.equal(data.disabled,true); assert.equal(data.was_active,false); break;
    case 'error-capture-disabled': assert.deepEqual(data,{enabled:false,files:[]}); break;
    case 'providers': assert.equal(data.data[0].name,'fixture'); break;
    case 'provider-upsert': assert.equal(data.name,'fixture-new'); break;
    case 'provider-delete': assert.deepEqual(data,{deleted:'fixture'}); break;
    case 'provider-show': assert.equal(data.name,'fixture'); break;
    case 'routing': assert.equal(core.accounts.strategy,'priority'); break;
    case 'cooldown-reset': assert.ok(data && typeof data==='object'); break;
    case 'logs-clear': assert.deepEqual(data,{cleared:true}); break;
    case 'request-queue': assert.deepEqual(data,{accounts:[{name:'fixture',in_flight:0,queued:0}],in_flight:1,queued:0,unassigned:1}); break;
    case 'tokens': assert.equal(data.data[0].id,issued.id); break;
    case 'token-issue': case 'token-rotate-client': assert.match(data.token,/^la_sk_/); break;
    case 'client-token-issue': assert.match(data.token,/^la_sk_/); assert.equal(data.client_kind,'codex'); assert.equal(data.principal_id,'primary'); break;
    case 'token-revoke': assert.deepEqual(data,{revoked:issued.id}); break;
    case 'usage': assert.equal(data.requests,1); assert.equal(data.upstream_attempts,0); break;
    case 'models': assert.equal(data.data[0].id,'fixture-model'); break;
    case 'model': assert.equal(data.id,'fixture-model'); break;
    case 'gemini-models': assert.equal(data.models[0].name,'fixture-model'); break;
    case 'gemini-model': assert.equal(data.name,'fixture-model'); break;
    case 'chat-inference': assert.equal(data.choices[0].message.content,'hello'); break;
    case 'anthropic-inference': assert.equal(data.content[0].text,'hello'); break;
    case 'native-response-create': case 'native-response-compact': assert.deepEqual(data,responseDocument); break;
    case 'bridged-response-create': assert.equal(data.object,'response'); assert.equal(data.output[0].content[0].text,'hello'); break;
    case 'response-get': assert.equal(data.id,'fixture'); assert.equal(data.object,'response'); break;
    case 'response-cancel': assert.equal(data.status,'cancelled'); assert.equal(cancelled(),true); break;
    case 'response-delete': assert.equal(data.deleted,true); break;
    case 'response-input-items': assert.equal(data.data[0].content[0].text,'hello'); break;
    case 'native-chat-list': assert.deepEqual(data.data,[]); assert.equal(data.first_id,null); assert.equal(data.last_id,null); break;
    case 'native-conversation-create': assert.deepEqual(data,{id:'fixture',object:'conversation',metadata:{fixture:true}}); break;
    case 'native-input-tokens': assert.deepEqual(data,{object:'response.input_tokens',input_tokens:2}); break;
    case 'native-call-create': assert.equal(data.id,'fixture'); assert.equal(data.object,'realtime.call'); break;
    case 'native-audio-text': assert.deepEqual(data,{text:'hello'}); break;
    case 'native-image': assert.deepEqual(data,{created:1,data:[{b64_json:'aGVsbG8='}]}); break;
    case 'activity-document': assert.ok(data['@context']); assert.match(data.id,/\/api\/services\/activitypub\//); break;
    case 'activity-inbox': assert.equal(data.type,'Accept'); assert.equal(data.object.id,'urn:fixture:activity'); break;
    default: assert.fail(`No body assertion for ${contract}`);
  }
}
export async function runParityFixtures() {
  const spec=JSON.parse(await readFile(new URL('../../../openapi/router.yaml',import.meta.url),'utf8'));
  const canonical=new Set(Object.entries(spec.paths).flatMap(([path,operations])=>Object.keys(operations).filter(method=>methods.has(method)).map(method=>`${method.toUpperCase()} ${path}`)));
  assert.equal(nativeRouteOutcomes.length,368); assert.deepEqual(new Set(nativeRouteOutcomes.map(row=>row.route)),canonical);
  const evidence=new Map(),failures=[],root=await realpath(await mkdtemp(join(tmpdir(),'router-route-census-'))),hits=[];let active;
  const upstream=createServer(async(request,response)=>{
    const chunks=[];for await(const chunk of request)chunks.push(chunk);
    hits.push({method:request.method,path:request.url,headers:request.headers,body:Buffer.concat(chunks)});
    if(!active?.upstream){response.writeHead(500);response.end('Unexpected upstream request');return;}
    const fixture=upstreamFixture(active.contract),bytes=Buffer.isBuffer(fixture.body)?fixture.body:Buffer.from(JSON.stringify(fixture.body));
    response.writeHead(fixture.status ?? 200,{'content-type':'application/json','x-request-id':'fixture-upstream',...fixture.headers});response.end(bytes);
  });
  upstream.listen(0,'127.0.0.1');await once(upstream,'listening');const baseURL=`http://127.0.0.1:${upstream.address().port}/v1`;
  try {
    for(const [ordinal,row] of nativeRouteOutcomes.entries()) {
      const [method,template]=row.route.split(' ');active=row;hits.length=0;
      if(method==='TRACE' && !process.versions.bun) {
        assert.throws(()=>new Request('http://native.invalid/',{method}),/unsupported|forbidden/i);
        evidence.set(`route:${row.route}`,{route:row.route,success:false,fullParity:false,observed:'web-request-transport-rejection',status:null});continue;
      }
      const directory=join(root,String(ordinal)),core=await createRouterCore({config:{data_dir:directory,home:directory,token_secret:'native-route-census-secret',token_admin_key:'native-route-admin',storage_policy:'memory',providers:[{name:'fixture',kind:'openai-compatible',base_url:baseURL,api_key:'fixture-upstream-credential',models:['fixture-model'],supported_clients:['claude','codex','gemini','qwen']}],accounts:[{name:'fixture',provider:'fixture'}]},env:{}});
      const client=clientFor(template),issued=await core.tokens.issue({label:'route-fixture',client_kind:client,principal_id:'primary',account:'primary'});
      const token=template.startsWith('/api/management/') ? 'native-route-admin':template.includes('/backend-api/') || template.endsWith('/whoami') ? issued.token.replace(/^la_sk_/,'at-'):issued.token;
      const responseStore=new ResponsesStore();let cancelled=false;
      if(template.includes('{response_id}') && template.startsWith('/api/services/openai/'))responseStore.save('/api/services/openai/v1',responseOwner(await core.authenticate(issued.token),issued.token),{...responseDocument,status:template.endsWith('/cancel')?'in_progress':'completed'},normalizeResponseInput({input:'hello'}),{abort(){cancelled=true;}});
      // Real isolated request logging is installed; subscription credentials are absent.
      const runtime=createNativeRouter({core,responseStore,peer:'127.0.0.1'});
      try {
        const path=template.replace(/\{[^}]+\}/g,p=>['{model_id}','{model}'].includes(p)?'fixture-model':'fixture'),body=fixtureBody(row.contract,issued,baseURL);
        const response=await runtime.fetch(new Request(`http://native.invalid${path}`,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',cookie:'client-session-private','x-router-secret':'client-private'},...(['GET','HEAD'].includes(method)?{}:{body:JSON.stringify(body)})}));
        const bytes=Buffer.from(await response.arrayBuffer()),text=bytes.toString('utf8');assert.equal(response.status,row.status,`${row.route}: ${text}`);
        assert.equal(hits.length,row.upstream?1:0,`${row.route}: upstream request count`);
        if(row.upstream) {
          assert.equal(hits[0].method,row.upstream.method);assert.equal(hits[0].path,row.upstream.path);
          assert.equal(hits[0].headers.authorization,'Bearer fixture-upstream-credential');assert.notEqual(hits[0].headers.authorization,`Bearer ${token}`);
          assert.equal(hits[0].headers.cookie,undefined);assert.equal(hits[0].headers['x-router-secret'],undefined);
          if(method!=='GET' && method!=='HEAD') {
            const sent=JSON.parse(hits[0].body);
            if(['chat-inference','anthropic-inference','bridged-response-create'].includes(row.contract)){assert.equal(sent.model,'fixture-model');assert.deepEqual(sent.messages,[{role:'user',content:'hello'}]);if(row.contract!=='bridged-response-create')assert.equal(sent.max_tokens,10);}
            else assert.deepEqual(sent,body);
          }
          assert.equal(response.headers.get('x-request-id'),'fixture-upstream');
        }
        if(method==='HEAD')assert.equal(bytes.length,0,`${row.route}: HEAD must have no body`);
        else if(row.contract==='health')assert.equal(text,'ok');
        else if(row.contract==='native-audio-bytes'){assert.deepEqual(bytes,audio);assert.equal(response.headers.get('content-type'),'audio/wav');}
        else {
          assert.match(response.headers.get('content-type') ?? '',/json/);const data=JSON.parse(text);
          if(row.status >= 400){assert.equal(data.error?.message ?? data.message,row.errorMessage,`${row.route}: exact configured error contract`);if(row.errorBody)assert.deepEqual(data,row.errorBody,`${row.route}: exact resource error envelope`);}
          else assertSuccess(row.contract,data,{core,issued,cancelled:()=>cancelled});
        }
        if(row.contract==='token-revoke' || row.contract==='token-rotate-client')assert.equal((await core.tokens.get(issued.id)).revoked,true);
        if(row.contract==='native-call-create')assert.equal(response.headers.get('location'),'/api/services/openai/v1/realtime/calls/fixture');
        if(['native-response-create','native-response-compact','native-conversation-create','native-call-create'].includes(row.contract)) {
          const namespace=row.contract==='native-response-compact'?'/api/services/openai/v1/responses':path;
          const affinity=await core.affinities.get(namespace,{client_kind:client,principal_id:'primary'},'fixture');assert.equal(affinity.destination.provider,'fixture');assert.equal(affinity.destination.account,'fixture');assert.equal(await core.affinities.get(namespace,{client_kind:client,principal_id:'foreign'},'fixture'),null);
        }
        evidence.set(`route:${row.route}`,{route:row.route,success:row.status>=200 && row.status<300,fullParity:false,status:response.status,contentType:response.headers.get('content-type'),observed:'configured-handler-contract',contract:row.contract,upstreamVerified:Boolean(row.upstream),bodyVerified:method!=='HEAD',headBodyEmpty:method==='HEAD'});
      } catch(error) {failures.push(`${row.route}: ${error.message}`);} finally {await runtime.close();}
    }
    assert.deepEqual(failures,[], 'Every exact route outcome must pass');
    for(const [key,head] of evidence)if(head.headBodyEmpty){const get=evidence.get(key.replace('route:HEAD ','route:GET '));assert.equal(head.status,get.status);assert.equal(head.contentType,get.contentType);}
    return evidence;
  } finally {upstream.closeIdleConnections?.();await new Promise(resolve=>upstream.close(resolve));await rm(root,{recursive:true,force:true});}
}
