// Optional DATA retention after original private matrix validation. These bytes
// never grant compiler admission or replace freshness checks.
import {createHash} from 'node:crypto';
import {lstatSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative,resolve,sep} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {types} from 'node:util';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function physical(root,path){
 const target=resolve(root,path),inside=relative(root,target);
 if(!inside||inside.startsWith('..'+sep)||inside==='..'||inside.includes('\\')||resolve(path)===path)throw TypeError('Matrix draft requires a relative child path');
 let cursor=root;
 if(lstatSync(cursor).isSymbolicLink())throw TypeError('Matrix draft cannot follow symbolic links');
 for(const part of inside.split(sep)){
  cursor=join(cursor,part);
  try{if(lstatSync(cursor).isSymbolicLink())throw TypeError('Matrix draft cannot follow symbolic links');}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 return target;
}
export function retainMatrixDraft({root,staging,plans,inputs,directory,computedIndices}={}){
 if(directory===undefined)return null;
 if(typeof directory!=='string'||!directory)throw TypeError('Matrix draft directory must be explicit');
 root=resolve(root);
 // Evidence stays outside every generated source tree and checked-in artifact.
 const destination=physical(root,directory),allowed=join(root,'js/node_modules/.matrix-drafts');
 if(destination!==allowed)throw TypeError('Matrix drafts require js/node_modules/.matrix-drafts');
 physical(root,'js/node_modules/.matrix-drafts');mkdirSync(destination,{recursive:true});
 const attempt=mkdtempSync(join(destination,'complete-'));
 try{
  let total=0,count=0;const members=[];
  for(const plan of plans)for(const output of plan.outputs){
   if(++count>200000||!Number.isSafeInteger(output.bytes)||output.bytes<0||output.bytes>64*1024*1024||(total+=output.bytes)>1024*1024*1024)throw RangeError('Original matrix draft byte bounds exceeded');
   const source=physical(staging,output.path),stat=lstatSync(source);
   if(!stat.isFile()||stat.size!==output.bytes)throw TypeError('Complete matrix draft file size differs');
   const bytes=readFileSync(source);
   if(hash(bytes)!==output.sha256)throw TypeError('Complete matrix draft file hash differs');
   const name=String(count).padStart(6,'0')+'.gz',compressed=gzipSync(bytes);
   writeFileSync(join(attempt,name),compressed,{flag:'wx'});
   if(!gunzipSync(readFileSync(join(attempt,name))).equals(bytes))throw TypeError('Complete matrix draft readback differs');
   members.push({...output,storedAs:name,storedBytes:compressed.length,storedSha256:hash(compressed)});
  }
  const indices=[];let completeIndexBytes=0;
  if(computedIndices!==undefined){
   if(!Array.isArray(computedIndices)||types.isProxy(computedIndices)||Object.getPrototypeOf(computedIndices)!==Array.prototype||computedIndices.length<1||computedIndices.length>2||Reflect.ownKeys(computedIndices).length!==computedIndices.length+1)throw TypeError('Complete ordinary computed index data required');
   const names=new Set();
   for(let at=0;at<computedIndices.length;at++){
    const slot=Object.getOwnPropertyDescriptor(computedIndices,String(at)),row=slot&&Object.hasOwn(slot,'value')?slot.value:null;
    if(!row||types.isProxy(row)||Object.getPrototypeOf(row)!==Object.prototype||Reflect.ownKeys(row).length!==2)throw TypeError('Complete ordinary computed index row required');
    const fields=Object.getOwnPropertyDescriptors(row);
    if(!fields.path||!Object.hasOwn(fields.path,'value')||!fields.content||!Object.hasOwn(fields.content,'value'))throw TypeError('Complete computed index own data fields required');
    const path=fields.path.value,content=fields.content.value;
    if(typeof path!=='string'||!/^profiles\/(?:owned-definitions-)?matrix-[a-f0-9]{64}\.json$/u.test(path)||names.has(path)||typeof content!=='string')throw TypeError('Complete original computed index path/content required');
    const bytes=Buffer.from(content);
    if(bytes.toString('utf8')!==content||bytes.length>64*1024*1024||(completeIndexBytes+=bytes.length)+total>1024*1024*1024)throw RangeError('Original matrix draft index byte bounds exceeded');
    JSON.parse(content);names.add(path);
    const storedAs='index-'+String(at+1).padStart(2,'0')+'.json.gz',compressed=gzipSync(bytes);
    writeFileSync(join(attempt,storedAs),compressed,{flag:'wx'});
    if(!gunzipSync(readFileSync(join(attempt,storedAs))).equals(bytes))throw TypeError('Complete computed index readback differs');
    indices.push({path,bytes:bytes.length,sha256:hash(bytes),storedAs,storedBytes:compressed.length,storedSha256:hash(compressed)});
   }
  }
  const record={schema:computedIndices===undefined?'unqualified-isolated-matrix-draft-v1':'unqualified-isolated-matrix-draft-v2',inputs,plans,members,completeBytes:total,...(computedIndices===undefined?{}:{indices,completeIndexBytes}),semanticAuthority:false,runtimeParity:false,rustExecuted:false};
  writeFileSync(join(attempt,'manifest.json'),JSON.stringify(record)+'\n',{flag:'wx'});
  return attempt;
 }catch(error){rmSync(attempt,{recursive:true,force:true});throw error;}
}
