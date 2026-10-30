/** Exact native global configuration inverses under the existing private transaction. */
import {open,lstat,mkdir,chmod} from 'node:fs/promises';
import {dirname} from 'node:path';
import {clientFailure,optionalClientText,removeClientFile} from './client-files.mjs';
import {atomicWrite,encodeLino} from './storage.mjs';
import {requireNativePath} from './operation-input.mjs';
import {clientFileTransaction} from './client-transaction.mjs';
import {setupClientJSON} from './client-json.mjs';
import {setupPersistentClient} from './client-persistent.mjs';
import {globalClientPaths,readGlobalClientState,globalClientDigest} from './client-global-state.mjs';
async function exclusive(path,source){
 await requireNativePath(path);await mkdir(dirname(path),{recursive:true,mode:0o700});const file=await open(path,'wx',0o600);try{await file.writeFile(source,'utf8');await file.sync();}finally{await file.close();}
}
async function mode(path,source){return source===null?null:(await lstat(path)).mode&0o7777;}
export async function applyGlobalClientConfiguration(paths,endpoint,catalog,options={}){
 const constraint=await inspectCodexCatalogConstraint(paths,{cwd:options.cwd}),files=globalClientPaths(paths);let setupBackup=null,originalConfig=null;
 try{return await clientFileTransaction(paths,async(txn)=>{
  if(await readGlobalClientState(paths)!==null)throw clientFailure('A global backup already exists; undo it before a new takeover');
  if(paths.info.client==='grok'){await options.afterConfigure?.(txn);return {path:paths.config,backup:null,changed:false};}
  const config=await optionalClientText(paths.config),marker=await optionalClientText(paths.marker),configMode=await mode(paths.config,config),markerMode=paths.marker?await mode(paths.marker,marker):null;originalConfig=config;
  for(const path of [files.config,files.marker,files.state]){await txn.verify(path);if(await optionalClientText(path)!==null)throw clientFailure('An existing global backup must be reconciled before takeover');}
  if(config!==null){await exclusive(files.config,config);await txn.advance([files.config]);}if(marker!==null){await exclusive(files.marker,marker);await txn.advance([files.marker]);}
  if(constraint){await removeCodexCatalogConstraint(paths,txn,{cwd:options.cwd,expected:constraint});originalConfig=await optionalClientText(paths.config);}
  await txn.verify(paths.config);if(paths.marker)await txn.verify(paths.marker);const codec=['claude','codex'].includes(paths.info.client)?setupPersistentClient:setupClientJSON;
  const result=await codec(paths,endpoint,catalog,{backendBaseURL:options.backendBaseURL,model:options.model,onWrite:async(path,write)=>{if(write?.backup)setupBackup=write.backup;await txn.advance([path]);}});
  const markerAfter=await optionalClientText(paths.marker),state={config_existed:config!==null,config_mode:configMode,config_hash_after_setup:globalClientDigest(await optionalClientText(paths.config)),marker_existed:marker!==null,marker_mode:markerMode,marker_hash_after_setup:markerAfter===null?null:globalClientDigest(markerAfter),marker_path:paths.marker,setup_backup:setupBackup};
  await exclusive(files.state,encodeLino(state)+'\n');await txn.advance([files.state]);await txn.checkpoint('config');await options.afterConfigure?.(txn);return result;
 },{checkpoint:options.checkpoint});}catch(error){if(setupBackup){const source=await optionalClientText(setupBackup);if(source!==null&&source===originalConfig)await removeClientFile(setupBackup);}throw error;}
}
export async function undoGlobalClientConfiguration(paths,options={}){
 return clientFileTransaction(paths,async(txn)=>{
  const saved=await readGlobalClientState(paths);if(saved===null){await options.afterRestore?.(txn);return {restored:false,path:null};}const {state,files}=saved;
  for(const path of [paths.config,...(paths.marker?[paths.marker]:[]),files.config,files.marker,files.state,...(state.setup_backup?[state.setup_backup]:[])])await txn.verify(path);
  const current=await optionalClientText(paths.config),marker=await optionalClientText(paths.marker);if(globalClientDigest(current)!==state.config_hash_after_setup)throw clientFailure('Client config changed after configuration; its edits were preserved');
  if(paths.marker&&(state.marker_hash_after_setup===null?marker!==null:globalClientDigest(marker)!==state.marker_hash_after_setup))throw clientFailure('Client marker changed after configuration; its edits were preserved');
  const beforeConfig=state.config_existed?await optionalClientText(files.config):null,beforeMarker=state.marker_existed?await optionalClientText(files.marker):null;if(state.config_existed&&beforeConfig===null||state.marker_existed&&beforeMarker===null)throw clientFailure('Global undo backup is missing');
  const restore=async(path,source,permissions)=>{await txn.verify(path);if(source===null)await removeClientFile(path);else{await atomicWrite(path,source);if(permissions!==null)await chmod(path,permissions&0o7777);}await txn.advance([path]);};
  if(paths.marker)await restore(paths.marker,beforeMarker,state.marker_mode);await restore(paths.config,beforeConfig,state.config_mode);await txn.checkpoint('restore');await options.afterRestore?.(txn);
  for(const path of [...(state.setup_backup?[state.setup_backup]:[]),files.config,files.marker,files.state]){await txn.verify(path);await removeClientFile(path);await txn.advance([path]);}return {restored:true,path:paths.config};
 },{checkpoint:options.checkpoint});
}

import {inspectCodexCatalogConstraint,removeCodexCatalogConstraint} from './client-codex-catalog.mjs';
