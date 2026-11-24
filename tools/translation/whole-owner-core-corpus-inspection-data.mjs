// Invocation-local source-inspection DATA. No stored row issues an owner,
// binding, type or executable permit. Only the fresh private capture writes it.
import {createHash} from 'node:crypto';
import {createWholeOwnerCoreAdoptionProducerContext,captureWholeOwnerCoreAdoptionAttributeData} from './whole-owner-core-producer-candidate.mjs';
import {originalAttributeOwnerBulkCryptoReady} from './attribute-owner-bulk-crypto.mjs';
import {originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=message=>{throw TypeError('Whole-owner corpus inspection DATA: '+message);};
const initial=originalAttributeOwnerBulkCryptoReady(),jsonOwner=initial?JSON:null,parseField=initial?Object.getOwnPropertyDescriptor(jsonOwner,'parse'):null,parseQualified=!!(parseField&&Object.hasOwn(parseField,'value')&&originalCapturedFunctionSource(parseField.value)==='function parse() { [native code] }');
export function wholeOwnerCoreCorpusInspectionReady(){if(!parseQualified||!originalAttributeOwnerBulkCryptoReady())return false;const current=Object.getOwnPropertyDescriptor(JSON,'parse');return JSON===jsonOwner&&!!current&&Object.hasOwn(current,'value')&&current.value===parseField.value&&current.writable===parseField.writable&&current.enumerable===parseField.enumerable&&current.configurable===parseField.configurable;}
export function createWholeOwnerCoreCorpusInspectionData(graph,dependencyInputs){
 if(!wholeOwnerCoreCorpusInspectionReady())fail('fresh callback-free source operation required');
 const modules=graph.modules,originals=modules.map(module=>({module,file:module.file,path:[...module.path],source:module.source,view:module.sourceView,condition:module.configurationCondition,profile:JSON.stringify(module.compilationProfile)}));
 let context=null,data=null,open=true;const rows=new Map(),effectRows=new Map(),selected=new Map(),key=(file,path)=>JSON.stringify([file,path]);
 try{context=createWholeOwnerCoreAdoptionProducerContext({modules,compilationProfile:graph.compilationProfile,dependencyInputs});const encoded=captureWholeOwnerCoreAdoptionAttributeData(context,modules);if(!wholeOwnerCoreCorpusInspectionReady())fail('native complete DATA parser changed during capture');data=Reflect.apply(parseField.value,jsonOwner,[encoded]);}finally{context=null;}
 if(!wholeOwnerCoreCorpusInspectionReady()||data.schema!=='whole-owner-core-attribute-inspection-data-v1'||data.sourceAuthority!==false||data.runtimeAuthority!==false||!Array.isArray(data.modules)||context!==null)fail('fresh complete primitive inspection capture required');
 if(data.producerEffects===null){if(data.modules.length)fail('null producer cannot supply source attributes');}
 else{
  if(data.modules.length!==modules.length||!Array.isArray(data.producerEffects.selections))fail('complete source/effect census differs');
  for(let at=0;at<modules.length;at++){const row=data.modules[at],module=modules[at],id=key(module.file,module.path);if(rows.has(id)||row.file!==module.file||!same(row.module,module.path))fail('complete ordered original module association differs');rows.set(id,row);}
  for(const row of data.producerEffects.selections){const id=key(row.file,row.module);if(!rows.has(id))fail('effect has no genuine original module');let values=effectRows.get(id);if(!values){values=[];effectRows.set(id,values);}values.push(row);}
 }
 function verify(){
  if(!open||!wholeOwnerCoreCorpusInspectionReady())fail('inspection closed or original intrinsics changed');
  if(modules.length!==originals.length||originals.some((row,at)=>modules[at]!==row.module||row.module.file!==row.file||row.module.source!==row.source||!same(row.module.path,row.path)||row.module.sourceView!==row.view||row.module.configurationCondition!==row.condition||JSON.stringify(row.module.compilationProfile)!==row.profile))fail('complete original module graph changed');
 }
 function rejoin(module){
  verify();const original=originals.find(row=>row.module===module);if(!original)fail('genuine original module required');
  // This private view API independently joins the entire original source,
  // actual module path and current profile; public DATA never substitutes it.
  const items=originalSourceModuleItems(module),row=rows.get(key(module.file,module.path)),sourceSha256=hash(module.source);
  if(!data.producerEffects)return {row:null,items,sourceSha256};
  if(!row||row.source!==module.source||row.sourceSha256!==sourceSha256||row.sourceViewDigest!==(module.sourceView?.digest??null)||row.configurationCondition!==(module.configurationCondition??null)||!same(row.module,module.path)||!Array.isArray(row.attributes))fail('complete original source/view association differs');
  for(const attribute of row.attributes){const span=attribute.span;if(!Array.isArray(span)||span.length!==2||!span.every(Number.isSafeInteger)||span[0]<0||span[1]<=span[0]||span[1]>module.source.length||typeof attribute.expected!=='string'||module.source.slice(...span)!==attribute.expected||!items.some(item=>span[0]>=item.start&&span[1]<=item.end))fail('exact original attribute source/span association differs');}
  return {row,items,sourceSha256};
 }
 function joinEffect(row,module,actual){
  if(row.file!==module.file||!same(row.module,module.path)||row.sourceSha256!==actual.sourceSha256||!row.span||!Number.isSafeInteger(row.span.start)||!Number.isSafeInteger(row.span.end)||!actual.items.some(item=>item.start===row.span.start&&item.end===row.span.end)||row.itemSha256!==hash(module.source.slice(row.span.start,row.span.end)))fail('effect original source/item association differs');
 }
 function detached(value){verify();const encoded=JSON.stringify(value);if(!wholeOwnerCoreCorpusInspectionReady())fail('native DATA copy changed');return Reflect.apply(parseField.value,jsonOwner,[encoded]);}
 for(const module of modules)rejoin(module);
 return {
  attributes(module){
   const actual=rejoin(module);if(!actual.row)return [];
   // Match the OLD lazy successful-inspection visitation, not eager capture
   // order. Include every selected item even if its final span list is empty.
   for(const row of effectRows.get(key(module.file,module.path))??[]){joinEffect(row,module,actual);const id=module.file+':'+JSON.stringify(module.path)+':'+row.span.start+':'+row.span.end,prior=selected.get(id);if(prior&&!same(prior,row))fail('duplicate original effect association differs');if(!prior)selected.set(id,row);}
   return detached(actual.row.attributes);
  },
  effects(){verify();for(const row of selected.values()){const module=modules.find(module=>module.file===row.file&&same(module.path,row.module));if(!module)fail('selected original module absent');joinEffect(row,module,rejoin(module));}return data.producerEffects===null?null:detached({...data.producerEffects,selections:[...selected.values()]});},
  verify,
  close(){open=false;data=null;rows.clear();effectRows.clear();selected.clear();originals.length=0;},
 };
}
