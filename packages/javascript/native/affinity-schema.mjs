import { decodeLino } from './storage.mjs';

// Declarative projection of the pinned Rust derives, rather than a validator
// written separately for each row. Source identities are in affinity-file-source-receipt.json.
const field = (name, type, optional = false) => ({ name, type, optional });
const structure = (source, fields) => ({ kind: 'struct', source, fields });
export const affinitySchema = {
  AffinityFile: structure('response_affinity.rs::AffinityFile', [field('version','u32'),field('records',{kind:'vec',type:'ResponseAffinity'})]),
  ResponseOwner: structure('response_affinity.rs::ResponseOwner', [field('client_kind','String'),field('principal_id','String')]),
  ResponseAffinity: structure('response_affinity.rs::ResponseAffinity', [field('namespace','ResponseNamespace'),field('response_id','String'),field('owner','ResponseOwner'),field('destination','AffinityDestination'),field('parent_id','String',true),field('created_at','i64'),field('expires_at','i64')]),
  ResponseNamespace: {kind:'enum',source:'response_affinity.rs::ResponseNamespace',variants:[
    'open_ai_responses','codex_responses','qwen_responses','open_ai_chat','codex_chat','qwen_chat',
    'open_ai_conversations','codex_conversations','qwen_conversations','open_ai_conversation_items','codex_conversation_items','qwen_conversation_items',
    'open_ai_realtime_calls','codex_realtime_calls','anthropic_files','anthropic_batches','anthropic_skills','anthropic_skill_versions',
    'codex_files','codex_mcp_sessions','codex_plugin_installs','codex_plugin_uploads','codex_workspace_plugins']},
  ProviderKind: {kind:'enum',source:'providers.rs::ProviderKind',variants:['openai-compatible','lefine','zai-coding-plan'],aliases:{'open-a-i-compatible':'openai-compatible'}},
  SubscriptionProvider: {kind:'enum',source:'subscription/types.rs::SubscriptionProvider',variants:['claude','codex','gemini','qwen']},
  AffinityDestination: {kind:'tagged',source:'response_affinity.rs::AffinityDestination',tag:'kind',variants:{
    stored_provider:structure('response_affinity.rs::AffinityDestination::StoredProvider',[field('name','String'),field('provider_kind','ProviderKind'),field('base_url','String')]),
    subscription:structure('response_affinity.rs::AffinityDestination::Subscription',[field('provider','SubscriptionProvider'),field('account','String'),field('upstream_account_id','String',true),field('base_url','String')]),
  }},
};
function freezeSchema(node) {
  if(node && typeof node==='object') {for(const child of Object.values(node))freezeSchema(child);Object.freeze(node);}
}
freezeSchema(affinitySchema);
export const I64_MIN = -(1n << 63n), I64_MAX = (1n << 63n)-1n, U64_MAX = (1n << 64n)-1n;
const SAFE_MIN = BigInt(Number.MIN_SAFE_INTEGER), SAFE_MAX = BigInt(Number.MAX_SAFE_INTEGER);
const pairs = new WeakMap();
class JsonNumber { constructor(raw) { this.raw = raw; } }
function fail(message) { throw new Error(message); }
export function exactInteger(value, minimum = I64_MIN, maximum = I64_MAX) {
  if (typeof value === 'number' && !Number.isSafeInteger(value) || !['number','bigint'].includes(typeof value)) fail('expected an exact integer');
  const integer = BigInt(value);
  if (integer < minimum || integer > maximum) fail('integer is out of range');
  return integer;
}
export function integerABI(value) { return value >= SAFE_MIN && value <= SAFE_MAX ? Number(value) : value; }
export function affinityExpiry(now, ttl) {
  now = exactInteger(now); ttl = exactInteger(ttl,1n,U64_MAX);
  // Duration.as_secs() is converted/clipped BEFORE saturating addition.
  const sum = now + (ttl > I64_MAX ? I64_MAX : ttl);
  return integerABI(sum > I64_MAX ? I64_MAX : sum);
}
function scalarString(value) {
  if (typeof value !== 'string') fail('expected a string');
  for (let i=0;i<value.length;i++) {
    const unit=value.charCodeAt(i);
    if (unit>=0xd800 && unit<=0xdbff) { const next=value.charCodeAt(++i); if (!(next>=0xdc00 && next<=0xdfff)) fail('lone leading surrogate in hex escape'); }
    else if (unit>=0xdc00 && unit<=0xdfff) fail('lone trailing surrogate in hex escape');
  }
  return value;
}
function entries(value) {
  if (!value || typeof value!=='object' || Array.isArray(value) || value instanceof JsonNumber) fail('expected a map');
  return pairs.get(value) ?? Object.entries(value);
}

// An iterative JSON reader preserves number lexemes and duplicate fields.
// Unknown struct values can be ignored without IEEE conversion or a recursive
// JS parser stack. The generic schema applies the original typed depth limit.
function lexicalJson(text) {
  let offset=0, root, assigned=false; const stack=[];
  const whitespace=()=>{while(/[\x20\t\r\n]/.test(text[offset]??'') && offset<text.length) offset++;};
  const string=()=>{
    const start=offset++;
    while(offset<text.length) {
      const c=text[offset++];
      if(c==='"') return JSON.parse(text.slice(start,offset));
      if(c==='\\') { if(offset>=text.length)break; offset++; }
    }
    fail('EOF while parsing a string');
  };
  const attach=value=>{
    const frame=stack.at(-1);
    if(!frame) { if(assigned)fail('trailing characters');root=value;assigned=true;return; }
    if(frame.array) frame.value.push(value);
    else { pairs.get(frame.value).push([frame.key,value]);frame.value[frame.key]=value; }
    frame.state='comma';
  };
  const value=()=>{
    whitespace(); const c=text[offset];
    if(c==='{' || c==='[') {
      offset++;const array=c==='[', container=array?[]:Object.create(null);
      if(!array)pairs.set(container,[]);
      attach(container);stack.push({value:container,array,state:'first'});return;
    }
    if(c==='"') { attach(string());return; }
    for(const [word,decoded] of [['null',null],['true',true],['false',false]]) if(text.startsWith(word,offset)) {offset+=word.length;attach(decoded);return;}
    const number=/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(offset));
    if(number) {offset+=number[0].length;attach(new JsonNumber(number[0]));return;}
    fail('expected value');
  };
  value();
  while(stack.length) {
    whitespace();const frame=stack.at(-1),end=frame.array?']':'}',c=text[offset];
    if(frame.state==='comma') {
      if(c===end) {offset++;stack.pop();continue;}
      if(c!==',')fail('expected comma or end');offset++;frame.state='next';continue;
    }
    if(frame.state==='first' && c===end) {offset++;stack.pop();continue;}
    if(!frame.array) {
      if(c!=='"')fail('key must be a string');frame.key=string();whitespace();
      if(text[offset++]!==':')fail('expected colon');
    }
    value();
  }
  whitespace();if(offset!==text.length)fail('trailing characters');return root;
}

function integer(value,type) {
  const min=type==='u32'?0n:I64_MIN,max=type==='u32'?4294967295n:I64_MAX;
  if(value instanceof JsonNumber) {
    // Pinned serde_json treats negative zero as f64, not the integer zero.
    if(!/^-?\d+$/.test(value.raw) || value.raw==='-0')fail(`invalid type: floating point, expected ${type}`);
    if(value.raw.length>20)fail(`invalid value, expected ${type}`);
    value=BigInt(value.raw);
  }
  try {return integerABI(exactInteger(value,min,max));}
  catch {fail(`invalid type or value, expected ${type}`);}
}
function buffered(value,depth,legacy) {
  if(typeof value==='string')scalarString(value);
  else if(value instanceof JsonNumber) {if(!Number.isFinite(Number(value.raw)))fail('number out of range');}
  else if(value && typeof value==='object') {
    if(legacy && depth>=128)fail('recursion limit exceeded');
    if(Array.isArray(value))for(const child of value)buffered(child,depth+1,legacy);
    else for(const [key,child] of entries(value)) {scalarString(key);buffered(child,depth+1,legacy);}
  }
}
export function validateAffinityValue(value,type='AffinityFile',{legacy=false}={}) {
  function apply(value,type,depth=1) {
    if(type==='String')return scalarString(value);
    if(type==='i64' || type==='u32')return integer(value,type);
    const spec=typeof type==='string'?affinitySchema[type]:type;
    if(!spec)fail('unknown schema type');
    if(legacy && value && typeof value==='object' && !(value instanceof JsonNumber) && depth>=128)fail('recursion limit exceeded');
    if(spec.kind==='vec') {
      if(!Array.isArray(value))fail('expected a sequence');return value.map(child=>apply(child,spec.type,depth+1));
    }
    if(spec.kind==='enum') {
      if(typeof value!=='string') {
        const fields=entries(value);if(fields.length!==1 || fields[0][1]!==null)fail('expected a unit enum variant');value=fields[0][0];
      }
      scalarString(value);const canonical=spec.aliases?.[value] ?? value;
      if(!spec.variants.includes(canonical))fail(`unknown variant \`${value}\``);return canonical;
    }
    if(spec.kind==='tagged') {
      buffered(value,depth,legacy);
      let tag,content;
      if(Array.isArray(value)) { tag=value[0];content=value.slice(1); }
      else {
        const fields=entries(value),tags=fields.filter(([key])=>key===spec.tag);
        if(tags.length>1)fail(`duplicate field \`${spec.tag}\``);
        if(!tags.length)fail(`missing field \`${spec.tag}\``);
        tag=tags[0][1];content=Object.create(null);pairs.set(content,fields.filter(([key])=>key!==spec.tag));
      }
      scalarString(tag);if(!Object.hasOwn(spec.variants,tag))fail(`unknown variant \`${tag}\``);
      return {[spec.tag]:tag,...apply(content,spec.variants[tag],depth)};
    }
    if(spec.kind==='struct') {
      const fields=spec.fields,result={};let selected;
      if(Array.isArray(value)) {
        if(value.length>fields.length)fail('invalid length for struct');selected=new Map(fields.slice(0,value.length).map((f,i)=>[f.name,value[i]]));
      } else {
        selected=new Map();
        for(const [key,child] of entries(value)) {
          scalarString(key);if(!fields.some(f=>f.name===key))continue;
          if(selected.has(key))fail(`duplicate field \`${key}\``);selected.set(key,child);
        }
      }
      for(const f of fields) {
        if(!selected.has(f.name)) {if(f.optional)continue;fail(`missing field \`${f.name}\``);}
        const child=selected.get(f.name);
        if(f.optional && child===null)continue;
        result[f.name]=apply(child,f.type,depth+1);
      }
      return result;
    }
    fail('unsupported schema node');
  }
  return apply(value,type);
}
export function decodeAffinityFile(text) {
  const legacy=/^(?:\{|\[)/.test(text.trimStart());
  const value=legacy?lexicalJson(text):decodeLino(text,{scalar:raw=>{
    if(raw==='null')return null;
    if(raw==='true' || raw==='false')return raw==='true';
    if(['NaN','Infinity','-Infinity'].includes(raw))return null;
    // codec0.7 first tries i64::from_str; out-of-range bare decimals remain strings.
    if(/^[+-]?\d+$/.test(raw)) {
      const digits=raw.replace(/^[+-]?0*/,'') || '0';if(digits.length>19)return raw;
      const n=BigInt((raw.startsWith('-')?'-':'')+digits);return n<I64_MIN || n>I64_MAX ? raw : integerABI(n);
    }
    if(/[.eE]/.test(raw) && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))return Number.isFinite(Number(raw))?new JsonNumber(raw):null;
    return raw;
  },escaped:bytes=>new TextDecoder('utf-8',{fatal:true}).decode(bytes),object:entries=>Object.fromEntries(entries)});
  return validateAffinityValue(value,'AffinityFile',{legacy});
}
