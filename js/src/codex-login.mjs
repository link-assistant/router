/** Codex public-client device and loopback OAuth authorization. */
import {createServer} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {rm} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {atomicWrite} from './storage.mjs';
import {CODEX_CLIENT_ID,importCredential,validateCredentialCatalog} from './oauth.mjs';
const fail=(code,message,status=400)=>Object.assign(new Error(message),{code,status});
const nonce=()=>randomUUID().replaceAll('-','');
const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
const nonempty=value=>typeof value==='string' && value.trim().length>0;
function issuerOrigin(value,allowLoopback) {
  let url;try {url=new URL(value);}catch {throw fail('invalid_oauth_endpoint','Codex issuer must be an absolute URL');}
  const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || !['','/'].includes(url.pathname) || url.origin!=='https://auth.openai.com' && !(allowLoopback && local && ['http:','https:'].includes(url.protocol))) throw fail('invalid_oauth_endpoint','Codex issuer must be official or an explicitly allowed loopback fixture');
  return url.origin;
}
async function json(response,signal) {
  const chunks=[];let bytes=0;const reader=response.body?.getReader();
  const abort=new Promise((_,reject)=> {const stop=()=>reject(fail('login_cancelled','Codex authorization cancelled',409));if (signal.aborted) stop();else signal.addEventListener('abort',stop,{once:true});});
  try {
    if (reader) while (true) {const part=await Promise.race([reader.read(),abort]);if (part.done) break;bytes+=part.value.byteLength;if (bytes>1024*1024) throw fail('oauth_response_invalid','Codex response exceeds 1 MiB',502);chunks.push(part.value);}
    const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes));return text ? JSON.parse(text) : {};
  } catch (error) {if (error.code) throw error;throw fail('oauth_response_invalid','Codex response is not valid UTF-8 JSON',502);}
  finally {if (reader) {Promise.resolve(reader.cancel()).catch(()=>{});try {reader.releaseLock();}catch {}}}
}
export class CodexLogin {
  constructor({home,manager,clock=()=>Math.floor(Date.now()/1000),signal,issuer='https://auth.openai.com',codexIssuer,allowLoopback=false,timeoutMs=900000,dataDir,validateCatalog=validateCredentialCatalog,catalogBaseURL,port=1455,flow='auto'}={}) {
    if (!home || !manager?.fetch || !Number.isSafeInteger(timeoutMs) || timeoutMs<=0) throw fail('invalid_login_config','Codex login requires a home, fetch manager and positive deadline');
    this.home=home;this.manager=manager;this.clock=clock;this.issuer=issuerOrigin(codexIssuer ?? issuer,allowLoopback);this.allowLoopback=allowLoopback;this.timeoutMs=timeoutMs;
    this.dataDir=dataDir ?? join(home,'.router');this.validateCatalog=validateCatalog;this.catalogBaseURL=catalogBaseURL ?? (allowLoopback && this.issuer!=='https://auth.openai.com' ? this.issuer : undefined);
    this.port=Number(port);this.flow=flow;this.controller=new AbortController();this.signal=signal ? AbortSignal.any([signal,this.controller.signal]) : this.controller.signal;this.used=false;
  }
  static async begin(options={}) {
    const login=new CodexLogin(options);
    if (['auto','device'].includes(login.flow)) await login.beginDevice();
    else if (login.flow==='loopback') await login.bindCallback();
    else throw fail('invalid_argument','Codex supports device or loopback authorization');
    return login;
  }
  authorizationURL() {return this.url;}
  async request(path,{body,form=false}={}) {
    const signal=AbortSignal.any([this.signal,AbortSignal.timeout(Math.min(this.timeoutMs,20000))]);
    const abort=new Promise((_,reject)=> {const stop=()=>reject(fail('login_cancelled','Codex authorization cancelled or its request deadline elapsed',409));if (signal.aborted) stop();else signal.addEventListener('abort',stop,{once:true});});
    let response;try {response=await Promise.race([this.manager.fetch(this.issuer+path,{method:'POST',redirect:'error',signal,headers:{'content-type':form ? 'application/x-www-form-urlencoded' : 'application/json'},body:form ? body : JSON.stringify(body)}),abort]);}
    catch (error) {if (error.code==='login_cancelled') throw error;throw fail('oauth_exchange_uncertain','Codex authorization request outcome is uncertain',502);}
    if (response.url && new URL(response.url).origin!==this.issuer) throw fail('invalid_oauth_endpoint','Codex response changed issuer origin',502);
    return {status:response.status,ok:response.ok,body:await json(response,signal)};
  }
  async beginDevice() {
    const response=await this.request('/api/accounts/deviceauth/usercode',{body:{client_id:CODEX_CLIENT_ID}});
    if (!response.ok) throw fail('device_authorization_rejected',response.status===404 ? 'Codex device authorization is disabled; use loopback flow' : 'Codex device authorization could not be started',response.status);
    const device=response.body,interval=typeof device.interval==='string' && /^\s*\d+\s*$/.test(device.interval) ? Number(device.interval) : device.interval;
    if (!nonempty(device.device_auth_id) || !nonempty(device.user_code ?? device.usercode) || !Number.isSafeInteger(interval) || interval<0) throw fail('oauth_response_invalid','Codex device response lacks a usable ID, code or interval',502);
    this.deviceId=device.device_auth_id;this.userCode=device.user_code ?? device.usercode;this.interval=interval;this.url=this.issuer+'/codex/device';this.status='awaiting_device';
  }
  async bindCallback() {
    if (this.signal.aborted) throw fail('login_cancelled','Codex callback cancelled',409);
    if (!Number.isInteger(this.port) || this.port<0 || this.port>65535 || this.issuer==='https://auth.openai.com' && ![1455,1457].includes(this.port)) throw fail('invalid_argument','Codex OAuth registers loopback ports 1455 and 1457 only');
    this.state=nonce();this.verifier=nonce()+nonce();let settle;
    this.callback=new Promise((resolve,reject)=>settle={resolve,reject});this.callback.catch(()=>{});
    this.signal.addEventListener('abort',()=>settle.reject(fail('login_cancelled','Codex callback cancelled',409)),{once:true});
    this.server=createServer((request,response)=> {
      const url=new URL(request.url,'http://localhost');
      if (request.method!=='GET' || url.pathname!=='/auth/callback') {response.writeHead(404);response.end();return;}
      if (url.searchParams.get('state')!==this.state) {response.writeHead(400);response.end('OAuth state did not match; authorization is still waiting');return;}
      if (this.handled) {response.writeHead(409);response.end('Authorization callback was already handled');return;}
      this.handled=true;
      const providerError=url.searchParams.get('error'),code=url.searchParams.get('code');
      if (providerError || !code) {
        const safe=['access_denied','server_error','temporarily_unavailable'].includes(providerError) ? providerError : 'provider_error';
        settle.reject(fail('authorization_failed',`Codex callback failed (${safe})`));response.writeHead(400);response.end('Authorization failed. You can close this window.');
      } else {settle.resolve(code);response.writeHead(200);response.end('Authorization received. You can close this window.');}
    });
    this.server.maxHeadersCount=32;this.server.headersTimeout=10000;this.server.requestTimeout=10000;
    await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(this.port,'127.0.0.1',resolve);});
    this.port=this.server.address().port;this.redirectURI=`http://localhost:${this.port}/auth/callback`;
    const pairs={response_type:'code',client_id:CODEX_CLIENT_ID,redirect_uri:this.redirectURI,scope:'openid profile email offline_access api.connectors.read api.connectors.invoke',code_challenge:createHash('sha256').update(this.verifier).digest('base64url'),code_challenge_method:'S256',id_token_add_organizations:'true',codex_cli_simplified_flow:'true',state:this.state,originator:'codex_cli_rs'};
    this.url=this.issuer+'/oauth/authorize?'+Object.entries(pairs).map(([key,value])=>`${encode(key)}=${encode(value)}`).join('&');this.status='awaiting_callback';
  }
  async stopCallback() {
    if (!this.server) return;const server=this.server;this.server=null;
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  }
  async cancel() {this.controller.abort();await this.stopCallback();}
  async wait({dataDir=this.dataDir,validateCatalog=this.validateCatalog,catalogBaseURL=this.catalogBaseURL,signal}={}) {
    if (this.used) throw fail('pending_login_consumed','Codex authorization was already consumed',409);this.used=true;
    const timer=setTimeout(()=>this.controller.abort(),this.timeoutMs),extraAbort=()=>this.controller.abort();signal?.addEventListener('abort',extraAbort,{once:true});if (signal?.aborted) extraAbort();
    try {
      let code,verifier,redirect;
      if (this.flow==='loopback') {code=await this.callback;await this.stopCallback();verifier=this.verifier;redirect=this.redirectURI;}
      else while (true) {
        const response=await this.request('/api/accounts/deviceauth/token',{body:{device_auth_id:this.deviceId,user_code:this.userCode}});
        if (response.ok) {
          const value=response.body;
          if (!nonempty(value.authorization_code) || !nonempty(value.code_verifier) || value.code_challenge!==createHash('sha256').update(value.code_verifier).digest('base64url')) throw fail('oauth_pkce_mismatch','Codex device authorization returned inconsistent PKCE values',502);
          code=value.authorization_code;verifier=value.code_verifier;redirect=this.issuer+'/deviceauth/callback';break;
        }
        const providerError=String(response.body.error ?? '').toLowerCase();
        if (response.status===429 || providerError==='slow_down') this.interval+=5;
        else if (['expired_token','access_denied'].includes(providerError)) throw fail('authorization_failed',`Codex device authorization failed (${providerError})`,401);
        else if (![403,404].includes(response.status) && providerError!=='authorization_pending') throw fail('device_authorization_rejected',`Codex device endpoint returned ${response.status}`,response.status);
        await sleep(this.interval*1000,undefined,{signal:this.signal});
      }
      const body=Object.entries({grant_type:'authorization_code',code,redirect_uri:redirect,client_id:CODEX_CLIENT_ID,code_verifier:verifier}).map(([key,value])=>`${encode(key)}=${encode(value)}`).join('&');
      const response=await this.request('/oauth/token',{body,form:true});
      if (!response.ok) throw fail('authorization_failed',`Codex token endpoint returned ${response.status}`,response.status);
      const tokens=response.body;if (!['id_token','access_token','refresh_token'].every(key=>nonempty(tokens[key]))) throw fail('oauth_response_invalid','Codex token response lacks required credential fields',502);
      const document={auth_mode:'chatgpt',tokens:Object.fromEntries(['id_token','access_token','refresh_token'].map(key=>[key,tokens[key]])),last_refresh:new Date(this.clock()*1000).toISOString()};
      const stage=join(dataDir,'auth-import-candidates',nonce()),sourceHome=join(stage,'codex');
      // Preserve the exchanged rotating chain before any subsequent network
      // validation. Failed acceptance retains this private recovery candidate.
      await atomicWrite(join(sourceHome,'auth.json'),JSON.stringify(document,null,2)+'\n');
      try {
        const result=await importCredential({provider:'codex',sourceHome,destinationHome:this.home,dataDir,owned:true,fetch:this.manager.fetch,clock:this.clock,validateCatalog,catalogBaseURL,allowLoopback:this.allowLoopback,beforePromote:()=>{if (this.signal.aborted) throw fail('login_cancelled','Codex authorization cancelled before promotion',409);}});
        await rm(stage,{recursive:true,force:true});return result;
      } catch (error) {error.transaction_id=stage.split('/').at(-1);throw error;}
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',extraAbort);await this.stopCallback();}
  }
}
