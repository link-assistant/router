/** Advance only intact global config guards while preserving the first exact backup. */
import {clientFailure,optionalClientText,removeClientFile} from './client-files.js';
import {atomicWrite,encodeLino} from './storage.js';
import {clientFileTransaction} from './client-transaction.js';
import {setupClientJSON} from './client-json.js';
import {setupPersistentClient} from './client-persistent.js';
import {globalClientDigest,readGlobalClientState} from './client-global-state.js';
export async function repairGlobalClientConfiguration(paths:any,endpoint:string,catalog:any[],options:any={}):Promise<any>{
 const constraint=await inspectCodexCatalogConstraint(paths,{cwd:options.cwd});let setupBackup:string|null=null,beforeConfig:string|null=null;
 try{return await clientFileTransaction(paths,async(txn:any):Promise<any>=>{
  const saved=await readGlobalClientState(paths);if(saved===null)throw clientFailure('Global repair requires its original undo state');for(const path of [paths.config,...(paths.marker?[paths.marker]:[]),saved.files.config,saved.files.marker,saved.files.state])await txn.verify(path);
  beforeConfig=await optionalClientText(paths.config);const beforeMarker=await optionalClientText(paths.marker);if(globalClientDigest(beforeConfig)!==saved.state.config_hash_after_setup||paths.marker&&(saved.state.marker_hash_after_setup===null?beforeMarker!==null:globalClientDigest(beforeMarker)!==saved.state.marker_hash_after_setup))throw clientFailure('Global config or marker was edited; exact undo guards were preserved');
  if(constraint)await removeCodexCatalogConstraint(paths,txn,{cwd:options.cwd,expected:constraint});beforeConfig=await optionalClientText(paths.config);
  const codec=['claude','codex'].includes(paths.info.client)?setupPersistentClient:setupClientJSON,result=await codec(paths,endpoint,catalog,{backendBaseURL:options.backendBaseURL,model:options.model,onWrite:async(path:string,write:any):Promise<void>=>{if(write?.backup)setupBackup=write.backup;await txn.advance([path]);}}),marker=await optionalClientText(paths.marker),state={...saved.state,config_hash_after_setup:globalClientDigest(await optionalClientText(paths.config)),marker_hash_after_setup:marker===null?null:globalClientDigest(marker)};
  await txn.verify(saved.files.state);await atomicWrite(saved.files.state,encodeLino(state)+'\n');await txn.advance([saved.files.state]);await txn.checkpoint('config');await options.afterConfigure?.(txn);return result;
 },{checkpoint:options.checkpoint});}catch(error){if(setupBackup&&await optionalClientText(setupBackup)===beforeConfig)await removeClientFile(setupBackup);throw error;}
}

import {inspectCodexCatalogConstraint,removeCodexCatalogConstraint} from './client-codex-catalog.js';
