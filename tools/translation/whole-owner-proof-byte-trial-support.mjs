// Complete, separate physical original-twelve trial. No default installation.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {proposeCanonicalDeriveTrial} from './prepare-builtin-canonical-trial.mjs';
import {prepareWholeOwnerProofByteCandidate,WHOLE_OWNER_PROOF_BYTE_PHYSICAL_PATHS} from "./current-whole-owner-proof-byte-provider.mjs";
import {prepareWholeOwnerProofByteOriginalTrial} from './prepare-whole-owner-proof-byte-original-trial.mjs';
import {COMPILER_SOURCE_INPUT_LIMITS} from './compiler-source-inputs.mjs';
const CODEC='tools/translation/builtin-source-meta.mjs',PATHS=Object.freeze([CODEC,...WHOLE_OWNER_PROOF_BYTE_PHYSICAL_PATHS]);
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw TypeError('Whole owner proof byte trial: '+message);};
export function proposeWholeOwnerProofByteCanonicalTrial({root}={}){
 root=resolve(root);const canonical=proposeCanonicalDeriveTrial({root}),closure=prepareWholeOwnerProofByteCandidate({root}),runner=prepareWholeOwnerProofByteOriginalTrial({root});
 if([...closure.files,...runner.files].some(row=>row.current!==row.after))fail('fresh complete materialized byte consumer closure and original-twelve runner required');
 const codec={path:CODEC,original:canonical.original,language:canonical.candidateProducer.files.find(row=>row.path===CODEC.replace(/\.mjs$/u,'-canonical-candidate.mjs')).language,candidate:canonical.candidate,beforeMeta:canonical.beforeMeta,afterMeta:canonical.afterMeta,sequence:canonical.sequence,inverseSequence:canonical.inverseSequence,inverse:canonical.inverse,trace:canonical.trace};
 const overlays=[codec,...closure.physicalOverlays];selected(overlays,CODEC);
 const paths=[...new Set([...overlays.map(row=>row.path),...[...closure.inputs,...closure.currentProviderInputs].map(row=>row.path),...closure.prerequisiteInputs.map(row=>row.path),...closure.files.map(row=>row.path),...closure.operationProducer.files.map(row=>row.path),...closure.resolverProducer.files.map(row=>row.path),...closure.resolverProducer.wholeOwnerProducer.files.map(row=>row.path),...runner.inputs.map(row=>row.path),...runner.files.map(row=>row.path),'tools/translation/whole-owner-proof-byte-trial-support.mjs'])].sort();
 const requiredSourceInputs=paths.map(path=>{const bytes=readFileSync(resolve(root,path));if(bytes.length>COMPILER_SOURCE_INPUT_LIMITS.fileBytes)fail('complete current input file bound');return {path,bytes:bytes.length,sha256:hash(bytes)};});
 for(const row of requiredSourceInputs){const bytes=readFileSync(resolve(root,row.path));if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('complete current source input changed');}
 return {schema:'isolated-original-derive-whole-owner-proof-byte-canonical-source-v1',overlays,requiredSourceInputs,test:canonical.test,canonicalProducer:canonical,byteConsumerProducer:closure,runnerProducer:runner,originalPublicAPIUnchanged:true,originalTestUnchanged:true,productionSelected:false,trialSelected:true,performanceQualified:false,sourceAuthority:false,runtimeAuthority:false,scope:'complete coherent physical creator/resolver/output and serializer consumer closure; one qualified synchronous operation-local byte frame'};
}
function selected(overlays,path){
 if(!Array.isArray(overlays)||overlays.length!==PATHS.length||new Set(overlays.map(row=>row.path)).size!==PATHS.length||overlays.some(row=>!PATHS.includes(row.path)||typeof row.original!=='string'||typeof row.candidate!=='string'||row.path===CODEC&&row.original===row.candidate||row.candidate.length>COMPILER_SOURCE_INPUT_LIMITS.fileBytes||Buffer.byteLength(row.candidate)>COMPILER_SOURCE_INPUT_LIMITS.fileBytes))fail('exact complete codec and fifteen coherent private issuer/consumer overlays required');
 return overlays.find(row=>row.path===path);
}
export function assertWholeOwnerProofByteTrialInputs(vector,proposal){
 selected(proposal.overlays,CODEC);for(const row of proposal.requiredSourceInputs){const fact=vector.files.find(item=>item.path===row.path);if(!fact||fact.bytes!==row.bytes||fact.sha256!==row.sha256)fail('complete fresh candidate source absent from frozen original universe: '+row.path);}
 for(const row of proposal.overlays){const fact=vector.files.find(item=>item.path===row.path);if(!fact||Buffer.byteLength(row.original)!==fact.bytes||hash(row.original)!==fact.sha256)fail('complete original physical source/hash join differs');}
}
export function wholeOwnerProofByteTrialFilePacket(fact,original,trial,{overlays}={}){
 const row=selected(overlays,fact.path),limit=COMPILER_SOURCE_INPUT_LIMITS.fileBytes;
 if(!Buffer.isBuffer(original)||!Buffer.isBuffer(trial)||original.length!==fact.bytes||hash(original)!==fact.sha256||original.length>limit||trial.length>limit)fail('complete bounded original and trial source bytes required');
 if(row?!original.equals(Buffer.from(row.original))||(row.original!==row.candidate&&original.equals(trial))||!trial.equals(Buffer.from(row.candidate)):!original.equals(trial))fail('only the exact complete freshly proposed physical overlays may differ');
 return {schema:'complete-original-and-whole-owner-proof-byte-trial-file-v1',path:fact.path,original:{...fact,base64:original.toString('base64')},trial:{sourceAssociation:row&&row.original!==row.candidate?'complete-candidate-source':'same-original-source',bytes:trial.length,sha256:hash(trial),...(row&&row.original!==row.candidate?{base64:trial.toString('base64')}:{})}};
}
export function decodeWholeOwnerProofByteTrialFilePacket(packet,fact,{overlays}={}){
 const row=selected(overlays,fact.path);if(typeof packet?.original?.base64!=='string'||packet.original.base64.length>Math.ceil(COMPILER_SOURCE_INPUT_LIMITS.fileBytes/3)*4)fail('bounded complete original source encoding required');
 const original=Buffer.from(packet.original.base64,'base64'),trial=row?Buffer.from(row.candidate):original;
 if(JSON.stringify(packet)!==JSON.stringify(wholeOwnerProofByteTrialFilePacket(fact,original,trial,{overlays})))fail('complete physical source packet equation differs');return {original,trial};
}
