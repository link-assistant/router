// Synchronous source failure propagation only, never owner/type/runtime proof.
// Frames and failures live only inside the active operation stack. There is no
// across-operation source, input, hash, owner, verdict or encoded-result cache.
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
const frames=[];
/** This can only revoke current source operations, never authorize one. */
export function invalidateActiveSourceOperations(){for(const frame of frames)frame.failed=true;}
function healthy(){if(frames.some(frame=>frame.failed))throw new TypeError('Source operation invalidated by an observed nested source-input failure');}
/** Only wrap private source validation here, never an application callback. */
export function withSourceInputValidation(run){requireSynchronousSourceCallback(run);try{return withCompleteSourceClosingFence(run,[]);}catch(error){invalidateActiveSourceOperations();throw error;}}
export function withSourceFailureOperation(run){
 requireSynchronousSourceCallback(run);healthy();if(frames.length>=256)throw new TypeError('Aggregate synchronous source operation depth bound');const frame={failed:false};frames.push(frame);
 try{return withCompleteSourceClosingFence(run,[healthy]);}finally{const last=frames.pop();frame.failed=false;if(last!==frame){frames.length=0;throw new TypeError('Original synchronous source failure stack changed');}}
}
