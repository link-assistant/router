// Invocation-local complete source DATA comparison only. Calling this helper
// grants no source, compiler, semantic, ownership or installation authority.
export function assertPairedSyncChildAfterAgreement(children,outputs){
 for(const output of outputs.values()){
  if(output.before===output.after)continue;
  for(const child of children){
   if(!child.inputs.has(output.path))continue;
   const proposed=child.outputs.get(output.path);
   if(child.inputs.get(output.path)!==output.before||!proposed||proposed.before!==output.before||proposed.after!==output.after||proposed.mode!==output.mode){
    throw new TypeError('Paired sync bulk: cross-unit dependency output lacks independently agreed complete projection: '+child.id+': '+output.path);
   }
  }
 }
}
