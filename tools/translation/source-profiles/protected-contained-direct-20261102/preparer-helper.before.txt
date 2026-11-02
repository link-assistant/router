// Fixed preparer/asset mutation intent DATA. Operational veto, never authority.
import fs from 'node:fs';
import {resolve,relative,dirname,sep} from 'node:path';
import {types} from 'node:util';
import {withProtectedNativeWriter,allowProtectedNativeDirectWrites,mutateProtectedNativeDirectWriter} from './protected-native-writers-20261102.mjs';
export {withProtectedNativeWriter as withProtectedPreparerWriter};
function errorCode(error){if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;const field=Object.getOwnPropertyDescriptor(error,'code');return field&&Object.hasOwn(field,'value')?field.value:undefined;}
function mode(path,directory=false){try{return fs.statSync(path).mode&0o777;}catch(error){if(errorCode(error)!=='ENOENT')throw error;return (directory?0o777:0o666)&~process.umask();}}
const name=(root,path)=>relative(root,path).split(sep).join('/');
export function preparerSourceMutationRows(root,rows){
 const intents=[];
 for(const row of rows){const full=resolve(root,row.path),target=name(root,full),permissions=mode(full);
  // writeFileSync's original w flag creates/truncates before filling the file.
  // Equal final bytes cannot conceal truncating a protected nonempty source.
  if(row.before!==null)intents.push({path:target,before:row.before,after:'',mode:permissions});
  intents.push({path:target,before:row.before===null?null:'',after:row.after,mode:permissions});
 }
 return intents;
}
// The original public copy writers have no total row-count cap. Every bounded
// batch is admitted before any caller writes; each real write is admitted again.
export function allowPreparerSourceWrites(root,rows){
 let batch=[];for(const row of rows){batch.push(row);if(batch.length===1024){allowProtectedNativeDirectWrites(root,preparerSourceMutationRows(root,batch));batch=[];}}
 if(batch.length)allowProtectedNativeDirectWrites(root,preparerSourceMutationRows(root,batch));
}
export function writePreparerSource(root,row,write){return mutateProtectedNativeDirectWriter(root,preparerSourceMutationRows(root,[row]),write);}
export function createPreparerAssetParents(root,path,create){
 const names=[],parts=name(root,dirname(resolve(root,path))).split('/');let full=resolve(root);
 for(const part of parts){if(!part)continue;full=resolve(full,part);try{fs.statSync(full);}catch(error){if(errorCode(error)!=='ENOENT')throw error;names.push({path:name(root,full),before:null,after:'',mode:mode(full,true)});}}
 return mutateProtectedNativeDirectWriter(root,names,create);
}
