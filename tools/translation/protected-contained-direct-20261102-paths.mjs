// Native filesystem address DATA only. No source/compiler/type/owner proof.
import fs from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {types} from 'node:util';
export const CONTAINED_NATIVE_DIRECT_LIMITS=Object.freeze({targets:4096,nativeAddressBytes:131072,retainedPathBytes:16777216});
const fail=message=>{throw new TypeError('Contained native source mutation: '+message);};
export function captureContainedNativeDirectTargets({requestedRoot,canonicalRoot,targets}={}){
 if(typeof requestedRoot!=='string'||typeof canonicalRoot!=='string')fail('primitive requested/canonical root association required');
 const requested=resolve(requestedRoot);if(fs.realpathSync(requested)!==canonicalRoot)fail('requested root differs from captured canonical policy root');
 if(!Array.isArray(targets)||types.isProxy(targets)||targets.length>CONTAINED_NATIVE_DIRECT_LIMITS.targets)fail('bounded native target array required');
 const fields=Object.getOwnPropertyDescriptors(targets);if(Reflect.ownKeys(fields).length!==targets.length+1)fail('dense own native target array required');
 const result=[];let retained=Buffer.byteLength(requested)+Buffer.byteLength(canonicalRoot);
 for(let at=0;at<targets.length;at++){
  const field=fields[at];if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string')fail('primitive own native target required');const requestedTarget=field.value;if(requestedTarget.length>CONTAINED_NATIVE_DIRECT_LIMITS.nativeAddressBytes||Buffer.byteLength(requestedTarget)>CONTAINED_NATIVE_DIRECT_LIMITS.nativeAddressBytes)fail('native address observation byte bound exceeded');
  if(!isAbsolute(requestedTarget)||resolve(requestedTarget)!==requestedTarget)fail('actual normalized absolute native target required');
  const relativeNative=relative(requested,requestedTarget);
  if(relativeNative===''||relativeNative==='..'||relativeNative.startsWith('..'+sep)||isAbsolute(relativeNative))fail('actual native target must remain within requested repository');
  const canonicalTarget=resolve(canonicalRoot,relativeNative),canonicalRelative=relative(canonicalRoot,canonicalTarget);
  if(canonicalRelative===''||canonicalRelative==='..'||canonicalRelative.startsWith('..'+sep)||isAbsolute(canonicalRelative))fail('actual native target escaped canonical repository');
  retained+=Buffer.byteLength(requestedTarget)+Buffer.byteLength(relativeNative)+Buffer.byteLength(canonicalTarget)+96;
  if(retained>CONTAINED_NATIVE_DIRECT_LIMITS.retainedPathBytes)fail('complete retained native address DATA byte bound exceeded');
  result.push(Object.freeze({requestedRoot:requested,canonicalRoot,requestedTarget,canonicalTarget,relativeNative,sourceAuthority:false,semanticAuthority:false}));
 }
 // Rechecking association does not turn these public records into custody.
 if(fs.realpathSync(requested)!==canonicalRoot)fail('requested root association changed during native address capture');return Object.freeze(result);
}
