// Function-only import cycle: no top-level call reads the bridge frame.
import {createScopedPrivateNativeProofJsonSerializer as originalScoped} from './private-native-proof-json.mjs';
import {suspendOperationProofByteConsumers} from './operation-proof-byte-bridge.mjs';
export function createScopedPrivateNativeProofJsonSerializer(){
 const original=originalScoped();
 return value=>suspendOperationProofByteConsumers(()=>original(value));
}
