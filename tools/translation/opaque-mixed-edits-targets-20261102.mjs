// Real strict/runtime receiving for DATA returned by the fixed paired inverse.
// An execution receipt never supplies missing native source/type/owner proof.
import {verifyOpaqueConstantAdoptionTargets} from './opaque-constant-adoption-20261101-targets.mjs';
import {hostRuntimeAssetsNamedDataAliases} from './host-assets.mjs';
import {effectRuntimeAssets} from './effect-assets.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
export async function verifyOpaqueMixedEditedTargets(result,options){
 if(!result||result.schema!=='whole-corpus-paired-mixed-edit-inverse-v1'||typeof result.javascript!=='string'||typeof result.typescript!=='string'||typeof result.originalWholeProject?.entry!=='string'||typeof result.javascriptHistory?.inverse!=='string'||typeof result.typescriptHistory?.inverse!=='string')throw TypeError('complete actual paired mixed edit inverse projections required');
 const assets=hostRuntimeAssetsNamedDataAliases(),effects=effectRuntimeAssets();assets.set('effects.mjs',effects.javascript);assets.set('effects.d.mts',effects.declarations);const runtimeFiles=[...assets].map(([path,source])=>({path:'runtime/'+path,source}));account({runtimeFiles,javascript:result.javascript,typescript:result.typescript});
 // The unmodified verifier compiles the entire emitted TS, imports both actual
 // emitted baseline/edited modules. All nine original token-report edge vectors
 // remain attached to the original adopted baseline; legitimate edited callees
 // may change behavior. The edited caller needs independent new vectors before
 // behavior qualification. No smaller baseline fixture replaces original cases.
 const received=await verifyOpaqueConstantAdoptionTargets({entry:result.originalWholeProject.entry,phases:[{phase:'adopted-project',javascript:result.javascriptHistory.inverse,typescript:result.typescriptHistory.inverse},{phase:'callee-edited-project',javascript:result.javascript,typescript:result.typescript}],runtimeFiles},{...options,checks:[]});
 return {...received,editedMixedProjection:true,independentBaselineTokenReportVectorsRequired:9,editedModulesImported:true,editedMixedBehaviorQualified:false,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,runtimeParity:false};
}
