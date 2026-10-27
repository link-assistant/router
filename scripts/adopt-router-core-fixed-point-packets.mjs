#!/usr/bin/env node
// Additive complete-unit proposals; the existing full Router gate stays intact.
import {writeFileSync,existsSync,lstatSync,openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

export function sourceUnitArguments(args){
 const result={root:resolve(process.cwd())},seen=new Set();
 for(let at=0;at<args.length;at++){
  const argument=args[at];if(['--root','--packets','--plan','--apply'].includes(argument)&&args[at+1]&&!args[at+1].startsWith('--')){const key={'--root':'root','--packets':'packetsPath','--plan':'planPath','--apply':'applyPath'}[argument];if(seen.has(key))throw Error('Repeated source-unit argument');seen.add(key);result[key]=args[++at];}
  else throw Error('Usage: adopt-router-core-fixed-point-packets.mjs --packets RELATIVE_JSON (--plan NEW_FILE | --apply EXISTING_PLAN) [--root ROOT]');
 }
 if(!result.packetsPath||Boolean(result.planPath)===Boolean(result.applyPath))throw Error('One packet directory and exactly one plan/apply mode are required');result.root=resolve(result.root);return result;
}
function readProposal(path){
 const limit=192*1024*1024,named=lstatSync(path);if(!named.isFile()||named.isSymbolicLink()||named.size>limit)throw Error('Bounded ordinary source-unit proposal required');const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{const before=fstatSync(fd),chunks=[];let size=0;for(;;){const bytes=Buffer.alloc(Math.min(65536,limit-size+1)),count=readSync(fd,bytes,0,bytes.length,null);if(!count)break;size+=count;if(size>limit)throw Error('Source-unit proposal exceeds its byte bound');chunks.push(bytes.subarray(0,count));}const after=fstatSync(fd);if(!before.isFile()||before.dev!==named.dev||before.ino!==named.ino||before.size!==size||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw Error('Complete source-unit proposal changed');const raw=Buffer.concat(chunks,size),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))throw Error('Lossless UTF8 source-unit proposal required');return text;}finally{closeSync(fd);}
}
export async function performSourceUnitSynchronization({root,packetsPath,planPath,applyPath}){
 process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=root;
 const {planSourceBoundCoreFixedPointPacketAdoption,applySourceBoundCoreFixedPointPacketAdoption}=await import('../tools/translation/source-bound-fixed-point-packet-adoption.mjs'),options={root,output:resolve(packetsPath)};
 if(applyPath)return applySourceBoundCoreFixedPointPacketAdoption(readProposal(resolve(applyPath)),options);
 const destination=resolve(planPath);if(destination===root||destination.startsWith(root+'/')||root.startsWith(destination+'/'))throw Error('Plan output must remain outside the receiving source tree');if(existsSync(destination))throw Error('Source adoption plan output must be new');const plan=await planSourceBoundCoreFixedPointPacketAdoption(options),text=JSON.stringify(plan)+'\n';writeFileSync(destination,text,{flag:'wx',mode:0o600});
 return {schema:plan.schema,plan:destination,stages:plan.review.stages,changed:plan.outputs.filter(row=>row.before!==row.after).map(row=>row.path),sourceAuthority:false,semanticAuthority:false,runtimeParity:false,rustExecuted:false};
}
export function synchronizeSourceUnits(args){
 const parsed=sourceUnitArguments(args),options={...parsed,...(parsed.planPath?{planPath:resolve(parsed.planPath)}:{applyPath:resolve(parsed.applyPath)})};
 // A fresh process binds the receiving dependency root before compiler imports.
 const boot='import {performSourceUnitSynchronization} from '+JSON.stringify(import.meta.url)+';console.log(JSON.stringify(await performSourceUnitSynchronization(JSON.parse(process.argv[1]))));';
 const result=spawnSync(process.versions.bun?'node':process.execPath,['--max-old-space-size=1792','--input-type=module','--eval',boot,JSON.stringify(options)],{cwd:options.root,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:options.root},encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 if(result.error||result.signal||result.status!==0){const error=new Error('Source-unit worker failed'+(result.signal?' ('+result.signal+')':'')+'\n'+(result.stderr??'')+(result.stdout??''));error.cause=result.error;throw error;}
 return JSON.parse(result.stdout);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(synchronizeSourceUnits(process.argv.slice(2))));
