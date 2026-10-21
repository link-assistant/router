// Callback-free admission only. The actual complete resolver still checks all
// original modules/items/owners/profiles and independently issues its result.
import {types} from 'node:util';
import {isDeriveFootprintContext,deriveFootprintSourceContext} from './derive-footprints.mjs';
import {compilationProfile} from './cfg-profile.mjs';
import {originalAttributeOwnerBulkCryptoReady} from './attribute-owner-bulk-crypto.mjs';
export function wholeOwnerResolverInputsCallbackFree({modules,externalModules,compilationProfile:profileInput,deriveContext,deriveBangContext,toolContext},isDeriveBangContext){
 // The producer supplies the resolver's actual lexical private-issuer import;
 // it is never read from the caller input or serialized evidence.
 if(!originalAttributeOwnerBulkCryptoReady()||!deriveContext||!isDeriveFootprintContext(deriveContext)||toolContext||deriveBangContext&&!isDeriveBangContext(deriveBangContext))return false;
 const original=deriveFootprintSourceContext(deriveContext),own=(owner,key)=>{const field=Object.getOwnPropertyDescriptor(owner,key);return field&&Object.hasOwn(field,'value')?field:null;},dense=(value,expected)=>{
  if(!value||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return false;const length=own(value,'length');if(!length||length.value!==expected.length||Reflect.ownKeys(value).length!==length.value+1)return false;
  for(let at=0;at<length.value;at++)if(own(value,''+at)?.value!==expected[at])return false;return true;
 };
 // Small profile DATA only, with an invocation-local completed immutable set.
 // No source, owner, hash, program or verdict survives this call.
 const done=new Set();let cells=0;
 function data(value,depth=0){
  if(value===null||['string','boolean','number','undefined'].includes(typeof value))return true;
  if(typeof value!=='object'||types.isProxy(value)||depth>32||++cells>8192)return false;if(done.has(value))return true;const parent=Object.getPrototypeOf(value);if(parent!==Object.prototype&&parent!==null&&parent!==Array.prototype||!Object.isFrozen(value))return false;
  const keys=Reflect.ownKeys(value);if(keys.length>8192)return false;for(const key of keys){if(typeof key!=='string'||key==='toJSON')return false;const field=own(value,key);if(!field||!data(field.value,depth+1))return false;}done.add(value);return true;
 }
 if(!data(profileInput))return false;let canonicalProfile;try{canonicalProfile=JSON.stringify(compilationProfile(profileInput));}catch{return false;}if(canonicalProfile!==JSON.stringify(original.compilationProfile))return false;
 if(!externalModules||typeof externalModules!=='object'||types.isProxy(externalModules)||Object.getPrototypeOf(externalModules)!==Map.prototype||Reflect.ownKeys(externalModules).length)return false;const expected=[...original.externalModules],actual=[...externalModules];if(actual.length!==expected.length)return false;for(let at=0;at<actual.length;at++)if(actual[at][0]!==expected[at][0]||actual[at][1]!==expected[at][1])return false;
 if(types.isProxy(modules)||!Array.isArray(modules)||Object.getPrototypeOf(modules)!==Array.prototype)return false;const length=own(modules,'length');if(!length||length.value!==original.modules.length||Reflect.ownKeys(modules).length!==length.value+1)return false;
 for(let at=0;at<length.value;at++){
  const module=own(modules,''+at)?.value,source=original.modules[at];if(!module||types.isProxy(module)||Object.getPrototypeOf(module)!==Object.prototype)return false;
  for(const key of Reflect.ownKeys(module))if(typeof key!=='string'||!own(module,key)||key==='toJSON')return false;
  if(own(module,'file')?.value!==source.file||own(module,'source')?.value!==source.source||!dense(own(module,'path')?.value,source.path))return false;
  for(const name of ['items','allItems']){const field=own(module,name);if(field&&!dense(field.value,source[name]))return false;}
  for(const name of ['sourceView','configurationCondition','moduleScopeKey']){const field=own(module,name);if(field&&field.value!==source[name])return false;if(name==='sourceView'&&!!field!==Object.hasOwn(source,name))return false;}
  const profile=own(module,'compilationProfile');if(profile&&profile.value!==undefined){if(!data(profile.value))return false;try{if(JSON.stringify(compilationProfile(profile.value))!==canonicalProfile)return false;}catch{return false;}}
 }
 return originalAttributeOwnerBulkCryptoReady();
}
