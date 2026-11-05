import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyTypedTargets} from './typed-targets.mjs';

const root=new URL('../../../',import.meta.url),sourcePath='rust/src/subscription_usage_normalize.rs';
const read=path=>readFileSync(new URL(path,root),'utf8');
const tag=$=>Object.freeze({$}),none=tag('None');

test('actual complete generated usage module preserves every provider and all independent record fields',{timeout:60000},async()=>{
 const inventory=JSON.parse(read('parity/rust-source-inventory.json')),row=inventory.sources.find(item=>item.source===sourcePath);
 assert.ok(row,'actual production source must be inventoried');
 const source=read(sourcePath),sha256=createHash('sha256').update(source).digest('hex'),meta=JSON.parse(read(row.targets.meta));
 assert.equal(row.sha256,sha256);assert.equal(meta.sourceSha256,sha256);assert.equal(meta.items.map(item=>item.source).join(''),source);
 const result={javascript:read(row.targets.javascript),typescript:read(row.targets.typescript),meta:{entry:sourcePath}};
 await verifyTypedTargets(result,(api,_result,module)=>{
  assert.equal(module.provenance.sourcePath,sourcePath);assert.equal(module.provenance.sourceSha256,sha256);
  assert.equal(module.provenance.runtimeParity,false);assert.equal(typeof api.empty_usage,'function');
  for(const provider of ['Anthropic','OpenAi','ZAi','Lefine','Gemini','Qwen']){
   const actual=api.empty_usage(tag(provider));
   assert.deepEqual(actual,{
    $:'SubscriptionUsage',provider:tag(provider),state:tag('Unverified'),status:'unverified',
    pool:none,allowed:none,limit_reached:none,plan:none,windows:[],additional_limits:[],
    credits:none,extra_usage:none,spend_control:none,rate_limit_reached_type:none,
    rate_limit_reset_credits_available:none,subscription_end:none,trial_end:none,
    subscription_created:none,retry_after_seconds:none,
   });
   assert.equal(Object.keys(actual).length,19);assert.equal(Object.isFrozen(actual),true);
   for(const value of Object.values(actual))if(value&&typeof value==='object')assert.equal(Object.isFrozen(value),true);
   const mutable={$:provider},snapshot=api.empty_usage(mutable);assert.deepEqual(snapshot,actual);
   assert.notStrictEqual(snapshot.provider,mutable);assert.equal(Object.isFrozen(mutable),false);
   mutable.$='Unknown';assert.equal(snapshot.provider.$,provider);assert.equal(Object.isFrozen(snapshot.provider),true);
  }
  let reads=0;const hostile=new Proxy({},{get(){reads++;throw Error('unexpected provider read');},ownKeys(){reads++;throw Error('unexpected provider keys');}});
  const accessor=Object.defineProperty({},'$',{enumerable:true,get(){reads++;throw Error('unexpected provider getter');}});
  for(const value of [null,undefined,0,'Anthropic',{},{$:'Anthropic',extra:true},tag('Unknown'),hostile,accessor])assert.throws(()=>api.empty_usage(value),TypeError);
  assert.equal(reads,0);
 },{childTimeoutMs:20000});
});
