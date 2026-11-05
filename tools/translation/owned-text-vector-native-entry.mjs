// Actual checked leading calls only, joined by the parent's private issuer.
import {ownedTextVectorOperationShape} from './owned-text-vector-call-shape.mjs';
export function hasBoundedOwnedTextVectorEntry(current,name,kind,genuine){
 let node=current.body;const names=new Set(current.params.map(parameter=>parameter.name)),wanted={'text-vector':'truncate','text-vector-ref':'len','text-slice':'from_slice'}[kind];if(!wanted)return false;
 for(let at=0;at<current.params.length&&node?.k==='let';at++,node=node.body){
  const call=node.value,row=call?.k==='routerHostCall'?ownedTextVectorOperationShape(call.id):null;if(names.has(node.name)||node.mutable||!['truncate','len','from_slice'].includes(row?.operation)||!genuine(call,current)||call.args[0]?.k!=='var'||!names.has(call.args[0].name))return false;
  if(row.operation==='truncate'?call.args.length!==2||call.args[1].k!=='lit'||call.args[1].value!=='18446744073709551615'||call.args[1].type?.rustPrimitiveName!=='u64':call.args.length!==1)return false;
  if(call.args[0].name===name)return row.operation===wanted;
 }return false;
}
