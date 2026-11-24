// Read-only case SOURCE custody. Never a compiler/native selection or permit.
import {constants,lstatSync,openSync,fstatSync,readSync,closeSync,realpathSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw TypeError('Unrun case source custody: '+message);};
const fields=['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs'];
const stamp=(stat,whole=true)=>Object.fromEntries(fields.slice(0,whole?fields.length:5).map(key=>[key,stat[key]]));
const same=(left,right)=>Object.keys(left).length===Object.keys(right).length&&Object.keys(left).every(key=>left[key]===right[key]);
export function captureUnrunSourceCaseCustody(root,rows){
 accountData(rows);if(typeof root!=='string'||!Array.isArray(rows)||rows.length>16)fail('bounded actual case source census required');
 return withSourceFailureOperation(()=>{
  const directory=realpathSync(root),files=new Map(),parents=new Map();let total=0;
  function read(row){
   if(!row||Object.keys(row).sort().join(',')!=='path,source'||typeof row.path!=='string'||!row.path.startsWith('tools/translation/test/')||!row.path.endsWith('.mjs')||row.path.length>4096||/[:\\\0\r\n]/u.test(row.path)||row.path.split('/').some(part=>!part||part==='.'||part==='..')||typeof row.source!=='string'||/\p{Surrogate}/u.test(row.source)||Buffer.byteLength(row.source)>2097152)fail('ordinary complete case path/source required');
   const path=join(directory,row.path);for(let parent=dirname(path),depth=0;;parent=dirname(parent)){if(++depth>128)fail('bounded ordinary case ancestors required');const stat=lstatSync(parent,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary case source ancestors required');const now=stamp(stat,false),before=parents.get(parent);if(before&&!same(before,now))fail('case source ancestor replaced');if(!before)parents.set(parent,now);if(dirname(parent)===parent)break;}
   const before=lstatSync(path,{bigint:true});if(!before.isFile()||before.isSymbolicLink()||before.size<0n||before.size>2097152n)fail('bounded ordinary case source required');
   const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0));let failed=false;
   try{const initial=stamp(before),opened=fstatSync(fd,{bigint:true});if(!opened.isFile()||!same(initial,stamp(opened)))fail('opened case source differs');const buffer=Buffer.alloc(Number(opened.size)+1);let size=0,count;while((count=readSync(fd,buffer,size,buffer.length-size,size))>0){size+=count;if(size>Number(opened.size))fail('whole case source grew');}if(size!==Number(opened.size)||!same(initial,stamp(fstatSync(fd,{bigint:true})))||!same(initial,stamp(lstatSync(path,{bigint:true})))||!buffer.subarray(0,size).equals(Buffer.from(row.source)))fail('whole current case source bytes/identity differ');const prior=files.get(row.path);if(prior&&!same(prior.identity,initial))fail('same-byte case source replacement');if(!prior){total+=size;if(total>16777216)fail('complete unrun case source aggregate bound');files.set(row.path,{row,identity:initial});}}
   catch(error){failed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!failed)throw error;}}
  }
  const close=()=>{let failed=false,primary;for(const value of files.values())try{withSourceInputValidation(()=>read(value.row));}catch(error){if(!failed){failed=true;primary=error;}}for(const [path,prior]of parents)try{withSourceInputValidation(()=>{const stat=lstatSync(path,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink()||!same(prior,stamp(stat,false)))fail('whole case ancestor changed');});}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;};
  let active=true;const release=()=>{if(!active)fail('one actual case source release required');active=false;files.clear();parents.clear();};
  try{for(const row of rows)withSourceInputValidation(()=>read(row));return Object.freeze({verify(){if(!active)fail('case source custody expired');close();},release});}catch(error){release();throw error;}
 });
}
export function withUnrunSourceCaseCustody(root,rows,run){
 requireSynchronousSourceCallback(run);const lease=captureUnrunSourceCaseCustody(root,rows);return withCompleteSourceClosingFence(run,[()=>lease.verify(),()=>lease.release()]);
}
