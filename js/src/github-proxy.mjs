import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {boundedBytes,nativeResponseHeaders} from './native-service.mjs';
import {ProtocolError} from './protocols.mjs';
const glob=(pattern,path)=>pattern.endsWith('/**') ? path===pattern.slice(0,-3) || path.startsWith(pattern.slice(0,-3)+'/') : pattern.split('/').length===path.split('/').length && pattern.split('/').every((part,index)=>part==='*' || part===path.split('/')[index]);
const parse=body=>{try{return JSON.parse(Buffer.from(body).toString('utf8'));}catch{return null;}};
function graphqlNames(query) {
  const names=[];let position=0;
  while(position<query.length) {
    if(query[position]==='#'){while(position<query.length && query[position]!=='\n')position++;continue;}
    if(query.startsWith('"""',position)){position+=3;while(position<query.length && !query.startsWith('"""',position))position++;position+=3;continue;}
    if(query[position]==='"'){position++;while(position<query.length){if(query[position]==='\\'){position+=2;continue;}if(query[position++]==='"')break;}continue;}
    const name=/^[_A-Za-z][_0-9A-Za-z]*/.exec(query.slice(position));if(name){names.push(name[0].toLowerCase());position+=name[0].length;}else position++;
  }
  return names;
}
function nested(value,predicate) {return value && typeof value==='object' && Object.entries(value).some(([key,child])=>predicate(key.toLowerCase(),child) || nested(child,predicate));}
export function destructiveGraphql(body) {
  const value=parse(body);if(typeof value?.query!=='string')return false;
  const names=graphqlNames(value.query),compact=value.query.replace(/\s/g,'').toLowerCase();if(!names.includes('mutation'))return false;
  return names.some(name=>name.startsWith('delete')) || names.some(name=>['transferrepository','updaterepositoryruleset','createrepositoryruleset','updateorganizationruleset','createorganizationruleset','updatebranchprotectionrule','createbranchprotectionrule'].includes(name)) || names.includes('updaterepository') && (compact.includes('visibility:') || compact.includes('"visibility"')) || names.some(name=>['updateref','updaterefs'].includes(name)) && (compact.includes('force:true') || nested(value.variables,(key,v)=>key==='force' && v===true)) || names.includes('updaterefs') && (/afteroid:["']0{40,}["']/.test(compact) || nested(value.variables,(key,v)=>key==='afteroid' && typeof v==='string' && /^0{40,}$/.test(v)));
}
export function githubDecision(policy,method,path,body=new Uint8Array()) {
  method=method.toUpperCase();const text=Buffer.from(body).toString('utf8').toLowerCase();
  for(const rule of policy?.rules ?? [])if((!rule.method || rule.method.toUpperCase()===method) && glob(rule.path,path) && (!rule.body_contains || text.includes(rule.body_contains.toLowerCase())))return rule.effect;
  const value=parse(body),segments=path.split('/');
  const protection=segments[1]==='repos' && segments[4]==='branches' && segments.slice(5).includes('protection');
  const ruleset=segments[1]==='repos' && segments[4]==='rulesets' || segments[1]==='orgs' && segments[3]==='rulesets';
  const effect=['PUT','POST','PATCH'].includes(method) && (protection || ruleset) || method==='POST' && glob('/repos/*/*/transfer',path) || method==='PATCH' && glob('/repos/*/*',path.replace(/\/+$/,'')) && Object.keys(value ?? {}).some(key=>['archived','private','visibility','default_branch'].includes(key.toLowerCase()));
  return method==='DELETE' || method==='PATCH' && path.includes('/git/refs/') && value?.force===true || effect || path==='/graphql' && destructiveGraphql(body) ? 'deny':'allow';
}
function validatePolicy(policy) {
  if(!policy || typeof policy!=='object' || Array.isArray(policy) || Object.keys(policy).some(key=>key!=='rules') || policy.rules!==undefined && !Array.isArray(policy.rules))throw new ProtocolError('Invalid GitHub policy',500);
  for(const rule of policy.rules ?? [])if(!rule || Object.keys(rule).some(key=>!['effect','method','path','body_contains'].includes(key)) || !['allow','deny'].includes(rule.effect) || typeof rule.path!=='string' || rule.method!=null && typeof rule.method!=='string' || rule.body_contains!=null && typeof rule.body_contains!=='string')throw new ProtocolError('Invalid GitHub policy rule',500);
  return policy;
}
export async function githubConfiguration(config={},env={}) {
  const specified=config.github ?? {},base_url=(specified.base_url ?? env.GITHUB_PROXY_BASE_URL ?? 'https://api.github.com').replace(/\/+$/,'');
  let token=specified.token ?? env.GITHUB_PROXY_TOKEN;
  if(!token && env.GITHUB_PROXY_TOKEN_FILE)token=(await readFile(env.GITHUB_PROXY_TOKEN_FILE,'utf8')).trim();
  if(!token && env.GITHUB_PROXY_TOKEN_ENV)token=env[env.GITHUB_PROXY_TOKEN_ENV];
  if(!token && config.data_dir){try{token=(await readFile(join(config.data_dir,'github-credential'),'utf8')).trim();}catch(error){if(error.code!=='ENOENT')throw error;}}
  if(!token) {
    const dir=env.GH_CONFIG_DIR || (env.HOME ? join(env.HOME,'.config','gh'):undefined);
    if(dir) {let contents;try{contents=await readFile(join(dir,'hosts.yml'),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
      const host=new URL(base_url).hostname.replace(/^api\.github\.com$/,'github.com');let current;
      for(const line of (contents ?? '').split('\n')){const match=/^([^:]+):(.*)$/.exec(line);if(!match)continue;if(!/^\s/.test(line))current=match[1].trim().replace(/^['"]|['"]$/g,'');else if(match[1].trim()==='oauth_token' && current?.toLowerCase()===host.toLowerCase())token=match[2].trim().replace(/^['"]|['"]$/g,'');}
    }
  }
  const policy=specified.policy ?? (env.GITHUB_PROXY_POLICY ? JSON.parse(await readFile(env.GITHUB_PROXY_POLICY,'utf8')):{});
  return {base_url,token:token || undefined,policy:validatePolicy(policy)};
}
export function githubAPIPath(path) {
  if(['/api/graphql','/api/services/github/api/graphql'].includes(path))return '/graphql';
  for(const prefix of ['/api/services/github/api/v3','/api/v3','/github'])if(path.startsWith(prefix) && path.length>prefix.length)return path.slice(prefix.length);
  return path;
}
export async function relayGithub(request,{config,claims,fetch=globalThis.fetch,maxBodyBytes=4*1024*1024,timeoutMs=120000}) {
  const error=(status,message,blocked=false)=>new Response(JSON.stringify({message}),{status,headers:{'content-type':'application/json',...(blocked?{'x-link-assistant-policy':'blocked'}:{})}});
  if(!config.token)return error(503,'GitHub proxy is not configured');
  const body=request.body ? await boundedBytes(request,maxBodyBytes):new Uint8Array(),url=new URL(request.url),path=githubAPIPath(url.pathname);
  const allowed=claims.github_repos ?? claims.record?.github_repos ?? [],repository=/^\/repos\/([^/]+)\/([^/]+)/.exec(path)?.slice(1).join('/');
  if(allowed.length && !allowed.some(value=>value.toLowerCase()===repository?.toLowerCase()))return error(403,"Blocked by Link.Assistant.Router GitHub policy: outside this token's repositories",true);
  if(githubDecision(config.policy,request.method,path,body)==='deny')return error(403,'Blocked by Link.Assistant.Router GitHub policy',true);
  let upstream=config.base_url+path;if(path==='/graphql' && config.base_url.endsWith('/api/v3'))upstream=config.base_url.slice(0,-7)+'/api/graphql';
  const target=new URL(upstream+url.search);if(!['http:','https:'].includes(target.protocol) || target.username || target.password)throw new ProtocolError('Invalid GitHub upstream URL',500);
  const headers=new Headers({authorization:`Bearer ${config.token}`});for(const name of ['accept','content-type','user-agent','time-zone','x-github-api-version','if-none-match','if-modified-since'])if(request.headers.has(name))headers.set(name,request.headers.get(name));
  const controller=new AbortController(),abort=()=>controller.abort(request.signal.reason);request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);timer.unref?.();const cleanup=()=>{clearTimeout(timer);request.signal.removeEventListener('abort',abort);};
  let response;try{response=await fetch(target,{method:request.method,headers,...(['GET','HEAD'].includes(request.method)?{}:{body}),signal:controller.signal,redirect:'manual'});}catch{cleanup();return error(502,'GitHub upstream request failed');}
  const reader=response.body?.getReader();if(!reader){cleanup();return new Response(null,{status:response.status,headers:nativeResponseHeaders(response.headers)});}
  const stream=new ReadableStream({async pull(sink){try{const value=await reader.read();if(value.done){cleanup();sink.close();}else sink.enqueue(value.value);}catch(error){cleanup();sink.error(error);}},async cancel(reason){controller.abort();cleanup();await reader.cancel(reason);}});
  return new Response(stream,{status:response.status,headers:nativeResponseHeaders(response.headers)});
}
