/** Fixed-allow-list client transactions with durable private snapshots and edit fences. */
import {lstat,mkdir,chmod,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {optionalClientText,clientFailure,removeClientFile} from './client-files.mjs';
import {requireNativePath} from './operation-input.mjs';
import {atomicWrite,serialized} from './storage.mjs';
import {withAdvisoryFileLock} from './file-lock.mjs';
const hash=value=>value===null ? null : createHash('sha256').update(value).digest('hex');
async function state(path) {const source=await optionalClientText(path);return {source,hash:hash(source),mode:source!==null ? (await lstat(path)).mode & 0o7777 : null};}
export async function clientFileTransaction(paths,operation,{checkpoint=()=>{}}={}) {
  const lock=join(paths.configHome,'link-assistant-router/clients',`${paths.info.client}.repair.lock`);
  await requireNativePath(lock);
  return serialized(lock,()=>withAdvisoryFileLock(lock,async()=>{
    const id=randomUUID().replaceAll('-',''),root=join(paths.configHome,'link-assistant-router/repairs',id);
    await requireNativePath(root);await mkdir(root,{recursive:true,mode:0o700});await chmod(root,0o700);
    const allowed=[paths.config,await (await import('./client-files.mjs')).preferredClientPath(paths.environment,paths.legacyEnvironment),await (await import('./client-files.mjs')).preferredClientPath(paths.metadata,paths.legacyMetadata),...(paths.marker ? [paths.marker] : []),...await globalClientTransactionFiles(paths)].sort();
    const entries=[];
    try {
      for(const [index,path] of [...new Set(allowed)].entries()) {
        const before=await state(path),backup=before.source!==null ? `${index}.backup` : null;
        if(backup) await atomicWrite(join(root,backup),before.source);
        entries.push({path,existed:before.source!==null,mode:before.mode,before_sha256:before.hash,after_sha256:before.hash,backup});
      }
      const manifest={version:1,id,client:paths.info.client,entries};
      const persist=()=>atomicWrite(join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
      await persist();
      const verify=async path=>{const entry=entries.find(entry=>entry.path===path);if(!entry) throw clientFailure('Client path is outside its transaction allow-list');if((await state(path)).hash!==entry.after_sha256) throw clientFailure('Client configuration changed concurrently; retry');};
      const advance=async changed=>{for(const path of changed) {const entry=entries.find(entry=>entry.path===path);if(!entry) throw clientFailure('Client path is outside its transaction allow-list');entry.after_sha256=(await state(path)).hash;}await persist();};
      for(const path of allowed) await verify(path);
      try {
        const result=await operation({verify,advance,checkpoint,snapshot:id,environment:allowed.find(path=>path===paths.environment || path===paths.legacyEnvironment),metadata:allowed.find(path=>path===paths.metadata || path===paths.legacyMetadata)});
        await advance(allowed);await rm(root,{recursive:true});return result;
      } catch(error) {
        let blocked=false;
        for(const entry of entries) {
          if((await state(entry.path)).hash!==entry.after_sha256) {blocked=true;continue;}
          if(entry.backup) {const source=await optionalClientText(join(root,entry.backup));if(hash(source)!==entry.before_sha256) throw clientFailure('Client transaction snapshot is damaged');await atomicWrite(entry.path,source);if(entry.mode!==null) await chmod(entry.path,entry.mode);}
          else await removeClientFile(entry.path);
        }
        if(blocked) throw clientFailure('Client transaction failed; concurrent edits were preserved and its private snapshot retained');
        await rm(root,{recursive:true});throw error;
      }
    } catch(error) {throw error;}
  }));
}

import {globalClientTransactionFiles} from './client-global-state.mjs';
