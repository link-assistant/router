// Fixed-producer guarded move adapter. No injected checker/producer or force flag.
import fs from 'node:fs';
import {withProtectedNativeWriter,verifyProtectedNativeWriter,allowProtectedNativeWriter,protectedNativeWriterRetainedBytes,mutateProtectedNativeWriter} from './protected-native-writers-20261102.mjs';
import {resolve,dirname,join,basename,relative} from 'node:path';
import {randomUUID} from 'node:crypto';
import {planNativeLeafModuleMove} from './native-module-move-20261101.mjs';
import {readCurrentSourceProposalFile} from './unit-runtime-materialization.mjs';
import {relativeReconcilePath as path,requireReconcile as need,reconcileHead,RECONCILE_LIMITS,boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
const identity=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeMs,stat.ctimeMs];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function ordinaryParent(root,name){
 let full=root;const initial=fs.lstatSync(full);need(initial.isDirectory()&&!initial.isSymbolicLink(),'ordinary current transaction root required');
 for(const part of path(name).split('/').slice(0,-1)){full=resolve(full,part);const stat=fs.lstatSync(full);need(stat.isDirectory()&&!stat.isSymbolicLink(),'ordinary current transaction ancestors required');}
 return resolve(root,name);
}
function stamp(root,name){const full=ordinaryParent(root,name);let stat;try{stat=fs.lstatSync(full);}catch(error){if(error.code==='ENOENT')return null;throw error;}need(stat.isFile()&&!stat.isSymbolicLink(),'ordinary transaction source required');return identity(stat);}
function backupMatches(row){try{const stat=fs.lstatSync(row.backup);return stat.isFile()&&!stat.isSymbolicLink()&&stat.dev===row.dev&&stat.ino===row.ino&&(stat.mode&0o777)===row.mode&&readCurrentSourceProposalFile(dirname(row.backup),basename(row.backup))===row.before;}catch{return false;}}
function message(error){if(error&&typeof error==='object'){const field=Object.getOwnPropertyDescriptor(error,'message');if(field&&Object.hasOwn(field,'value')&&typeof field.value==='string')return field.value.slice(0,4096);}return 'unreported transaction failure';}
function details(error,rollback,recovery){if(error&&typeof error==='object')try{Object.defineProperties(error,{rollbackFailures:{value:rollback,enumerable:true},recoveryPaths:{value:recovery,enumerable:true}});}catch{/* Preserve the primary thrown value unchanged. */}}
function installNativeLeafModuleMoveProtectedBody(serialized,options){
 need(typeof serialized==='string'&&Buffer.byteLength(serialized)<=RECONCILE_LIMITS.wire,'bounded complete serialized native move required');
 const received=JSON.parse(serialized),fresh=planNativeLeafModuleMove(options);need(JSON.stringify(received)===JSON.stringify(fresh),'proposal differs from complete fresh native leaf checking');
 const policyRows=[...fresh.outputs,...fresh.moves.flatMap(move=>[{path:move.from,before:move.source,after:null,mode:move.mode},{path:move.to,before:null,after:move.source,mode:move.mode}])];allowProtectedNativeWriter(fresh.root,policyRows);
 need(protectedNativeWriterRetainedBytes(fresh.root)+Buffer.byteLength(serialized)+boundedReconcileWireBytes(received)+boundedReconcileWireBytes(fresh)<=RECONCILE_LIMITS.raw,'policy and complete native move retention exceed original raw bound');
 const root=fresh.root,originals=new Map(),expected=new Map(),expectedIdentity=new Map(),written=[],backups=[],temporary=new Map(),parents=new Map();let directory=null,directoryIdentity=null,moveBackup=null,destinationIdentity=null;
 const request=JSON.parse(fresh.manifestSource),nativeParent=dirname(resolve(root,request.from));
 for(const row of fresh.inputs){need(!originals.has(row.path),'unique complete source inputs required');originals.set(row.path,row.source);expected.set(row.path,row.source);expectedIdentity.set(row.path,stamp(root,row.path));}
 for(const name of expected.keys()){const pieces=path(name).split('/').slice(0,-1);let full=root;for(let at=0;at<=pieces.length;at++){if(at)full=resolve(full,pieces[at-1]);const stat=fs.lstatSync(full);need(stat.isDirectory()&&!stat.isSymbolicLink(),'ordinary captured transaction ancestor required');parents.set(full,[stat.dev,stat.ino,stat.mode]);}}
 const guard=()=>{
  verifyProtectedNativeWriter(root);
  need(reconcileHead(root)===fresh.baseRevision,'current Git revision changed during native move');for(const [name,text]of expected)need(readCurrentSourceProposalFile(root,name)===text&&same(stamp(root,name),expectedIdentity.get(name)),'complete input identity/bytes changed during native move: '+name);
  for(const [name,before]of parents){const stat=fs.lstatSync(name);need(stat.isDirectory()&&!stat.isSymbolicLink()&&same([stat.dev,stat.ino,stat.mode],before),'captured transaction ancestor replaced');}
  const wanted=[...expected].filter(([name,text])=>text!==null&&dirname(resolve(root,name))===nativeParent&&name.endsWith('.rs')).map(([name])=>basename(name));if(directory)wanted.push(basename(directory));
  const handle=fs.opendirSync(nativeParent),names=[];try{for(;;){const entry=handle.readSync();if(entry===null)break;need(names.length<RECONCILE_LIMITS.count,'bounded transaction source census required');names.push(entry.name);}}finally{handle.closeSync();}need(same(names.sort(),wanted.sort()),'complete native source census changed during installation');
 };
 const remember=(name,text,ownedInode=null)=>{need(readCurrentSourceProposalFile(root,name)===text,'complete installed source readback differs');const actual=stamp(root,name);if(ownedInode)need(actual&&actual[0]===ownedInode[0]&&actual[1]===ownedInode[1],'owned installed inode differs');expected.set(name,text);expectedIdentity.set(name,actual);};
 const ownedDirectory=()=>{const stat=fs.lstatSync(directory);need(stat.isDirectory()&&!stat.isSymbolicLink()&&stat.dev===directoryIdentity.dev&&stat.ino===directoryIdentity.ino&&stat.mode===directoryIdentity.mode,'owned transaction directory changed');};
 const stage=(text,mode)=>{ownedDirectory();const name=join(directory,'stage-'+randomUUID());mutateProtectedNativeWriter(root,[{path:relative(root,name),before:null,after:text,mode}],()=>fs.writeFileSync(name,text,{flag:'wx',mode}));temporary.set(name,{identity:identity(fs.lstatSync(name)),source:text});mutateProtectedNativeWriter(root,[{path:relative(root,name),before:text,after:text,mode}],()=>fs.chmodSync(name,mode));const stat=fs.lstatSync(name);need(stat.isFile()&&!stat.isSymbolicLink()&&readCurrentSourceProposalFile(directory,basename(name))===text,'complete staged output readback differs');temporary.set(name,{identity:identity(stat),source:text});return {name,identity:identity(stat)};};
 guard();if(fresh.noOp){need(fresh.moves.length===0&&fresh.outputs.length===0,'checked no-op must have no mutations');return {schema:fresh.schema,baseRevision:fresh.baseRevision,changed:[],noOp:true,sourceAuthority:false,semanticAuthority:false,runtimeParity:false};}
 need(fresh.moves.length===1,'one genuine checked leaf move required');const move=fresh.moves[0],fromFull=ordinaryParent(root,move.from),toFull=ordinaryParent(root,move.to),changed=fresh.outputs.filter(row=>row.before!==row.after);
 need(dirname(fromFull)===dirname(toFull)&&expected.get(move.from)===move.source&&expected.get(move.to)===null,'complete same-directory move originals differ');
 directory=join(dirname(fromFull),'.router-leaf-move-'+randomUUID());try{mutateProtectedNativeWriter(root,[{path:relative(root,directory),before:null,after:'',mode:0o700}],()=>fs.mkdirSync(directory,{mode:0o700}));directoryIdentity=fs.lstatSync(directory);ownedDirectory();}catch(error){details(error,[],fs.existsSync(directory)?[directory]:[]);throw error;}
 try{
  guard();const fromIdentity=stamp(root,move.from);need(fromIdentity&&fs.lstatSync(fromFull).nlink===1,'move source inode/link count changed');
  // Atomic no-overwrite destination creation retains the exact source inode.
  mutateProtectedNativeWriter(root,[{path:move.from,before:move.source,after:move.source,mode:move.mode},{path:move.to,before:null,after:move.source,mode:move.mode}],()=>fs.linkSync(fromFull,toFull));destinationIdentity=stamp(root,move.to);need(destinationIdentity[0]===fromIdentity[0]&&destinationIdentity[1]===fromIdentity[1],'destination is not the original source inode');remember(move.to,move.source,destinationIdentity);remember(move.from,move.source,fromIdentity);
  guard();ownedDirectory();const backup=join(directory,'original-leaf.rs');need(!fs.existsSync(backup),'owned leaf backup must be absent');
  mutateProtectedNativeWriter(root,[{path:move.from,before:move.source,after:null,mode:move.mode},{path:relative(root,backup),before:null,after:move.source,mode:move.mode}],()=>fs.renameSync(fromFull,backup));moveBackup={path:move.from,backup,before:move.source,mode:move.mode,dev:fromIdentity[0],ino:fromIdentity[1]};backups.push(moveBackup);need(backupMatches(moveBackup),'complete moved original backup differs');remember(move.from,null);remember(move.to,move.source,destinationIdentity);
  for(const row of changed){
   guard();ownedDirectory();need(row.before!==null&&expected.get(row.path)===row.before&&readCurrentSourceProposalFile(root,row.path)===row.before,'checked replacement original differs');
   const full=ordinaryParent(root,row.path),beforeIdentity=stamp(root,row.path),backup=join(directory,'original-'+backups.length),stageRow=stage(row.after,row.mode);
   mutateProtectedNativeWriter(root,[{path:row.path,before:row.before,after:row.before,mode:row.mode},{path:relative(root,backup),before:null,after:row.before,mode:row.mode}],()=>fs.linkSync(full,backup));const saved={path:row.path,backup,before:row.before,mode:row.mode,dev:beforeIdentity[0],ino:beforeIdentity[1]};backups.push(saved);need(backupMatches(saved),'complete original replacement backup differs');remember(row.path,row.before,beforeIdentity);guard();
   mutateProtectedNativeWriter(root,[{path:relative(root,stageRow.name),before:row.after,after:null,mode:row.mode},{path:row.path,before:row.before,after:row.after,mode:row.mode}],()=>fs.renameSync(stageRow.name,full));temporary.delete(stageRow.name);written.push({...row,ownedIdentity:stageRow.identity});remember(row.path,row.after,stageRow.identity);
  }
  guard();need(readCurrentSourceProposalFile(root,move.from)===null&&readCurrentSourceProposalFile(root,move.to)===move.source,'complete leaf relocation readback differs');
 }catch(error){
  const rollback=[];
  for(const row of [...written].reverse())try{
   ownedDirectory();const actual=stamp(root,row.path);need(actual&&actual[0]===row.ownedIdentity[0]&&actual[1]===row.ownedIdentity[1]&&readCurrentSourceProposalFile(root,row.path)===row.after,'external replacement retained');const staged=stage(row.before,row.mode);mutateProtectedNativeWriter(root,[{path:relative(root,staged.name),before:row.before,after:null,mode:row.mode},{path:row.path,before:row.after,after:row.before,mode:row.mode}],()=>fs.renameSync(staged.name,ordinaryParent(root,row.path)));temporary.delete(staged.name);
  }catch(cause){rollback.push(row.path+': '+message(cause));}
  if(moveBackup)try{ownedDirectory();need(backupMatches(moveBackup),'changed original backup retained');need(readCurrentSourceProposalFile(root,move.from)===null,'external original path retained');mutateProtectedNativeWriter(root,[{path:relative(root,moveBackup.backup),before:moveBackup.before,after:moveBackup.before,mode:moveBackup.mode},{path:move.from,before:null,after:moveBackup.before,mode:moveBackup.mode}],()=>fs.linkSync(moveBackup.backup,fromFull));}catch(cause){rollback.push(move.from+': '+message(cause));}
  if(destinationIdentity)try{
   const actual=stamp(root,move.to);need(actual&&actual[0]===destinationIdentity[0]&&actual[1]===destinationIdentity[1]&&readCurrentSourceProposalFile(root,move.to)===move.source,'external destination retained');need(readCurrentSourceProposalFile(root,move.from)===move.source,'original path was not safely restored');mutateProtectedNativeWriter(root,[{path:move.to,before:move.source,after:null,mode:move.mode}],()=>fs.unlinkSync(toFull));
  }catch(cause){rollback.push(move.to+': '+message(cause));}
  // Remove only unchanged own backups whose original data is present again.
  for(const row of backups)try{ownedDirectory();if(backupMatches(row)&&readCurrentSourceProposalFile(root,row.path)===row.before)mutateProtectedNativeWriter(root,[{path:relative(root,row.backup),before:row.before,after:null,mode:row.mode}],()=>fs.unlinkSync(row.backup));}catch(cause){rollback.push(row.backup+': '+message(cause));}
  for(const [name,row]of temporary)try{ownedDirectory();const stat=fs.lstatSync(name);need(stat.isFile()&&!stat.isSymbolicLink()&&stat.dev===row.identity[0]&&stat.ino===row.identity[1]&&readCurrentSourceProposalFile(directory,basename(name))===row.source,'owned stage changed');mutateProtectedNativeWriter(root,[{path:relative(root,name),before:row.source,after:null,mode:row.identity[2]&0o777}],()=>fs.unlinkSync(name));}catch(cause){rollback.push(name+': '+message(cause));}
  try{ownedDirectory();mutateProtectedNativeWriter(root,[{path:relative(root,directory),before:'',after:null,mode:0o700}],()=>fs.rmdirSync(directory));}catch(cause){rollback.push(directory+': recovery directory retained');}
  details(error,rollback,fs.existsSync(directory)?[directory]:[]);throw error;
 }
 // Mutation has closed successfully. Cleanup failures retain bounded exact
 // originals for manual recovery; they never trigger a partial-backup rollback.
 const cleanup=[];
 for(const row of backups)try{ownedDirectory();need(backupMatches(row),'changed backup retained');mutateProtectedNativeWriter(root,[{path:relative(root,row.backup),before:row.before,after:null,mode:row.mode}],()=>fs.unlinkSync(row.backup));}catch(cause){cleanup.push(row.backup+': '+message(cause));}
 try{ownedDirectory();mutateProtectedNativeWriter(root,[{path:relative(root,directory),before:'',after:null,mode:0o700}],()=>fs.rmdirSync(directory));directory=null;}catch{cleanup.push(directory+': recovery directory retained');}
 // Removing the original hard-link backup changes the destination's ctime.
 // Rejoin its exact owned inode/bytes, then close every current source again.
 try{remember(move.to,move.source,destinationIdentity);guard();}catch(error){details(error,cleanup,directory&&fs.existsSync(directory)?[directory]:[]);throw error;}
 return {schema:fresh.schema,baseRevision:fresh.baseRevision,changed:[move.from,move.to,...changed.map(row=>row.path)],noOp:false,cleanupFailures:cleanup,recoveryPaths:directory&&fs.existsSync(directory)?[directory]:[],sourceAuthority:false,semanticAuthority:false,runtimeParity:false};
}

export function installNativeLeafModuleMove(serialized,options){
 need(typeof serialized==='string'&&Buffer.byteLength(serialized)<=RECONCILE_LIMITS.wire,'bounded complete serialized native move required');
 return withProtectedNativeWriter(options?.root,()=>installNativeLeafModuleMoveProtectedBody(serialized,options));
}
