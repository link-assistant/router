// Complete copied-source history DATA. Pins confer no semantic permission.
import {constants,lstatSync,openSync,fstatSync,readSync,closeSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalCapturedFunctionSource} from './original-json-intrinsics.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ARCHIVE='tools/translation/source-profiles/local-closure-option-captured-20261101/complete-parent-successor.json.gz';
const PIN='80b12771aeb89c8ab55179eeb0933dcdbc0f34135255952d46bd7a0b096c54c6';
const parent='local-closure-option-candidate-20261101',successor='local-closure-option-captured-20261101';
const suffixes=['.mjs','-syntax.mjs','-project.mjs'];
const fail=reason=>{throw TypeError('Captured Option complete source history: '+reason);};
const parse=JSON.parse,birth=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged()&&originalCapturedFunctionSource(parse)==='function parse() { [native code] }';
const guard=()=>{if(!birth||JSON.parse!==parse||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())fail('original source DATA operations changed');};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const identity=(stat,full)=>Object.fromEntries((full?['dev','ino','mode','uid','gid','nlink','size','mtimeNs','ctimeNs']:['dev','ino','mode','uid','gid']).map(key=>[key,String(stat[key])]));
const same=(left,right)=>Object.keys(left).length===Object.keys(right).length&&Object.keys(left).every(key=>left[key]===right[key]);
function ancestors(path,frame){for(let current=dirname(path),depth=0;;current=dirname(current)){if(++depth>128)fail('bounded physical ancestor path required');const stat=lstatSync(current,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary nonalias source ancestors required');const now=identity(stat,false),prior=frame.directories.get(current);if(prior&&!same(prior,now))fail('physical source ancestor replaced');if(!prior)frame.directories.set(current,now);if(dirname(current)===current)break;}}
function read(relative,frame){
 guard();const path=join(ROOT,relative);ancestors(path,frame);const before=lstatSync(path,{bigint:true});if(!before.isFile()||before.isSymbolicLink()||before.size>2097152n)fail('bounded ordinary complete source input required');
 const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0)|(constants.O_NONBLOCK??0));let primaryFailed=false;
 try{const opened=fstatSync(fd,{bigint:true}),expected=identity(before,true);if(!opened.isFile()||!same(expected,identity(opened,true))||opened.size<0n||opened.size>2097152n)fail('opened original source identity differs');const bytes=Buffer.alloc(Number(opened.size)+1);let size=0,count;while((count=readSync(fd,bytes,size,bytes.length-size,size))>0){size+=count;if(size>Number(opened.size))fail('complete source grew while read');}if(size!==Number(opened.size)||!same(expected,identity(fstatSync(fd,{bigint:true}),true))||!same(expected,identity(lstatSync(path,{bigint:true}),true)))fail('complete source changed while read');const result=bytes.subarray(0,size),prior=frame.files.get(relative);if(prior&&(!same(expected,prior.identity)||!result.equals(prior.bytes)))fail('complete original source changed or was replaced');if(!prior){if(frame.files.size>=7)fail('complete fixed source input census exceeded');frame.files.set(relative,{identity:expected,bytes:Buffer.from(result)});}return result;
 }catch(error){primaryFailed=true;throw error;}finally{try{closeSync(fd);}catch(error){if(!primaryFailed)throw error;}}
}
function close(frame){let failed=false,primary;for(const path of frame.files.keys())try{withSourceInputValidation(()=>read(path,frame));}catch(error){if(!failed){failed=true;primary=error;}}for(const [path,prior]of frame.directories)try{withSourceInputValidation(()=>{const stat=lstatSync(path,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink()||!same(prior,identity(stat,false)))fail('original source ancestor identity changed');});}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;}
export function visitCapturedOptionSourceHistory(consume){
 requireSynchronousSourceCallback(consume);const frame={files:new Map(),directories:new Map()};return withSourceFailureOperation(()=>{
  try{return withCompleteSourceClosingFence(()=>{
   const data=withSourceInputValidation(()=>{const packed=read(ARCHIVE,frame);if(createHash('sha256').update(packed).digest('hex')!==PIN)fail('entire immutable archive differs');const raw=gunzipSync(packed,{maxOutputLength:4194304}),value=parse(new TextDecoder('utf8',{fatal:true}).decode(raw));guard();accountData(value);if(value.schema!=='complete-local-closure-captured-source-copy-v1'||value.parentCommit!=='327fa26b76a2a0ef2465115ce1d4d5e04b45344e'||value.scalarParent!=='8a6de0143294b737f6e52f8ec01b513379810d32366a66eebf4a9a92352d8388'||value.rows?.length!==3)fail('complete exact parent/successor chain required');return value;});
   const sourceRows=[];for(let index=0;index<data.rows.length;index++){
    const row=data.rows[index];withSourceInputValidation(()=>{if(row.beforePath!=='tools/translation/'+parent+suffixes[index]||row.afterPath!=='tools/translation/'+successor+suffixes[index]||row.language!=='JavaScript'||typeof row.before!=='string'||typeof row.after!=='string'||Buffer.byteLength(row.before)>2097152||Buffer.byteLength(row.after)>2097152)fail('whole original and successor module images required');if(!read(row.beforePath,frame).equals(Buffer.from(row.before))||!read(row.afterPath,frame).equals(Buffer.from(row.after)))fail('actual complete original/current module bytes differ');});
    const history=withSourceInputValidation(()=>{const value=transportConcreteSourceEquations([{before:row.before,after:row.after,language:row.language}])[0];if(value.inverse!==row.before||transportConcreteSyntaxMeta(value.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(value.afterMeta).source!==row.after)fail('complete copied source CST/inverse differs');return value;});const event={...row,history,semanticAuthority:false};accountData({data,sourceRows,event});freeze(event);withCompleteSourceClosingFence(()=>{const received=consume(event);accountData({data,sourceRows,event,received});return null;},[]);sourceRows.push({beforePath:row.beforePath,afterPath:row.afterPath,before:row.before,after:row.after,trace:history.trace});
   }
   const result={schema:data.schema,parentCommit:data.parentCommit,scalarParent:data.scalarParent,sourceRows,sourceCopyOnly:true,semanticAuthority:false,oldImagesModified:false,originalClosureEquivalence:false,sourceInstalled:false};accountData(result);return freeze(result);
  },[()=>close(frame)]);}finally{frame.files.clear();frame.directories.clear();}
 });
}
