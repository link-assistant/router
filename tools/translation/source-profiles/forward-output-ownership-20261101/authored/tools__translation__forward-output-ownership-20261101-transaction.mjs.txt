// Operational exact-byte transaction only; no compiler/source/type/owner issuer.
// SOURCE ONLY / UNRUN. Original private callers reissue one whole producer.
// Cooperating/exclusive writers are required. There is no atomic conditional
// Node pathname removal, global atomicity or durable interrupted recovery here.
import fs from 'node:fs';
import {join,dirname,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {constants as bufferConstants} from 'node:buffer';
import {forwardCustodyFilesystemData as io} from './forward-output-ownership-20261101.mjs';
import {FORWARD_OWNERSHIP_BASE as BASE,FORWARD_OWNERSHIP_PRODUCERS} from './forward-output-ownership-20261101-partitions.mjs';
import {replayOriginalForwardProducer,consumeOriginalForwardReplay} from './forward-output-ownership-20261101-replay.mjs';
const SCHEMA='router-forward-physical-partition-20261101-v2',MiB=1024*1024;
const keys=(value,wanted)=>io.same(Object.keys(value).sort(),[...wanted].sort());
const decimal=value=>typeof value==='string'&&value.length<=64&&/^(?:0|[1-9][0-9]*)$/u.test(value);

function freshCallbacks(value){
 io.need(value!==null&&typeof value==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(value)),'ordinary fresh operational callback record required');
 const names=Reflect.ownKeys(value);io.need((names.length===3||names.length===4)&&['entries','verify','mutateOutputDirectories'].every(name=>names.includes(name))&&names.every(name=>['entries','verify','mutateOutputDirectories','release'].includes(name)),'closed fresh operational callbacks required');const result={};
 for(const name of names){const field=Object.getOwnPropertyDescriptor(value,name);io.need(field&&field.enumerable&&Object.hasOwn(field,'value')&&io.synchronousCallback(field.value),'own synchronous fresh callback without getters/proxies required');result[name]=field.value;}
 return Object.freeze(result);
}

export function applyPartitionedForwardCustody(state,{check=false}={}){
 const {need,same,synchronous,synchronousCallback,identity,complete,statFile,path,physical,ordinary,equalFiles,readSmall,writeAll,writeText,equalText,lines,closing}=io;
 synchronous(state.verify());
 const root=state.outputRoot,parts=state.partitions.parts.map(spec=>({spec,prior:null,priorRows:new Map(),oldFiles:new Map(),oldBank:null,bank:null,newRows:[],reuse:false,indexFD:null})),byPart=new Map(parts.map(part=>[part.spec.id,part]));
 const matrix=state.prefixes.some(Boolean),pending=BASE+'/pending',priorRows=new Map(),rows=[],byName=new Map(),artifacts=new Map(),unknown=new Set(),changed=[],failures=[],preservedLegacyNeighbors=[];
 const createdBanks=new Map(),publicParents=new Map();let pendingId=null,fresh=null,historicalRows=null,rolledBack=false,published=false;
 const tick=()=>need(state.deadline===Infinity||Number.isFinite(state.deadline)&&performance.now()<state.deadline,'actual original caller deadline exceeded');
 state.verifyClosing=()=>{tick();synchronous(state.verify());};
 const rootId=identity(statFile(root));need(statFile(root).isDirectory()&&!statFile(root).isSymbolicLink(),'ordinary existing receiving root required');
 const ownRoot=()=>need(fs.realpathSync(root)===root&&same(identity(statFile(root)),rootId),'receiving root path/identity replaced');
 const resolveFile=name=>physical(root,name),reportFile=name=>join(root,name);
 const mutate=(targets,operation)=>synchronous(state.mutateOutputDirectories(targets,()=>fresh?.mutateOutputDirectories&&fresh.mutateOutputDirectories!==state.mutateOutputDirectories?synchronous(fresh.mutateOutputDirectories(targets,operation)):synchronous(operation())));
 const ownMutation=(names,operation)=>mutate(names.map(resolveFile),operation);
 state.recoveryPaths=()=>[...(pendingId?[reportFile(pending)]:[]),...[...createdBanks.keys()].map(reportFile),...[...unknown].map(reportFile)].concat(state.historyBank&&state.preserveHistorical?[state.historyBank.recoveryPath]:[]);
 // A previous incomplete preparation blocks a new bank before any mutation.
 try{fs.lstatSync(resolveFile(pending));need(false,'unresolved preparation retained at '+resolveFile(pending));}catch(error){if(io.errorField(error,'code')!=='ENOENT')throw error;}
 const partFor=name=>byPart.get(state.partitions.locate(name).id);
 const oldFile=row=>row.file??resolveFile(row.part.oldBank+'/data-'+row.slot);
 const checkOldBank=part=>{
  if(!part.oldBank)return;const full=resolveFile(part.oldBank);need(same(identity(statFile(full)),part.oldBankId),'prior byte bank directory replaced');
  need(same(fs.readdirSync(full).sort(),[...part.oldFiles.keys()].sort()),'unknown prior byte-bank member retained');
  for(const [name,stamp]of part.oldFiles)need(same(complete(statFile(resolveFile(part.oldBank+'/'+name))),stamp),'prior byte-bank file changed: '+name);
 };
 // Receipts are ordinary project metadata under the cooperating-writer trust
 // boundary. Full snapshot files, never a digest/index alone, authorize an
 // ordinary edited-peer comparison. They issue no semantic admission.
 for(const part of parts){
  tick();const pointer=part.spec.home+'/current.json',actual=ordinary(root,pointer);part.pointer=pointer;part.pointerBefore=actual?{identity:identity(actual.stat),mode:actual.stat.mode%512,text:readSmall(actual.full,8192)}:null;
  if(!actual)continue;const receipt=JSON.parse(part.pointerBefore.text);
  need(keys(receipt,['schema','producer','id','kind','prefix','bank','count','bytes'])&&receipt.schema===SCHEMA&&FORWARD_OWNERSHIP_PRODUCERS.includes(receipt.producer)&&receipt.id===part.spec.id&&receipt.kind===part.spec.kind&&receipt.prefix===part.spec.prefix&&/^bank-[a-f0-9-]{36}$/u.test(receipt.bank)&&Number.isSafeInteger(receipt.count)&&receipt.count>=0&&decimal(receipt.bytes),'complete fixed physical-partition receipt required');
  part.prior=receipt;part.oldBank=part.spec.home+'/'+receipt.bank;const directory=statFile(resolveFile(part.oldBank));need(directory.isDirectory()&&!directory.isSymbolicLink(),'ordinary prior snapshot directory required');part.oldBankId=identity(directory);
  const index=part.oldBank+'/index.jsonl';part.oldFiles.set('index.jsonl',complete(statFile(resolveFile(index))));let bytes=0n;const slots=new Set();
  for(const row of lines(resolveFile(index),tick)){
   need(keys(row,['path','slot','bytes','mode'])&&typeof row.path==='string'&&partFor(row.path)===part&&!priorRows.has(row.path)&&!part.priorRows.has(row.path)&&Number.isSafeInteger(row.slot)&&row.slot>=0&&!slots.has(row.slot)&&Number.isSafeInteger(row.bytes)&&row.bytes>=0&&Number.isInteger(row.mode)&&row.mode>=0&&row.mode<=0o777,'unique complete prior output row in actual physical partition required');path(row.path);
   const stored=ordinary(root,part.oldBank+'/data-'+row.slot);need(stored&&stored.stat.size===row.bytes&&stored.stat.mode%512===row.mode,'complete prior snapshot bytes/mode required');
   slots.add(row.slot);bytes+=BigInt(row.bytes);part.oldFiles.set('data-'+row.slot,complete(stored.stat));const original={...row,part};part.priorRows.set(row.path,original);priorRows.set(row.path,original);
  }
  need(part.priorRows.size===receipt.count&&bytes===BigInt(receipt.bytes),'complete prior snapshot accounting differs');if(part.spec.prefix)need(bytes<=512n*BigInt(MiB),'original prefixed prior byte domain exceeded');
  checkOldBank(part);
 }
 const policy=ordinary(root,'translation/source-ownership.json'),policyText=policy?readSmall(policy.full,16*MiB):null,protectedPaths=new Set();
 if(policyText!==null){const value=JSON.parse(policyText);need(keys(value,['schema','authored','unmanaged'])&&value.schema==='router-explicit-source-ownership-v1','explicit authored/unmanaged policy schema required');for(const names of [value.authored,value.unmanaged]){need(Array.isArray(names)&&names.length<=200000,'bounded explicit authored/unmanaged policy required');for(const name of names){path(name);need(!protectedPaths.has(name),'distinct explicit ownership declarations required');protectedPaths.add(name);}}}
 const pointerCurrent=(part,after=false)=>{
  const expected=after?part.pointerAfter:part.pointerBefore,now=ordinary(root,part.pointer);
  return expected?Boolean(now&&same(identity(now.stat),expected.identity)&&now.stat.mode%512===expected.mode&&equalText(now.full,expected.text,tick)):now===null;
 };
 const controls=()=>{
  const checks=[()=>{tick();ownRoot();},()=>{tick();synchronous(state.verify());},()=>{tick();if(fresh)synchronous(fresh.verify());},()=>{tick();if(state.historyBank)state.historyBank.verify();},()=>{
   tick();const now=ordinary(root,'translation/source-ownership.json');need(policyText===null?now===null:Boolean(now&&same(complete(now.stat),complete(policy.stat))&&equalText(now.full,policyText,tick)),'explicit authored policy changed');
  }];
  for(const part of parts){checks.push(()=>{tick();need(pointerCurrent(part,published&&!part.reuse),'physical receipt changed');});checks.push(()=>{tick();checkOldBank(part);});}
  for(const [file,id]of publicParents)checks.push(()=>{tick();need(same(identity(statFile(file)),id),'receiving parent directory replaced');});
  return closing(()=>{},checks);
 };

 const history=()=>{
  if(historicalRows)return historicalRows;
  state.historyBank=consumeOriginalForwardReplay(replayOriginalForwardProducer({root:state.root,producer:state.producer,matrix,deadline:state.deadline}),{root:state.root,producer:state.producer,matrix});historicalRows=new Map();const freshNames=new Set();for(const [name]of synchronous(state.entries()))freshNames.add(name);
  for(const [name,row]of state.historyBank.entries()){
   tick();let part;try{part=partFor(name);}catch{continue;}if(priorRows.has(name)||protectedPaths.has(name))continue;
   const actual=ordinary(root,name);if(actual&&actual.stat.mode%512===row.mode&&equalFiles(actual.full,row.file,tick)){const original={path:name,bytes:row.bytes,mode:row.mode,file:row.file,part,legacy:true};historicalRows.set(name,original);priorRows.set(name,original);}
   else if(actual&&!freshNames.has(name))preservedLegacyNeighbors.push(name);
  }
  return historicalRows;
 };
 const parents=name=>{
  const full=resolveFile(name),chain=[];for(let directory=dirname(full);directory!==root;directory=dirname(directory)){need(directory.startsWith(root+sep),'receiving parent escaped');chain.push(directory);}
  for(const directory of chain.reverse()){
   let stat;try{stat=statFile(directory);}catch(error){if(io.errorField(error,'code')!=='ENOENT')throw error;mutate([directory],()=>fs.mkdirSync(directory,{mode:0o755}));stat=statFile(directory);}
   need(stat.isDirectory()&&!stat.isSymbolicLink(),'ordinary receiving parent required');const before=publicParents.get(directory);need(!before||same(identity(stat),before),'receiving parent identity changed');publicParents.set(directory,identity(stat));
  }
 };
 const ownPending=()=>{ownRoot();need(pendingId&&same(identity(statFile(resolveFile(pending))),pendingId),'private preparation directory replaced');};
 const remember=(name,proof)=>{ownPending();const actual=ordinary(root,name);need(actual,'complete own artifact required');artifacts.set(name,{identity:identity(actual.stat),size:actual.stat.size,...proof});return actual;};
 const assertArtifact=name=>{
  ownPending();const row=artifacts.get(name),actual=ordinary(root,name);need(row&&actual&&same(identity(actual.stat),row.identity)&&actual.stat.size===row.size,'private artifact inode/bytes/mode replaced');
  if(row.source!==undefined)need(equalText(actual.full,row.source,tick),'complete private artifact source changed');
  else if(row.reference)need(equalFiles(actual.full,row.reference,tick),'complete private artifact original bytes changed');
  else if(row.index){let at=0;for(const value of lines(actual.full,tick)){const expected=row.index[at++];need(expected&&keys(value,['path','slot','bytes','mode'])&&value.path===expected.path&&value.slot===expected.slot&&value.bytes===expected.bytes&&value.mode===expected.mode,'complete private index changed');}need(at===row.index.length,'private index lost rows');}
  return actual;
 };
 const current=(row,expected)=>{const actual=ordinary(root,row.path);return expected?Boolean(actual&&same(identity(actual.stat),expected.identity)&&actual.stat.mode%512===expected.mode&&equalFiles(actual.full,expected.reference,tick)):actual===null;};
 const backup=(row,actual,reference)=>{
  const name=pending+'/before-'+row.ordinal;ownMutation([name],()=>fs.linkSync(actual.full,resolveFile(name)));remember(name,{reference});return {bank:name,identity:identity(actual.stat),mode:actual.stat.mode%512,reference};
 };
 const capture=(row,expected,name)=>{
  ownPending();need(!ordinary(root,name),'unique exact private quarantine required');
  ownMutation([row.path,name],()=>fs.renameSync(resolveFile(row.path),resolveFile(name)));unknown.add(name);
  const actual=ordinary(root,name);if(!actual||!same(identity(actual.stat),expected.identity)||actual.stat.mode%512!==expected.mode||!equalFiles(actual.full,expected.reference,tick)||(expected.text!==undefined&&!equalText(actual.full,expected.text,tick))){
   // Unknown captured bytes remain retained even if somebody independently
   // restores the public original before rollback. Cleanup never adopts them.
   if(actual)try{ownMutation([row.path],()=>fs.linkSync(actual.full,resolveFile(row.path)));}catch{}need(false,'unexpected captured replacement retained at '+resolveFile(name));
  }
  remember(name,expected.text!==undefined?{source:expected.text}:{reference:expected.reference});unknown.delete(name);return name;
 };
 const rollback=()=>{
  if(rolledBack)return;rolledBack=true;const secondary=[];
  for(const part of [...parts].reverse())if(part.pointerAttempted)try{
   const descriptor={path:part.pointer};if(pointerCurrent(part,true))capture(descriptor,part.pointerAfter,pending+'/rollback-pointer-'+parts.indexOf(part));else need(pointerCurrent(part,false)||ordinary(root,part.pointer)===null,'external receipt replacement retained');
   if(part.pointerBefore&&!ordinary(root,part.pointer))ownMutation([part.pointer],()=>fs.linkSync(assertArtifact(part.pointerBackup).full,resolveFile(part.pointer)));
   need(pointerCurrent(part,false),'original receipt rollback differs');part.pointerInstalled=false;part.pointerAttempted=false;
  }catch(error){secondary.push(error);}
  for(const row of [...changed].reverse())try{
   tick();if(row.after&&current(row,row.after))capture(row,row.after,pending+'/rollback-output-'+row.ordinal);else if(row.after&&ordinary(root,row.path))need(current(row,row.before),'external output replacement retained');
   if(row.before&&!ordinary(root,row.path))ownMutation([row.path],()=>fs.linkSync(assertArtifact(row.before.bank).full,resolveFile(row.path)));
   need(current(row,row.before),'complete original output rollback readback differs');
  }catch(error){secondary.push(error);}
  state.preserveHistorical=Boolean(unknown.size||secondary.length);if(secondary.length)throw new AggregateError(secondary,'Forward rollback retained recovery evidence; an expired original deadline prevents further comparison/restoration');
 };
 const bankCensus=part=>{if(!part.bank)return;need(same(identity(statFile(resolveFile(part.bank))),createdBanks.get(part.bank)),'new private snapshot directory replaced');need(same(fs.readdirSync(resolveFile(part.bank)).sort(),[...artifacts.keys()].filter(name=>dirname(name)===part.bank).map(name=>name.slice(part.bank.length+1)).sort()),'unknown new snapshot member retained');};
 const preparationCensus=()=>{ownPending();need(unknown.size===0,'unknown quarantine retained');need(same(fs.readdirSync(resolveFile(pending)).sort(),[...artifacts.keys()].filter(name=>dirname(name)===pending).map(name=>name.slice(pending.length+1)).sort()),'unknown preparation member retained');for(const part of parts)bankCensus(part);};
 const removeArtifact=name=>{assertArtifact(name);ownMutation([name],()=>fs.unlinkSync(resolveFile(name)));artifacts.delete(name);};
 const finish=success=>{
  tick();preparationCensus();for(const name of artifacts.keys())assertArtifact(name);for(const part of parts)checkOldBank(part);
  // First remove transient backups while their complete immutable references
  // still exist. A cleanup failure retains the unknown remainder; it does not
  // claim a successful rollback after commit or after the original deadline.
  for(const name of [...artifacts.keys()].filter(name=>dirname(name)===pending))removeArtifact(name);
  for(const part of parts){
   const keep=success&&!part.reuse;for(const name of [...artifacts.keys()].filter(name=>dirname(name)===part.bank))if(!keep||!/(?:\/index\.jsonl|\/data-[0-9]+)$/u.test(name))removeArtifact(name);
   if(!keep&&part.bank){bankCensus(part);need(fs.readdirSync(resolveFile(part.bank)).length===0,'unknown empty snapshot retained');ownMutation([part.bank],()=>fs.rmdirSync(resolveFile(part.bank)));createdBanks.delete(part.bank);part.bank=null;}
   if(success&&!part.reuse&&part.oldBank){checkOldBank(part);for(const [name,stamp]of part.oldFiles){need(same(complete(statFile(resolveFile(part.oldBank+'/'+name))),stamp),'prior snapshot changed before cleanup');ownMutation([part.oldBank+'/'+name],()=>fs.unlinkSync(resolveFile(part.oldBank+'/'+name)));}need(same(identity(statFile(resolveFile(part.oldBank))),part.oldBankId)&&fs.readdirSync(resolveFile(part.oldBank)).length===0,'unknown old snapshot directory retained');ownMutation([part.oldBank],()=>fs.rmdirSync(resolveFile(part.oldBank)));part.oldBank=null;}
  }
  ownPending();need(fs.readdirSync(resolveFile(pending)).length===0,'unknown final preparation directory retained');ownMutation([pending],()=>fs.rmdirSync(resolveFile(pending)));pendingId=null;
 };
 state.rollbackClosing=rollback;
 let primary,failed=false;const secondary=[];
 try{
  controls();if(!check){
   parents(pending);ownMutation([pending],()=>fs.mkdirSync(resolveFile(pending),{mode:0o700}));pendingId=identity(statFile(resolveFile(pending)));
   const intent=JSON.stringify({schema:'router-forward-cooperating-preparation-v2',producer:state.producer,parts:parts.map(part=>part.spec.id)})+'\n';writeText(resolveFile(pending+'/intent.json'),intent,0o600,tick);remember(pending+'/intent.json',{source:intent});
   for(const part of parts){parents(part.spec.home+'/placeholder');part.bank=part.spec.home+'/bank-'+randomUUID();ownMutation([part.bank],()=>fs.mkdirSync(resolveFile(part.bank),{mode:0o700}));createdBanks.set(part.bank,identity(statFile(resolveFile(part.bank))));part.indexFD=fs.openSync(resolveFile(part.bank+'/index.jsonl'),'wx',0o600);}
  }
  let bytes=0n,payload=0n;const profileBytes=new Map();
  for(const [name,source]of synchronous(state.entries())){
   tick();path(name);need(typeof source==='string'&&!byName.has(name),'complete unique primitive original output required');const part=partFor(name),size=Buffer.byteLength(source);bytes+=BigInt(size);
   if(part.spec.kind!=='index'){payload+=BigInt(size);if(matrix){need(payload<=1024n*BigInt(MiB),'original matrix payload bound');const amount=(profileBytes.get(part.spec.prefix)??0n)+BigInt(size);need(amount<=512n*BigInt(MiB),'original prefixed profile payload bound');profileBytes.set(part.spec.prefix,amount);}}
   else need(size<=bufferConstants.MAX_STRING_LENGTH*3,'already-produced ordinary matrix JSON string representability bound');
   const actual=ordinary(root,name),old=priorRows.get(name);let mode=actual?actual.stat.mode%512:0o666;
   const row={path:name,ordinal:rows.length,part,slot:part.newRows.length,bytes:size,mode,source,before:null,after:null,changed:false,protected:protectedPaths.has(name)};rows.push(row);byName.set(name,row);
   if(row.protected){need(actual&&equalText(actual.full,source,tick),'explicit authored/unmanaged destination retained: '+name);row.protectedIdentity=identity(actual.stat);continue;}
   if(check){if(!actual)failures.push('missing: '+name);else if(old&&(actual.stat.mode%512!==old.mode||!equalFiles(actual.full,oldFile(old),tick)))failures.push('edited: '+name);else if(!equalText(actual.full,source,tick))failures.push('stale: '+name);continue;}
   const after=part.bank+'/data-'+row.slot;writeText(resolveFile(after),source,mode,tick,Boolean(actual));const stored=remember(after,{source});mode=stored.stat.mode%512;row.mode=mode;
   const stage=part.bank+'/stage-'+row.slot;ownMutation([stage],()=>fs.copyFileSync(stored.full,resolveFile(stage),fs.constants.COPYFILE_EXCL));remember(stage,{source});need(equalFiles(stored.full,resolveFile(stage),tick),'independent output stage differs');row.after={bank:after,stage,identity:identity(statFile(resolveFile(stage))),mode,reference:resolveFile(after)};
   const identical=actual&&actual.stat.mode%512===mode&&equalText(actual.full,source,tick);let baseline=old;
   if(!baseline&&actual&&!identical){history();baseline=priorRows.get(name);}
   if(baseline&&actual)need(actual.stat.mode%512===baseline.mode&&equalFiles(actual.full,oldFile(baseline),tick),'edited receipt/legacy-owned forward peer retained: '+name);
   if(actual&&!identical)need(baseline,'differing unknown authored forward peer retained: '+name);
   if(actual)row.before=backup(row,actual,baseline?oldFile(baseline):resolveFile(after));
   row.changed=!identical;if(identical)row.after.identity=identity(actual.stat);part.newRows.push(row);writeAll(part.indexFD,Buffer.from(JSON.stringify({path:name,slot:row.slot,bytes:size,mode})+'\n'));
  }
  // Fixed old replay is lazy: identical fresh enrollment never needs archives.
  // Once used for a differing unknown output, all exact historical stale rows
  // in these actual partitions participate, never prefix-inferred ownership.
  for(const [name,old]of priorRows)if(!byName.has(name)&&!protectedPaths.has(name)){
   tick();const actual=ordinary(root,name);if(!actual)continue;need(actual.stat.mode%512===old.mode&&equalFiles(actual.full,oldFile(old),tick),'edited stale forward peer retained: '+name);
   if(check){failures.push('unexpected: '+name);continue;}const row={path:name,ordinal:rows.length,part:old.part,before:null,after:null,changed:true};rows.push(row);row.before=backup(row,actual,oldFile(old));
  }
  for(const part of parts)if(part.indexFD!==null){const fd=part.indexFD;part.indexFD=null;fs.closeSync(fd);remember(part.bank+'/index.jsonl',{index:part.newRows});}
  controls();fresh=freshCallbacks(synchronous(state.reissue()));state.verifyFresh=()=>{tick();synchronous(fresh.verify());};if(fresh.release)state.releaseFresh=()=>synchronous(fresh.release());
  let count=0,total=0n;const cursor=check?synchronous(state.entries())[Symbol.iterator]():null;
  for(const [name,source]of synchronous(fresh.entries())){
   tick();const row=byName.get(name);need(row&&!row.fresh&&typeof source==='string','fresh complete output census changed');row.fresh=true;count++;total+=BigInt(Buffer.byteLength(source));
   if(check){const original=cursor.next();need(!original.done&&original.value[0]===name&&original.value[1]===source,'complete fresh check-mode producer differs');}
   else if(row.protected){const actual=ordinary(root,name);need(actual&&same(identity(actual.stat),row.protectedIdentity)&&equalText(actual.full,source,tick),'explicit authored identical peer changed during reissue');}
   else need(equalText(assertArtifact(row.after.bank).full,source,tick),'fresh private producer output differs');
  }
  need(count===byName.size&&total===bytes&&(!cursor||cursor.next().done),'complete initial/fresh output accounting differs');controls();
  if(check)return {failures,changed:[],preservedExplicit:[...protectedPaths].filter(name=>byName.has(name)),preservedLegacyNeighbors};
  for(const row of rows)if(!row.protected)need(current(row,row.before),'original target changed before whole installation: '+row.path);
  for(const part of parts){
   part.reuse=Boolean(part.prior&&part.newRows.length===part.priorRows.size&&part.newRows.every(row=>{const old=part.priorRows.get(row.path);return old&&old.bytes===row.bytes&&old.mode===row.mode&&equalFiles(resolveFile(row.after.bank),oldFile(old),tick);}));
   if(part.reuse)continue;const receipt={schema:SCHEMA,producer:state.producer,id:part.spec.id,kind:part.spec.kind,prefix:part.spec.prefix,bank:part.bank.slice(part.spec.home.length+1),count:part.newRows.length,bytes:part.newRows.reduce((sum,row)=>sum+BigInt(row.bytes),0n).toString()};
   const text=JSON.stringify(receipt)+'\n',stage=pending+'/pointer-stage-'+parts.indexOf(part);writeText(resolveFile(stage),text,0o600,tick);remember(stage,{source:text});part.pointerAfter={identity:identity(statFile(resolveFile(stage))),mode:statFile(resolveFile(stage)).mode%512,text,reference:resolveFile(stage)};part.pointerStage=stage;
   if(part.pointerBefore){const actual=ordinary(root,part.pointer);part.pointerBackup=pending+'/pointer-before-'+parts.indexOf(part);ownMutation([part.pointerBackup],()=>fs.linkSync(actual.full,resolveFile(part.pointerBackup)));remember(part.pointerBackup,{source:part.pointerBefore.text});}
  }
  controls();
  for(const row of rows)if(row.changed){tick();need(current(row,row.before),'public target changed before exact install');parents(row.path);changed.push(row);if(row.before)capture(row,row.before,pending+'/captured-'+row.ordinal);if(row.after){ownMutation([row.path],()=>fs.linkSync(assertArtifact(row.after.stage).full,resolveFile(row.path)));need(current(row,row.after),'installed exact output readback differs');}}
  for(const part of parts)if(!part.reuse){
   tick();need(pointerCurrent(part,false),'physical receipt changed before publication');part.pointerAttempted=true;if(part.pointerBefore)capture({path:part.pointer}, {...part.pointerBefore,reference:resolveFile(part.pointerBackup)},pending+'/captured-pointer-'+parts.indexOf(part));
   ownMutation([part.pointer],()=>fs.linkSync(assertArtifact(part.pointerStage).full,resolveFile(part.pointer)));part.pointerInstalled=true;need(pointerCurrent(part,true),'published exact physical receipt differs');
  }
  published=true;controls();state.finalizeSuccess=()=>finish(true);
  const banks=parts.map(part=>({id:part.spec.id,bank:part.reuse?part.oldBank:part.bank}));
  return {failures,changed:rows.filter(row=>row.changed).map(row=>row.path),ownershipBanks:banks,noOp:rows.every(row=>!row.changed)&&parts.every(part=>part.reuse),preservedExplicit:[...protectedPaths].filter(name=>byName.has(name)),preservedLegacyNeighbors};
 }catch(error){failed=true;primary=error;}
 finally{for(const part of parts)if(part.indexFD!==null){const fd=part.indexFD;part.indexFD=null;try{const before=identity(io.statFD(fd));fs.closeSync(fd);need(same(identity(statFile(resolveFile(part.bank+'/index.jsonl'))),before),'own index replaced during closing');remember(part.bank+'/index.jsonl',{index:part.newRows});}catch(error){if(!failed){failed=true;primary=error;}else secondary.push(error);}}}
 if(failed){try{rollback();}catch(error){secondary.push(error);}if(!unknown.size&&!secondary.length&&pendingId)state.finalizeFailure=()=>finish(false);state.preserveHistorical=Boolean(unknown.size||secondary.length);if(primary&&typeof primary==='object')try{Object.defineProperties(primary,{forwardTransactionClosingFailures:{value:secondary,enumerable:true},forwardTransactionRecoveryPaths:{value:state.recoveryPaths(),enumerable:true}});}catch{}throw primary;}
}
