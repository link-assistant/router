// Optional DATA retention after original private matrix validation. These bytes
// never grant compiler admission or replace freshness checks.
import {createHash} from 'node:crypto';
import {lstatSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,relative,resolve,sep} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';

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
export function retainMatrixDraft({root,staging,plans,inputs,directory}={}){
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
  const record={schema:'unqualified-isolated-matrix-draft-v1',inputs,plans,members,completeBytes:total,semanticAuthority:false,runtimeParity:false,rustExecuted:false};
  writeFileSync(join(attempt,'manifest.json'),JSON.stringify(record)+'\n',{flag:'wx'});
  return attempt;
 }catch(error){rmSync(attempt,{recursive:true,force:true});throw error;}
}
