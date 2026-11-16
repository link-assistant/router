// Resource acquisition hints only. They cannot authorize compiler admission.
import {types} from 'node:util';
import {resolve,relative} from 'node:path';
const own=(value,key)=>{if(value===null||!['object','function'].includes(typeof value)||types.isProxy(value))return undefined;const field=Object.getOwnPropertyDescriptor(value,key);return field&&Object.hasOwn(field,'value')?field.value:undefined;};
export function missingOpaqueReceivingResource(error,{root,acquiring}={}){
 if(acquiring!==true||typeof root!=='string')return null;const seen=new Set();let current=error;
 for(let depth=0;depth<8&&current!==undefined;depth++){
  if(current===null||!['object','function'].includes(typeof current)||types.isProxy(current)||seen.has(current))return null;seen.add(current);
  const name=own(current,'path');if(own(current,'code')==='ENOENT'&&typeof name==='string'&&!/[\0\r\n]/u.test(name)){
   const path=relative(resolve(root),resolve(root,name)).split('\\').join('/');
   if(path.startsWith('tools/translation/source-profiles/')&&path.length<=4096&&!/[:\\]/u.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'))return {path,reason:'missing-original-profile-resource',sourceAuthority:false,semanticAuthority:false};
  }
  current=own(current,'cause');
 }
 return null;
}
