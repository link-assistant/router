// Hosted CI entrypoint only. No --force/local/command/profile override exists.
import {mkdirSync,realpathSync,lstatSync,openSync,writeSync,closeSync,constants} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NATIVE_PROFILE_ORACLES,NATIVE_PROFILE_ORACLE_LIMITS as LIMIT} from '../tools/translation/native-profile-oracles-20261101-control.mjs';
import {createNativeProfileOracleCiGate,requireNativeProfileOracleCiGate} from '../tools/translation/native-profile-oracles-20261101-gate.mjs';
import {createNativeProfileOracleWorkspace,materializeNativeProfileOracleWorkspace,inspectNativeProfileOracleWorkspace,cleanupNativeProfileOracleWorkspace} from '../tools/translation/native-profile-oracles-20261101-materialize.mjs';
import {runNativeProfileOracle,inspectNativeProfileOracleProcessReceipt} from '../tools/translation/native-profile-oracles-20261101-process.mjs';
import {createNativeOracleDiskMonitor} from '../tools/translation/native-profile-oracles-20261101-disk.mjs';
import {performance} from 'node:perf_hooks';
function fail(message){throw new TypeError('Native profile CI: '+message);}
function receipt(path,data){const bytes=Buffer.from(JSON.stringify(data,null,2)+'\n');if(bytes.length>1048576)fail('complete bounded native receipt required');const fd=openSync(path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|(constants.O_NOFOLLOW??0),0o600);let failed=false;try{let at=0;while(at<bytes.length){const count=writeSync(fd,bytes,at,bytes.length-at,null);if(count<=0)fail('complete native receipt write required');at+=count;}}catch(error){failed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!failed)throw error;}}}
export async function runAllNativeProfileOracles(){
 const gate=await createNativeProfileOracleCiGate(),authorization=await requireNativeProfileOracleCiGate(gate);
 if(typeof process.env.RUNNER_TEMP!=='string'||process.env.RUNNER_TEMP.length>LIMIT.pathBytes)fail('actual runner temporary directory required');
 const temporary=realpathSync(process.env.RUNNER_TEMP),info=lstatSync(temporary);if(!info.isDirectory()||info.isSymbolicLink())fail('ordinary actual runner temporary directory required');
 const parent=join(temporary,'router-native-profile-oracles');try{mkdirSync(parent,{mode:0o700});}catch(error){if(error?.code!=='EEXIST')throw error;if(realpathSync(parent)!==parent||!lstatSync(parent).isDirectory()||lstatSync(parent).isSymbolicLink())fail('native evidence parent replaced');}
 const evidenceRoot=join(parent,process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT+'-'+process.env.GITHUB_JOB);mkdirSync(evidenceRoot,{mode:0o700});
 receipt(join(evidenceRoot,'STARTED.json'),{schema:'native-profile-run-v1',sourceSha:authorization.sourceSha,profiles:NATIVE_PROFILE_ORACLES.map(row=>row.id),complete:false,untranslatedLibraryProvider:true,semanticAuthority:false});
 const disk=createNativeOracleDiskMonitor(evidenceRoot,authorization.startedAt);disk.tick(true);
 let failed=false,primary;const outcomes=[];
 for(const profile of NATIVE_PROFILE_ORACLES){
  let workspace=null,processReceipt=null,status='incomplete',workspaceReceipt=null,profileFailed=false,profilePrimary;
  const tick=()=>{disk.tick();return undefined;};
  try{await requireNativeProfileOracleCiGate(gate);workspace=createNativeProfileOracleWorkspace({root:authorization.root,profileId:profile.id,sourceSha:authorization.sourceSha,evidenceRoot});await materializeNativeProfileOracleWorkspace(workspace,{tick});disk.tick(true);processReceipt=await runNativeProfileOracle(gate,workspace);await cleanupNativeProfileOracleWorkspace(workspace,{tick});status='complete';}catch(error){profileFailed=true;profilePrimary=error;processReceipt=inspectNativeProfileOracleProcessReceipt(gate);if(!failed){failed=true;primary=error;}}
  finally{if(workspace)try{workspaceReceipt=inspectNativeProfileOracleWorkspace(workspace);}catch(error){if(!profileFailed){profileFailed=true;profilePrimary=error;status='incomplete';}if(!failed){failed=true;primary=error;}}const outcome={profileId:profile.id,status,workspace:workspaceReceipt,process:processReceipt,error:profileFailed?{type:typeof profilePrimary,message:profilePrimary instanceof Error?profilePrimary.message:'non-Error primary retained by caller'}:null};outcomes.push(outcome);try{receipt(join(evidenceRoot,profile.id+'.json'),outcome);}catch(error){if(!failed){failed=true;primary=error;}}}
 }
 try{disk.tick(true);await requireNativeProfileOracleCiGate(gate);}catch(error){if(!failed){failed=true;primary=error;}}
 try{receipt(join(evidenceRoot,failed?'INCOMPLETE.json':'COMPLETE.json'),{schema:'native-profile-run-v1',sourceSha:authorization.sourceSha,complete:!failed,outcomes,disk:disk.inspect(),semanticAuthority:false,runtimeParityQualified:false});}catch(error){if(!failed){failed=true;primary=error;}}
 if(failed)throw primary;return Object.freeze({evidenceRoot,sourceSha:authorization.sourceSha,complete:true,semanticAuthority:false});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.length!==2)fail('no command-line override is accepted');await runAllNativeProfileOracles();}
