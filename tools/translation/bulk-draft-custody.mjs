// Complete unqualified output DATA. This helper cannot issue compiler authority.
import {createHash} from 'node:crypto';
import {lstatSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const BULK_DRAFT_LIMITS=Object.freeze({files:200000,fileBytes:64*1024*1024,totalBytes:1024*1024*1024});
function destination(root,directory){
 if(directory!=='js/node_modules/.bulk-drafts')throw TypeError('Bulk drafts require js/node_modules/.bulk-drafts');
 let cursor=root;
 if(lstatSync(root).isSymbolicLink())throw TypeError('Bulk draft cannot follow symbolic links');
 for(const part of directory.split('/')){
  cursor=join(cursor,part);
  try{if(lstatSync(cursor).isSymbolicLink())throw TypeError('Bulk draft cannot follow symbolic links');}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }
 return cursor;
}
function safeOutput(path){
 if(typeof path!=='string'||path.length>4096||path.includes('\\')||path.includes(':')||path.includes('\0')||path.split('/').some(part=>!part||part==='.'||part==='..'))throw TypeError('Bulk draft requires safe complete output paths');
}
export function retainBulkDraft({root,directory,plan,expected,inputs,verifyFresh}={}){
 if(verifyFresh!==undefined&&typeof verifyFresh!=='function')throw TypeError('Bulk draft freshness observer must be a function');
 root=resolve(root);const folder=destination(root,directory);
 mkdirSync(folder,{recursive:true});const attempt=mkdtempSync(join(folder,'complete-'));
 try{
  let total=0,count=0;const members=[],names=new Set();
  const declared=new Map(plan.outputs.map(row=>[row.path,row]));
  if(declared.size!==plan.outputs.length)throw TypeError('Bulk draft output census has duplicates');
  for(const [path,content] of expected){
   safeOutput(path);
   if(names.has(path)||typeof content!=='string')throw TypeError('Bulk draft needs distinct complete UTF-8 output text');
   const row=declared.get(path),bytes=Buffer.from(content);
   if(bytes.toString('utf8')!==content||!row||bytes.length!==row.bytes||hash(bytes)!==row.sha256)throw TypeError('Complete bulk draft output size/hash differs');
   if(++count>BULK_DRAFT_LIMITS.files||bytes.length>BULK_DRAFT_LIMITS.fileBytes||(total+=bytes.length)>BULK_DRAFT_LIMITS.totalBytes)throw RangeError('Complete bulk draft byte bounds exceeded');
   const storedAs=String(count).padStart(6,'0')+'.gz',packed=gzipSync(bytes);
   writeFileSync(join(attempt,storedAs),packed,{flag:'wx'});
   const stored=readFileSync(join(attempt,storedAs));
   if(!stored.equals(packed)||!gunzipSync(stored,{maxOutputLength:BULK_DRAFT_LIMITS.fileBytes}).equals(bytes))throw TypeError('Complete bulk draft readback differs');
   names.add(path);members.push({...row,storedAs,storedBytes:packed.length,storedSha256:hash(packed)});
  }
  if(names.size!==declared.size||total!==plan.expectedBytes)throw TypeError('Complete bulk draft output census differs');
  const record={schema:'unqualified-complete-bulk-draft-v1',inputs,plan,members,completeBytes:total,
   semanticAuthority:false,sourceAuthority:false,privatePlanAuthority:false,runtimeParity:false,rustExecuted:false};
  const text=JSON.stringify(record)+'\n';writeFileSync(join(attempt,'manifest.json'),text,{flag:'wx'});
  if(readFileSync(join(attempt,'manifest.json'),'utf8')!==text)throw TypeError('Complete bulk draft manifest readback differs');
  verifyFresh?.();
  return attempt;
 }catch(error){rmSync(attempt,{recursive:true,force:true});throw error;}
}
