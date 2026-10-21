// New enclosing consumer only. Existing standalone/full-bang APIs stay intact.
import {types} from 'node:util';
import {deriveFootprintOriginalContext} from './derive-footprints.mjs';
import {originalDataFreezeIntrinsicsUnchanged,originalPathMembershipIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {proveSchemarsBangFootprint as proveOriginal,assertSchemarsBangFootprint as assertOriginal,originalSchemarsOutput as readOriginal,isSchemarsBangFootprint as isOriginal} from './schemars-bang-footprints.mjs';
import {proveSchemarsWithOutput,assertSchemarsWithOutput,originalSchemarsWithOutput,isSchemarsWithOutput} from './schemars-with-bang-candidate.mjs';
const originalTypes=types,get=Object.getOwnPropertyDescriptor,hasOwn=Object.hasOwn,proxyField=get(types,'isProxy'),isProxy=proxyField?.value;
const fail=message=>{throw new TypeError('Private Schemars enclosing dispatch: '+message);};
function ownSelection(options){
 if(types!==originalTypes||typeof isProxy!=='function'||originalCapturedFunctionSource(isProxy)!=='function isProxy() { [native code] }')fail('native input operations changed');
 const current=get(originalTypes,'isProxy');if(!current||!hasOwn(current,'value')||current.value!==isProxy||current.writable!==proxyField.writable||current.enumerable!==proxyField.enumerable||current.configurable!==proxyField.configurable||!originalDataFreezeIntrinsicsUnchanged()||!originalPathMembershipIntrinsicsUnchanged())fail('native input operations changed');
 if(!options||typeof options!=='object'||isProxy(options))fail('own input DATA required');const context=get(options,'context'),certificate=get(options,'certificate');if(!context||!certificate||!hasOwn(context,'value')||!hasOwn(certificate,'value'))fail('own original context/certificate DATA required');
 // Membership is checked before reading any certificate fields or attributes.
 deriveFootprintOriginalContext(context.value,certificate.value);return {context:context.value,certificate:certificate.value};
}
export function proveSchemarsBangFootprint(options){
 const selected=ownSelection(options),{context,certificate}=selected;
 const withType=certificate.attributes.some(attribute=>attribute.name==='schemars'&&attribute.position==='container'&&attribute.helpers?.some(helper=>helper.key==='with'));
 // Selection only chooses a prover. Each actual private prover independently
 // rejoins the complete source/owner and refuses unsupported helper branches.
 return withType?proveSchemarsWithOutput({context,certificate}):proveOriginal({context,certificate});
}
export function assertSchemarsBangFootprint(proof,context,certificate){
 if(isSchemarsWithOutput(proof))return assertSchemarsWithOutput(proof,context,certificate);
 if(isOriginal(proof))return assertOriginal(proof,context,certificate);fail('unsealed, copied or foreign output');
}
export function originalSchemarsOutput(proof,context,certificate,module,item){
 if(isSchemarsWithOutput(proof))return originalSchemarsWithOutput(proof,context,certificate,module,item);
 if(isOriginal(proof))return readOriginal(proof,context,certificate,module,item);fail('unsealed, copied or foreign output');
}
export const isSchemarsBangFootprint=proof=>isSchemarsWithOutput(proof)||isOriginal(proof);
