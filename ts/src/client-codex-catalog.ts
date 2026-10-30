/** Validate foreign Codex catalogue constraints before exact managed takeover. */
import {open,lstat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {resolve} from 'node:path';
import {optionalClientText,clientFailure} from './client-files.js';
import {requireNativePath} from './operation-input.js';
import {atomicWrite} from './storage.js';
import {parseClientTomlSource,editClientTomlSource} from './client-toml-cst.js';
async function catalogue(path:string):Promise<string>{
 await requireNativePath(path);const before=await lstat(path);if(!before.isFile()||before.isSymbolicLink())throw clientFailure('Codex model_catalog_json requires a regular nonsymlink file');const file=await open(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0)),limit=8*1024*1024;
 try{const stat=await file.stat();if(!stat.isFile()||stat.size>limit)throw clientFailure('Codex model_catalog_json exceeds its regular file bound');const chunks:Buffer[]=[];let bytes=0;for(;;){const buffer=Buffer.alloc(Math.min(65536,limit-bytes+1)),part=await file.read(buffer,0,buffer.length,null);if(!part.bytesRead)break;bytes+=part.bytesRead;if(bytes>limit)throw clientFailure('Codex model_catalog_json exceeds its byte bound');chunks.push(buffer.subarray(0,part.bytesRead));}const source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks,bytes));let data:any;try{data=JSON.parse(source);}catch{throw clientFailure('Codex model_catalog_json is not valid JSON');}if(!data||!Array.isArray(data.models))throw clientFailure('Codex model_catalog_json must contain a models array');return source;}finally{await file.close();}
}
export async function inspectCodexCatalogConstraint(paths:any,{cwd=process.cwd()}:any={}):Promise<any>{
 if(paths.info.client!=='codex')return null;const source=await optionalClientText(paths.config);if(source===null||!source.trim())return null;const document=parseClientTomlSource(source);if(!Object.hasOwn(document,'model_catalog_json'))return null;const value=document.model_catalog_json;if(typeof value!=='string'||!value)throw clientFailure('Codex model_catalog_json must be a file path string');const path=resolve(cwd,value),catalogSource=await catalogue(path);return {source,path,catalogSource,sourceAuthority:false,semanticAuthority:false};
}
export async function removeCodexCatalogConstraint(paths:any,txn:any,{cwd=process.cwd(),expected=null}:any={}):Promise<any>{
 const current=await inspectCodexCatalogConstraint(paths,{cwd});if(expected&&(current===null||current.source!==expected.source||current.path!==expected.path||current.catalogSource!==expected.catalogSource))throw clientFailure('Codex catalogue constraint changed before managed mutation');if(current===null)return {changed:false,sourceAuthority:false,semanticAuthority:false};await txn.verify(paths.config);const plan=editClientTomlSource(current.source,[{path:['model_catalog_json'],action:'delete'}]);if(await optionalClientText(paths.config)!==current.source||await catalogue(current.path)!==current.catalogSource)throw clientFailure('Codex catalogue constraint changed during source preparation');await atomicWrite(paths.config,plan.after);await txn.advance([paths.config]);return {changed:true,source:plan.before,after:plan.after,inverse:plan.inverse,stages:plan.stages,sourceAuthority:false,semanticAuthority:false};
}
