// Native engine lifecycle. Docker's Rust registry is deliberately never read
// or overwritten: it identifies a different executable and storage owner.
import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { randomBytes, randomUUID, createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { lstat, mkdir, chmod, open, readdir, rm } from 'node:fs/promises';
import { resolve, join, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite, serialized, withNativeFileLock } from './storage.mjs';

const ENGINE = 'link-assistant-router/native-managed/v1', SELF = fileURLToPath(import.meta.url);
const MAX_STATE = 1024 * 1024, children = new Map(), OWNER_BOOT = randomUUID();
const fail = message => Object.assign(new Error(message),{code:'managed_server'});
const unsupported = message => Object.assign(new Error(message),{code:'unsupported'});
const sleep = ms => new Promise(done=>setTimeout(done,ms));
const out = (...lines) => ({output:lines});
const nonce = () => randomBytes(32).toString('hex');
const digest = (key,text) => createHmac('sha256',key).update(text).digest('hex');
const fingerprint = value => createHash('sha256').update(value).digest('hex');
function equal(a,b) { return typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b)); }
export const supportedManagedOperations = Object.freeze(Object.fromEntries(['start','stop','status','use','claim','reap','remove'].map(op=>[`server.${op}`,{
  status:'partial', limitations:['Native Node daemon and namespaced JSON registry, not Rust Docker container/volume; loopback HTTP only; no systemd, TLS trust import, local discovery, OAuth adoption, or Docker leases; native references use explicit acquisition and dead-owner reaping.'],
}])));

async function info(path) { try { return await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function noLinks(path) {
  for (let current = resolve(path);;) {
    if ((await info(current))?.isSymbolicLink()) throw fail('Native managed state contains a symlink');
    if (current === parse(current).root) return; current = dirname(current);
  }
}
async function readJSON(path) {
  await noLinks(path); let file;
  try {
    file = await open(path,'r'); const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_STATE) throw fail('Native managed state requires a regular file within 1 MiB');
    const bytes = Buffer.alloc(MAX_STATE+1); const {bytesRead} = await file.read(bytes,0,bytes.length,0);
    if (bytesRead > MAX_STATE) throw fail('Native managed state exceeds 1 MiB');
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,bytesRead)));
  } catch (error) { if (error.code === 'ENOENT') return null; throw fail('Invalid or unreadable native managed state'); }
  finally { await file?.close(); }
}
function paths(dataDir) {
  if (typeof dataDir !== 'string' || !dataDir) throw fail('Managed operation requires a resolved data directory');
  const root = join(resolve(dataDir),'native-managed');
  return {root,state:join(root,'state.json'),selection:join(root,'server.json'),volume:join(root,'data')};
}
async function writeJSON(path,value) {
  const text = JSON.stringify(value); if (Buffer.byteLength(text) > MAX_STATE) throw fail('Native managed state exceeds 1 MiB');
  await noLinks(path); await atomicWrite(path,text+'\n'); await chmod(path,0o600);
}
async function locked(p,operation) {
  await noLinks(p.root); await mkdir(p.root,{recursive:true,mode:0o700}); await chmod(p.root,0o700);
  return serialized(p.state,()=>withNativeFileLock(p.state,operation,12000));
}
function validateState(state) {
  if (!state) return null;
  if (state.schema !== ENGINE || state.engine !== 'node' || !/^[a-f0-9]{64}$/.test(state.control_key) || !/^[a-f0-9]{64}$/.test(state.token_secret) ||
      typeof state.boot_id !== 'string' || !Number.isInteger(state.port) || state.port < 0 || state.port > 65535 ||
      !Number.isInteger(state.control_port) || state.control_port < 0 || state.control_port > 65535 ||
      (state.pid !== null && (!Number.isSafeInteger(state.pid) || state.pid <= 0)) || !Array.isArray(state.references) ||
      state.references.length > 10000 || state.references.some(ref=>!Number.isSafeInteger(ref.pid) || ref.pid <= 0 || typeof ref.owner_boot !== 'string') ||
      typeof state.claimed !== 'boolean' || typeof state.keep_running !== 'boolean' || !Number.isSafeInteger(state.created_at)) throw fail('Native managed registry is invalid or belongs to another engine');
  return state;
}
const loadState = async p => validateState(await readJSON(p.state));
function alive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid,0); return true; } catch (error) { if (error.code === 'ESRCH') return false; if (error.code === 'EPERM') return true; throw error; }
}
export function normalizeManagedOrigin(value) {
  let url; try { url = new URL(String(value).trim()); } catch { throw fail('Server URL must be an absolute http:// or https:// origin without credentials, path, query, or fragment'); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw fail('Server URL must be an absolute http:// or https:// origin without credentials, path, query, or fragment');
  return url.origin;
}
function request(url,{method = 'GET',headers = {},body,limit = 65536,timeout = 1200} = {}) {
  return new Promise((done,reject)=> {
    const call = httpRequest(url,{method,headers,agent:false},response=> {
      const chunks = []; let size = 0;
      response.on('data',bytes=> { size += bytes.length; if (size > limit) call.destroy(fail('Managed control response exceeds its budget')); else chunks.push(bytes); });
      response.on('error',reject); response.on('end',()=>done({status:response.statusCode,text:Buffer.concat(chunks).toString('utf8')}));
    });
    call.setTimeout(timeout,()=>call.destroy(fail('Managed control request timed out'))); call.on('error',reject); call.end(body);
  });
}
async function proof(state,action = 'health') {
  const challenge = nonce(), body = JSON.stringify({challenge,boot_id:state.boot_id});
  const result = await request(`http://127.0.0.1:${state.control_port}/${action}`,{method:'POST',headers:{authorization:`Bearer ${state.control_key}`,'content-type':'application/json'},body});
  if (result.status !== 200) throw fail('Managed daemon ownership verification failed');
  let report; try { report = JSON.parse(result.text); } catch { throw fail('Managed daemon ownership verification failed'); }
  const {mac,...payload} = report;
  if (!equal(mac,digest(state.control_key,JSON.stringify(payload))) || payload.challenge !== challenge || payload.boot_id !== state.boot_id || payload.pid !== state.pid || payload.role !== ENGINE || payload.healthy !== true) throw fail('Managed daemon process identity does not match the owned registry');
  return payload;
}
async function verified(state) {
  if (!state.pid || !alive(state.pid)) throw fail('Managed daemon is stopped or its recorded process has exited');
  const result = await proof(state);
  const health = await request(`http://127.0.0.1:${state.port}/health`);
  if (health.status !== 200 || health.text.trim() !== 'ok') throw fail('Managed daemon public listener is not healthy');
  return result;
}
function daemonConfig(config,state,p) {
  // Parent-owned live Router data and credentials are never adopted. The
  // managed daemon has its own volume and signing authority.
  return {providers:config.providers ?? [],accounts:config.accounts ?? [],token_secret:state.token_secret,data_dir:p.volume,
    storage_policy:'text',host:'127.0.0.1',port:0,account_strategy:config.account_strategy,account_failover:config.account_failover,
    account_cooldown_seconds:config.account_cooldown_seconds,session_affinity_ttl_seconds:config.session_affinity_ttl_seconds};
}
async function start(p,state,config,keepRunning) {
  if (state?.pid) {
    if (alive(state.pid)) {
      await verified(state); if (keepRunning) {state.keep_running = true; await writeJSON(p.state,state);} return state;
    }
    state.pid = null; state.control_port = 0;
  }
  state ??= {schema:ENGINE,engine:'node',token_secret:nonce(),control_key:nonce(),boot_id:randomUUID(),created_at:Math.floor(Date.now()/1000),pid:null,port:0,control_port:0,references:[],keep_running:false,claimed:false,bootstrap_token:null};
  state.boot_id = randomUUID(); state.control_key = nonce(); state.keep_running ||= keepRunning;
  await noLinks(p.volume);
  await validateTree(p.volume);
  const executable = process.versions.bun ? 'node' : process.execPath;
  const child = spawn(executable,[SELF,'--daemon'],{detached:true,stdio:['ignore','ignore','ignore','ipc'],env:{PATH:process.env.PATH ?? '',SystemRoot:process.env.SystemRoot ?? ''}});
  let committed = false;
  try {
    const ready = await new Promise((done,reject)=> {
      const timer = setTimeout(()=>reject(fail('Managed daemon did not become ready within 10 seconds')),10000);
      const finish = fn => value => {clearTimeout(timer); child.off('error',onError); child.off('exit',onExit); child.off('message',onMessage); fn(value);};
      const onError = finish(reject), onExit = finish(()=>reject(fail('Managed daemon exited before readiness')));
      const onMessage = finish(message=>message?.ready ? done(message) : reject(fail('Managed daemon failed to start')));
      child.once('error',onError); child.once('exit',onExit); child.once('message',onMessage);
      child.send({state,config:daemonConfig(config,state,p)});
    });
    if (ready.pid !== child.pid || ready.boot_id !== state.boot_id || !Number.isInteger(ready.port) || !Number.isInteger(ready.control_port)) throw fail('Managed readiness identity mismatch');
    Object.assign(state,{pid:ready.pid,port:ready.port,control_port:ready.control_port,bootstrap_token:ready.bootstrap_token});
    await verified(state); await writeJSON(p.state,state);
    child.send({commit:true}); committed = true; children.set(child.pid,child);
    child.once('exit',()=>children.delete(child.pid)); child.disconnect(); child.unref();
    return state;
  } finally {
    if (!committed) {
      // A failed readiness result is complete only after this owned child has
      // exited. Otherwise test runners can kill a still-closing daemon and its
      // delayed rejection can spill into the next fixture.
      let timer;
      const exited = child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise(done=>child.once('exit',done));
      if (child.connected) {
        child.send({abort:true},()=>{});
        child.disconnect();
      }
      child.unref();
      try {await Promise.race([exited,new Promise((_,reject)=> {timer = setTimeout(()=>reject(fail('Aborted managed daemon did not exit within 4 seconds')),4000);})]);}
      finally {clearTimeout(timer);}
    }
  }
}
async function stop(p,state) {
  if (!state) throw fail('Managed router is absent; run server.start first');
  if (state.pid && alive(state.pid)) {
    await verified(state); await proof(state,'shutdown');
    const deadline = Date.now()+6000;
    while (alive(state.pid)) { if (Date.now() >= deadline) throw fail('Owned managed daemon has not exited; registry was retained'); await sleep(25); }
  }
  state.pid = null; state.control_port = 0; state.keep_running = false; state.references = [];
  await writeJSON(p.state,state); return state;
}
async function validateTree(path) {
  let files = 0;
  const visit = async (path,depth) => {
    if (++files > 10000 || depth > 32) throw unsupported('Native managed volume exceeds its 10000-entry / 32-level safety budget');
    await noLinks(path); const stat = await info(path); if (!stat) return;
    if (stat.isDirectory()) for (const name of await readdir(path)) await visit(join(path,name),depth+1);
    else if (!stat.isFile()) throw fail('Managed volume contains a special file');
  };
  await visit(path,0);
}
async function selection(p,env,state) {
  const configured = env.LINK_ASSISTANT_ROUTER_URL ?? env.ROUTER_URL;
  if (configured !== undefined) return {source:'environment',url:normalizeManagedOrigin(configured),token_configured:!!(env.LINK_ASSISTANT_ROUTER_TOKEN ?? env.LINK_ASSISTANT_TOKEN)};
  const saved = await readJSON(p.selection);
  if (saved) return {source:'persisted',url:normalizeManagedOrigin(saved.server),token_configured:typeof saved.token === 'string'};
  return {source:'managed',url:state?.port ? `http://127.0.0.1:${state.port}` : null,token_configured:false};
}
// Operation dispatch uses this before local state changes. Selecting a server
// is an operator's target choice; absent remote delegation, it cannot silently
// become a local mutation. The explicit --local target may override it.
export async function selectedManagedServer({core,config = {},env = {}} = {}) {
  config = core?.config ?? config;
  const configured = env.LINK_ASSISTANT_ROUTER_URL ?? env.ROUTER_URL;
  if (configured !== undefined) return normalizeManagedOrigin(configured);
  const p = paths(config.data_dir ?? config.dataDir), saved = await readJSON(p.selection);
  return saved ? normalizeManagedOrigin(saved.server) : null;
}
async function status(p,state,env) {
  let lifecycle = state ? 'stopped' : 'absent', detail = null;
  if (state?.pid && alive(state.pid)) {
    try { await verified(state); lifecycle = 'running'; } catch { lifecycle = 'unverified'; detail = 'Recorded process failed identity or health verification; no process action is authorized'; }
  }
  const selected = await selection(p,env,state);
  return {selection:selected,managed:{present:!!state,state:lifecycle,detail,container:'native-node-daemon',volume:p.volume,url:state?.port ? `http://127.0.0.1:${state.port}` : null,
    administrator_claimed:state?.claimed ?? false,users:state?.references.filter(ref=>alive(ref.pid)).length ?? 0,keep_running:state?.keep_running ?? false},
    output:[`effective server: ${selected.source}${selected.url ? `: ${selected.url}` : ''}`,`managed server: ${lifecycle}; engine=node` ]};
}
function validateOptions(name,options,config) {
  const allowed = new Set(['data_dir',...(name === 'server.use' ? ['server','management_server','token','token_stdin','clear','run_max_requests'] : name === 'server.reap' ? ['pid'] : name === 'server.remove' ? ['yes'] : [])]);
  for (const [key,value] of Object.entries(options)) if (value !== undefined && value !== false && !allowed.has(key)) throw unsupported(`Native ${name} does not support ${key}`);
  if (Object.entries(config).some(([key,value])=>value && /^(tls|https|listeners|systemd)/i.test(key))) throw unsupported('Native managed daemons support one loopback HTTP listener only');
  if (name === 'server.remove' && options.yes !== true) throw fail('Removing the native managed volume destroys its saved credentials and requires --yes');
  if (name === 'server.reap' && (!Number.isSafeInteger(Number(options.pid)) || Number(options.pid) <= 0)) throw fail('server.reap requires a positive PID');
}
export async function executeManagedOperation({name,options = {},invocation = {},core,config = {},env = {}}) {
  if (!supportedManagedOperations[name]) throw unsupported(`Native ${name} is not implemented`);
  config = core?.config ?? config; validateOptions(name,options,config);
  const p = paths(options.data_dir ?? config.data_dir ?? config.dataDir);
  if (name === 'server.use') {
    if (options.clear && Object.entries(options).some(([key,value])=>!['clear','data_dir'].includes(key) && value !== undefined && value !== false)) throw fail('--clear cannot be combined with a server, token, or run budget');
    let selected;
    if (!options.clear) {
      if (!options.server) throw fail('Provide a server URL or use --clear');
      let token = options.token;
      if (options.token_stdin) {if (token !== undefined) throw fail('token and token_stdin conflict'); token = String(invocation.stdin ?? '').split(/\r?\n/)[0].trim(); if (!token) throw fail('Standard input did not contain a token');}
      if (token !== undefined && (typeof token !== 'string' || !token)) throw fail('Server token must be a nonempty string');
      if (options.run_max_requests !== undefined && (!Number.isSafeInteger(Number(options.run_max_requests)) || Number(options.run_max_requests) <= 0)) throw fail('Run budget must be a positive integer');
      const server = normalizeManagedOrigin(options.server), management = options.management_server === undefined ? undefined : normalizeManagedOrigin(options.management_server);
      selected = {server,...(management && management !== server ? {management_server:management} : {}),...(token ? {token} : {}),...(options.run_max_requests !== undefined ? {run_max_requests:Number(options.run_max_requests)} : {})};
    }
    return locked(p,async()=> {if (options.clear) {await noLinks(p.selection); await rm(p.selection,{force:true}); return out(`cleared persisted server selection at ${p.selection}`);} await writeJSON(p.selection,selected); return out(`saved server selection in ${p.selection} (token ${selected.token ? 'set' : 'unset'})`);});
  }
  return locked(p,async()=> {
    let state = await loadState(p);
    if (name === 'server.status') return status(p,state,env);
    if (name === 'server.start') {state = await start(p,state,config,true); return out(`managed native router started at http://127.0.0.1:${state.port}`);}
    if (name === 'server.stop') {await stop(p,state); return out('managed native router stopped; native credential volume was preserved');}
    if (name === 'server.claim') {
      if (!state) throw fail('Managed router is absent; run server.start first');
      if (state.claimed) throw fail('Managed router administrator is already claimed; its credential is not printed twice');
      const identity = await verified(state); if (!identity.bootstrap_valid || typeof state.bootstrap_token !== 'string' || identity.bootstrap_fingerprint !== fingerprint(state.bootstrap_token)) throw fail('Managed bootstrap administrator is unavailable, mismatched, or expired');
      state.claimed = true; await writeJSON(p.state,state); return out(state.bootstrap_token);
    }
    if (name === 'server.reap') {
      const pid = Number(options.pid); if (!state) return out();
      if (alive(pid)) throw fail('Refusing to reap a live or reused owner PID');
      state.references = state.references.filter(ref=>ref.pid !== pid);
      if (!state.references.length && !state.keep_running) await stop(p,state); else await writeJSON(p.state,state);
      return out();
    }
    if (!state) throw fail('Managed router is absent; no owned state was removed');
    await stop(p,state); await validateTree(p.volume); await rm(p.volume,{recursive:true,force:true}); await noLinks(p.state); await rm(p.state,{force:true});
    return out('removed the native managed daemon and its credential volume');
  });
}

// Native wrapper leases are explicit until the `with` launcher is integrated.
export async function acquireManagedReference({core,config = {}}) {
  config = core?.config ?? config; validateOptions('server.start',{},config); const p = paths(config.data_dir ?? config.dataDir);
  return locked(p,async()=> {const state = await start(p,await loadState(p),config,false); if (!state.references.some(ref=>ref.pid === process.pid && ref.owner_boot === OWNER_BOOT)) state.references.push({pid:process.pid,owner_boot:OWNER_BOOT}); await writeJSON(p.state,state); return {pid:process.pid,url:`http://127.0.0.1:${state.port}`};});
}

async function daemon() {
  let runtime, control, committed = false, started = false;
  const exit = async()=> {const timer = setTimeout(()=>process.exit(0),3000); timer.unref(); await runtime?.close().catch(()=>{}); control?.close(); process.exit(0);};
  const deadline = setTimeout(()=>exit(),10000);
  process.on('disconnect',()=> {if (!committed) exit();}); process.on('SIGTERM',exit); process.on('SIGINT',exit);
  process.on('message',async message=> {
    if (message?.commit) {committed = true; clearTimeout(deadline); return;}
    if (message?.abort) {await exit(); return;}
    if (started || !message?.config || !message?.state) return; started = true;
    try {
      const state = validateState(message.state), core = await (await import('./core.mjs')).createRouterCore({config:message.config,env:{}});
      let token = state.bootstrap_token;
      if (!token) token = (await core.tokens.issue({scope:'admin',ttl_hours:87600,label:'native-managed-bootstrap'})).token;
      runtime = (await import('./server.mjs')).createNativeRouter({core}); await runtime.listen({host:'127.0.0.1',port:0});
      control = createServer(async(req,res)=> {
        try {
          if (req.method !== 'POST' || !['/health','/shutdown'].includes(req.url) || !equal(req.headers.authorization,`Bearer ${state.control_key}`)) {res.writeHead(403); res.end(); return;}
          const chunks = []; let length = 0;
          for await (const bytes of req) {length += bytes.length; if (length > 4096) throw fail('Control body too large'); chunks.push(bytes);}
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!/^[a-f0-9]{64}$/.test(body.challenge) || body.boot_id !== state.boot_id) throw fail('Invalid control challenge');
          let bootstrapValid = false; try {await core.tokens.validate(token,{admin:true}); bootstrapValid = true;} catch {}
          const payload = {challenge:body.challenge,boot_id:state.boot_id,pid:process.pid,role:ENGINE,healthy:!!runtime.address,bootstrap_valid:bootstrapValid,bootstrap_fingerprint:fingerprint(token)};
          res.writeHead(200,{'content-type':'application/json'}); res.end(JSON.stringify({...payload,mac:digest(state.control_key,JSON.stringify(payload))}));
          if (req.url === '/shutdown') setImmediate(exit);
        } catch {if (!res.headersSent) res.writeHead(400); res.end();}
      });
      control.requestTimeout = 2000; control.headersTimeout = 2000;
      await new Promise((done,reject)=> {control.once('error',reject); control.listen(0,'127.0.0.1',done);});
      process.send?.({ready:true,pid:process.pid,boot_id:state.boot_id,port:runtime.address.port,control_port:control.address().port,bootstrap_token:token});
    } catch {process.send?.({ready:false}); await exit();}
  });
}
if (process.argv[1] === SELF && process.argv[2] === '--daemon') daemon();
