import {ProtocolError} from './protocols.mjs';
const copy = structuredClone;
const object = (value,path) => {if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProtocolError(`${path} must be an object`);return value;};
const fields = (value,allowed,path) => {object(value,path);for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new ProtocolError(`${path}.${key} cannot be represented by this bridge`);};
const string = (value,path) => {if (typeof value !== 'string') throw new ProtocolError(`${path} must be a string`);return value;};
const parseObject = (value,path) => {let parsed;try {parsed = typeof value === 'string' ? JSON.parse(value) : value;} catch {throw new ProtocolError(`${path} must encode a JSON object`);}return object(parsed,path);};
const alias = (value,a,b) => value[a] ?? value[b];
const levels={minimal:512,low:1024,medium:8192,high:24576,xhigh:32768,max:128000};
function effort(value) {if(value==null)return;if(typeof value!=='string')throw new ProtocolError('thinking effort must be a string');const normalized=value.toLowerCase();if(normalized==='-1')return 'auto';if(!['none','auto',...Object.keys(levels)].includes(normalized))throw new ProtocolError(`unsupported thinking effort: ${value}`);return normalized;}
function chatThinking(body) {
  if(body.reasoning!=null)object(body.reasoning,'reasoning');
  const value=effort(body.reasoning?.effort ?? body.reasoning_effort);if(value===undefined)return;
  const visible=typeof body.reasoning?.summary==='string' ? body.reasoning.summary!=='none' : typeof body.reasoning_effort==='string' ? body.reasoning_effort!=='none':undefined;
  return {thinkingBudget:value==='none'?0:value==='auto'?-1:levels[value],...(visible===undefined?{}:{includeThoughts:visible})};
}
function geminiThinking(config) {
  if(!config)return;fields(config,['includeThoughts','include_thoughts','thinkingBudget','thinking_budget','thinkingLevel','thinking_level'],'thinkingConfig');
  for(const key of ['includeThoughts','include_thoughts'])if(config[key]!==undefined && typeof config[key]!=='boolean')throw new ProtocolError(`thinkingConfig.${key} must be a boolean`);
  const level=effort(alias(config,'thinkingLevel','thinking_level'));if(level!==undefined)return level;
  const budget=alias(config,'thinkingBudget','thinking_budget');if(budget==null)return;
  if(!Number.isSafeInteger(budget) || budget< -1 || budget>4294967295)throw new ProtocolError('thinking budget must be -1 or a nonnegative u32 integer');
  return budget===-1?'auto':budget===0?'none':budget<=512?'minimal':budget<=1024?'low':budget<=8192?'medium':budget<=24576?'high':'xhigh';
}
function imageMedia(value) {if(!['image/jpeg','image/png','image/gif','image/webp'].includes(value))throw new ProtocolError('Image media type is unsupported');return value;}
function imageBase64(value) {if(typeof value!=='string' || !value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.replace(/=+$/,'').length%4===1 || value.includes('=') && value.length%4!==0 || Buffer.from(value,'base64').toString('base64').replace(/=+$/,'')!==value.replace(/=+$/,''))throw new ProtocolError('Image data must be valid base64');return value;}
const chatContent=parts=>parts.length===1 && parts[0].type==='text' ? parts[0].text:parts;
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
      if (match) return {inlineData:{mimeType:match[1],data:imageBase64(match[2])}};
      let parsed;try {parsed=new URL(url);} catch {throw new ProtocolError('Image URI must be an absolute HTTP(S) URI');}
      if (!['http:','https:'].includes(parsed.protocol))throw new ProtocolError('Image URI must use HTTP(S)');
      return {fileData:{fileUri:url}};
    }
    throw new ProtocolError(`Cannot translate content part ${part.type} to Gemini`);
  });
}
export function chatToGemini(body) {
  fields(body,['model','messages','stream','max_tokens','max_completion_tokens','temperature','top_p','top_k','stop','tools','tool_choice','parallel_tool_calls','n','stream_options','user','safety_identifier','response_format','seed','frequency_penalty','presence_penalty','logit_bias','modalities','audio','logprobs','top_logprobs','reasoning','reasoning_effort'],'request');
  if (!Array.isArray(body.messages))throw new ProtocolError('messages must be an array');
  if (body.max_tokens != null && body.max_completion_tokens != null)throw new ProtocolError('max_completion_tokens and max_tokens cannot both be set');
  if (body.n != null && body.n !== 1)throw new ProtocolError('Gemini bridge supports only n=1');
  for (const field of ['audio','user','safety_identifier','stream_options'])if(body[field]!=null)throw new ProtocolError(`${field} cannot be represented by Gemini`);
  if(body.logprobs!=null && body.logprobs!==false || body.top_logprobs!=null && body.top_logprobs!==0)throw new ProtocolError('Log probabilities cannot be represented by Gemini');
  if(body.logit_bias!=null && (typeof body.logit_bias!=='object' || Array.isArray(body.logit_bias) || Object.keys(body.logit_bias).length))throw new ProtocolError('logit_bias cannot be represented by Gemini');
  for(const field of ['frequency_penalty','presence_penalty'])if(body[field]!=null && (typeof body[field]!=='number' || !Number.isFinite(body[field]) || body[field]<-2 || body[field]>2))throw new ProtocolError(`${field} must be between -2 and 2`);
  if(body.seed!=null && !Number.isSafeInteger(body.seed))throw new ProtocolError('seed must be an integer');
  if(body.top_k!=null && (!Number.isSafeInteger(body.top_k) || body.top_k<0))throw new ProtocolError('top_k must be a non-negative integer');
  if(body.parallel_tool_calls!=null && typeof body.parallel_tool_calls!=='boolean')throw new ProtocolError('parallel_tool_calls must be a boolean');
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
  for(const [from,to] of [['temperature','temperature'],['top_p','topP'],['top_k','topK'],['frequency_penalty','frequencyPenalty'],['presence_penalty','presencePenalty'],['seed','seed']])if(body[from] !== undefined)generation[to]=body[from];
  if(body.max_completion_tokens ?? body.max_tokens)generation.maxOutputTokens=body.max_completion_tokens ?? body.max_tokens;
  if(body.stop)generation.stopSequences=Array.isArray(body.stop)?copy(body.stop):[body.stop];
  if(body.response_format) {
    if(body.response_format.type === 'json_object'){generation.responseMimeType='application/json';generation.responseJsonSchema={type:'object',additionalProperties:true};}
    else if(body.response_format.type === 'json_schema'){const definition=object(body.response_format.json_schema,'response_format.json_schema');if(typeof definition.name!=='string' || !definition.name || definition.strict!==undefined && typeof definition.strict!=='boolean')throw new ProtocolError('JSON schema requires a nonempty name and boolean strict');generation.responseMimeType='application/json';generation.responseJsonSchema=copy(object(definition.schema,'schema'));}
    else if(body.response_format.type !== 'text')throw new ProtocolError('Unsupported response_format');
  }
  const thinking=chatThinking(body);if(thinking)generation.thinkingConfig=thinking;
  if(Object.keys(generation).length)out.generationConfig=generation;
  if(body.tools)out.tools=[{functionDeclarations:body.tools.map(tool => {fields(tool,['type','function'],'tool');if(tool.type !== 'function')throw new ProtocolError('Gemini only supports function tools');fields(tool.function,['name','description','parameters','strict'],'function');if(tool.function.strict!=null && tool.function.strict!==false)throw new ProtocolError('Function strict cannot be represented by Gemini');if(typeof tool.function.name!=='string' || !tool.function.name)throw new ProtocolError('Function name must not be empty');return {name:tool.function.name,...(tool.function.description ? {description:tool.function.description}:{}),parameters:copy(object(tool.function.parameters ?? {type:'object',properties:{}},'parameters'))};})}];
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
    const inline=alias(part,'inlineData','inline_data');if(inline){fields(part,['inlineData','inline_data'],'part');fields(inline,['mimeType','mime_type','data'],'inlineData');const mime=imageMedia(alias(inline,'mimeType','mime_type'));imageBase64(inline.data);return {type:'image_url',image_url:{url:`data:${mime};base64,${inline.data}`}};}
    const file=alias(part,'fileData','file_data');if(file){fields(part,['fileData','file_data'],'part');fields(file,['mimeType','mime_type','fileUri','file_uri'],'fileData');const media=alias(file,'mimeType','mime_type');if(media!=null)imageMedia(media);const uri=alias(file,'fileUri','file_uri');let url;try{url=new URL(uri);}catch{throw new ProtocolError('Image URI is invalid');}if(!['http:','https:'].includes(url.protocol))throw new ProtocolError('Image URI must use HTTP(S)');return {type:'image_url',image_url:{url:uri}};}
    throw new ProtocolError('Gemini part cannot be represented by this bridge');
  };
  const system=alias(body,'systemInstruction','system_instruction');if(system){fields(system,['role','parts'],'systemInstruction');out.messages.push({role:'system',content:chatContent(system.parts.map(convert))});}
  for(const content of body.contents) {
    fields(content,['role','parts'],'content');const role=content.role ?? 'user';if(!['user','model'].includes(role) || !Array.isArray(content.parts))throw new ProtocolError('Gemini content role/parts is invalid');
    const ordinary=[],calls=[],results=[];
    for(const part of content.parts) {
      const call=alias(part,'functionCall','function_call'),result=alias(part,'functionResponse','function_response');
      if(call){fields(part,['functionCall','function_call'],'part');fields(call,['id','name','args'],'functionCall');if(role !== 'model' || !call.name)throw new ProtocolError('Function call must be in a model turn');const id=call.id ?? `call_${sequence++}`;if(pending.some(p=>p.id === id))throw new ProtocolError('Function call id is duplicated');pending.push({id,name:call.name});calls.push({id,type:'function',function:{name:call.name,arguments:JSON.stringify(object(call.args ?? {},'args'))}});}
      else if(result){fields(part,['functionResponse','function_response'],'part');fields(result,['id','name','response'],'functionResponse');if(role !== 'user')throw new ProtocolError('Function response must be in a user turn');const matches=pending.filter(c => c.name === result.name && (!result.id || c.id === result.id));if(matches.length !== 1)throw new ProtocolError('Function response is missing or ambiguous; include call id');const matched=matches[0];pending.splice(pending.indexOf(matched),1);results.push({role:'tool',tool_call_id:matched.id,content:JSON.stringify(object(result.response,'response'))});}
      else ordinary.push(convert(part));
    }
    out.messages.push(...results);
    if(ordinary.length || calls.length)out.messages.push({role:role === 'model'?'assistant':'user',content:chatContent(ordinary),...(calls.length?{tool_calls:calls}:{})});
  }
  const generation=alias(body,'generationConfig','generation_config');if(generation){fields(generation,['temperature','topP','topK','maxOutputTokens','stopSequences','thinkingConfig'],'generationConfig');for(const [from,to] of [['temperature','temperature'],['topP','top_p'],['maxOutputTokens','max_tokens'],['stopSequences','stop']])if(generation[from]!==undefined)out[to]=copy(generation[from]);if(generation.topK!==undefined && generation.topK!==64)throw new ProtocolError('generationConfig.topK has no exact cross-provider representation');const thinking=geminiThinking(generation.thinkingConfig);if(thinking!==undefined)out.reasoning_effort=thinking;}
  if(body.tools)out.tools=body.tools.flatMap(tool => {fields(tool,['functionDeclarations','function_declarations'],'tools');const declarations=alias(tool,'functionDeclarations','function_declarations');if(!Array.isArray(declarations))throw new ProtocolError('Function declarations must be an array');return declarations.map(fn => {fields(fn,['name','description','parameters','parametersJsonSchema'],'declaration');return {type:'function',function:{...copy(fn),...(fn.parametersJsonSchema===undefined?{}:{parameters:copy(fn.parametersJsonSchema)})}};}).map(tool=>{delete tool.function.parametersJsonSchema;return tool;});});
  const config=alias(body,'toolConfig','tool_config');if(config){const calling=alias(config,'functionCallingConfig','function_calling_config');fields(calling,['mode','allowedFunctionNames','allowed_function_names'],'functionCallingConfig');const allowed=alias(calling,'allowedFunctionNames','allowed_function_names'),mode=calling.mode?.toUpperCase();if(allowed){if(mode !== 'ANY' || allowed.length !== 1)throw new ProtocolError('Function policy cannot be represented exactly');out.tool_choice={type:'function',function:{name:allowed[0]}};}else {out.tool_choice={AUTO:'auto',NONE:'none',ANY:'required'}[mode];if(!out.tool_choice)throw new ProtocolError('Function policy mode is invalid');}}
  return out;
}
export function geminiCanonical(body, normalizeUsage) {
  const value=body.response ?? body,candidate=value.candidates?.[0],reason=candidate?.finishReason ?? value.promptFeedback?.blockReason;if(value.candidates?.length > 1 || !candidate?.content && !reason)throw new ProtocolError('Gemini response must contain one candidate or a terminal prompt block',502);
  const r={id:value.responseId,model:value.modelVersion,text:'',tools:[],usage:normalizeUsage(value.usageMetadata,'gemini'),finish:reason === 'MAX_TOKENS' ? 'length':reason==null || reason==='STOP'?'stop':'content_filter'};
  for(const part of candidate?.content?.parts ?? []){if(part.text !== undefined){r.text+=part.text;}else if(part.functionCall){const c=part.functionCall;r.tools.push({id:c.id ?? `call_${r.tools.length}`,type:'function',function:{name:c.name,arguments:JSON.stringify(c.args ?? {})}});}else throw new ProtocolError('Gemini output part cannot be represented',502);}
  if(r.tools.length && r.finish==='stop')r.finish='tool_calls';return r;
}
export function canonicalGemini(r,model) {
  return {candidates:[{index:0,content:{role:'model',parts:[...(r.text?[{text:r.text}]:[]),...r.tools.map(t=>({functionCall:{id:t.id,name:t.function.name,args:parseObject(t.function.arguments,'arguments')}}))]},finishReason:r.finish === 'length'?'MAX_TOKENS':'STOP'}],usageMetadata:{promptTokenCount:r.usage.input,candidatesTokenCount:r.usage.output,totalTokenCount:r.usage.total,cachedContentTokenCount:r.usage.cached},modelVersion:model};
}
