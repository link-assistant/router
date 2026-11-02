// Absolute native mutation address DATA. Operational veto only, no authority.
import fs from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {types} from 'node:util';
export const ABSOLUTE_NATIVE_MUTATION_LIMITS=Object.freeze({targets:4096,addressBytes:131072,retainedBytes:16777216});
const fail=message=>{throw new TypeError('Absolute native source mutation: '+message);};
export function captureAbsoluteNativeMutationTargets({requestedRoot,canonicalRoot,targets}={}){
 if(typeof requestedRoot!=='string'||typeof canonicalRoot!=='string')fail('primitive requested/canonical root association required');const requested=resolve(requestedRoot);if(fs.realpathSync(requested)!==canonicalRoot)fail('requested root differs from captured policy root');
 if(!Array.isArray(targets)||types.isProxy(targets)||targets.length>ABSOLUTE_NATIVE_MUTATION_LIMITS.targets)fail('bounded own target array required');const fields=Object.getOwnPropertyDescriptors(targets);if(Reflect.ownKeys(fields).length!==targets.length+1)fail('dense own target array required');let retained=Buffer.byteLength(requested)+Buffer.byteLength(canonicalRoot);const result=[];
 for(let at=0;at<targets.length;at++){const field=fields[at];if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string')fail('primitive own native target required');const target=field.value;if(!isAbsolute(target)||resolve(target)!==target)fail('actual normalized absolute native target required');if(target.length>ABSOLUTE_NATIVE_MUTATION_LIMITS.addressBytes||Buffer.byteLength(target)>ABSOLUTE_NATIVE_MUTATION_LIMITS.addressBytes)fail('native address byte bound');const name=relative(requested,target),inside=name!==''&&name!=='..'&&!name.startsWith('..'+sep)&&!isAbsolute(name),actual=inside?resolve(canonicalRoot,name):target;retained+=Buffer.byteLength(target)+Buffer.byteLength(actual)+Buffer.byteLength(name)+96;if(retained>ABSOLUTE_NATIVE_MUTATION_LIMITS.retainedBytes)fail('retained native address DATA bound');result.push(Object.freeze({requestedRoot:requested,canonicalRoot,requestedTarget:target,canonicalTarget:actual,relativeNative:name,sourceAuthority:false,semanticAuthority:false}));}
 if(fs.realpathSync(requested)!==canonicalRoot)fail('requested root association changed during native target capture');return Object.freeze(result);
}
