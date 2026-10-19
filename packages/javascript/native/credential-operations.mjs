/** Local credential observation/withdrawal without constructing token authentication. */
import {unlink,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {loadConfig,ProviderStore,nativeConfigOptions} from './config.mjs';
import {CredentialFileStore,OAuthManager,subscriptionHome,subscriptionProvider} from './oauth.mjs';
import {nativeCredentialStatus} from './auth-service.mjs';
import {readNativeText} from './operation-input.mjs';
import {atomicWrite} from './storage.mjs';
const exec=promisify(execFile),subscriptions=['claude','codex','gemini','qwen'];
const candidates={claude:['.credentials.json','credentials.json','auth.json','oauth.json','config.json'],codex:['auth.json'],gemini:['oauth_creds.json'],qwen:['oauth_creds.json']};
const fail=(code,message,exitCode=1)=>Object.assign(new Error(message),{code,exitCode});
const output=lines=>({output:lines});
export function credentialWithdrawal(name,options) {return name==='auth.clear' || name==='auth.status' && options.clear_all || ['auth.claude','auth.codex','auth.gh'].includes(name) && options.clear;}
async function context({routerOptions={},options={},invocation={},env={}}) {
  const overrides=Object.fromEntries(Object.entries(options).filter(([key])=>nativeConfigOptions.has(key)));
  const input={...(routerOptions.config ?? routerOptions.core?.config ?? {}),...overrides};
  if(invocation.cwd) {
    for(const key of ['data_dir','home','claude_home','claude_code_home','codex_home','gemini_home','qwen_home'])if(input[key])input[key]=resolve(invocation.cwd,input[key]);
    if(!input.data_dir)input.data_dir=resolve(invocation.cwd,env.DATA_DIR ?? '.router');
  }
  // Observation/deletion never decrypt a provider key or sign a router token.
  const configEnv={...env};delete configEnv.TOKEN_SECRET_FILE;
  const config=await loadConfig({...routerOptions,config:input,env:configEnv});
  const clock=routerOptions.clock ?? routerOptions.core?.clock ?? (()=>Math.floor(Date.now()/1000));
  const inherited=routerOptions.core;
  const providers=inherited?.config?.data_dir === config.data_dir ? inherited.providers : new ProviderStore({dataDir:config.data_dir,secret:config.token_secret,env,records:[],persistent:config.storage_policy!=='memory'});
  const oauth=inherited?.oauth ?? new OAuthManager({fetch:routerOptions.fetch ?? globalThis.fetch,clock,env,...routerOptions.oauth});
  return {config,clock,providers,oauth};
}
async function remove(path) {try{await unlink(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw fail('credential_clear','Credential path cannot be removed');}}
async function hasFile(path) {try{return (await stat(path)).isFile();}catch(error){if(error.code==='ENOENT')return false;throw fail('credential_read','Credential location cannot be inspected');}}
function keychainService(env) {const dir=env.CLAUDE_CONFIG_DIR;return 'Claude Code-credentials'+(dir ? '-'+createHash('sha256').update(dir).digest('hex').slice(0,8):'');}
async function keychainPresent(service,settings) {
  if(settings.keychainHasEntry)return settings.keychainHasEntry(service);
  if((settings.platform ?? process.platform)!=='darwin')return false;
  try {await exec('/usr/bin/security',['find-generic-password','-s',service],{timeout:3000,maxBuffer:128*1024});return true;}catch{return false;}
}
function ghDirectory(env) {return env.GH_CONFIG_DIR || (env.HOME ? join(env.HOME,'.config','gh'):null);}
async function ghToken(config,env,directory,cwd) {
  const expected=new URL(config.github?.base_url ?? env.GITHUB_PROXY_BASE_URL ?? 'https://api.github.com').hostname.replace(/^api\.github\.com$/,'github.com');
  const text=await readNativeText(join(directory,'hosts.yml'),{cwd,maxBytes:1024*1024});let host;
  for(const line of text.split('\n')) {
    const match=/^([^:]+):(.*)$/.exec(line);if(!match)continue;
    if(!/^\s/.test(line))host=match[1].trim().replace(/^['"]|['"]$/g,'');
    else if(host?.toLowerCase()===expected.toLowerCase() && match[1].trim()==='oauth_token') {
      const token=match[2].trim().replace(/^['"]|['"]$/g,'');if(token)return token;
    }
  }
  return null;
}
async function configuredGithub(config,env) {
  const variable=config.github?.token ?? env.GITHUB_PROXY_TOKEN ?? (env.GITHUB_PROXY_TOKEN_ENV ? env[env.GITHUB_PROXY_TOKEN_ENV]:null);
  if(variable)return true;
  try {
    if(env.GITHUB_PROXY_TOKEN_FILE)return Boolean((await readNativeText(env.GITHUB_PROXY_TOKEN_FILE,{maxBytes:1024*1024})).trim());
    const dir=ghDirectory(env);return dir ? Boolean(await ghToken(config,env,dir)):false;
  }catch{return false;}
}
async function withdraw(core,name,options,{env={},oauth={}}={}) {
  let selected=[],github=false,api=[];
  if(name==='auth.clear') {
    if(options.all && options.provider)throw fail('options','provider and all cannot be combined',2);
    if(options.all){selected=subscriptions;github=true;api=(await core.providers.list()).filter(row=>row.has_encrypted_api_key || row.api_key_env);}
    else if(options.provider) {
      const requested=options.provider.toLowerCase();
      if(['gh','github'].includes(requested))github=true;
      else {try{selected=[subscriptionProvider(requested)];}catch{const row=await core.providers.get(options.provider);if(!row)throw fail('credential_clear','No credential with that provider name');api=[row];}}
    } else throw fail('options','Nothing to clear; name a provider or pass all',2);
  } else if(name==='auth.status'){selected=subscriptions;github=true;api=(await core.providers.list()).filter(row=>row.has_encrypted_api_key || row.api_key_env);}
  else if(name==='auth.gh')github=true;
  else selected=[name.slice(5)];
  if(selected.length+Number(github)+api.length>1 && !options.yes)throw fail('credential_confirmation','Multiple credential withdrawals require yes');
  const lines=[],errors=[];
  for(const provider of selected) {
    const home=subscriptionHome(provider,{config:core.config,env});const store=new CredentialFileStore({provider,home,dataDir:core.config.data_dir,clock:core.clock});
    try {
      const removed=await store.transaction(async()=>{const rows=[];for(const file of candidates[provider]){const path=join(home,file);if(await remove(path))rows.push(path);}return rows;});
      lines.push(...(removed.length ? removed.map(path=>`${provider.padEnd(8)} removed ${path}`):[`${provider.padEnd(8)} absent`]));
      if(provider==='claude') {const service=keychainService(env);if(await keychainPresent(service,oauth))lines.push(`claude   note: ${JSON.stringify(service)} still holds a vendor-owned Keychain entry; remove it with the vendor client`);}
    } catch(error) {errors.push(error);lines.push(`${provider.padEnd(8)} withdrawal failed (${error.code ?? 'credential_clear'})`);}
  }
  if(github) {
    try {const path=join(core.config.data_dir,'github-credential');lines.push(await remove(path) ? `github   removed ${path}`:'github   absent');if(await configuredGithub(core.config,env))lines.push('github   note: an environment or mounted gh credential remains configured');lines.push('github   note: restart to withdraw routes mounted at startup');}catch(error){errors.push(error);lines.push('github   withdrawal failed');}
  }
  for(const row of api) {
    try {const deleted=await core.providers.remove(row.name);lines.push(`${row.name.padEnd(8)} ${deleted ? 'removed the stored API key and provider entry':'absent'}`);if(row.api_key_env && env[row.api_key_env])lines.push(`${row.name.padEnd(8)} note: ${row.api_key_env} still holds a key in this environment`);}catch(error){errors.push(error);lines.push(`${row.name.padEnd(8)} withdrawal failed`);}
  }
  lines.push('note: this removes local credentials only; minted tokens remain valid upstream and should be revoked there');
  if(errors.length){const error=fail('credential_clear','One or more local credential withdrawals failed');error.data=output(lines);throw error;}
  return output(lines);
}
async function ghOperation(core,options,invocation,env) {
  const path=join(core.config.data_dir,'github-credential');
  if(options.status)return output([`github credential: ${await hasFile(path) ? `stored at ${path}`:await configuredGithub(core.config,env) ? 'configured from the environment':'absent'}`]);
  if(options.token_stdin && options.from_gh_config)throw fail('options','token-stdin and from-gh-config cannot be combined',2);
  let token;
  if(options.token_stdin){token=String(invocation.stdin ?? '').trim();if(!token)throw fail('credential_input','Token stdin must not be empty');}
  else {
    const dir=options.from_gh_config ?? ghDirectory(env);
    if(!dir)throw fail('credential_input','No gh configuration directory; pass from-gh-config');
    token=await ghToken(core.config,env,dir,invocation.cwd);
    if(!token)throw fail('credential_input','No GitHub credential found in the selected gh configuration');
  }
  if(/[\r\n\0]/.test(token))throw fail('credential_input','GitHub credential contains invalid control characters');
  await atomicWrite(path,token);return output([`stored the GitHub credential in ${path}`]);
}
export async function executeCredentialOperation({name,options,invocation={},routerOptions={},env={}}) {
  if(invocation.deadlineMs!==undefined || invocation.maxOutputBytes!==undefined)throw fail('unsupported','Credential operations do not yet implement per-invocation deadline/output accounting');
  const core=await context({routerOptions,options,invocation,env});
  if(credentialWithdrawal(name,options))return withdraw(core,name,options,{env,oauth:routerOptions.oauth});
  if(name==='auth.gh')return ghOperation(core,options,invocation,env);
  const report=await nativeCredentialStatus(core,{env,fetch:routerOptions.fetch,...routerOptions.core?.oauthOptions,...routerOptions.oauth});
  report.api_key_providers=report.api_key_providers.filter(row=>row.has_encrypted_api_key || row.api_key_env);
  if(report.credentials.some(row=>row.state==='refresh-failed')){const error=fail('credential_refresh','A subscription credential refresh failed');error.data=report;throw error;}
  return report;
}
