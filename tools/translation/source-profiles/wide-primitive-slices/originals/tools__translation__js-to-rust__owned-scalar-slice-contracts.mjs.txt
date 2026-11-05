// Finite ABI descriptions only; fresh native source/type/body checks issue IR.
export const OWNED_PRIMITIVE_SLICE_RUST_TYPES=Object.freeze({'u64-list-ref':"&'a [u64]",'i64-list-ref':"&'a [i64]",'bool-list-ref':"&'a [bool]"});
export const ownedPrimitiveSliceElement=type=>Object.hasOwn(OWNED_PRIMITIVE_SLICE_RUST_TYPES,type)?type.slice(0,-9):null;
export const ownedPrimitiveSliceDomain=element=>['u64','i64','bool'].includes(element)?element+'-list-ref':null;
export function emitOwnedPrimitiveSliceLoop(statement,{rust,expr,body,sequence,indent,rustName}){
 if(!ownedPrimitiveSliceElement(statement.value.type))throw new TypeError('Actual checked primitive slice loop required');const pad=' '.repeat(indent),value=expr(statement.value);if(!rust)return pad+'for (const '+statement.name+' of '+value+') {\n'+body(statement.body,indent+4)+'\n'+pad+'}';
 const temporary='__ro_scalar_values_'+sequence();return pad+'let '+temporary+' = '+value+';\n'+pad+'for '+rustName(statement.name)+' in '+temporary+'.iter().copied() {\n'+body(statement.body,indent+4)+'\n'+pad+'}';
}
