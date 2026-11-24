// Real strict/runtime receiving for DATA returned by the fixed paired inverse.
// An execution receipt never supplies missing native source/type/owner proof.
import {verifyOpaqueConstantAdoptionTargets} from './opaque-constant-adoption-20261101-targets.mjs';
import {hostRuntimeAssetsNamedDataAliases} from './host-assets.mjs';
import {effectRuntimeAssets} from './effect-assets.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
export async function verifyOpaqueBindingEditedTargets(result,options){
 if(!result||result.schema!=='whole-corpus-paired-binding-rename-inverse-v1'||typeof result.javascript!=='string'||typeof result.typescript!=='string'||typeof result.originalWholeProject?.entry!=='string')throw TypeError('complete actual paired binding inverse projections required');
 const assets=hostRuntimeAssetsNamedDataAliases(),effects=effectRuntimeAssets();assets.set('effects.mjs',effects.javascript);assets.set('effects.d.mts',effects.declarations);const runtimeFiles=[...assets].map(([path,source])=>({path:'runtime/'+path,source}));account({runtimeFiles,javascript:result.javascript,typescript:result.typescript});
 // The unmodified verifier compiles the entire emitted TS, imports both actual
 // emitted modules and requires all nine independent token-report edge vectors
 // at this exact adopted phase. No smaller fixture or injectable checks replace it.
 const received=await verifyOpaqueConstantAdoptionTargets({entry:result.originalWholeProject.entry,phases:[{phase:'adopted-project',javascript:result.javascript,typescript:result.typescript}],runtimeFiles},{...options,checks:[]});
 return {...received,editedBindingProjection:true,independentOriginalTokenReportVectorsRequired:9,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,runtimeParity:false};
}
