/** Vendor usage extraction and partial-stream output estimation from src/usage.rs. */
const integer = value => Number.isSafeInteger(value) && value >= 0 ? value : undefined;
const first = (value,keys) => keys.map(key=>integer(value?.[key])).find(value=>value !== undefined);
function parts(value) {
  const usage=value?.usage;
  if(usage) {
    const total=integer(usage.total_tokens);if(total !== undefined)return {total};
    const raw=first(usage,['input_tokens','prompt_tokens']),output=first(usage,['output_tokens','completion_tokens']);
    const input=raw === undefined?undefined:raw+(integer(usage.cache_creation_input_tokens) ?? 0)+(integer(usage.cache_read_input_tokens) ?? 0);
    if(input !== undefined || output !== undefined)return {input,output};
  }
  const gemini=value?.usageMetadata;
  if(gemini){const total=integer(gemini.totalTokenCount);if(total !== undefined)return {total};const input=integer(gemini.promptTokenCount),output=integer(gemini.candidatesTokenCount);if(input !== undefined || output !== undefined)return {input,output};}
  return value?.response ? parts(value.response) : value?.message ? parts(value.message):undefined;
}
const chars = value => typeof value === 'string'?[...value].length:0;
function outputChars(value) {
  if(value?.type === 'content_block_delta')return ['text','thinking','partial_json'].reduce((n,key)=>n+chars(value.delta?.[key]),0);
  if(value?.type?.startsWith('response.') && value.type.endsWith('.delta'))return chars(value.delta);
  if(value?.type)return 0;
  const chat=(value?.choices ?? []).reduce((n,choice)=>n+['content','reasoning_content','reasoning'].reduce((m,key)=>m+chars(choice.delta?.[key]),0)+(choice.delta?.tool_calls ?? []).reduce((m,call)=>m+chars(call.function?.arguments),0),0);
  const gemini=(value?.response ?? value)?.candidates?.reduce((n,candidate)=>n+(candidate.content?.parts ?? []).reduce((m,part)=>m+chars(part.text),0),0) ?? 0;
  return chat+gemini;
}
function finalUsage(value) {
  if(value.type === 'message_delta')return value.usage && typeof value.usage === 'object';
  if(['response.completed','response.incomplete','response.failed'].includes(value.type))return true;
  if(value.type)return false;
  if(value.usage && typeof value.usage === 'object')return true;
  const native=value.response ?? value;return native.usageMetadata && native.candidates?.some(c=>c.finishReason);
}
export class UsageTracker {
  constructor({maxBytes=32*1024*1024} = {}) {this.maxBytes=maxBytes;this.buffer=Buffer.alloc(0);this.json=[];this.jsonBytes=0;this.sse=false;this.total=0;this.input=0;this.output=0;this.streamedChars=0;this.final=false;this.finished=false;}
  add(raw) {
    let value;try{value=JSON.parse(Buffer.from(raw).toString('utf8'));}catch{return;}
    if(this.sse){this.streamedChars+=outputChars(value);this.final ||= Boolean(finalUsage(value));}else this.final=true;
    const usage=parts(value);if(usage){this.total=Math.max(this.total,usage.total ?? 0);this.input=Math.max(this.input,usage.input ?? 0);this.output=Math.max(this.output,usage.output ?? 0);}
  }
  feed(bytes) {
    if(this.finished)return;
    if(!this.sse && this.jsonBytes+bytes.byteLength <= this.maxBytes){this.json.push(Buffer.from(bytes));this.jsonBytes+=bytes.byteLength;}
    this.buffer=Buffer.concat([this.buffer,bytes]);let end;
    while((end=this.buffer.indexOf(10))>=0){const line=this.buffer.subarray(0,end).toString('utf8').replace(/\r$/,'');this.buffer=this.buffer.subarray(end+1);if(!line.startsWith('data:'))continue;this.sse=true;this.json=[];this.jsonBytes=0;this.add(line.slice(5).replace(/^ /,''));}
    if(this.buffer.length>this.maxBytes)this.buffer=Buffer.alloc(0);
  }
  settlement() {
    const estimate=this.sse && !this.final?Math.ceil(this.streamedChars/4):0,estimated=estimate>this.output,output=Math.max(this.output,estimate);
    return {tokens:Math.max(this.total,this.input+output),estimated};
  }
  finish() {
    if(!this.finished){if(!this.sse)this.add(Buffer.concat(this.json,this.jsonBytes));else if(this.buffer.toString('utf8').startsWith('data: '))this.add(this.buffer.subarray(6));this.finished=true;this.json=[];this.buffer=Buffer.alloc(0);}
    return this.settlement();
  }
}
