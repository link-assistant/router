/** Exact live model identities and owner selection shared by setup, launch and doctor. */
import {clientIntegration,clientFailure} from './client-files.mjs';
const originSuffixes=['/api/services/anthropic','/api/services/openai/v1','/api/services/codex/v1','/api/services/qwen/v1','/api/services/gemini','/api/gemini','/api/qwen/v1','/api/codex/v1','/v1'];
export function clientRouterOrigin(baseURL) {
  let url;try {url=new URL(String(baseURL).trim().replace(/\/+$/,''));}catch{throw clientFailure('Invalid Router base URL');}
  if(!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw clientFailure('Router base URL requires HTTP(S) without embedded credentials, query or fragment');
  const suffix=originSuffixes.find(suffix=>url.pathname.endsWith(suffix));if(suffix) url.pathname=url.pathname.slice(0,-suffix.length) || '/';
  return url.href.replace(/\/+$/,'');
}
const optional=(row,key,predicate)=>{if(row[key]!==null && row[key]!==undefined && !predicate(row[key])) throw clientFailure(`Router model catalog row has invalid ${key}`);};
export function parseNativeClientCatalog(data) {
  if(!Array.isArray(data)) throw clientFailure('Router model catalog data must be an array');
  const rows=data.map((value,index)=>{
    if(!value || typeof value!=='object' || Array.isArray(value) || typeof value.id!=='string') throw clientFailure(`Router model catalog row ${index} does not match this Router version`);
    const row={...value};
    if(row.owned_by!==undefined && typeof row.owned_by!=='string') throw clientFailure('Router model catalog row has invalid owned_by');optional(row,'default_reasoning_level',value=>typeof value==='string');
    optional(row,'router_unavailable_reason',value=>typeof value==='string');optional(row,'provider_created_at',Number.isSafeInteger);
    optional(row,'selector_kind',value=>typeof value==='string');
    optional(row,'supported_reasoning_levels',value=>Array.isArray(value) && value.every(level=>level && typeof level==='object' && typeof level.effort==='string' && (level.description===undefined || typeof level.description==='string')));
    if(row.client_capabilities===null) throw clientFailure('Router model catalog row has invalid client_capabilities');
    optional(row,'client_capabilities',value=>value && typeof value==='object' && !Array.isArray(value) && (value.claude==null || typeof value.claude==='object' && typeof value.claude.behaves_as==='string' && typeof value.claude.source==='string'));
    const selectors={concrete:'concrete',provider_advertised_exact_id:'concrete',provider_dynamic_alias:'provider_dynamic_alias',provider_advertised_alias:'provider_dynamic_alias',operator_alias:'operator_alias'};
    row.owned_by ??='';row.selector_kind=Object.hasOwn(selectors,row.selector_kind) ? selectors[row.selector_kind] : 'unknown';return row;
  }).filter(row=>row.id.trim().length>0).sort((a,b)=>a.id<b.id ? -1 : a.id>b.id ? 1 : a.owned_by<b.owned_by ? -1 : a.owned_by>b.owned_by ? 1 : 0);
  const unique=rows.filter((row,index)=>index===0 || row.id!==rows[index-1].id || row.owned_by!==rows[index-1].owned_by);
  if(!unique.length) throw clientFailure('Router catalog contains no models from healthy subscriptions');return unique;
}
export async function fetchNativeClientCatalog(client,baseURL,token,{fetch:fetcher=globalThis.fetch,signal,timeoutMs=15000,maxBytes=4*1024*1024}={}) {
  const info=clientIntegration(client),url=clientRouterOrigin(baseURL)+'/api/models',controller=new AbortController();
  const abort=()=>controller.abort();if(signal?.aborted) throw clientFailure('Client catalog operation cancelled');signal?.addEventListener('abort',abort,{once:true});
  let timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(clientFailure('Client catalog deadline exceeded'));},timeoutMs);});
  const cancelled=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(clientFailure('Client catalog operation cancelled')),{once:true}));
  const bounded=promise=>Promise.race([promise,deadline,cancelled]);let reader;
  try {
    const response=await bounded(Promise.resolve().then(()=>fetcher(url,{headers:{'x-link-assistant-client':info.client,...(info.client==='gemini' ? {'x-goog-api-key':token} : {authorization:`Bearer ${token}`})},redirect:'error',signal:controller.signal})));
    if(!response.ok || response.url && new URL(response.url).origin!==new URL(url).origin) throw clientFailure(`Client catalog request failed (${response.status})`);
    const declared=response.headers.get('content-length');if(declared!==null && Number(declared)>maxBytes) throw clientFailure('Client catalog exceeds its byte budget');
    reader=response.body?.getReader();const chunks=[];let total=0;
    if(reader) for(;;) {const {done,value}=await bounded(reader.read());if(done) break;total+=value.byteLength;if(total>maxBytes) throw clientFailure('Client catalog exceeds its byte budget');chunks.push(Buffer.from(value));}
    let parsed;try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,total)));}catch{throw clientFailure('Router returned an invalid model catalog');}
    return parseNativeClientCatalog(parsed.data);
  } finally {clearTimeout(timer);signal?.removeEventListener('abort',abort);void reader?.cancel().catch(()=>{});}
}
export function nativeClientModelAuthorized(client,catalog,requested) {
  const info=clientIntegration(client);
  if(info.client==='claude' && requested.endsWith('[1m]')) return catalog.some(row=>row.id===requested.slice(0,-4) && row.owned_by==='anthropic');
  return catalog.some(row=>row.id===requested);
}
export function selectNativeClientModel(client,catalog) {
  const info=clientIntegration(client);for(const owner of info.owners) {const row=catalog.find(row=>row.owned_by===owner);if(row) return row.id;}
  return info.strict && catalog.some(row=>row.owned_by!=='') ? null : catalog[0]?.id ?? null;
}
