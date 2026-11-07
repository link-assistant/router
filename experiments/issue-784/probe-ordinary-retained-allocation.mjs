// Sampling ends before a complete ordinary generation; no output is installed.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {startAllocationSample,allocationCheckpoint,AllocationSampleStop} from './allocation-sample-control.mjs';
const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{encoding:'utf8',maxBuffer:1048576}).split('\0').filter(Boolean);
if(paths.length>1000)throw Error('Finite complete current Rust source count required');
startAllocationSample();
const {planRegeneration}=await import('../../tools/translation/bulk.mjs');
try{
 const plan=planRegeneration({root:resolve('.'),progress:event=>{
  console.log(JSON.stringify({event,diagnosticOnly:true,memory:process.memoryUsage()}));
  allocationCheckpoint('planner-progress',event.entry??event.source??null,event.phase??null);
 }});
 allocationCheckpoint('unexpected-complete-plan');
 throw Error('Diagnostic threshold was not reached; complete plan is not installed or qualified');
}catch(error){
 if(!(error instanceof AllocationSampleStop))throw error;
 console.log(JSON.stringify({intentionalEarlyStop:true,message:error.message,ordinaryPlannerCompleted:false,
  diagnosticOnly:true,productionExecutableGain:0,heapLimitMiB:512}));
}
