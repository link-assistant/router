// One NEW complete synchronous binding operation, never an old read's cache.
// The factory instance remains private to the copied actual Serde issuer.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {deriveFootprintSourceContext} from './derive-footprints.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {isSourceModuleView} from './source-module-views.mjs';
import {originalAttributeOwnerBulkCryptoReady} from './attribute-owner-bulk-crypto.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Whole attribute owner operation: '+message);};
function immutableSourceCarriers(source){
 const own=(owner,key)=>{const field=Object.getOwnPropertyDescriptor(owner,key);return field&&Object.hasOwn(field,'value')?field:null;};
 const modules=source.modules;if(types.isProxy(modules)||!Array.isArray(modules)||Object.getPrototypeOf(modules)!==Array.prototype||!Object.isFrozen(modules))return false;
 const length=own(modules,'length');if(!length||length.value>20000||Reflect.ownKeys(modules).length!==length.value+1)return false;
 for(let at=0;at<length.value;at++){
  const slot=own(modules,''+at),module=slot?.value;if(!module||types.isProxy(module)||Object.getPrototypeOf(module)!==Object.prototype||!Object.isFrozen(module))return false;
  const file=own(module,'file'),text=own(module,'source'),path=own(module,'path');if(typeof file?.value!=='string'||typeof text?.value!=='string'||!path||types.isProxy(path.value)||!Array.isArray(path.value)||Object.getPrototypeOf(path.value)!==Array.prototype||!Object.isFrozen(path.value))return false;
  const count=own(path.value,'length');if(!count||count.value>64||Reflect.ownKeys(path.value).length!==count.value+1)return false;for(let index=0;index<count.value;index++)if(typeof own(path.value,''+index)?.value!=='string')return false;
  for(const name of ['configurationCondition','sourceView']){const field=Object.getOwnPropertyDescriptor(module,name);if(field&&!Object.hasOwn(field,'value'))return false;if(name==='sourceView'&&field&&(!isSourceModuleView(field.value)||!Object.isFrozen(field.value)))return false;}
 }
 return true;
}
export function createOriginalAttributeOwnerBulkOperation(){
 let current=null;
 return Object.freeze({
  active(){return current!==null;},
  current(context){
   if(!current)return null;
   if(current.context!==context||!current.open||!originalAttributeOwnerBulkCryptoReady())fail('current complete source operation changed');
   return current;
  },
  run(context,run,fallback=run){
   if(typeof run!=='function'||typeof fallback!=='function')fail('synchronous complete original creator required');
   const legacy=()=>{const prior=current;current=null;try{return fallback();}finally{current=prior;}};
   if(!originalAttributeOwnerBulkCryptoReady())return legacy();
   let source=deriveFootprintSourceContext(context),rows=[],units=0;
   // Unknown size selects the complete old creator; no owner list is filtered.
   if(!immutableSourceCarriers(source))return legacy();
   for(const module of source.modules){units+=module.source.length;if(units>64*1024*1024)return legacy();}
   let external=JSON.stringify([...source.externalModules]),profile=JSON.stringify(source.compilationProfile),dependencies=source.dependencies;
   for(const module of source.modules)rows.push({file:module.file,path:JSON.stringify(module.path),source:module.source,sha256:hash(module.source),view:module.sourceView,condition:module.configurationCondition??null});
   if(!originalAttributeOwnerBulkCryptoReady())fail('entry source capture changed crypto/intrinsics');
   let program=resolveModuleBindings({...source,deriveContext:context}),canonical=JSON.stringify(program),digest=hash(canonical);
   if(!originalAttributeOwnerBulkCryptoReady())fail('fresh complete binding program changed crypto/intrinsics');
   const prior=current,frame={context,open:true,bindings:program,digest,original:source};current=frame;
   try{
    const result=run();
    if(!originalAttributeOwnerBulkCryptoReady())fail('final original crypto/intrinsics changed');
    // No partial output escapes a failed final boundary. All original source
    // payloads are hashed afresh, independently of the one binding-program hash.
    const final=deriveFootprintSourceContext(context);
    if(final.modules!==source.modules||final.modules.length!==rows.length||final.dependencies!==dependencies||JSON.stringify(final.compilationProfile)!==profile||JSON.stringify([...final.externalModules])!==external)fail('complete original context changed during operation');
    for(let at=0;at<rows.length;at++){
     const module=final.modules[at],row=rows[at];if(module.file!==row.file||JSON.stringify(module.path)!==row.path||module.source!==row.source||module.sourceView!==row.view||(module.configurationCondition??null)!==row.condition||hash(module.source)!==row.sha256)fail('full original source/view changed during operation');
    }
    if(!originalAttributeOwnerBulkCryptoReady())fail('final original crypto/intrinsics changed');
    return result;
   }finally{
    current=prior;frame.open=false;frame.context=null;frame.bindings=null;frame.digest=null;frame.original=null;
    rows.length=0;source=null;program=null;canonical=null;digest=null;external=null;profile=null;dependencies=null;
   }
  },
 });
}
