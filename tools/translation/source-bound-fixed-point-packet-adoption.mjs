// Complete source/data readback only. Fresh original proposers keep all private
// source/tool/derive checks; this operation never grants executable admission.
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
import {openCoreAdoptionGzipPackets} from './core-adoption-packet-storage.mjs';
import {SOURCE_BOUND_OWNED_CORE_STAGES,proposeSourceBoundOwnedCoreStage} from './source-bound-owned-core-bulk.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
const fail=message=>{throw new TypeError('Source-bound owned packet readback: '+message);};
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
function object(value,keys,label){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('own '+label+' required');
 const names=Reflect.ownKeys(value);if(names.length!==keys.length||names.some(name=>typeof name!=='string'||!keys.includes(name)))fail(label+' fields differ');
 for(const name of keys){const field=Object.getOwnPropertyDescriptor(value,name);if(!field||!Object.hasOwn(field,'value'))fail(label+' accessors refused');}return value;
}
function array(value,bound,label){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>bound||Reflect.ownKeys(value).length!==value.length+1)fail('bounded dense '+label+' required');
 for(let at=0;at<value.length;at++){const field=Object.getOwnPropertyDescriptor(value,String(at));if(!field||!Object.hasOwn(field,'value'))fail(label+' holes/accessors refused');}return value;
}
function except(value,keys){return Object.fromEntries(Object.keys(value).filter(key=>!keys.includes(key)).map(key=>[key,value[key]]));}
export async function planSourceBoundCoreFixedPointPacketAdoption(request){
 const input=IO.options(request),output=resolve(input.output),rootInput=input.root;
 if(typeof rootInput!=='string'||!rootInput.length||rootInput.length>IO.limits.pathUnits||rootInput.includes('\0')||realpathSync(rootInput)!==resolve(rootInput))fail('actual unlinked physical source root required');
 const root=resolve(rootInput),revision=head(root);if(output===root||output.startsWith(root+'/')||root.startsWith(output+'/'))fail('packet evidence must remain outside the source repository');
 const {result,original,cargo,reader,index,current,changed}=await replaySourceBoundCoreFixedPointPacketsForPlanning(output,root);
 const inputs=original.rows.map(row=>({path:row.path,source:row.source})).concat(cargo.rows.map(row=>({path:row.path,source:row.source}))),outputs=changed.map(([path,after])=>{const prior=original.rows.find(row=>row.path===path);if(!prior)fail('one actual original source target required');return {path,before:prior.source,after,inverse:prior.source,mode:prior.identity.mode&0o777,kind:'source-bound-core-adoption'};});
 const packetSource={root:output,index,storage:reader.storage};
 const retainedSourceBytes=inputs.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0)+outputs.reduce((sum,row)=>sum+Buffer.byteLength(row.before)+Buffer.byteLength(row.after),0)+Buffer.byteLength(JSON.stringify(packetSource));if(retainedSourceBytes>64*1024*1024)fail('complete source installation plan exceeds its original 64 MiB bound');
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'owned-source-adoption:retain-complete-fresh-source-packet-replay-and-target-inverses',apply:()=>({inputs,outputs,packetSource})}]},
  {phase:'repository',rules:[{id:'router:package-explicit-source-only-adoption-with-current-Git-baseline',apply:value=>({...value,schema:'router-source-bound-fixed-point-packet-adoption-v1',root,entry:index.entry,baseRevision:revision,review:result,retainedSourceBytes,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false})}]},
 ]).run(null);
 reader.verify();IO.rejoin(original);cargo.verify();if(head(root)!==revision)fail('Git baseline changed during complete packet planning');return {...run.value,trace:run.trace};
}

import {execFileSync} from 'node:child_process';
import {createRulePipeline} from './rule-pipeline.mjs';
import {installFreshAsyncSourceProposal} from './unit-runtime-materialization.mjs';
function head(root){
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),empty=process.platform==='win32'?'NUL':'/dev/null';
 const revision=execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'rev-parse','HEAD'],{env:{...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:empty,GIT_CONFIG_SYSTEM:empty},encoding:'utf8',timeout:30_000,maxBuffer:4096}).trim();if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision))fail('complete current Git revision required');return revision;
}

export async function applySourceBoundCoreFixedPointPacketAdoption(serialized,options){
 const receipt=await installFreshAsyncSourceProposal(serialized,()=>planSourceBoundCoreFixedPointPacketAdoption(options));return {...receipt,semanticAuthority:false,reviewedSourceInstallation:true,applicationSourcesInstalled:receipt.changed.length>0,sourceInverseIsReverseExecution:false,executableCoverageGain:null,crossInvocationCache:false};
}

import {replaySourceBoundCoreFixedPointPacketsForPlanning} from './source-bound-fixed-point-packet-readback.mjs';
