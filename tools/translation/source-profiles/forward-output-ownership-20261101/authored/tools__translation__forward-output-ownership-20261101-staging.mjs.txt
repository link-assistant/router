import {boundedSourceReadOpenFlags,checkBoundedSourcePath} from './forward-output-ownership-20261101-bounded-bytes.mjs';
// Exact known private-mirror cleanup, never a recursive prefix deletion.
// SOURCE ONLY / UNRUN; Node path operations require cooperating writers.
import fs from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {describeForwardOutputPartitions} from './forward-output-ownership-20261101-partitions.mjs';
import {forwardCustodyFilesystemData,compareForwardCustodyFiles,readForwardCustodyIndex} from './forward-output-ownership-20261101.mjs';
const need=(yes,message)=>{if(!yes)throw TypeError('Forward private staging: '+message);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const statFile=forwardCustodyFilesystemData.statFile,statFD=forwardCustodyFilesystemData.statFD;
const id=stat=>[stat.dev,stat.ino,stat.mode];
const stamp=stat=>[...id(stat),stat.size,stat.mtimeNs,stat.ctimeNs];
function physical(root,name){need(typeof name==='string'&&name&&!/[\\\0\r\n:]/u.test(name)&&name.split('/').every(part=>part&&part!=='.'&&part!=='..'),'ordinary private mirror path required');let full=root;for(const part of name.split('/')){full=join(full,part);const stat=statFile(full);need(!stat.isSymbolicLink()&&(full===join(root,name)||stat.isDirectory()),'linked mirror member refused');}return full;}
function text(root,name,max=8192){
 const full=physical(root,name),before=statFile(full);need(before.isFile()&&before.size<=max,'bounded mirror bookkeeping file required');checkBoundedSourcePath(full);
 const fd=fs.openSync(full,boundedSourceReadOpenFlags());let result,primary,failed=false;
 try{need(same(stamp(statFD(fd)),stamp(before)),'mirror file replaced on open');const chunks=[];let total=0;for(;;){const bytes=Buffer.alloc(Math.min(65536,max-total+1)),count=fs.readSync(fd,bytes,0,bytes.length,null);if(!count)break;total+=count;need(total<=max,'mirror source grew beyond original bound');chunks.push(bytes.subarray(0,count));}const bytes=Buffer.concat(chunks,total);result=bytes.toString('utf8');need(Buffer.from(result).equals(bytes),'exact mirror UTF8 required');}catch(error){failed=true;primary=error;}
 for(const check of [()=>need(same(stamp(before),stamp(statFD(fd)))&&same(stamp(before),stamp(statFile(full))),'mirror bookkeeping changed'),()=>fs.closeSync(fd)])try{check();}catch(error){if(!failed){failed=true;primary=error;}}
 if(failed)throw primary;return result;
}

export function createForwardStagingClosure(root){
 root=fs.realpathSync(resolve(root));const initial=statFile(root);need(initial.isDirectory()&&!initial.isSymbolicLink(),'ordinary task-owned mirror root required');const rootId=id(initial),known=new Map(),directoryIds=new Map([['',id(initial)]]);let closed=false;
 const own=()=>need(!closed&&fs.realpathSync(root)===root&&same(id(statFile(root)),rootId),'closed/replaced private mirror');
 const remember=(name,proof)=>{own();const full=physical(root,name),stat=statFile(full);need(stat.isFile(),'ordinary known mirror file required');let parent=name;while(parent.includes('/')){parent=parent.slice(0,parent.lastIndexOf('/'));const current=id(statFile(physical(root,parent))),before=directoryIds.get(parent);need(!before||same(before,current),'known mirror parent replaced');directoryIds.set(parent,current);}known.set(name,{stamp:stamp(stat),proof});};
 function original(name,source){need(typeof source==='string','complete original mirror bytes required');need(text(root,name,8*1024*1024)===source,'complete original mirror source differs');remember(name,{source});}
 function output(plan,custody,producer){
  own();const scope=describeForwardOutputPartitions({producer,prefixes:[plan.outputPrefix]});
  need(custody&&Array.isArray(custody.banks)&&custody.banks.length===scope.parts.length,'complete actual guarded worker partitions required');
  const supplied=new Map();for(const row of custody.banks){need(row&&typeof row.id==='string'&&typeof row.bank==='string'&&!supplied.has(row.id),'distinct exact worker partition coordinates required');supplied.set(row.id,row.bank);}
  const expected=new Map(plan.outputs.map(row=>[row.path,row]));let totalCount=0,totalBytes=0;
  for(const part of scope.parts){
   const bank=supplied.get(part.id);need(typeof bank==='string'&&bank.startsWith(part.home+'/')&&/^bank-[a-f0-9-]{36}$/u.test(bank.slice(part.home.length+1)),'worker snapshot escapes actual physical profile partition');
   const pointer=part.home+'/current.json',pointerSource=text(root,pointer),receipt=JSON.parse(pointerSource);
   need(receipt.producer===producer&&receipt.schema==='router-forward-physical-partition-20261101-v2'&&receipt.id===part.id&&receipt.kind===part.kind&&receipt.prefix===part.prefix&&receipt.bank===bank.slice(part.home.length+1)&&Number.isSafeInteger(receipt.count)&&receipt.count>=0&&typeof receipt.bytes==='string'&&receipt.bytes.length<=64&&/^(?:0|[1-9][0-9]*)$/u.test(receipt.bytes),'complete actual worker physical receipt differs');
   const slots=new Set(),index=[];let count=0,bytes=0;
   for(const row of readForwardCustodyIndex(physical(root,bank+'/index.jsonl'),()=>{})){
    const expectedRow=expected.get(row.path);need(expectedRow&&scope.locate(row.path)===part&&!slots.has(row.slot)&&Number.isSafeInteger(row.slot)&&row.slot>=0&&row.slot<200000&&Number.isInteger(row.mode)&&row.mode>=0&&row.mode<=0o777&&row.bytes===expectedRow.bytes,'complete private worker partition row differs');
    slots.add(row.slot);expected.delete(row.path);const bankFile=bank+'/data-'+row.slot;
    need(statFile(physical(root,row.path)).mode%512===row.mode&&statFile(physical(root,bankFile)).mode%512===row.mode&&compareForwardCustodyFiles(physical(root,row.path),physical(root,bankFile)),'actual complete worker output/snapshot bytes or modes differ');
    remember(row.path,{reference:bankFile});remember(bankFile,{reference:row.path});count++;bytes+=row.bytes;index.push({path:row.path,bytes:row.bytes});
   }
   need(count===receipt.count&&BigInt(bytes)===BigInt(receipt.bytes),'complete private worker partition accounting differs');
   need(same(fs.readdirSync(physical(root,bank)).sort(),['index.jsonl',...[...slots].map(slot=>'data-'+slot)].sort()),'unknown private worker snapshot member retained');
   remember(pointer,{source:pointerSource});remember(bank+'/index.jsonl',{index});totalCount+=count;totalBytes+=bytes;
  }
  need(expected.size===0&&totalCount===plan.outputs.length&&totalBytes===plan.expectedBytes,'whole original worker profile output accounting differs');
 }

 function verify(){
  own();const directories=new Map(),seen=new Set(),allowedDirectories=new Set(['']);for(const name of known.keys()){let parent=name;while(parent.includes('/')){parent=parent.slice(0,parent.lastIndexOf('/'));allowedDirectories.add(parent);}}
  function visit(name){const full=name?physical(root,name):root,stat=statFile(full);if(stat.isDirectory()){need(allowedDirectories.has(name)&&same(id(stat),directoryIds.get(name)),'unknown/replaced private mirror directory retained');const names=fs.readdirSync(full).sort();directories.set(name,{id:id(stat),names});for(const child of names)visit(name?name+'/'+child:child);need(same(stamp(statFile(full)),stamp(stat))&&same(fs.readdirSync(full).sort(),names),'private mirror directory changed during full census');}else{const row=known.get(name);need(row&&same(stamp(stat),row.stamp),'unknown/replaced mirror file retained: '+name);seen.add(name);if(row.proof.source!==undefined)need(text(root,name,8*1024*1024)===row.proof.source,'original mirror file changed');else if(row.proof.reference)need(compareForwardCustodyFiles(full,physical(root,row.proof.reference)),'complete known mirror byte copy changed');else{const expected=new Map(row.proof.index.map(value=>[value.path,value.bytes]));for(const value of readForwardCustodyIndex(full,()=>{})){need(expected.get(value.path)===value.bytes,'complete mirror bank index changed');expected.delete(value.path);}need(expected.size===0,'mirror bank index lost output');}}}
  visit('');need(seen.size===known.size,'known mirror member removed');return directories;
 }
 function close({removeRoot=true}={}){
  const directories=verify();
  // Full bytes and directory census close before the first removal. Exact
  // private file stamps and parent inode/mode close before each own unlink.
  for(const [name,row]of known){own();const full=physical(root,name),parentName=name.includes('/')?name.slice(0,name.lastIndexOf('/')):'',parent=parentName?physical(root,parentName):root;need(same(id(statFile(parent)),directories.get(parentName).id)&&same(stamp(statFile(full)),row.stamp),'mirror artifact replaced before cleanup; retained');fs.unlinkSync(full);}
  for(const [name,row]of [...directories].sort((a,b)=>b[0].split('/').length-a[0].split('/').length||b[0].length-a[0].length)){own();const full=name?physical(root,name):root;need(same(id(statFile(full)),row.id)&&fs.readdirSync(full).length===0,'unknown mirror directory member retained');if(name||removeRoot)fs.rmdirSync(full);if(!name)closed=true;}
 }
 return Object.freeze({original,output,verify,close,assertRoot:own,recoveryPath:root});
}
