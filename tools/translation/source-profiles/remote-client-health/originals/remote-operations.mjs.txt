/** Exact management requests used by the state CLI; no local fallback. */
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { request as httpsRequest } from 'node:https';
import { rootCertificates } from 'node:tls';
import { Readable } from 'node:stream';
import {parseProviderImport,providerProvisionResponse} from './provider-manifest.mjs';

const error = (message,exitCode = 1) => Object.assign(new Error(message),{code:'remote-operation',exitCode});
const out = (...output) => ({output});
const segment = value => encodeURIComponent(String(value)).replace(/[!'()*]/g,ch=>`%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
const list = value => value === undefined ? [] : Array.isArray(value) ? value : [value];
const nullish = value => value === undefined ? null : value;
const positive = (value,fallback,zero = false) => {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < (zero ? 0 : 1)) throw error('Numeric limit must be a safe integer in the supported range',2);
  return parsed;
};

export function parsePauseUntil(value,now = Math.floor(Date.now()/1000)) {
  if (value === undefined) return null;
  const text = String(value).trim();let result;
  if (/^\d+$/.test(text)) result = Number(text);
  else if (/^\d+[smhd]$/.test(text)) result = now + Number(text.slice(0,-1)) * ({s:1,m:60,h:3600,d:86400})[text.at(-1)];
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) result = Math.floor(Date.parse(text)/1000);
  if (!Number.isSafeInteger(result) || result < 0) throw error('Pause deadline must be Unix seconds, RFC 3339, or a delay like 90m in the safe integer range',2);
  return result;
}

export const remoteStateFamilies = new Set(['accounts','auth','tokens','providers','logs','tls','doctor','usage','models']);
export function nativeRemoteCall(name,options = {},invocation = {}) {
  if (name === 'tokens.issue') return {method:'POST',path:'/api/management/tokens',body:{
    ttl_hours:positive(options.ttl_hours,24),label:options.label ?? '',account:nullish(options.account),
    max_requests:options.max_requests === undefined ? null : positive(options.max_requests,0,true),
    max_tokens:options.max_tokens === undefined ? null : positive(options.max_tokens,0,true),
    rate_limit_per_minute:options.rate_limit_per_minute === undefined ? null : positive(options.rate_limit_per_minute,0,true),
    scope:options.admin ? 'admin' : null,github_repos:list(options.github_repo).length ? list(options.github_repo) : null,
    allowed_models:list(options.allowed_model).length ? list(options.allowed_model) : null}};
  if (name === 'tokens.rotate') return {method:'POST',path:'/api/management/tokens/rotate-client',body:{id:options.id,
    ttl_hours:positive(options.ttl_hours,24),label:options.label ? options.label : null,
    max_requests:options.max_requests === undefined ? null : positive(options.max_requests,0,true),max_tokens:options.max_tokens === undefined ? null : positive(options.max_tokens,0,true),
    rate_limit_per_minute:options.rate_limit_per_minute === undefined ? null : positive(options.rate_limit_per_minute,0,true),account:nullish(options.account)}};
  if (name === 'tokens.list' || name === 'tokens.show') return {method:'GET',path:'/api/management/tokens'};
  if (name === 'tokens.revoke' || name === 'tokens.expire') return {method:'POST',path:'/api/management/tokens/revoke',body:{id:options.id}};
  if (name === 'accounts.list') return {method:'GET',path:'/api/management/accounts'};
  if (name === 'accounts.pause') return {method:'POST',path:`/api/management/accounts/${segment(options.name)}/pause`,body:{reason:options.reason ?? 'paused by an operator',until_unix:parsePauseUntil(options.until,invocation.nowUnix)}};
  if (name === 'accounts.resume') return {method:'POST',path:`/api/management/accounts/${segment(options.name)}/resume`,body:{}};
  if (name === 'accounts.policy') return {method:options.file ? 'POST' : 'GET',path:`/api/management/accounts/${segment(options.name)}/policy`};
  if (name === 'providers.list') return {method:'GET',path:'/api/management/providers'};
  if (name === 'providers.show' || name === 'providers.remove') return {method:name.endsWith('remove') ? 'DELETE' : 'GET',path:`/api/management/providers/${segment(options.name)}`};
  if (name === 'providers.add') {
    const apiKey = options.api_key_stdin ? String(invocation.stdin ?? '').split(/\r?\n/)[0].trim() : undefined;
    if (options.api_key_stdin && !apiKey) throw error('api-key-stdin requires a nonempty input line',2);
    return {method:'POST',path:'/api/management/providers',body:{name:options.name,kind:options.kind ?? 'openai-compatible',
      base_url:nullish(options.base_url),default_model:nullish(options.model),models:list(options.models),
      supported_clients:list(options.supported_clients),api_key:nullish(apiKey),api_key_env:nullish(options.api_key_env),
      encrypted_api_key:null,enabled:options.enabled ?? true,subscriber_id:nullish(options.subscriber_id),
      acknowledge_intermediary_risk:options.acknowledge_intermediary_risk ?? false,
      acknowledge_unsupported_clients:list(options.acknowledge_unsupported_client),if_absent:options.if_absent ?? false}};
  }
  if (name === 'auth.status') return {method:'GET',path:'/api/management/auth/status'};
  return null;
}

async function inputText(filename,cwd) {
  const path = resolve(cwd,filename),file = await open(path,constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await file.stat(); if (!stat.isFile() || stat.size > 4 * 1024 * 1024) throw error('Operation input must be a regular file within 4 MiB',2);
    const buffer = Buffer.alloc(4 * 1024 * 1024 + 1);const {bytesRead} = await file.read(buffer,0,buffer.length,0);
    if (bytesRead === buffer.length) throw error('Operation input exceeds 4 MiB',2);
    return new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,bytesRead));
  } finally { await file.close(); }
}

async function trustedFetch(url,options,certificatePath,cwd) {
  const file = await open(resolve(cwd,certificatePath),constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));let ca;
  try {
    const stat = await file.stat();if (!stat.isFile() || stat.size > 1024 * 1024) throw error('Management CA must be a regular file within 1 MiB');
    ca = await file.readFile();if (!ca.includes(Buffer.from('-----BEGIN CERTIFICATE-----'))) throw error('Management CA does not contain a PEM certificate');
  } finally {await file.close();}
  if (new URL(url).protocol !== 'https:') throw error('Custom management CA requires HTTPS');
  return new Promise((resolveResponse,reject)=> {
    const request = httpsRequest(url,{method:options.method,headers:options.headers,signal:options.signal,ca:[...rootCertificates,ca]},response=> {
      resolveResponse({status:response.statusCode,ok:response.statusCode >= 200 && response.statusCode < 300,url,body:Readable.toWeb(response)});
    });
    request.once('error',reject);request.end(options.body);
  });
}

export async function sendRemoteManagement(target,call,{fetch = globalThis.fetch,signal,deadlineMs = 30000,maxOutputBytes = 4 * 1024 * 1024,cwd = process.cwd()} = {}) {
  positive(deadlineMs,30000);positive(maxOutputBytes,4 * 1024 * 1024);
  const controller = new AbortController(),timer = setTimeout(()=>controller.abort(),deadlineMs);
  const combined = signal ? AbortSignal.any([signal,controller.signal]) : controller.signal;
  let reader;const aborted = new Promise((_,reject)=> {
    const abort = ()=>reject(error('Remote operation cancelled or its deadline elapsed'));
    if (combined.aborted) abort();else combined.addEventListener('abort',abort,{once:true});
  });
  const within = promise=>Promise.race([promise,aborted]);
  try {
    const url = target.managementServer+call.path;
    const request = {method:call.method,redirect:'error',signal:combined,
      headers:{accept:'application/json',...(call.client ? {'x-link-assistant-client':call.client} : {}),...(target.token ? {authorization:`Bearer ${target.token}`} : {}),...(call.body !== undefined ? {'content-type':'application/json'} : {})},
      ...(call.body !== undefined ? {body:JSON.stringify(call.body)} : {})};
    const response = await within(target.managementCaCert ? trustedFetch(url,request,target.managementCaCert,cwd) : fetch(url,request));
    if (response.url && new URL(response.url).origin !== target.managementServer) throw error('Remote management response changed origin');
    const chunks = [];let bytes = 0;reader = response.body?.getReader();
    if (reader) while (true) {
      const part = await within(reader.read());if (part.done) break;bytes += part.value.byteLength;
      if (bytes > maxOutputBytes) throw error('Remote management response exceeds the output budget');chunks.push(part.value);
    }
    const text = new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes));
    let answer;try {answer = text ? JSON.parse(text) : {};}catch {throw error(`Selected router ${target.server} returned invalid JSON`);}
    if (!response.ok) {
      const failure = error(`Selected router ${target.server} returned HTTP ${response.status}`,response.status === 404 && call.method === 'GET' ? 2 : 1);
      failure.status = response.status;failure.remoteOutcome = answer?.error?.outcome;throw failure;
    }
    return answer;
  } catch (failure) {
    if (failure.code === 'remote-operation') throw failure;
    throw error(combined.aborted ? 'Remote operation cancelled or its deadline elapsed' : `Selected router ${target.server} request failed`);
  } finally {
    clearTimeout(timer);controller.abort();
    // A hostile/injected stream may never settle cancel(). Deadline enforcement
    // must not wait for that stream to cooperate.
    if (reader) {Promise.resolve(reader.cancel()).catch(()=>{});try {reader.releaseLock();} catch {}}
  }
}

export async function executeRemoteOperation({name,options = {},invocation = {},target,fetch = globalThis.fetch}) {
  if (['tokens.import','tokens.recover-admin'].includes(name)) throw error(`${name} proves local store ownership and has no remote form for ${target.server}; pass --local.`,2);
  if (name === 'providers.import') {
    const records = parseProviderImport(await inputText(options.path,invocation.cwd ?? process.cwd()));
    const report = {complete:true,results:[]};
    for (const record of records) {
      try {
        const result = await sendRemoteManagement(target,{method:'POST',path:'/api/management/providers',body:record},{fetch,...invocation});
        const accepted = providerProvisionResponse(result);if (accepted.name !== record.name) throw error('Remote provider acceptance named a different candidate');
        report.results.push(accepted);
      } catch (failure) {
        report.complete = false;report.results.push({name:record.name,outcome:['invalid_candidate','credential_rejected','rate_limited','unverified','persistence_uncertain'].includes(failure.remoteOutcome) ? failure.remoteOutcome : 'unverified'});break;
      }
    }
    if (!report.complete) {const failure = error('Provider import stopped at the first failed acceptance');failure.data = out(JSON.stringify(report,null,2));throw failure;}
    return out(JSON.stringify(report,null,2));
  }
  const call = nativeRemoteCall(name,options,invocation);
  if (!call) throw error(`${name} cannot answer for selected router ${target.server} from here; pass --local to act on this machine.`);
  if (name === 'accounts.policy' && options.file) call.body = JSON.parse(await inputText(options.file,invocation.cwd ?? process.cwd()));
  const answer = await sendRemoteManagement(target,call,{fetch,...invocation});
  if (name === 'tokens.list') {if (!Array.isArray(answer.data)) throw error('Remote token list is malformed');return answer.data;}
  if (name === 'tokens.show') {if (!Array.isArray(answer.data)) throw error('Remote token list is malformed');const held = answer.data.find(record=>record.id === options.id);if (!held) throw error(`not found: ${options.id}`,2);return held;}
  if (name === 'tokens.issue' || name === 'tokens.rotate') {if (typeof answer.token !== 'string' || !answer.token) throw error('Remote token issuance is malformed');return {token:answer.token};}
  if (name === 'tokens.revoke' || name === 'tokens.expire') return out(`revoked ${options.id}`);
  if (name === 'providers.list') {if (!Array.isArray(answer.data)) throw error('Remote provider list is malformed');return answer.data;}
  if (name === 'providers.add') return providerProvisionResponse(answer);
  if (name === 'providers.remove') return out(`removed ${options.name}`);
  if (name === 'accounts.pause') return out(`server: ${target.server} (${target.source})`,answer.until_unix == null ? `paused ${options.name} until it is resumed` : `paused ${options.name} until ${new Date(answer.until_unix * 1000).toISOString().replace('.000Z','+00:00')}`);
  if (name === 'accounts.resume') return out(`server: ${target.server} (${target.source})`,answer.was_paused === false ? `${options.name} was not paused` : `resumed ${options.name}`);
  if (name === 'auth.status') {if (!Array.isArray(answer.credentials)) throw error('Remote credential status is malformed');return {server:target.server,credentials:answer.credentials,sources:[],api_key_providers:[],output:[]};}
  return answer;
}
