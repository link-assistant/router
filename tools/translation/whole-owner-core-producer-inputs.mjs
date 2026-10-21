// Optional callback-free ingress. Every semantic/source check remains in the
// complete original constructor, resolver and private owner issuers.
import {types} from 'node:util';
import {isSourceModuleView,originalSourceModuleItems} from './source-module-views.mjs';
import {originalAttributeOwnerBulkCryptoReady} from './attribute-owner-bulk-crypto.mjs';
export function wholeOwnerCoreProducerInputsCallbackFree({modules,compilationProfile,dependencyInputs}){
 if(!originalAttributeOwnerBulkCryptoReady())return false;
 const own=(owner,key)=>{const field=Object.getOwnPropertyDescriptor(owner,key);return field&&Object.hasOwn(field,'value')?field:null;},array=value=>{
  if(!value||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return null;const length=own(value,'length');if(!length||length.value>20000||Reflect.ownKeys(value).length!==length.value+1)return null;const rows=[];for(let at=0;at<length.value;at++){const field=own(value,''+at);if(!field)return null;rows.push(field.value);}return rows;
 };
 const completed=new Set();let cells=0;
 function profile(value,depth=0){if(value==null||['string','boolean','number'].includes(typeof value))return true;if(typeof value!=='object'||types.isProxy(value)||depth>32||++cells>8192)return false;if(completed.has(value))return true;const parent=Object.getPrototypeOf(value);if(![Object.prototype,Array.prototype,null].includes(parent)||!Object.isFrozen(value))return false;const names=Reflect.ownKeys(value);if(names.length>8192)return false;for(const key of names){if(typeof key!=='string'||key==='toJSON')return false;const field=own(value,key);if(!field||!profile(field.value,depth+1))return false;}completed.add(value);return true;}
 if(!profile(compilationProfile)||!dependencyInputs||types.isProxy(dependencyInputs)||![Object.prototype,null].includes(Object.getPrototypeOf(dependencyInputs)))return false;
 const cargoKeys=Reflect.ownKeys(dependencyInputs);if(cargoKeys.length!==2||!cargoKeys.includes('manifest')||!cargoKeys.includes('lock'))return false;for(const name of cargoKeys)if(typeof own(dependencyInputs,name)?.value!=='string')return false;
 const rows=array(modules);if(!rows)return false;let units=0;
 for(const module of rows){
  if(!module||types.isProxy(module)||Object.getPrototypeOf(module)!==Object.prototype)return false;for(const key of Reflect.ownKeys(module))if(typeof key!=='string'||key==='toJSON'||!own(module,key))return false;
  const source=own(module,'source')?.value,path=array(own(module,'path')?.value),view=own(module,'sourceView')?.value;if(typeof source!=='string'||typeof own(module,'file')?.value!=='string'||!path||path.length>64||path.some(value=>typeof value!=='string')||!isSourceModuleView(view)||!Object.isFrozen(view)||(units+=source.length)>64*1024*1024)return false;
  const condition=own(module,'configurationCondition')?.value;if(condition!==undefined&&!['active','inactive','unknown'].includes(condition))return false;const local=own(module,'compilationProfile');if(local&&!profile(local.value))return false;
  let originals;try{originals=new Set(originalSourceModuleItems(module));}catch{return false;}
  for(const name of ['items','allItems']){const field=own(module,name);if(field){const items=array(field.value);if(!items||items.some(item=>!originals.has(item)))return false;}}
 }
 return originalAttributeOwnerBulkCryptoReady();
}
