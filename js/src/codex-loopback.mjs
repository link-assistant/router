/** Separate native-JS Codex bridge owner state; never signals an unproved PID. */
import {request} from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {lstat} from 'node:fs/promises';
import {join,dirname,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {optionalClientText,removeClientFile,clientFailure} from './client-files.mjs';
import {atomicWrite,serialized} from './storage.mjs';
import {withAdvisoryFileLock} from './file-lock.mjs';
import {requireNativePath} from './operation-input.mjs';
import {normalizeManagedOrigin} from './managed-server.mjs';
import {startCodexLoopbackTransport,CODEX_BRIDGE_BACKEND,codexLoopbackRequired} from './codex-loopback-transport.mjs';
const SELF=fileURLToPath(import.meta.url),ENGINE='router-native-codex-loopback-v1',MARKER='LINK_ASSISTANT_ROUTER_NATIVE_CODEX_BRIDGE';
const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
export function codexNativeBridgeStatePath(paths){return join(dirname(paths.environment),'codex.native-loopback-bridge.json');}
async function readState(path){
 const source=await optionalClientText(path);if(source===null)return null;if(Buffer.byteLength(source)>65536)throw clientFailure('Codex bridge state exceeds its bound');if(process.platform!=='win32'&&((await lstat(path)).mode&0o077)!==0)throw clientFailure('Codex bridge state must be owner-private');let state;try{state=JSON.parse(source);}catch{throw clientFailure('Codex bridge state is malformed');}
 if(!state||state.engine!==ENGINE||state.version!==1||!Number.isSafeInteger(state.pid)||state.pid<=0||typeof state.nonce!=='string'||!/^[a-f0-9]{32}$/u.test(state.nonce)||normalizeManagedOrigin(state.upstream_origin)!==state.upstream_origin||typeof state.loopback_origin!=='string')throw clientFailure('Codex bridge state is not owned by this runtime');if(state.ca_cert_path!==undefined&&state.ca_cert_path!==null&&(typeof state.ca_cert_path!=='string'||!isAbsolute(state.ca_cert_path)||state.ca_cert_path.includes('\0')))throw clientFailure('Codex bridge CA path is invalid');const url=new URL(state.loopback_origin);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.origin!==state.loopback_origin)throw clientFailure('Codex bridge state requires a literal IPv4 loopback listener');return {source,state};
}
async function matching(path,saved){return await optionalClientText(path)===saved.source;}
async function removeMatching(path,saved){const current=await optionalClientText(path);if(current===null)return;if(current!==saved.source)throw clientFailure('Codex bridge state changed concurrently; it was preserved');await removeClientFile(path);}
function alive(pid){try{process.kill(pid,0);return true;}catch(error){return Object(error).code!=='ESRCH';}}
function probe(state,shutdown=false){
 return new Promise(resolve=>{let done=false;const settle=(value)=>{if(done)return;done=true;clearTimeout(timer);resolve(value);},url=state.loopback_origin+'/__link_assistant_router/codex_bridge/'+state.nonce+(shutdown?'/shutdown':''),timer=setTimeout(()=>{call.destroy();settle(false);},shutdown?1000:300),call=request(url,{method:shutdown?'POST':'GET',agent:false},response=>{const valid=response.statusCode===200&&response.headers['x-link-assistant-router-codex-bridge']===state.nonce;response.resume();response.once('end',()=>settle(valid));response.once('error',()=>settle(false));});call.once('error',()=>settle(false));call.end();});
}
async function stopOwned(path,saved){
 if(!await matching(path,saved))throw clientFailure('Codex bridge state changed concurrently');if(!await probe(saved.state)){if(alive(saved.state.pid))throw clientFailure('Codex bridge process is live but its ownership probe failed; state preserved');await removeMatching(path,saved);return;}if(!await probe(saved.state,true))throw clientFailure('Owned Codex bridge refused shutdown');const deadline=Date.now()+3000;while(await probe(saved.state)){if(Date.now()>=deadline)throw clientFailure('Owned Codex bridge did not stop within its deadline');await sleep(25);}const current=await optionalClientText(path);if(current!==null)await removeMatching(path,saved);
}
async function startOwned(path,origin,port,caCert=null){
 const nonce=randomUUID().replaceAll('-',''),env={[MARKER]:'1',ROUTER_CODEX_BRIDGE_STATE:path,ROUTER_CODEX_BRIDGE_UPSTREAM:origin,ROUTER_CODEX_BRIDGE_NONCE:nonce,ROUTER_CODEX_BRIDGE_PORT:String(port)};if(caCert!==null)env.ROUTER_CODEX_BRIDGE_CA=caCert;if(process.platform==='win32')for(const key of ['SystemRoot','WINDIR','TEMP','TMP'])if(process.env[key])env[key]=process.env[key];
 const child=spawn(process.execPath,[SELF],{env,stdio:'ignore',detached:process.platform!=='win32',windowsHide:true});let exited=false;child.once('exit',()=>{exited=true;});child.once('error',()=>{exited=true;});child.unref();const deadline=Date.now()+5000;
 try{while(Date.now()<deadline){let saved;try{saved=await readState(path);}catch{saved=null;}if(saved&&saved.state.pid===child.pid&&saved.state.nonce===nonce&&saved.state.upstream_origin===origin&&(saved.state.ca_cert_path??null)===caCert&&await probe(saved.state))return {...saved,child};if(exited)throw clientFailure('Codex bridge child failed before ownership verification');await sleep(25);}throw clientFailure('Codex bridge startup deadline exceeded');}catch(error){if(!exited)await terminateSpawned(child);const saved=await readState(path).catch(()=>null);if(saved&&saved.state.pid===child.pid&&saved.state.nonce===nonce)await removeMatching(path,saved);throw error;}
}
async function terminateSpawned(child){
 if(!child||child.exitCode!==null||child.signalCode!==null)return;child.kill('SIGTERM');let deadline=Date.now()+3000;while(child.exitCode===null&&child.signalCode===null&&Date.now()<deadline)await sleep(25);if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');deadline=Date.now()+1000;while(child.exitCode===null&&child.signalCode===null&&Date.now()<deadline)await sleep(25);if(child.exitCode===null&&child.signalCode===null)throw clientFailure('Owned newly spawned Codex child did not exit after termination');}
}
async function rollbackStarted(path,saved){
 try{await stopOwned(path,saved);}catch(error){await terminateSpawned(saved.child);throw error;}
}
export async function withCodexNativeBridge(paths,origin,operation,context={}){
 origin=normalizeManagedOrigin(origin);if(paths.info.client!=='codex')return operation(null);const selected=await selectedManagedTarget({name:'clients.setup',options:{server:origin},config:context.config??{},env:context.env??{},cwd:context.cwd??process.cwd()}),selectedCA=context.caCert??selected?.caCert??null,caCert=selectedCA===null?null:(await readClientRouterCA(selectedCA,context.cwd??process.cwd())).path;const path=codexNativeBridgeStatePath(paths),lock=path+'.lock';await requireNativePath(lock);
 return serialized(lock,()=>withAdvisoryFileLock(lock,async()=>{let saved=await readState(path),started=false;
  if(!codexLoopbackRequired(origin)){const result=await operation(null);if(saved)await stopOwned(path,saved);return result;}
  if(!saved||saved.state.upstream_origin!==origin||(saved.state.ca_cert_path??null)!==caCert||!await probe(saved.state)){const port=saved&&saved.state.upstream_origin===origin?Number(new URL(saved.state.loopback_origin).port):0;if(saved)await stopOwned(path,saved);try{saved=await startOwned(path,origin,port,caCert);}catch(error){if(!port)throw error;saved=await startOwned(path,origin,0,caCert);}started=true;}
  try{return await operation(saved.state.loopback_origin+CODEX_BRIDGE_BACKEND);}catch(error){if(started)await rollbackStarted(path,saved);throw error;}
 },{timeout:5000}));
}
export async function stopCodexNativeBridge(paths){if(paths.info.client!=='codex')return;const path=codexNativeBridgeStatePath(paths),lock=path+'.lock';await requireNativePath(lock);await serialized(lock,()=>withAdvisoryFileLock(lock,async()=>{const saved=await readState(path);if(saved)await stopOwned(path,saved);},{timeout:3000}));}
async function runDaemon(){
 const path=process.env.ROUTER_CODEX_BRIDGE_STATE,origin=process.env.ROUTER_CODEX_BRIDGE_UPSTREAM,nonce=process.env.ROUTER_CODEX_BRIDGE_NONCE,port=Number(process.env.ROUTER_CODEX_BRIDGE_PORT),caCert=process.env.ROUTER_CODEX_BRIDGE_CA??null;if(!path||!isAbsolute(path)||!origin||!nonce)throw clientFailure('Incomplete owned Codex bridge child environment');await requireNativePath(path);let saved=null;const finish=async()=>{if(saved&&await optionalClientText(path)===saved.source)await removeMatching(path,saved);};
 const server=await startCodexLoopbackTransport({upstreamOrigin:origin,nonce,port,onShutdown:finish,upstreamCaCert:caCert});const state={engine:ENGINE,version:1,pid:process.pid,upstream_origin:normalizeManagedOrigin(origin),loopback_origin:server.loopbackOrigin,nonce,ca_cert_path:caCert},source=JSON.stringify(state)+'\n';await atomicWrite(path,source);saved={source,state};const stop=()=>{void server.close().then(finish).catch(()=>{});};process.once('SIGTERM',stop);process.once('SIGINT',stop);
}
if(process.argv[1]&&resolve(process.argv[1])===SELF){if(process.env[MARKER]!=='1')throw clientFailure('Codex bridge entry requires its owned child environment');await runDaemon();}

import {parseClientTomlSource} from './client-toml-cst.mjs';
export async function codexNativeBackendMatches(paths,origin,backend){if(paths.info.client!=='codex')return true;const source=await optionalClientText(paths.config);if(source===null)return false;try{return parseClientTomlSource(source).chatgpt_base_url===(backend??normalizeManagedOrigin(origin)+CODEX_BRIDGE_BACKEND);}catch{return false;}}

import {selectedManagedTarget} from './managed-server.mjs';
import {readClientRouterCA} from './client-ca.mjs';
