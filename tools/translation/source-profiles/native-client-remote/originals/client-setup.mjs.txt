/** Managed client token provisioning and atomic configuration for JSON clients. */
import {createHash} from 'node:crypto';
import {clientPaths,clientFailure,clientObject,optionalClientText,preferredClientPath,readClientEnvironment,writeClientEnvironment,writeClientMarker,removeClientFile} from './client-files.mjs';
import {fetchNativeClientCatalog,clientRouterOrigin} from './client-catalog.mjs';
import {setupClientJSON,removeClientJSON} from './client-json.mjs';
import {nativeClientStatus} from './client-status.mjs';
import {clientFileTransaction} from './client-transaction.mjs';
import {selectedManagedTarget} from './managed-server.mjs';
const implementedClients=new Set(['opencode','agent','qwen','grok','claude','codex']);
const completeBinding=(claims,client)=>{
  if(claims.client_kind!==client || typeof claims.principal_id!=='string' || !claims.principal_id.trim() || typeof claims.sub!=='string' || !claims.sub) throw clientFailure('Supplied token requires the exact canonical managed-client binding and subscriber principal');
  return {token_id:claims.sub,principal_id:claims.principal_id};
};
function decodedBinding(token,client) {
  if(Buffer.byteLength(token)>65536 || !token.startsWith('la_sk_')) throw clientFailure('Supplied Router token requires la_sk_ prefix');
  const parts=token.slice(6).split('.');if(parts.length!==3 || parts.some(part=>!part || !/^[A-Za-z0-9_-]+$/.test(part))) throw clientFailure('Invalid supplied Router token encoding');
  let claims;try{claims=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(Buffer.from(parts[1],'base64url')));}catch{throw clientFailure('Invalid supplied Router token payload');}
  return completeBinding(claims,client);
}
function canonicalOrigin(value) {const origin=clientRouterOrigin(value),url=new URL(origin);if(url.pathname!=='/') throw clientFailure('Client setup requires a Router origin without a path');return origin;}
function localOrigin(config) {let host=config.host ?? '127.0.0.1';if(host==='0.0.0.0') host='127.0.0.1';if(host==='::') host='::1';if(host.includes(':') && !host.startsWith('[')) host=`[${host}]`;return canonicalOrigin(`http://${host}:${config.port ?? 8080}`);}
const metadataPath=paths=>preferredClientPath(paths.metadata,paths.legacyMetadata);
export async function setupNativeClient({options,invocation={},core,env={},fetch,checkpoint}={}) {
  const paths=clientPaths(options.client,{home:options.home,env,cwd:invocation.cwd}),{info}=paths;
  if(info.unsupported) throw clientFailure(info.unsupported);
  if(!implementedClients.has(info.client)) throw clientFailure('This client does not support persistent Router configuration');
  if(await optionalClientText(paths.config+'.with-router-state.json')!==null) throw clientFailure('Reversible global client state requires the full undo-state contract; existing setup preserved');
  if(options.management_server) throw clientFailure('Native remote client issuance and proof-of-possession are not implemented');
  if(!options.base_url && await selectedManagedTarget({name:'clients.setup',config:core.config,env,cwd:invocation.cwd})) throw clientFailure('clients setup mints locally; a selected remote Router requires configure or an explicit base URL');
  const origin=options.base_url ? canonicalOrigin(options.base_url) : localOrigin(core.config),context={home:options.home,env,cwd:invocation.cwd};
  const status=await nativeClientStatus(info.client,context),oldEnvironment=await preferredClientPath(paths.environment,paths.legacyEnvironment),oldMetadata=await optionalClientText(await metadataPath(paths));
  const oldToken=readClientEnvironment(await optionalClientText(oldEnvironment),info.token),oldRecord=oldMetadata===null ? null : clientObject(oldMetadata,'Ownership metadata');
  if(status.ownership_state==='managed-intact' && oldRecord?.router===origin && oldToken) {
    try {completeBinding(await core.tokens.validate(oldToken),info.client);return {output:[`${info.client} is already configured in ${paths.config}`,`credentials: ${oldEnvironment} (mode 0600)`]};}catch{/* Replacement must verify a new complete credential below. */}
  }
  let token=options.token_stdin ? String(invocation.stdin ?? '').trim() : String(options.token ?? env.LINK_ASSISTANT_ROUTER_TOKEN ?? env.LINK_ASSISTANT_TOKEN ?? '').trim();
  let record,minted=null,catalog,foreign=false,setupBackup=null;
  try {
    if(token) {
      const decoded=decodedBinding(token,info.client);let local;
      try {local=await core.tokens.validate(token);}catch{/* Issuing Router catalog must authenticate foreign credentials. */}
      foreign=!local;const binding=local ? completeBinding(local,info.client) : decoded;
      record={client:info.client,source:'supplied',...binding,label:null,issued_at:null,router:origin,principal_id:binding.principal_id,config_sha256:null};
    } else {
      const issued=await core.tokens.issue({ttl_hours:options.ttl_hours===undefined ? 24 : Number(options.ttl_hours),label:`client-${info.client}`,account:'primary',client_kind:info.client,principal_id:'primary'});
      token=issued.token;minted=issued.id;record={client:info.client,source:'minted',token_id:issued.id,label:`client-${info.client}`,issued_at:core.clock(),router:origin,principal_id:'primary',config_sha256:null};
    }
    if(info.client!=='grok' || foreign) {
      const all=await fetchNativeClientCatalog(info.client,origin,token,{fetch,signal:invocation.signal});
      const preferred=info.owners.flatMap(owner=>all.filter(row=>row.owned_by===owner));catalog=info.owners.length && (preferred.length || info.strict) ? preferred : all;
    } else catalog=[];
    let backup;
    const result=await clientFileTransaction(paths,async txn=>{
      await txn.verify(paths.config);if(paths.marker) await txn.verify(paths.marker);
      const configured=info.client==='grok' ? {path:paths.config,backup:null,changed:false} : await (['claude','codex'].includes(info.client)?setupPersistentClient:setupClientJSON)(paths,origin+info.suffix,catalog,{onWrite:async(path,result)=>{if(result?.backup) setupBackup=result.backup;await txn.advance([path]);}});backup=configured.backup;
      await txn.checkpoint('config');await txn.verify(txn.environment);await writeClientEnvironment(paths,origin,token);await txn.advance([txn.environment]);
      await txn.checkpoint('environment');await txn.verify(txn.metadata);
      record.config_sha256=createHash('sha256').update(await optionalClientText(paths.config) ?? '').digest('hex');await writeClientMarker(txn.metadata,record);await txn.advance([txn.metadata]);await txn.checkpoint('metadata');return configured;
    },{checkpoint});
    return {output:[info.client==='grok' ? 'configured grok through its environment; its own config file was not changed' : `${result.changed ? 'configured' : 'already configured'} ${info.client} in ${paths.config}`,...(backup ? [`backup: ${backup}`] : []),`credentials: ${await preferredClientPath(paths.environment,paths.legacyEnvironment)} (mode 0600)`,'The token is not stored in the client config or printed to the terminal.']};
  } catch(error) {if(minted) await core.tokens.revoke(minted);if(setupBackup) await removeClientFile(setupBackup);throw error;}
}
export async function removeNativeClient({options,invocation={},core,env={},checkpoint}={}) {
  const paths=clientPaths(options.client,{home:options.home,env,cwd:invocation.cwd}),{info}=paths;
  if(!implementedClients.has(info.client)) throw clientFailure('This client does not support persistent Router removal');
  if(await optionalClientText(paths.config+'.with-router-state.json')!==null) throw clientFailure('Reversible global client state requires the full undo-state contract; existing setup preserved');
  const path=await metadataPath(paths),source=await optionalClientText(path),record=source===null ? null : clientObject(source,'Ownership metadata');
  if(record && (![info.client,info.legacy].includes(record.client) || !['minted','supplied'].includes(record.source))) throw clientFailure('Invalid managed credential metadata');
  if(record && (record.source==='minted' || options.revoke_supplied)) {
    if(record.management_server) throw clientFailure('Remote managed credential revocation is not implemented; configuration preserved');
    if(typeof record.token_id!=='string' || !record.token_id) {if(!options.force) throw clientFailure('Credential token ID is missing; configuration preserved');}
    else {
      const held=(await core.tokens.list()).find(token=>token.id===record.token_id);
      if(!held && !options.force) throw clientFailure('Managed token does not belong to this local store; configuration preserved');
      if(held) await core.tokens.revoke(record.token_id);
    }
  }
  const result=await clientFileTransaction(paths,async txn=>{
    const removed=info.client==='grok' ? {path:paths.config,backup:null,changed:false} : await (['claude','codex'].includes(info.client)?removePersistentClient:removeClientJSON)(paths,{onWrite:path=>txn.advance([path])});
    await txn.checkpoint('config');await txn.verify(txn.environment);await removeClientFile(txn.environment);await txn.advance([txn.environment]);
    await txn.verify(txn.metadata);await removeClientFile(txn.metadata);await txn.advance([txn.metadata]);await txn.checkpoint('metadata');return removed;
  },{checkpoint});
  return {output:[`Removed Router configuration for ${info.client}`,...(result.backup ? [`backup: ${result.backup}`] : [])]};
}

import {setupPersistentClient,removePersistentClient} from './client-persistent.mjs';
