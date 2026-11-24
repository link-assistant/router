// Explicit operation-local bytes only; no source/checker/owner authority.
import {types} from 'node:util';
import {createScopedPrivateNativeProofJsonSerializer as originalScoped} from './private-native-proof-json.mjs';
import {createPrivateFrozenJsonComposer as originalComposer} from './private-frozen-json.mjs';
import {withOperationProofByteComposition} from './operation-proof-byte-consumer-scope.mjs';
import {originalBatchedNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalBatchedLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
const ready=originalBatchedNamespaceTraversalIntrinsicsUnchanged()&&originalBatchedLexingIntrinsicsUnchanged();
const proxy=ready?types.isProxy:null,BridgeError=TypeError;
let active=null;
// There is deliberately no exported arbitrary serializer setter or frame data.
function factory(original){
 return value=>{const frame=active;return frame&&frame.open?frame.serialize(value):original(value);};
}
export function createScopedPrivateNativeProofJsonSerializer(){return factory(originalScoped());}
export function createPrivateFrozenJsonComposer(){return factory(originalComposer());}
// The separate scope fallback calls this BEFORE the exact old serializer can
// invoke any callback. It exposes no capability to turn byte composition on.
export function suspendOperationProofByteConsumers(run){
 const prior=active;active=null;
 try{return run();}finally{active=prior;}
}
export function withOperationProofByteConsumerBridge(run){
 if(!ready||typeof run!=='function'||proxy(run))throw new BridgeError('Proof byte bridge requires a qualified synchronous callback');
 return withOperationProofByteComposition(serialize=>{
  const prior=active,frame={open:true,serialize};active=frame;
  try{return run();}
  finally{frame.open=false;frame.serialize=null;active=prior;}
 });
}
