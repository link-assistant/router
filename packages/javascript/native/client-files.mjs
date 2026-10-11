/** Bounded, owner-private client files; no shell or client executable is invoked. */
import {stat,unlink} from 'node:fs/promises';
import {join,isAbsolute,resolve,delimiter} from 'node:path';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readNativeText,requireNativePath} from './operation-input.mjs';
import {atomicWrite} from './storage.mjs';

export const clientFailure=message=>Object.assign(new Error(message),{code:'client',exitCode:1});
export const clientIntegrations=Object.freeze([
  {client:'codex',legacy:'codex',dialect:'OpenAI Responses',token:'LINK_ASSISTANT_TOKEN',base:null,suffix:'/api/services/codex/v1',owners:['openai','z.ai'],strict:true},
  {client:'claude',legacy:'claude-code',dialect:'Anthropic Messages',token:'ANTHROPIC_AUTH_TOKEN',base:'ANTHROPIC_BASE_URL',suffix:'/api/services/anthropic',owners:['anthropic','z.ai'],strict:true},
  {client:'cursor-agent',legacy:'cursor',dialect:'Cursor private',token:null,base:null,suffix:'',owners:[],strict:false,unsupported:'Cursor uses a private ConnectRPC API and has no supported Router setup'},
  {client:'gemini',legacy:'gemini-cli',dialect:'Gemini native',token:'GEMINI_API_KEY',base:'GOOGLE_GEMINI_BASE_URL',suffix:'/api/services/gemini',owners:['google'],strict:false,unsupported:'Individual Gemini subscriptions are CodeAssistIneligibleTierError; use an isolated Gemini API-key launch'},
  {client:'grok',legacy:'grok-cli',dialect:'OpenAI Chat',token:'GROK_API_KEY',base:'GROK_BASE_URL',suffix:'/api/services/openai/v1',owners:[],strict:false},
  {client:'opencode',legacy:'opencode',dialect:'OpenAI Chat',token:'LINK_ASSISTANT_TOKEN',base:null,suffix:'/api/services/openai/v1',owners:[],strict:false},
  {client:'qwen',legacy:'qwen-code',dialect:'OpenAI Chat',token:'LINK_ASSISTANT_TOKEN',base:'OPENAI_BASE_URL',suffix:'/api/services/qwen/v1',owners:['qwen'],strict:false},
  {client:'agent',legacy:'agent',dialect:'OpenAI Chat',token:'LINK_ASSISTANT_TOKEN',base:null,suffix:'/api/services/openai/v1',owners:[],strict:false},
]);
export function clientIntegration(name) {
  const found=clientIntegrations.find(client=>client.client===name || client.legacy===name);
  if (!found) throw clientFailure('Unknown client');return found;
}
const absolute=(path,label)=>{if (typeof path!=='string' || !path.trim() || !isAbsolute(path)) throw clientFailure(`${label} requires an absolute nonempty directory`);return resolve(path);};
export function clientPaths(name,{home,env=process.env,cwd=process.cwd()}={}) {
  const info=clientIntegration(name),root=home!==undefined ? resolve(cwd,home) : absolute(env.HOME,'HOME');
  const directory=(key,fallback)=>home!==undefined || !env[key] ? fallback : resolve(cwd,env[key]);
  const configHome=directory('XDG_CONFIG_HOME',join(root,'.config'));
  const roots={codex:directory('CODEX_HOME',join(root,'.codex')),claude:directory('CLAUDE_CONFIG_DIR',join(root,'.claude')),
    'cursor-agent':directory('CURSOR_CONFIG_DIR',join(root,'.cursor')),gemini:join(directory('GEMINI_CLI_HOME',root),'.gemini'),grok:join(root,'.grok'),
    opencode:join(configHome,'opencode'),qwen:home===undefined && env.QWEN_HOME?.startsWith('~/') ? join(root,env.QWEN_HOME.slice(2)) : directory('QWEN_HOME',join(root,'.qwen')),agent:join(configHome,'link-assistant-agent')};
  const filenames={codex:'config.toml',claude:'settings.json','cursor-agent':'cli-config.json',gemini:'settings.json',grok:'user-settings.json',opencode:'opencode.json',qwen:'settings.json',agent:'opencode.json'};
  const owned=join(configHome,'link-assistant-router','clients');
  return {info,home:root,configHome,config:join(roots[info.client],filenames[info.client]),environment:join(owned,`${info.client}.env`),metadata:join(owned,`${info.client}.credential.json`),
    legacyEnvironment:join(owned,`${info.legacy}.env`),legacyMetadata:join(owned,`${info.legacy}.credential.json`),
    marker:['codex','claude','opencode','qwen','agent'].includes(info.client) ? join(roots[info.client],'.link-assistant-router-client.json') : null};
}
export async function optionalClientText(path) {
  if (!path) return null;
  try {return await readNativeText(path,{maxBytes:8*1024*1024});}catch(error) {if (error.code==='ENOENT') return null;throw clientFailure(`Could not read client configuration (${error.code ?? 'invalid file'})`);}
}
export async function preferredClientPath(canonical,legacy) {return await optionalClientText(canonical)!==null ? canonical : legacy;}
export function clientObject(source,label='Client configuration') {
  if (source===null || !source.trim()) return {};
  let value;try {value=JSON.parse(source);}catch {throw clientFailure(`${label} contains invalid JSON`);}
  if (!value || typeof value!=='object' || Array.isArray(value)) throw clientFailure(`${label} must contain a JSON object`);return value;
}
export function objectProperty(document,key) {
  if (!Object.hasOwn(document,key)) document[key]={};
  const value=document[key];if (!value || typeof value!=='object' || Array.isArray(value)) throw clientFailure(`${key} must be a JSON object`);return value;
}
export const renderClientJSON=value=>JSON.stringify(value,null,2)+'\n';
export async function writeClientFile(path,source,contents) {
  if (source===contents) return {path,backup:null,changed:false};
  await requireNativePath(path);
  let backup=null;if (source!==null) {backup=`${path}.link-assistant-router.${Date.now()*1000000}.${randomUUID().replaceAll('-','')}.bak`;await atomicWrite(backup,source);}
  await atomicWrite(path,contents);return {path,backup,changed:true};
}
export async function writeClientMarker(path,document) {await requireNativePath(path);await atomicWrite(path,renderClientJSON(document));}
export async function removeClientFile(path) {await requireNativePath(path);try {await unlink(path);}catch(error) {if(error.code!=='ENOENT') throw error;}}
export function readClientEnvironment(source,key) {
  const prefix=`export ${key}=`;const line=source?.split(/\r?\n/).find(line=>line.startsWith(prefix));if (line===undefined) return null;
  const raw=line.slice(prefix.length).trim();return raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1,-1).replaceAll("'\\''","'") : raw;
}
export const shellQuote=value=>"'"+String(value).replaceAll("'","'\\''")+"'";
export async function writeClientEnvironment(paths,origin,token) {
  if (!paths.info.token) throw clientFailure('Client has no Router token environment');
  const {info}=paths,lines=[];if(info.base) lines.push(`export ${info.base}=${shellQuote(origin+info.suffix)}`);
  lines.push(`export ${info.token}=${shellQuote(token)}`);
  if (info.client==='codex') {
    if (!token.startsWith('la_sk_')) throw clientFailure('Codex requires a Router-issued la_sk_ token');
    const alias='at-'+token.slice(6);lines.push(`export CODEX_ACCESS_TOKEN=${shellQuote(alias)}`,`export CODEX_CONNECTORS_TOKEN=${shellQuote(alias)}`,`export CODEX_AUTHAPI_BASE_URL=${shellQuote(origin+'/api/services/codex')}`);
  }
  if(info.client==='claude') lines.push('export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1');
  const path=await preferredClientPath(paths.environment,paths.legacyEnvironment);await requireNativePath(path);await atomicWrite(path,lines.join('\n')+'\n');return path;
}
export async function clientCommandExists(command,env=process.env) {
  for(const directory of String(env.PATH ?? '').split(delimiter).filter(Boolean)) {
    try {if((await stat(join(directory,command))).isFile()) return true;}catch{}
  }return false;
}
export const sameClientValue=isDeepStrictEqual;
