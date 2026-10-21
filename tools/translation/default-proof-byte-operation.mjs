// Internal byte-cost adapter only; no source, owner or checker authority.
import {withOperationProofByteConsumerBridge} from './operation-proof-byte-bridge.mjs';
export function withDefaultProofByteConsumers(run){
 if(typeof run!=='function')throw new TypeError('Default proof byte operation requires its actual synchronous callback');
 let entered=false;
 try{return withOperationProofByteConsumerBridge(()=>{entered=true;return run();});}
 catch(error){
  // Optional DATA machinery may refuse before touching the original operation.
  // Once entered, every original return/throw belongs to that one invocation.
  if(entered)throw error;
  return run();
 }
}
