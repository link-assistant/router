import test from 'node:test';
import assert from 'node:assert/strict';
import {UsageTracker} from '../../../packages/javascript/native/usage.mjs';
import {createNativeRouter} from '../../../packages/javascript/native/server.mjs';
const frame=value=>`data: ${JSON.stringify(value)}\n\n`;
test('usage tracker counts vendor caches, Unicode partial output and final usage without double counting',()=>{
  const tracker=new UsageTracker();const bytes=Buffer.from(frame({type:'message_start',message:{usage:{input_tokens:3,cache_read_input_tokens:2,cache_creation_input_tokens:1}}})+frame({type:'content_block_delta',delta:{type:'text_delta',text:'Xin chào🙂'}}));
  for(const byte of bytes)tracker.feed(Buffer.from([byte]));assert.deepEqual(tracker.finish(),{tokens:9,estimated:true});
  const complete=new UsageTracker();complete.feed(Buffer.from(frame({choices:[{delta:{content:'a'.repeat(100)}}]})+frame({usage:{prompt_tokens:2,completion_tokens:1,total_tokens:3}})));assert.deepEqual(complete.finish(),{tokens:3,estimated:false});
  const json=new UsageTracker();json.feed(Buffer.from(JSON.stringify({response:{usageMetadata:{promptTokenCount:4,candidatesTokenCount:2,totalTokenCount:6,cachedContentTokenCount:3}}})));assert.deepEqual(json.finish(),{tokens:6,estimated:false});
});
test('native and translated truncated streams settle estimated usage and never report success',async()=>{
  for(const target of ['chat','anthropic']) {
    let settled,success=0;
    const core={config:{},tokens:{validate:()=>({sub:'t'}),admit:()=> 'admitted',settle:(_id,_reserved,used)=>{settled=used;}},candidates:()=>[{protocol:'anthropic',model:'m',base_url:'http://localhost/v1'}],reportSuccess:()=>{success++;}};
    const raw=frame({type:'message_start',message:{id:'a',usage:{input_tokens:3}}})+frame({type:'content_block_start',index:0,content_block:{type:'text',text:''}})+frame({type:'content_block_delta',index:0,delta:{type:'text_delta',text:'abcdefghij'}});
    const router=createNativeRouter({core,fetch:async()=>new Response(raw,{headers:{'content-type':'text/event-stream'}})});
    const request=new Request(`http://router/v1/${target === 'chat'?'chat/completions':'messages'}`,{method:'POST',headers:{authorization:'Bearer t'},body:JSON.stringify({model:'m',messages:[{role:'user',content:'hi'}],stream:true})});
    const result=await router.fetch(request);assert.match(await result.text(),/upstream_stream_error/);assert.equal(settled,6);assert.equal(success,0);
  }
});
