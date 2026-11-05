/** Secret-free observations and routing precedence for all eight client integrations. */
import {parseClientTomlSource} from './client-toml-cst.mjs';
import {clientPaths,optionalClientText,preferredClientPath,clientObject,readClientEnvironment,clientCommandExists,clientFailure} from './client-files.mjs';
const modelKeys=['ANTHROPIC_MODEL','ANTHROPIC_DEFAULT_OPUS_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'];
const claudePrecedence=['ANTHROPIC_AUTH_TOKEN','ANTHROPIC_API_KEY',...modelKeys,'CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY','CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'];
const strip=value=>value?.replace(/\/+$/,'');
const text=value=>typeof value==='string' ? value : null;
const safeOrigin=value=>{try {const url=new URL(value);return ['http:','https:'].includes(url.protocol) ? url.origin : null;}catch{return null;}};
function publicDocument(client,source) {
  if(client==='codex') {try{return parseClientTomlSource(source ?? '');}catch{throw clientFailure('Client configuration contains invalid TOML');}}
  return clientObject(source);
}
function publicBase(paths,document,environment,env) {
  switch(paths.info.client) {
    case 'codex': {
      const provider=document.model_providers?.['link-assistant'];
      return document.model_provider==='link-assistant' && provider?.wire_api==='responses' && (provider?.env_key==='LINK_ASSISTANT_TOKEN'||provider?.requires_openai_auth===true) ? text(provider.base_url) : null;
    }
    case 'claude':return text(document.env?.ANTHROPIC_BASE_URL);
    case 'opencode':case 'agent':return text(document.provider?.['link-assistant']?.options?.baseURL);
    case 'qwen':return text((Array.isArray(document.modelProviders?.openai) ? document.modelProviders.openai : []).find(model=>model?.envKey==='LINK_ASSISTANT_TOKEN')?.baseUrl);
    case 'gemini':case 'grok':return text(env[paths.info.base]) ?? readClientEnvironment(environment,paths.info.base);
    default:return null;
  }
}
function claudeEntries(marker) {
  const env=marker?.gateway_env;
  if(!env || typeof env!=='object' || Array.isArray(env)) return [];
  return Object.entries(env).flatMap(([key,value])=>value && (value.managed===null || value.managed===undefined || typeof value.managed==='string') ? [{key,managed_value:value.managed ?? null}] : []);
}
function validClaudeMarker(marker,expected) {
  // Current Rust markers retain env entries and user-owned model keys; old markers
  // with just the endpoint are incomplete and never establish intact ownership.
  const entries=claudeEntries(marker),users=marker?.user_model_keys ?? [];
  if(!Array.isArray(users) || users.some(key=>!modelKeys.includes(key)) || new Set(users).size!==users.length || typeof marker?.anthropic_base_url!=='string') return false;
  const get=key=>entries.find(entry=>entry.key===key),managed=key=>get(key)?.managed_value ?? null;
  const fixed=[['CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY','1'],['ANTHROPIC_AUTH_TOKEN',null],['ANTHROPIC_API_KEY',null]].every(([key,value])=>get(key) && managed(key)===value);
  const target=entries.find(entry=>['ANTHROPIC_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'].includes(entry.key))?.managed_value ?? null;
  return (!expected || marker.anthropic_base_url===expected) && fixed && (target===null || typeof target==='string' && target.length>0)
    && modelKeys.every(key=>Boolean(get(key))!==users.includes(key))
    && ['ANTHROPIC_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'].every(key=>users.includes(key) || managed(key)===target)
    && modelKeys.filter(key=>!['ANTHROPIC_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'].includes(key)).every(key=>users.includes(key) || get(key) && managed(key)===null)
    && !get('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC');
}
export async function nativeClientStatus(name,options={}) {
  const paths=clientPaths(name,options),{info}=paths,ambientEnv=options.env ?? process.env,env=options.home!==undefined ? {} : ambientEnv,conflicts=[];
  let source=null,document={},unreadable;
  try {source=await optionalClientText(paths.config);document=publicDocument(info.client,source);}catch(error) {unreadable=error.message;conflicts.push('public-config:invalid');}
  let environment=null,metadata=null,marker=null,environmentExists=false,metadataExists=false,markerExists=false;
  try {const path=await preferredClientPath(paths.environment,paths.legacyEnvironment);environment=await optionalClientText(path);environmentExists=environment!==null;}catch{environmentExists=true;conflicts.push('managed-environment:invalid');}
  try {const path=await preferredClientPath(paths.metadata,paths.legacyMetadata),value=await optionalClientText(path);metadataExists=value!==null;if(metadataExists) metadata=clientObject(value,'Ownership metadata');}catch{metadataExists=true;conflicts.push('ownership-metadata:invalid');}
  if(paths.marker) try {const value=await optionalClientText(paths.marker);markerExists=value!==null;if(markerExists) marker=clientObject(value,'Ownership marker');}catch{markerExists=true;conflicts.push('ownership-marker:invalid');}
  const metadataComplete=metadata && [info.client,info.legacy].includes(metadata.client) && typeof metadata.router==='string' && metadata.router.length>0 && ['minted','supplied'].includes(metadata.source);
  if(metadata && !metadataComplete) conflicts.push('ownership-metadata:invalid');
  const expected=metadata?.router ? strip(metadata.router)+info.suffix : null;
  const token=info.token ? readClientEnvironment(environment,info.token) : null,managedBase=info.base ? readClientEnvironment(environment,info.base) : null;
  const base=publicBase(paths,document,environment,env),ambient=info.base && typeof env[info.base]==='string' && env[info.base] ? env[info.base] : null;
  let markerValid=!paths.marker;
  if(markerExists) {
    markerValid=info.client==='codex' ? Boolean(marker) : info.client==='claude' ? validClaudeMarker(marker,expected) : info.client==='qwen' ? Array.isArray(marker?.managed_models) : Object.hasOwn(marker ?? {},'managed_provider');
    if(!markerValid) conflicts.push('ownership-marker:invalid');
  }
  if(ambient && expected && strip(ambient)!==strip(expected)) conflicts.push(`ambient:${info.base}`);
  if(info.token && env[info.token] && token!==null && env[info.token]!==token) conflicts.push(`ambient:${info.token}`);
  if(managedBase!==null && expected && strip(managedBase)!==strip(expected)) conflicts.push(`managed-environment:${info.base}`);
  if(environmentExists && info.token && token===null) conflicts.push(`managed-environment:${info.token}`);
  if(info.client==='codex') {
    if(expected && document.model_provider!=='link-assistant') conflicts.push('public-config:model_provider');
    if(expected && document.model_providers?.['link-assistant']?.base_url!==expected) conflicts.push('public-config:model_providers.link-assistant.base_url');
    if(Object.hasOwn(document,'model_catalog_json')) conflicts.push('public-config:model_catalog_json');
  } else if(['opencode','agent'].includes(info.client)) {
    if(expected && document.provider?.['link-assistant']?.options?.baseURL!==expected) conflicts.push('public-config:provider.link-assistant.options.baseURL');
  } else if(info.client==='qwen') {
    if(expected && !(Array.isArray(document.modelProviders?.openai) ? document.modelProviders.openai : []).some(model=>model?.envKey==='LINK_ASSISTANT_TOKEN' && model?.baseUrl===expected)) conflicts.push('public-config:modelProviders.openai');
  } else if(info.client==='claude') {
    const entries=claudeEntries(marker),users=Array.isArray(marker?.user_model_keys) ? marker.user_model_keys : [],publicEnv=document.env ?? {};
    if(expected && strip(publicEnv.ANTHROPIC_BASE_URL)!==strip(expected)) conflicts.push('public-config:ANTHROPIC_BASE_URL');
    for(const key of ['ANTHROPIC_AUTH_TOKEN','ANTHROPIC_API_KEY']) if(Object.hasOwn(publicEnv,key)) conflicts.push(`public-config:${key}`);
    for(const key of modelKeys) {
      const wanted=entries.find(entry=>entry.key===key)?.managed_value ?? null;
      if(!users.includes(key) && (text(publicEnv[key]) ?? null)!==wanted) conflicts.push(`public-config:${key}`);
      if(env[key] && env[key]!==wanted) conflicts.push(`ambient:${key}`);
      if(readClientEnvironment(environment,key)) conflicts.push(`managed-environment:${key}`);
    }
    const discovery='CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY';
    if(readClientEnvironment(environment,discovery)!=='1') conflicts.push(`managed-environment:${discovery}`);
    if(publicEnv[discovery]!=='1' && source!==null) conflicts.push(`public-config:${discovery}`);
    if(env[discovery] && env[discovery]!=='1') conflicts.push(`ambient:${discovery}`);
    for(const key of ['ANTHROPIC_API_KEY','CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC']) {
      if(env[key]) conflicts.push(`ambient:${key}`);if(readClientEnvironment(environment,key)) conflicts.push(`managed-environment:${key}`);
    }
  }
  const complete=environmentExists && metadataComplete && token!==null && (['grok','gemini'].includes(info.client) || source!==null) && markerValid;
  const anyManaged=environmentExists || metadataExists || markerExists;
  const any=source!==null || base!==null || managedBase!==null || ambient!==null || anyManaged || info.client==='claude' && claudePrecedence.some(key=>Boolean(env[key]));
  const unique=[...new Set(conflicts)].sort();
  const state=unreadable || unique.some(key=>key.endsWith(':invalid')) || anyManaged && !complete ? 'ambiguous' : complete ? unique.length ? 'managed-drifted' : 'managed-intact' : any ? 'foreign' : 'unconfigured';
  const effective_source=ambient!==null ? 'ambient-environment' : base!==null ? 'public-config' : managedBase!==null ? 'managed-environment' : metadata?.router ? 'ownership-metadata' : null;
  return {client:info.client,installed:await clientCommandExists(info.client,ambientEnv),configured:state==='managed-intact',config_path:paths.config,dialect:info.dialect,
    base_url:safeOrigin(ambient ?? base ?? managedBase ?? metadata?.router),token_env:info.token,token_env_set:Boolean(info.token && (env[info.token] || token!==null)),ownership_state:state,
    ...(effective_source ? {effective_source} : {}),conflicts:unique,...(unreadable ? {unreadable} : {}),...(info.unsupported ? {unsupported:info.unsupported} : {})};
}
