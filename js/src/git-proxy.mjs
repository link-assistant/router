import {boundedBytes,nativeResponseHeaders} from './native-service.mjs';
const ZERO='0'.repeat(40);
const glob=(pattern,path)=>pattern.endsWith('/**') ? path===pattern.slice(0,-3) || path.startsWith(pattern.slice(0,-3)+'/') : pattern.split('/').length===path.split('/').length && pattern.split('/').every((part,index)=>part==='*' || part===path.split('/')[index]);
const allowedRef=(policy,repository,name)=>(policy.rules ?? []).some(rule=>rule.effect==='allow' && (!rule.method || rule.method.toUpperCase()==='GIT') && glob(rule.path,`/git/${repository}/${name}`));
export function parseRefUpdates(body) {
  const updates=[];let cursor=0;const decoder=new TextDecoder('utf-8',{fatal:true});
  while(cursor+4<=body.length) {
    const prefix=Buffer.from(body.subarray(cursor,cursor+4)).toString('ascii');if(!/^[0-9a-fA-F]{4}$/.test(prefix))break;
    const length=parseInt(prefix,16);if(!length || length<4 || cursor+length>body.length)break;
    let payload=body.subarray(cursor+4,cursor+length);cursor+=length;const nul=payload.indexOf(0);if(nul>=0)payload=payload.subarray(0,nul);
    let fields;try{fields=decoder.decode(payload).trim().split(' ');}catch{continue;}
    if(fields.length>=3 && fields[0].length===40 && fields[1].length===40)updates.push({old:fields[0],new:fields[1],name:fields[2]});
  }
  return updates;
}
const refusal=(name,operation,reason)=>`Blocked by Link.Assistant.Router git policy: ${operation==='delete' ? `deleting ${name} is refused` : operation==='force' ? `force-updating ${name} is refused` : `could not confirm ${name} is a fast-forward (${reason})`}; allow it in GITHUB_PROXY_POLICY to permit this ref`;
export async function relayGit(request,{config,claims,fetch=globalThis.fetch,maxBodyBytes=4*1024*1024,maxResponseBytes=32*1024*1024,timeoutMs=120000}) {
  const error=(status,message,blocked=false)=>new Response(message+'\n',{status,headers:{'content-type':'text/plain; charset=utf-8',...(blocked?{'x-link-assistant-policy':'blocked'}:{})}});
  const source=new URL(request.url),path=source.pathname.replace(/^\/api\/services\/github/,'');
  const repository=/^\/git\/([^/]+)\/([^/]+)/.exec(path)?.slice(1).join('/').replace(/(?:\.git)+$/,'');
  if(!repository)return error(404,'not a git repository path');if(!config.token)return error(503,'GitHub proxy is not configured');
  const scope=claims.github_repos ?? claims.record?.github_repos ?? [];if(scope.length && !scope.some(value=>value.toLowerCase()===repository.toLowerCase()))return error(403,"outside this token's repositories",true);
  let body;try{body=await boundedBytes(request,maxBodyBytes);}catch(errorValue){return error(413,errorValue.message);}
  const controller=new AbortController(),abort=()=>controller.abort(request.signal.reason);request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);timer.unref?.();const cleanup=()=>{clearTimeout(timer);request.signal.removeEventListener('abort',abort);};
  const authorization='Basic '+Buffer.from(`x-access-token:${config.token}`).toString('base64');
  if(path.endsWith('/git-receive-pack')) {
    const updates=parseRefUpdates(body),window=Buffer.from(body.subarray(0,4096)),start=window.indexOf(0),capabilities=start>=0 ? window.subarray(start).toString('utf8'):'';
    const force=capabilities.includes('force-ref-updates') || capabilities.includes('push-force');
    for(const update of updates) {
      if(allowedRef(config.policy,repository,update.name))continue;
      if(update.new===ZERO){cleanup();return error(403,refusal(update.name,'delete'),true);}
      if(force && update.old!==ZERO){cleanup();return error(403,refusal(update.name,'force'),true);}
    }
    for(const update of updates) {
      if(update.old===ZERO || update.new===ZERO || allowedRef(config.policy,repository,update.name))continue;
      let response,payload;
      try{response=await fetch(`${config.base_url}/repos/${repository}/compare/${update.old}...${update.new}`,{headers:{authorization,accept:'application/vnd.github+json','user-agent':'link-assistant-router'},signal:controller.signal,redirect:'manual'});if(response.ok)payload=JSON.parse(Buffer.from(await boundedBytes(response,maxResponseBytes)).toString('utf8'));else await response.body?.cancel();}
      catch{cleanup();return error(403,refusal(update.name,'unknown','upstream request failed'),true);}
      if(!response.ok){cleanup();return error(403,refusal(update.name,'unknown',`upstream answered ${response.status}`),true);}
      if(['behind','diverged'].includes(payload?.status)){cleanup();return error(403,refusal(update.name,'force'),true);}
      if(!['ahead','identical'].includes(payload?.status)){cleanup();return error(403,refusal(update.name,'unknown','upstream gave no comparable status'),true);}
    }
  }
  const base=config.base_url.replace(/^https:\/\/api\.github\.com(?=\/|$)/,'https://github.com');
  const target=new URL(base+'/'+path.slice('/git/'.length)+source.search);
  const headers=new Headers({authorization});for(const name of ['content-type','accept','user-agent','git-protocol'])if(request.headers.has(name))headers.set(name,request.headers.get(name));
  let response;try{response=await fetch(target,{method:request.method,headers,...(['GET','HEAD'].includes(request.method)?{}:{body}),signal:controller.signal,redirect:'manual'});}catch{cleanup();return error(502,'git upstream request failed');}
  const reader=response.body?.getReader();if(!reader){cleanup();return new Response(null,{status:response.status,headers:nativeResponseHeaders(response.headers)});}
  const stream=new ReadableStream({async pull(sink){try{const value=await reader.read();if(value.done){cleanup();sink.close();}else sink.enqueue(value.value);}catch(reason){cleanup();sink.error(reason);}},async cancel(reason){controller.abort();cleanup();await reader.cancel(reason);}});
  return new Response(stream,{status:response.status,headers:nativeResponseHeaders(response.headers)});
}
