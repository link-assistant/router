// Operational source protection only. No compiler or serialization authority.
import {AsyncLocalStorage} from 'node:async_hooks';
import {realpathSync,existsSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {resolve,relative,dirname,sep,isAbsolute} from 'node:path';
import {captureExplicitSourceMutationPolicy} from './unit-runtime-materialization.mjs';

const operations=new AsyncLocalStorage();
const fail=message=>{throw new TypeError('Serialization source writer: '+message);};
function reportClosingFailure(){
 try{process.stderr.write('{"schema":"serialization-source-writer-closing-20261102","closingFailed":true}\n');}catch{}
}
function acquire(requestedRoot){
 const root=realpathSync(resolve(requestedRoot));
 for(let parent=operations.getStore();parent;parent=parent.parent){
  if(parent.root===root){parent.verify();return {frame:parent,owner:false};}
 }
 const policy=captureExplicitSourceMutationPolicy(root);
 const frame={root,parent:operations.getStore(),closed:false,failed:false,primary:undefined,
  poison(error){if(!this.failed){this.failed=true;this.primary=error;}},
  verify(){if(this.failed)throw this.primary;try{if(this.closed)fail('expired operation');policy.verify();}catch(error){this.poison(error);throw error;}},
  allow(paths){try{this.verify();policy.allowMutationPaths(paths);}catch(error){this.poison(error);throw error;}},
  close(){try{policy.close();}finally{this.closed=true;}}};
 return {frame,owner:true};
}
function writer(frame){
 const label=path=>{
  frame.verify();if(typeof path!=='string')fail('primitive absolute filesystem path required');
  const full=resolve(path),name=relative(frame.root,full);
  if(!name||isAbsolute(name)||name==='..'||name.startsWith('..'+sep))fail('destination outside captured root');
  return name.split(sep).join('/');
 };
 const admission=paths=>{
  try{frame.allow(paths.map(label));}catch(error){frame.poison(error);throw error;}
 };
 return Object.freeze({root:frame.root,
  verify(){try{frame.verify();}catch(error){frame.poison(error);throw error;}},
  preflight(paths){admission(paths);},
  mutate(paths,operation){admission(paths);let result;try{result=operation();frame.verify();}catch(error){frame.poison(error);throw error;}return result;},
  writeArtifact(target,text,suffix){
   // Preserve the two original producers' wx stage, rename, names and umask.
   // No old-output read or aggregate cap narrows their original write domain.
   const missing=[];for(let at=dirname(target);!existsSync(at);at=dirname(at))missing.push(at);
   admission(missing);admission([target]);
   if(missing.length)this.mutate(missing,()=>mkdirSync(dirname(target),{recursive:true}));
   const temporary=target+suffix+process.pid;
   this.mutate([temporary],()=>writeFileSync(temporary,text,{flag:'wx'}));
   this.mutate([temporary,target],()=>renameSync(temporary,target));
  }});
}
function finish(frame,owner,failed,primary,result){
 if(owner){try{frame.close();}catch(error){if(!failed&&!frame.failed){failed=true;primary=error;}else reportClosingFailure();}}
 if(frame.failed)throw frame.primary;if(failed)throw primary;return result;
}
export function withSerializationWriterSync(root,write,operation){
 if(!write)return operation(null,resolve(root));
 const {frame,owner}=acquire(root);let result,failed=false,primary;
 try{result=operations.run(frame,()=>operation(writer(frame),frame.root));frame.verify();}
 catch(error){failed=true;primary=error;frame.poison(error);}
 return finish(frame,owner,failed,primary,result);
}
export async function withSerializationWriterAsync(root,write,operation){
 if(!write)return await operation(null,resolve(root));
 const {frame,owner}=acquire(root);let result,failed=false,primary;
 try{result=await operations.run(frame,()=>operation(writer(frame),frame.root));frame.verify();}
 catch(error){failed=true;primary=error;frame.poison(error);}
 return finish(frame,owner,failed,primary,result);
}
