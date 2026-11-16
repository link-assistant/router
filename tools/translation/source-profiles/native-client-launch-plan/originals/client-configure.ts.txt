/** Shared configure and legacy with --global workflow; all selection remains explicit. */
import {clientIntegrations,clientIntegration,clientPaths,clientFailure,clientObject,optionalClientText,preferredClientPath,readClientEnvironment,writeClientEnvironment,writeClientMarker,removeClientFile} from './client-files.js';
import {nativeClientStatus} from './client-status.js';
import {selectedManagedTarget,withNativeManagedConfigureTarget} from './managed-server.js';
import {prepareRemoteClientCredential,reuseRemoteClientCredential,revokeRemoteClientCredential} from './client-remote.js';
import {globalClientDigest,readGlobalClientState} from './client-global-state.js';
import {applyGlobalClientConfiguration,undoGlobalClientConfiguration} from './client-global.js';
async function withSelectedConfigureTarget(options:any,core:any,env:any,invocation:any,fetch:any,operation:(target:any)=>Promise<any>):Promise<any>{
 if(options.managed&&(options.local||options.server||options.management_server))throw clientFailure('--managed conflicts with --local or explicit server origins');
 if(!options.managed){const explicit=await selectedManagedTarget({name:'configure',options,config:core.config,env,cwd:invocation.cwd});if(explicit)return operation(explicit);}
 const context={options,config:core.config,env,cwd:invocation.cwd},known=await withNativeManagedConfigureTarget(context,operation);if(known!==null)return known;
 if(!options.managed){const discovered=await discoverLocalRouter({env,invocation,fetch});if(discovered)return operation(discovered);if(invocation.signal?.aborted)throw clientFailure('Local Router discovery was cancelled');if(options.local)throw clientFailure('--local requires an already-running local Router');}
 return withNativeManagedConfigureTarget({...context,create:true},operation);
}
async function undoOne(paths:any,context:any,output:string[]):Promise<boolean>{
 let hadCredential=false;const result=await undoGlobalClientConfiguration(paths,{checkpoint:context.checkpoint,afterRestore:async(txn:any):Promise<void>=>{
  await txn.verify(txn.environment);await txn.verify(txn.metadata);const source=await optionalClientText(txn.metadata),record=source===null?null:clientObject(source,'Ownership metadata');hadCredential=await optionalClientText(txn.environment)!==null;
  if(record&&record.client!==paths.info.client&&record.client!==paths.info.legacy)throw clientFailure('Undo credential belongs to another client');
  if(record?.source==='minted'&&typeof record.token_id==='string'&&typeof record.router==='string'){
   try{await revokeRemoteClientCredential({...record,management_server:record.management_server??record.router},{config:context.core.config,env:context.env,invocation:context.invocation,fetch:context.fetch,suppliedToken:context.options.token});output.push('revoked token '+record.token_id+' on '+record.router);}catch{output.push('note: token '+record.token_id+' on '+record.router+' may remain live; revoke it on its issuing Router');}
  }
  await removeClientFile(txn.environment);await txn.advance([txn.environment]);await removeClientFile(txn.metadata);await txn.advance([txn.metadata]);await txn.checkpoint('metadata');
 }});await stopCodexNativeBridge(paths);if(result.restored)output.push('restored '+paths.config+' exactly');else if(hadCredential)output.push('removed the stored credential for '+paths.info.client);return result.restored||hadCredential;
}
async function configureOne(paths:any,target:any,context:any,output:string[],backendBaseURL:string|null=null):Promise<void>{
 const {options,core,env,invocation,fetch}=context,source=await optionalClientText(await preferredClientPath(paths.metadata,paths.legacyMetadata)),record=source===null?null:clientObject(source,'Ownership metadata'),environment=await preferredClientPath(paths.environment,paths.legacyEnvironment),token=readClientEnvironment(await optionalClientText(environment),paths.info.token),status=await nativeClientStatus(paths.info.client,{home:options.home,env,cwd:invocation.cwd}),saved=await readGlobalClientState(paths),remote={client:paths.info.client,origin:target.server,managementServer:target.managementServer,config:core.config,env,invocation,fetch};
 if(status.ownership_state==='managed-intact'&&(saved!==null||paths.info.client==='grok')&&token&&await codexNativeBackendMatches(paths,target.server,backendBaseURL)&&await reuseRemoteClientCredential(remote,record,token)){output.push(paths.info.client+' is already configured in '+paths.config);return;}
 if(saved!==null){
  if(!record||!token||record.client!==paths.info.client||record.router!==target.server||record.management_server!==target.managementServer||!['minted','supplied'].includes(record.source))throw clientFailure('Existing global credentials require exact undo before changing Router');const actual=await authenticateRemoteClientCredential(remote,token);if(record.token_id!==actual.binding.token_id||record.principal_id!==actual.binding.principal_id)throw clientFailure('Global credential metadata does not match its authenticated token');
  const repaired=await repairGlobalClientConfiguration(paths,target.server+paths.info.suffix,actual.catalog,{backendBaseURL,cwd:invocation.cwd,checkpoint:context.checkpoint,afterConfigure:async(txn:any):Promise<void>=>{await txn.verify(txn.environment);await writeClientEnvironment(paths,target.server,token);await txn.advance([txn.environment]);await txn.checkpoint('environment');await txn.verify(txn.metadata);record.config_sha256=globalClientDigest(await optionalClientText(paths.config));await writeClientMarker(txn.metadata,record);await txn.advance([txn.metadata]);await txn.checkpoint('metadata');if(!await reuseRemoteClientCredential(remote,record,token))throw clientFailure('Post-repair catalog authentication failed');}});output.push('repaired '+paths.info.client+' in '+paths.config);if(repaired.backup)output.push('backup: '+repaired.backup);return;
 }
 const supplied=options.token_stdin?String(invocation.stdin??'').trim():options.token??target.token,candidate=await prepareRemoteClientCredential({...remote,suppliedToken:supplied,ttlHours:options.ttl_hours??8760,nowUnix:core.clock()});
 try{await applyGlobalClientConfiguration(paths,target.server+paths.info.suffix,candidate.catalog,{backendBaseURL,cwd:invocation.cwd,checkpoint:context.checkpoint,afterConfigure:async(txn:any):Promise<void>=>{
  await txn.verify(txn.environment);await writeClientEnvironment(paths,target.server,candidate.token);await txn.advance([txn.environment]);await txn.checkpoint('environment');await txn.verify(txn.metadata);candidate.record.config_sha256=globalClientDigest(await optionalClientText(paths.config));await writeClientMarker(txn.metadata,candidate.record);await txn.advance([txn.metadata]);await txn.checkpoint('metadata');if(!await reuseRemoteClientCredential(remote,candidate.record,candidate.token))throw clientFailure('Post-configuration catalog authentication failed');
 }});}catch(error){try{await candidate.cleanup();}catch{throw clientFailure('Global configuration failed; its unused minted credential could not be revoked');}throw error;}
 output.push('configured '+paths.info.client+' in '+paths.config,'credentials: '+environment+' (mode 0600)','undo: router configure --undo '+paths.info.client);
}
async function executeNativeConfigureAtTarget({name='configure',options={},invocation={},core,env={},fetch=globalThis.fetch,checkpoint,target}:any={}):Promise<any>{
 if(name==='with'&&!options.global&&!options.undo)throw clientFailure('Temporary client launch requires the remaining process/isolation lifecycle');if(!options.all&&!options.client)throw clientFailure('Configure requires a client or --all');if(options.all&&options.client)throw clientFailure('--all conflicts with a single client');
 const output:string[]=[],failures:string[]=[],clients=options.all?clientIntegrations:[clientIntegration(options.client)],context={options:{...options,ttl_hours:name==='with'?8760:options.ttl_hours},invocation,core,env,fetch,checkpoint};let completed=0;
 for(const info of clients){
  if(info.unsupported){if(options.undo&&!options.all)throw clientFailure(info.unsupported);output.push('skipped '+info.client+': '+info.unsupported);continue;}
  const paths=clientPaths(info.client,{home:options.home,env,cwd:invocation.cwd});try{
   if(!options.undo&&options.all&&!(await nativeClientStatus(info.client,{home:options.home,env,cwd:invocation.cwd})).installed){output.push('skipped '+info.client+': not installed');continue;}
   if(options.undo){const changed=await undoOne(paths,context,output);if(!changed&&!options.all)throw clientFailure('No saved global configuration or credential exists for '+info.client);if(changed)completed++;}
   else{await inspectCodexCatalogConstraint(paths,{cwd:invocation.cwd});await withCodexNativeBridge(paths,target.server,backend=>configureOne(paths,target,context,output,backend));completed++;target.retainManagedServer?.();}
  }catch(error){if(!options.all)throw error;failures.push(info.client+': '+Object(error).message);}
 }
 if(options.all)output.push((options.undo?'restored ':'configured ')+completed+' client(s)');if(failures.length){const error:any=clientFailure('One or more client configurations failed');error.data={output:[...output,...failures.map(text=>'error: '+text)]};throw error;}return {output};
}

import {withCodexNativeBridge,stopCodexNativeBridge,codexNativeBackendMatches} from './codex-loopback.js';

import {authenticateRemoteClientCredential} from './client-remote.js';
import {repairGlobalClientConfiguration} from './client-global-repair.js';

import {inspectCodexCatalogConstraint} from './client-codex-catalog.js';

export async function executeNativeConfigure(context:any={}):Promise<any>{
 const {options={},core,env={},invocation={},fetch=globalThis.fetch}=context;
 if(context.name==='with'&&!options.global&&!options.undo)throw clientFailure('Temporary client launch requires the remaining process/isolation lifecycle');
 if(!options.all&&!options.client)throw clientFailure('Configure requires a client or --all');if(options.all&&options.client)throw clientFailure('--all conflicts with a single client');
 if(!options.all)clientIntegration(options.client);
 if(options.undo)return executeNativeConfigureAtTarget(context);
 return withSelectedConfigureTarget(options,core,env,invocation,fetch,target=>executeNativeConfigureAtTarget({...context,target}));
}

import {discoverLocalRouter} from './local-router-discovery.js';
