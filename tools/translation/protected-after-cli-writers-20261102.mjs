// Fixed .after value projection into the existing guarded CLI sink. UNRUN.
import {writeProtectedCoreCliPlan} from './protected-core-cli-writers-20261102.mjs';
// Lazy own wrappers do not read row fields during production. The actual fixed
// sink snapshots each value after original stale returns and writes those same
// captured values. This adapter grants no source/native permission.
export function writeProtectedAfterCliPlan(root,produce,stale){
 let original;
 writeProtectedCoreCliPlan(root,()=>{
  original=produce();
  return {get files(){return original.files.map(row=>({get path(){return row.path;},get current(){return row.current;},get currentAfter(){return row.after;}}));}};
 },()=>stale(original));
 return original;
}
