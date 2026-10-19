import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {translateRequest,translateResponse} from '../../../js/src/protocols.mjs';
import {translateStream,decodeSSE} from '../../../js/src/streams.mjs';
import {createNativeRouter} from '../../../js/src/server.mjs';
const chat={model:'m',messages:[{role:'system',content:'Be terse'},{role:'user',content:'weather?'},{role:'assistant',content:null,tool_calls:[{id:'c',type:'function',function:{name:'weather',arguments:'{"city":"Hanoi"}'}}]},{role:'tool',tool_call_id:'c',content:'{"degrees":29}'}],tools:[{type:'function',function:{name:'weather',parameters:{type:'object',properties:{city:{type:'string'}}}}}],tool_choice:'required',max_tokens:12,temperature:0.2};
const native={candidates:[{index:0,content:{role:'model',parts:[{text:'Hello'},{functionCall:{id:'c',name:'weather',args:{city:'Hanoi'}}}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:4,candidatesTokenCount:3,totalTokenCount:7,cachedContentTokenCount:2},modelVersion:'vendor'};
const frame=p=>`data: ${JSON.stringify(p)}\n\n`;
const request=(path,body)=>new Request(`http://router${path}`,{method:'POST',headers:{authorization:'Bearer client','content-type':'application/json'},body:JSON.stringify(body)});
test('Gemini source terminal truth maps every blocked reason to content_filter including prompt-only JSON and SSE',async()=>{
  for(const reason of ['STOP','MAX_TOKENS','SAFETY','RECITATION','BLOCKLIST','UNKNOWN_FUTURE_BLOCK']) {
    const value={...native,candidates:[{content:{role:'model',parts:[{text:'partial'}]},finishReason:reason}]},finish=reason==='STOP'?'stop':reason==='MAX_TOKENS'?'length':'content_filter',response=translateResponse(value,'gemini','responses','visible');
    assert.equal(translateResponse(value,'gemini','chat','visible').choices[0].finish_reason,finish);assert.equal(response.status,finish==='stop'?'completed':'incomplete');assert.equal(response.output[0].status,response.status);assert.deepEqual(response.incomplete_details,finish==='stop'?null:{reason:finish==='length'?'max_output_tokens':'content_filter'});
    const events=[];for await(const event of decodeSSE(translateStream(new Response(frame({response:value})).body,'gemini','responses','visible')))events.push(JSON.parse(event.data));const terminal=events.at(-1);assert.equal(terminal.type,finish==='stop'?'response.completed':'response.incomplete');assert.equal(terminal.response.status,response.status);assert.deepEqual(terminal.response.incomplete_details,response.incomplete_details);assert.equal(terminal.response.output[0].status,response.status);
  }
  const blocked={promptFeedback:{blockReason:'SAFETY'},usageMetadata:{promptTokenCount:2,candidatesTokenCount:0}};const response=translateResponse(blocked,'gemini','responses','visible');assert.deepEqual(response.output,[]);assert.equal(response.incomplete_details.reason,'content_filter');const events=[];for await(const event of decodeSSE(translateStream(new Response(frame(blocked)).body,'gemini','chat','visible')))events.push(event.data);assert.ok(events.some(event=>event.includes('content_filter')));assert.equal(events.at(-1),'[DONE]');
});
test('Gemini adapters preserve function pairing, generation policy and JSON usage',()=>{
  const converted=translateRequest(chat,'chat','gemini');assert.deepEqual(converted.systemInstruction,{parts:[{text:'Be terse'}]});assert.equal(converted.contents[2].parts[0].functionResponse.name,'weather');assert.equal(converted.generationConfig.maxOutputTokens,12);assert.equal(converted.toolConfig.functionCallingConfig.mode,'ANY');
  const back=translateRequest({...converted,model:'m'},'gemini','chat');assert.equal(back.messages[2].tool_calls[0].id,'c');assert.equal(back.messages[3].tool_call_id,'c');assert.equal(back.max_tokens,12);assert.equal(back.tools[0].function.name,'weather');
  const response=translateResponse(native,'gemini','anthropic','alias');assert.equal(response.content[0].text,'Hello');assert.deepEqual(response.content[1].input,{city:'Hanoi'});assert.equal(response.usage.cache_read_input_tokens,2);assert.equal(response.usage.input_tokens,2);
});
test('Gemini bridge rejects loss and ambiguous/unmatched calls',()=>{
  assert.throws(()=>translateRequest({...chat,unknown:1},'chat','gemini'),/cannot be represented/);
  assert.throws(()=>translateRequest({...chat,messages:[{role:'tool',tool_call_id:'foreign',content:'bad'}]},'chat','gemini'),/preceding/);
  assert.throws(()=>translateRequest({model:'m',contents:[{role:'model',parts:[{functionCall:{name:'f',args:{}}},{functionCall:{name:'f',args:{}}}]},{role:'user',parts:[{functionResponse:{name:'f',response:{}}}]}]},'gemini','chat'),/ambiguous/);
  assert.equal(translateResponse({...native,candidates:[{content:{parts:[{text:'thought-text',thought:true,thoughtSignature:'signature'}]},finishReason:'STOP'}]},'gemini','chat','m').choices[0].message.content,'thought-text');
  assert.throws(()=>translateRequest({...chat,parallel_tool_calls:false},'chat','gemini'),/parallel/);
});
test('Gemini media and generation controls follow Rust bridge contracts without inventing HTTP MIME facts',()=>{
  const body={model:'m',messages:[{role:'user',content:[{type:'image_url',image_url:{url:'https://images.test/a.webp'}},{type:'image_url',image_url:{url:'data:image/png;base64,QUJD'}}]}],seed:42,frequency_penalty:0.5,presence_penalty:-0.5,logit_bias:{},top_logprobs:0,logprobs:false,response_format:{type:'json_object'}};
  const converted=translateRequest(body,'chat','gemini');assert.deepEqual(converted.contents[0].parts,[{fileData:{fileUri:'https://images.test/a.webp'}},{inlineData:{mimeType:'image/png',data:'QUJD'}}]);assert.deepEqual(converted.generationConfig,{frequencyPenalty:0.5,presencePenalty:-0.5,seed:42,responseMimeType:'application/json',responseJsonSchema:{type:'object',additionalProperties:true}});
  for(const suffix of ['Q','QQ=','QR=='])assert.throws(()=>translateRequest({...body,messages:[{role:'user',content:[{type:'image_url',image_url:{url:`data:image/png;base64,${suffix}`}}]}]},'chat','gemini'),/base64/);
  assert.throws(()=>translateRequest({...body,tools:[{type:'function',function:{name:'f',strict:true}}]},'chat','gemini'),/strict/);
  const native={model:'m',contents:[{role:'user',parts:[{text:'one'}]}],generationConfig:{topK:64},tools:[{functionDeclarations:[{name:'f',parametersJsonSchema:{type:'object'}}]}]};const reversed=translateRequest(native,'gemini','chat');assert.equal(reversed.messages[0].content,'one');assert.equal(reversed.top_k,undefined);assert.deepEqual(reversed.tools[0].function.parameters,{type:'object'});
  assert.throws(()=>translateRequest({...native,generationConfig:{topK:10}},'gemini','chat'),/exact cross-provider/);assert.throws(()=>translateRequest({...body,user:'tracking'},'chat','gemini'),/user cannot/);
});
test('Gemini thinking uses source effort precedence, exact budget thresholds and separate summary visibility',()=>{
  for(const [effort,budget] of [['none',0],['auto',-1],['minimal',512],['low',1024],['medium',8192],['high',24576],['xhigh',32768],['max',128000]]){const value=translateRequest({...chat,reasoning_effort:effort},'chat','gemini');assert.equal(value.generationConfig.thinkingConfig.thinkingBudget,budget);assert.equal(value.generationConfig.thinkingConfig.includeThoughts,effort!=='none');}
  let value=translateRequest({...chat,reasoning_effort:'high',reasoning:{effort:'LOW',summary:'none'}},'chat','gemini');assert.deepEqual(value.generationConfig.thinkingConfig,{thinkingBudget:1024,includeThoughts:false});
  for(const [budget,effort] of [[0,'none'],[-1,'auto'],[512,'minimal'],[513,'low'],[1025,'medium'],[8193,'high'],[24577,'xhigh']]){value=translateRequest({model:'m',contents:[],generationConfig:{thinkingConfig:{thinkingBudget:budget,includeThoughts:true}}},'gemini','chat');assert.equal(value.reasoning_effort,effort);}
  value=translateRequest({model:'m',contents:[],generationConfig:{thinkingConfig:{thinkingLevel:'HIGH',thinkingBudget:-2}}},'gemini','chat');assert.equal(value.reasoning_effort,'high');
  assert.throws(()=>translateRequest({model:'m',contents:[],generationConfig:{thinkingConfig:{thinkingBudget:4294967296}}},'gemini','chat'),/u32/);assert.throws(()=>translateRequest({...chat,reasoning_effort:'unsupported'},'chat','gemini'),/unsupported thinking effort/);
});
test('Gemini streams unwrap Code Assist, preserve UTF8/tools/usage and fail premature ending',async()=>{
  const raw=frame({response:{responseId:'g',candidates:[{content:{role:'model',parts:[{text:'Xin chào'}]}}]}})+frame({response:{candidates:[{content:{role:'model',parts:[{functionCall:{id:'c',name:'f',args:{x:1}}}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:2,candidatesTokenCount:1,totalTokenCount:3}}});
  let usage;
  const result=await new Response(translateStream(new Response(raw).body,'gemini','chat','m',{onComplete:state=>{usage=state.usage;}})).text();assert.match(result,/Xin chào/);assert.match(result,/tool_calls/);assert.match(result,/\[DONE\]/);assert.equal(usage.total,3);
  const reverse=await new Response(translateStream(new Response(frame({id:'c',choices:[{delta:{content:'hello'},finish_reason:'stop'}]})+'data: [DONE]\n\n').body,'chat','gemini','m')).text();assert.match(reverse,/modelVersion/);assert.match(reverse,/finishReason/);assert.doesNotMatch(reverse,/response.created/);
  const malformed=await new Response(translateStream(new Response(frame({candidates:[{content:{parts:[{text:'partial'}]}}]})).body,'gemini','chat','m')).text();assert.match(malformed,/upstream_stream_error/);assert.doesNotMatch(malformed,/\[DONE\]/);
});
test('native Gemini localhost request uses Code Assist envelope and returns native response metadata',async t=>{
  let observed;
  const server=createServer(async (incoming,outgoing)=>{const chunks=[];for await(const chunk of incoming)chunks.push(chunk);observed={path:incoming.url,headers:incoming.headers,body:JSON.parse(Buffer.concat(chunks).toString())};outgoing.setHeader('content-type','application/json');outgoing.end(JSON.stringify({response:native}));});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();}));
  const core={config:{},tokens:{validate:()=>({client_kind:'gemini',principal_id:'primary'})},candidates:()=>[{protocol:'gemini',model:'models/vendor',base_url:`http://127.0.0.1:${server.address().port}`,api_key:'subscription',auth_type:'oauth',project:'p'}]};
  const router=createNativeRouter({core});const response=await router.fetch(request('/api/services/gemini/v1beta/models/alias:generateContent',{contents:[{role:'user',parts:[{text:'Hi'}]}]}));assert.equal(response.status,200);
  assert.equal(observed.path,'/v1internal:generateContent');assert.equal(observed.headers.authorization,'Bearer subscription');assert.deepEqual(observed.body,{model:'vendor',project:'p',request:{contents:[{role:'user',parts:[{text:'Hi'}]}]}});
  const body=await response.json();assert.equal(body.modelVersion,'alias');assert.equal(body.candidates[0].content.parts[0].text,'Hello');assert.equal(body.response,undefined);
});
test('Gemini service translates to native Chat and keeps error dialect on rejected action',async()=>{
  let payload;
  const core={config:{},tokens:{validate:()=>({client_kind:'gemini',principal_id:'primary'})},candidates:()=>[{protocol:'openai',model:'actual',base_url:'http://localhost/v1'}]};
  const router=createNativeRouter({core,fetch:async(_url,options)=>{payload=JSON.parse(options.body);return Response.json({id:'c',choices:[{message:{role:'assistant',content:'hello'},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3}});}});
  const response=await router.fetch(request('/api/services/gemini/v1beta/models/alias:generateContent',{contents:[{role:'user',parts:[{text:'Hi'}]}]}));assert.equal(response.status,200);assert.equal(payload.model,'actual');assert.equal(payload.messages[0].content,'Hi');assert.equal((await response.json()).usageMetadata.totalTokenCount,3);
  const rejected=await router.fetch(request('/api/services/gemini/v1beta/models/alias:delete',{}));assert.equal(rejected.status,404);assert.equal((await rejected.json()).error.status,'NOT_FOUND');
});
