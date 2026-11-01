// Existing full canonical/retained project metadata domain, DATA only.
// No old128-file/4MiB fixture API or semantic permission is widened here.
import {isDeepStrictEqual,types} from 'node:util';
import {planConsumedProjectMetaUtf8ObjectStorage,loadProjectMetaStorageWithCompressedConcrete,PROJECT_META_STORAGE_LIMITS} from './project-meta-consumed-storage.mjs';
import {serializeProjectMetaFieldUtf8} from './project-meta-field-flat-json.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Policy complete retained metadata: '+message);};
const safe=path=>typeof path==='string'&&path.length>0&&path.length<=4096&&!/[:\\\0\r\n]/u.test(path)&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');
function record(value,allowed,required=allowed){if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('ordinary complete metadata DATA record required');for(const key of Reflect.ownKeys(value)){const field=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!allowed.includes(key)||!field||!Object.hasOwn(field,'value'))fail('own bounded known metadata DATA fields required');}if(required.some(key=>!Object.hasOwn(value,key)))fail('all complete metadata DATA fields must be own');}
function packetData(packet){
 record(packet,['schema','metaPath','javascriptPath','typescriptPath','text','components','targets','limits','sourceAuthority','semanticAuthority']);if(packet.schema!=='policy-original-retained-field-packet-v1')fail('exact metadata packet schema required');
 const array=packet.components;if(!array||types.isProxy(array)||!Array.isArray(array)||Object.getPrototypeOf(array)!==Array.prototype)fail('ordinary complete component array required');const length=Object.getOwnPropertyDescriptor(array,'length');if(!length||!Object.hasOwn(length,'value')||length.value>3||Reflect.ownKeys(array).length!==length.value+1)fail('bounded dense complete metadata components required');
 for(let index=0;index<length.value;index++){const field=Object.getOwnPropertyDescriptor(array,String(index));if(!field||!Object.hasOwn(field,'value'))fail('own metadata components without accessors required');record(field.value,['field','target','path','bytes','sha256','text']);}
 record(packet.targets,['meta','javascript','typescript','checkedProgramMeta','targetProgramMeta','concreteSyntaxMeta'],['meta','javascript','typescript']);record(packet.limits,['fileBytes','totalBytes']);
 const header={...packet,text:null,components:array.map(row=>({...row,text:null}))};return accountData(header);
}
function rows(packet){
 const retained=packetData(packet);
 if(!packet||!safe(packet.metaPath)||!safe(packet.javascriptPath)||!safe(packet.typescriptPath)||typeof packet.text!=='string'||!Array.isArray(packet.components)||packet.components.length>3)fail('complete original field storage packet required');if(packet.text.length>PROJECT_META_STORAGE_LIMITS.fileBytes)fail('original metadata root field length bound');let bytes=Buffer.byteLength(packet.text);if(bytes>PROJECT_META_STORAGE_LIMITS.fileBytes)fail('original metadata root field bound');const paths=new Set([packet.metaPath]);
 for(const row of packet.components){if(!row||!safe(row.path)||paths.has(row.path)||typeof row.text!=='string'||row.text.length>PROJECT_META_STORAGE_LIMITS.fileBytes||Buffer.byteLength(row.text)>PROJECT_META_STORAGE_LIMITS.fileBytes)fail('complete unique bounded metadata component bytes required');paths.add(row.path);bytes+=Buffer.byteLength(row.text);if(bytes>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('original complete metadata aggregate bound');}
 if(bytes+retained.utf8Bytes>PROJECT_META_STORAGE_LIMITS.totalBytes||bytes+retained.utf16Units>PROJECT_META_STORAGE_LIMITS.totalBytes)fail('complete packet body/header occurrence bound');return {bytes,files:[{path:packet.metaPath,text:packet.text},...packet.components.map(row=>({path:row.path,text:row.text}))]};
}
export function storePolicyProjectMeta(meta,options={}){
 accountData(options);record(options,['metaPath','javascriptPath','typescriptPath'],['javascriptPath','typescriptPath']);const metaPath=Object.hasOwn(options,'metaPath')?options.metaPath:'policy/whole-project.json',javascriptPath=options.javascriptPath,typescriptPath=options.typescriptPath;
 if(!safe(metaPath)||!safe(javascriptPath)||!safe(typescriptPath))fail('actual complete output paths required');
 // The existing consuming producer owns/deletes the large selected semantic
 // fields only after their full original canonical bytes are retained.
 const storage=planConsumedProjectMetaUtf8ObjectStorage(metaPath,meta,{serializeUtf8:serializeProjectMetaFieldUtf8}),packet={schema:'policy-original-retained-field-packet-v1',metaPath,javascriptPath,typescriptPath,text:storage.text,components:storage.components,targets:{meta:metaPath,javascript:javascriptPath,typescript:typescriptPath,...storage.targets},limits:PROJECT_META_STORAGE_LIMITS,sourceAuthority:false,semanticAuthority:false};rows(packet);return packet;
}
export function replayPolicyProjectMeta(packet){
 rows(packet);const components=new Map(packet.components.map(row=>[row.path,row.text]));
 // This original loader rechecks every complete component, canonical JSON,
 // compressed concrete inverse, exact logical key census and full aggregate.
 return loadProjectMetaStorageWithCompressedConcrete(packet.text,{metaPath:packet.metaPath,targets:packet.targets,read:path=>{if(!components.has(path))fail('absent complete original metadata component');return components.get(path);}});
}
export function visitPolicyProjectMeta(packet,consume){
 requireSynchronousSourceCallback(consume);const source=rows(packet);replayPolicyProjectMeta(packet);
 let visited=0;for(const row of source.files){const event={schema:'complete-policy-project-meta-field-v1',index:visited,path:row.path,source:row.text,bytes:Buffer.byteLength(row.text),sourceAuthority:false,semanticAuthority:false};Object.freeze(event);withCompleteSourceClosingFence(()=>{const answer=consume(event);accountData(answer);},[]);visited++;}
 return {visited,bytes:source.bytes,allCompleteFieldsDelivered:true,limits:PROJECT_META_STORAGE_LIMITS,sourceAuthority:false,semanticAuthority:false};
}
export function requireSamePolicyProjectMetaPacket(submitted,fresh){
 rows(submitted);rows(fresh);replayPolicyProjectMeta(submitted);replayPolicyProjectMeta(fresh);
 if(!isDeepStrictEqual(submitted,fresh))fail('complete submitted metadata differs from a full fresh actual source/producer/private-type reissue');return true;
}
