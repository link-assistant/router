import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {createNativeRouter} from '../../../js/src/server.mjs';
import {parseRefUpdates} from '../../../js/src/git-proxy.mjs';
const old='1'.repeat(40),next='2'.repeat(40),zero='0'.repeat(40);
const pkt=line=>Buffer.from((Buffer.byteLength(line)+4).toString(16).padStart(4,'0')+line);
const push=(before,after,name='refs/heads/main',capabilities='report-status')=>Buffer.concat([pkt(`${before} ${after} ${name}\0${capabilities}\n`),Buffer.from('0000PACK\0\xff')]);
test('git pkt lines stop at flush and preserve exact capabilities and raw pack bytes',()=>{
  assert.deepEqual(parseRefUpdates(push(old,next)),[{old,new:next,name:'refs/heads/main'}]);
  assert.deepEqual(parseRefUpdates(Buffer.concat([pkt(`${old} ${next} refs/heads/a\n`),pkt(`${zero} ${next} refs/heads/b\n`),Buffer.from('0000garbage')])),[{old,new:next,name:'refs/heads/a'},{old:zero,new:next,name:'refs/heads/b'}]);
  assert.deepEqual(parseRefUpdates(Buffer.from('0003truncated')),[]);
});
test('git localhost ancestry mediation refuses rewrites before forwarding and passes authorized fast-forward/create bytes',async t=>{
  let verdict='ahead';const received=[];const upstream=createServer(async(request,response)=>{const chunks=[];for await(const chunk of request)chunks.push(chunk);received.push({url:request.url,headers:request.headers,body:Buffer.concat(chunks)});if(request.url.includes('/compare/')){response.writeHead(200,{'content-type':'application/json'});response.end(JSON.stringify({status:verdict}));}else {response.writeHead(200,{'content-type':'application/x-git-receive-pack-result'});response.end('000eunpack ok\n0000');}});
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>upstream.close(resolve)));
  const core={config:{github:{token:'operator-git-token',base_url:`http://127.0.0.1:${upstream.address().port}`}}},router=createNativeRouter({core,authenticate:()=>({github_repos:['A/B']})});
  const request=body=>new Request('http://router/api/services/github/git/a/b.git/git-receive-pack?exact=1',{method:'POST',body,headers:{authorization:'Bearer caller',cookie:'caller=1','content-type':'application/x-git-receive-pack-request','git-protocol':'version=2'}});
  let response=await router.fetch(request(push(old,zero)));assert.equal(response.status,403);assert.match(await response.text(),/deleting refs\/heads\/main/);assert.equal(received.length,0);
  response=await router.fetch(request(push(old,next,'refs/heads/main','push-force')));assert.equal(response.status,403);assert.equal(received.length,0);
  verdict='diverged';response=await router.fetch(request(push(old,next)));assert.equal(response.status,403);assert.match(await response.text(),/force-updating/);assert.equal(received.length,1);assert.equal(received[0].url,`/repos/a/b/compare/${old}...${next}`);
  verdict='unknown';response=await router.fetch(request(push(old,next)));assert.equal(response.status,403);assert.match(await response.text(),/no comparable status/);assert.equal(received.length,2);
  verdict='ahead';const body=push(old,next);response=await router.fetch(request(body));assert.equal(response.status,200);await response.text();assert.equal(received.length,4);assert.equal(received[3].url,'/a/b.git/git-receive-pack?exact=1');assert.deepEqual(received[3].body,body);assert.equal(received[3].headers.authorization,'Basic '+Buffer.from('x-access-token:operator-git-token').toString('base64'));assert.equal(received[3].headers.cookie,undefined);assert.equal(received[3].headers['git-protocol'],'version=2');
  response=await router.fetch(request(push(zero,next)));assert.equal(response.status,200);await response.text();assert.equal(received.length,5);
  const permitted=createNativeRouter({core:{config:{github:{...core.config.github,policy:{rules:[{effect:'allow',method:'GIT',path:'/git/a/b/refs/heads/main'}]}}}},authenticate:()=>({})});response=await permitted.fetch(request(push(old,zero)));assert.equal(response.status,200);await response.text();assert.equal(received.length,6);
});
test('admin listener serves the actual embedded UI assets and hardens assets, API errors and fallbacks',async()=>{
  const core={config:{},admin:{status:()=>({claimed:false})}},router=createNativeRouter({core,listenerKind:'admin',peer:'127.0.0.1'});
  const expected={'/':'6f37ad41b22e25daaf0d79b52fbd8a7cf420aec6dad293f377f372c593e81d65','/assets/app.js':'60450cb9d2c8e52b7964e2adb5670f47e7e695dce9936dbfc0ea98fb2bcde66f','/assets/react.js':'73e85984904d151433d181a3c7de579f2e77e6132471ec1bae77e4acd3185d33','/assets/rolldown-runtime.js':'bbf7c5086ae414dc3f33777e3eebf16ea8631325b8bb4690d25091c03567f31a','/assets/ui-vendor.js':'881d21a46007374c8dc046889e1006c547ec88f68397d4f9b895314fb314b74c'};
  for(const [path,digest] of Object.entries(expected)){const response=await router.fetch(new Request('http://router'+path));assert.equal(response.status,200);assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),digest);assert.equal(response.headers.get('cache-control'),'no-cache, must-revalidate');assert.match(response.headers.get('content-security-policy'),/script-src 'self';/);assert.equal(response.headers.get('x-frame-options'),'DENY');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('referrer-policy'),'no-referrer');}
  let response=await router.fetch(new Request('http://router/settings'));assert.equal(response.status,200);assert.match(await response.text(),/<div id="root">/);
  response=await router.fetch(new Request('http://router/api/unknown'));assert.equal(response.status,404);assert.equal(await response.text(),'not found');assert.equal(response.headers.get('x-frame-options'),'DENY');
  response=await router.fetch(new Request('http://router/api/management/tokens'));assert.equal(response.status,401);assert.equal(response.headers.get('x-frame-options'),'DENY');
});
