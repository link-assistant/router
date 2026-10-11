import {ProtocolError} from './protocols.mjs';
const copy = structuredClone;
const object = (value,path) => {if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProtocolError(`${path} must be an object`);return value;};
const fields = (value,allowed,path) => {object(value,path);for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new ProtocolError(`${path}.${key} cannot be represented by this bridge`);};
const string = (value,path) => {if (typeof value !== 'string') throw new ProtocolError(`${path} must be a string`);return value;};
const parseObject = (value,path) => {let parsed;try {parsed = typeof value === 'string' ? JSON.parse(value) : value;} catch {throw new ProtocolError(`${path} must encode a JSON object`);}return object(parsed,path);};
const alias = (value,a,b) => value[a] ?? value[b];
function chatParts(content) {
  if (content == null) return [];
  if (typeof content === 'string') return content ? [{text:content}] : [];
  if (!Array.isArray(content)) throw new ProtocolError('Message content must be a string or array');
  return content.map(part => {
    if (part.type === 'text') {fields(part,['type','text'],'content');return {text:string(part.text,'content.text')};}
    if (part.type === 'image_url') {
      fields(part,['type','image_url'],'content');fields(part.image_url,['url','detail'],'image_url');
      if (part.image_url.detail != null && part.image_url.detail !== 'auto') throw new ProtocolError('image detail cannot be represented by Gemini');
      const url=string(part.image_url.url,'image_url.url'), match=/^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
      if (match) return {inlineData:{mimeType:match[1],data:match[2]}};
      let parsed;try {parsed=new URL(url);} catch {throw new ProtocolError('Image URI must be an absolute HTTP(S) URI');}
      if (!['http:','https:'].includes(parsed.protocol))throw new ProtocolError('Image URI must use HTTP(S)');
      return {fileData:{mimeType:'image/jpeg',fileUri:url}};
    }
    throw new ProtocolError(`Cannot translate content part ${part.type} to Gemini`);
  });
}
export function chatToGemini(body) {
  fields(body,['model','messages','stream','max_tokens','max_completion_tokens','temperature','top_p','top_k','stop','tools','tool_choice','parallel_tool_calls','n','stream_options','user','safety_identifier','response_format','seed','frequency_penalty','presence_penalty','logit_bias','modalities','audio','logprobs','top_logprobs','reasoning','reasoning_effort'],'request');
  if (!Array.isArray(body.messages))throw new ProtocolError('messages must be an array');
  if (body.max_tokens != null && body.max_completion_tokens != null)throw new ProtocolError('max_completion_tokens and max_tokens cannot both be set');
  if (body.n != null && body.n !== 1)throw new ProtocolError('Gemini bridge supports only n=1');
  for (const field of ['audio','logprobs','top_logprobs','seed','frequency_penalty','presence_penalty','logit_bias','reasoning','reasoning_effort']) if(body[field] != null && body[field] !== false)throw new ProtocolError(`${field} cannot be represented by Gemini`);
  if(body.parallel_tool_calls === false)throw new ProtocolError('Disabling parallel calls cannot be represented by Gemini');
  if(body.modalities && JSON.stringify(body.modalities) !== '["text"]')throw new ProtocolError('Non-text modalities cannot be represented by Gemini');
  const out={contents:[]},system=[],pending=new Map();
  for (const message of body.messages) {
    fields(message,message.role === 'assistant' ? ['role','content','name','tool_calls'] : message.role === 'tool' ? ['role','content','tool_call_id'] : ['role','content','name'],'message');
    if(message.name)throw new ProtocolError('Message name cannot be represented by Gemini');
    if(['system','developer'].includes(message.role)){system.push(...chatParts(message.content));continue;}
    if(message.role === 'tool') {
      const name=pending.get(message.tool_call_id);if(!name)throw new ProtocolError('Tool result has no preceding matching call');pending.delete(message.tool_call_id);
      const text=typeof message.content === 'string' ? message.content : (message.content ?? []).map(p => {if(p.type !== 'text')throw new ProtocolError('Tool output must be text');return p.text;}).join('');
      let response;try {response=JSON.parse(text);} catch {response={output:text};}if(!response || typeof response !== 'object' || Array.isArray(response))response={output:text};
      out.contents.push({role:'user',parts:[{functionResponse:{id:message.tool_call_id,name,response}}]});continue;
    }
    if(!['user','assistant'].includes(message.role))throw new ProtocolError('Message role cannot be represented by Gemini');
    const parts=chatParts(message.content);
    for(const call of message.tool_calls ?? []) {
      if(call.type !== 'function' || !call.id || !call.function?.name || pending.has(call.id))throw new ProtocolError('Function call identity is invalid or duplicated');
      pending.set(call.id,call.function.name);parts.push({functionCall:{id:call.id,name:call.function.name,args:parseObject(call.function.arguments,'function.arguments')}});
    }
    out.contents.push({role:message.role === 'assistant' ? 'model' : 'user',parts});
  }
  if(system.length)out.systemInstruction={parts:system};
  const generation={};
  for(const [from,to] of [['temperature','temperature'],['top_p','topP'],['top_k','topK']])if(body[from] !== undefined)generation[to]=body[from];
  if(body.max_completion_tokens ?? body.max_tokens)generation.maxOutputTokens=body.max_completion_tokens ?? body.max_tokens;
  if(body.stop)generation.stopSequences=Array.isArray(body.stop)?copy(body.stop):[body.stop];
  if(body.response_format) {
    if(body.response_format.type === 'json_object')generation.responseMimeType='application/json';
    else if(body.response_format.type === 'json_schema'){generation.responseMimeType='application/json';generation.responseJsonSchema=copy(body.response_format.json_schema.schema);}
    else if(body.response_format.type !== 'text')throw new ProtocolError('Unsupported response_format');
  }
  if(Object.keys(generation).length)out.generationConfig=generation;
  if(body.tools)out.tools=[{functionDeclarations:body.tools.map(tool => {if(tool.type !== 'function')throw new ProtocolError('Gemini only supports function tools');return {name:tool.function.name,...(tool.function.description ? {description:tool.function.description}:{}),parameters:copy(tool.function.parameters ?? {type:'object',properties:{}})};})}];
  if(body.tool_choice) {
    const mode=typeof body.tool_choice === 'string'?{auto:'AUTO',none:'NONE',required:'ANY'}[body.tool_choice]:'ANY';if(!mode)throw new ProtocolError('Unsupported tool_choice');
    out.toolConfig={functionCallingConfig:{mode,...(typeof body.tool_choice === 'object'?{allowedFunctionNames:[body.tool_choice.function.name]}:{})}};
  }
  return out;
}
export function geminiToChat(body) {
  fields(body,['model','stream','contents','systemInstruction','system_instruction','generationConfig','generation_config','tools','toolConfig','tool_config'],'request');
  if(!Array.isArray(body.contents))throw new ProtocolError('contents must be an array');
  const out={model:body.model,messages:[],stream:body.stream ?? false},pending=[];let sequence=0;
  const convert = part => {
    if(Object.hasOwn(part,'text')) {fields(part,['text'],'part');return {type:'text',text:string(part.text,'part.text')};}
    const inline=alias(part,'inlineData','inline_data');if(inline){fields(part,['inlineData','inline_data'],'part');const mime=alias(inline,'mimeType','mime_type');if(!/^image\/(?:jpeg|png|gif|webp)$/.test(mime) || !/^[A-Za-z0-9+/]+={0,2}$/.test(inline.data))throw new ProtocolError('Inline image must contain supported image media and base64');return {type:'image_url',image_url:{url:`data:${mime};base64,${inline.data}`}};}
    const file=alias(part,'fileData','file_data');if(file){fields(part,['fileData','file_data'],'part');const uri=alias(file,'fileUri','file_uri');let url;try{url=new URL(uri);}catch{throw new ProtocolError('Image URI is invalid');}if(!['http:','https:'].includes(url.protocol))throw new ProtocolError('Image URI must use HTTP(S)');return {type:'image_url',image_url:{url:uri}};}
    throw new ProtocolError('Gemini part cannot be represented by this bridge');
  };
  const system=alias(body,'systemInstruction','system_instruction');if(system){fields(system,['role','parts'],'systemInstruction');out.messages.push({role:'system',content:system.parts.map(convert)});}
  for(const content of body.contents) {
    fields(content,['role','parts'],'content');const role=content.role ?? 'user';if(!['user','model'].includes(role) || !Array.isArray(content.parts))throw new ProtocolError('Gemini content role/parts is invalid');
    const ordinary=[],calls=[],results=[];
    for(const part of content.parts) {
      const call=alias(part,'functionCall','function_call'),result=alias(part,'functionResponse','function_response');
      if(call){fields(part,['functionCall','function_call'],'part');fields(call,['id','name','args'],'functionCall');if(role !== 'model' || !call.name)throw new ProtocolError('Function call must be in a model turn');const id=call.id ?? `call_${sequence++}`;if(pending.some(p=>p.id === id))throw new ProtocolError('Function call id is duplicated');pending.push({id,name:call.name});calls.push({id,type:'function',function:{name:call.name,arguments:JSON.stringify(object(call.args ?? {},'args'))}});}
      else if(result){fields(part,['functionResponse','function_response'],'part');fields(result,['id','name','response'],'functionResponse');if(role !== 'user')throw new ProtocolError('Function response must be in a user turn');const matches=pending.filter(c => c.name === result.name && (!result.id || c.id === result.id));if(matches.length !== 1)throw new ProtocolError('Function response is missing or ambiguous; include call id');const matched=matches[0];pending.splice(pending.indexOf(matched),1);results.push({role:'tool',tool_call_id:matched.id,content:JSON.stringify(object(result.response,'response'))});}
      else ordinary.push(convert(part));
    }
    if(ordinary.length || calls.length)out.messages.push({role:role === 'model'?'assistant':'user',content:ordinary,...(calls.length?{tool_calls:calls}:{})});
    out.messages.push(...results);
  }
  const generation=alias(body,'generationConfig','generation_config');if(generation){fields(generation,['temperature','topP','top_p','topK','top_k','maxOutputTokens','max_output_tokens','stopSequences','stop_sequences','candidateCount','candidate_count','responseMimeType','response_mime_type','responseJsonSchema','response_json_schema'],'generationConfig');for(const [a,b,to] of [['temperature','temperature','temperature'],['topP','top_p','top_p'],['topK','top_k','top_k'],['maxOutputTokens','max_output_tokens','max_tokens'],['stopSequences','stop_sequences','stop']]){const value=alias(generation,a,b);if(value !== undefined)out[to]=copy(value);}if((alias(generation,'candidateCount','candidate_count') ?? 1) !== 1)throw new ProtocolError('Only one Gemini candidate can be bridged');const mime=alias(generation,'responseMimeType','response_mime_type');if(mime === 'application/json')out.response_format={type:'json_object'};else if(mime && mime !== 'text/plain')throw new ProtocolError('Response MIME type cannot be represented');const schema=alias(generation,'responseJsonSchema','response_json_schema');if(schema)out.response_format={type:'json_schema',json_schema:{name:'response',schema:copy(schema)}};}
  if(body.tools)out.tools=body.tools.flatMap(tool => {fields(tool,['functionDeclarations','function_declarations'],'tools');return alias(tool,'functionDeclarations','function_declarations').map(fn => ({type:'function',function:copy(fn)}));});
  const config=alias(body,'toolConfig','tool_config');if(config){const calling=alias(config,'functionCallingConfig','function_calling_config');fields(calling,['mode','allowedFunctionNames','allowed_function_names'],'functionCallingConfig');const allowed=alias(calling,'allowedFunctionNames','allowed_function_names'),mode=calling.mode?.toUpperCase();if(allowed){if(mode !== 'ANY' || allowed.length !== 1)throw new ProtocolError('Function policy cannot be represented exactly');out.tool_choice={type:'function',function:{name:allowed[0]}};}else {out.tool_choice={AUTO:'auto',NONE:'none',ANY:'required'}[mode];if(!out.tool_choice)throw new ProtocolError('Function policy mode is invalid');}}
  return out;
}
export function geminiCanonical(body, normalizeUsage) {
  const value=body.response ?? body,candidate=value.candidates?.[0];if(value.candidates?.length > 1 || !candidate?.content)throw new ProtocolError('Gemini response must contain one candidate',502);
  const r={id:value.responseId,model:value.modelVersion,text:'',tools:[],usage:normalizeUsage(value.usageMetadata,'gemini'),finish:candidate.finishReason === 'MAX_TOKENS' ? 'length':'stop'};
  if(!['STOP','MAX_TOKENS',undefined].includes(candidate.finishReason))throw new ProtocolError(`Gemini finish reason ${candidate.finishReason} cannot be represented`,502);
  for(const part of candidate.content.parts ?? []){if(part.text !== undefined){if(part.thought || part.thoughtSignature)throw new ProtocolError('Gemini thought metadata cannot be represented',502);r.text+=part.text;}else if(part.functionCall){const c=part.functionCall;r.tools.push({id:c.id ?? `call_${r.tools.length}`,type:'function',function:{name:c.name,arguments:JSON.stringify(c.args ?? {})}});}else throw new ProtocolError('Gemini output part cannot be represented',502);}
  if(r.tools.length)r.finish='tool_calls';return r;
}
export function canonicalGemini(r,model) {
  return {candidates:[{index:0,content:{role:'model',parts:[...(r.text?[{text:r.text}]:[]),...r.tools.map(t=>({functionCall:{id:t.id,name:t.function.name,args:parseObject(t.function.arguments,'arguments')}}))]},finishReason:r.finish === 'length'?'MAX_TOKENS':'STOP'}],usageMetadata:{promptTokenCount:r.usage.input,candidatesTokenCount:r.usage.output,totalTokenCount:r.usage.total,cachedContentTokenCount:r.usage.cached},modelVersion:model};
}
