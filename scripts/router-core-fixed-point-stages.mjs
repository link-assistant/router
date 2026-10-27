#!/usr/bin/env node
// Additive complete-unit proposals; the existing full Router gate stays intact.

import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

export function sourceUnitArguments(args){
 const result={root:resolve(process.cwd())},seen=new Set();
 for(let at=0;at<args.length;at++){
  const flags={'--root':'root','--output':'output','--mode':'mode','--stages':'stages'},argument=args[at],key=Object.hasOwn(flags,argument)?flags[argument]:null,value=args[at+1];
  if(!key||!value||value.startsWith('--')||seen.has(key))throw Error('Usage: router-core-fixed-point-stages.mjs --mode propose|review --output DIRECTORY [--root ROOT] [--stages NAME,NAME]');
  seen.add(key);result[key]=value;at++;
 }
 if(!result.output||!['propose','review'].includes(result.mode)||result.mode==='propose'&&!result.stages||result.mode==='review'&&seen.has('stages'))throw Error('One output, explicit propose/review mode and proposal-only stage list required');
 if(result.stages){result.stages=result.stages.split(',');if(!result.stages.length||result.stages.length>21||result.stages.some(name=>!name)||new Set(result.stages).size!==result.stages.length)throw Error('Bounded unique nonempty stage names required');}
 result.root=resolve(result.root);result.output=resolve(result.output);return result;
}

export async function performSourceUnitSynchronization({root,output,mode,stages}){
 process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=root;
 if(mode==='propose'){const {proposeSourceBoundCoreFixedPointPackets}=await import('../tools/translation/propose-core-adoption-corpus.mjs');return proposeSourceBoundCoreFixedPointPackets({root,output},stages);}
 if(mode==='review'){const {reviewSourceBoundCoreFixedPointPackets}=await import('../tools/translation/source-bound-fixed-point-packet-readback.mjs');return reviewSourceBoundCoreFixedPointPackets(output,root);}
 throw Error('Explicit propose/review mode required');
}
export function synchronizeSourceUnits(args){
 const options=sourceUnitArguments(args);
 const boot='import {performSourceUnitSynchronization} from '+JSON.stringify(import.meta.url)+';console.log(JSON.stringify(await performSourceUnitSynchronization(JSON.parse(process.argv[1]))));';
 const result=spawnSync(process.versions.bun?'node':process.execPath,['--max-old-space-size=1792','--input-type=module','--eval',boot,JSON.stringify(options)],{cwd:options.root,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:options.root},encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 if(result.error||result.signal||result.status!==0){const error=new Error('Owned-core source worker failed'+(result.signal?' ('+result.signal+')':'')+'\n'+(result.stderr??'')+(result.stdout??''));error.cause=result.error;throw error;}
 return JSON.parse(result.stdout);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(synchronizeSourceUnits(process.argv.slice(2))));
