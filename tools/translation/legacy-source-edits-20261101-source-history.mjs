// Complete historical-producer source equations, not namespace/type/executable authority.
import {openSync,readSync,closeSync,lstatSync,fstatSync,constants} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createReconcileSourceCapture} from './paired-sync-reconcile-20261101-support.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const ARCHIVE='tools/translation/source-profiles/legacy-source-edits-20261101/complete-source-equations.json.gz';
const FILES=['tools/translation/legacy-source-edits-20261101-replay.mjs','tools/translation/layout-ownership-bulk-20261101.mjs'];
const fail=message=>{throw new TypeError('Historical producer source history: '+message);};
const stamp=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeMs,stat.ctimeMs];
function bytes(path,initial){
 const remember=(name,stat)=>{const value=JSON.stringify(stamp(stat));if(initial.has(name)&&initial.get(name)!==value)fail('source archive initial identity changed');initial.set(name,value);};
 for(let parent=dirname(path);;parent=dirname(parent)){const stat=lstatSync(parent);if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary archive ancestors required');remember(parent,stat);if(parent===dirname(parent))break;}
 const before=lstatSync(path);if(!before.isFile()||before.isSymbolicLink()||before.size!==12161)fail('exact ordinary immutable source archive required');
 if(!Number.isInteger(constants.O_NOFOLLOW)||!Number.isInteger(constants.O_NONBLOCK))fail('native no-follow/nonblocking source open required');
 remember(path,before);
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 return withCompleteSourceClosingFence(()=>{
  const opened=fstatSync(fd);if(JSON.stringify(stamp(opened))!==JSON.stringify(stamp(before)))fail('source archive changed before open');
  const result=Buffer.alloc(12162);let at=0;while(at<result.length){const count=readSync(fd,result,at,result.length-at,at);if(!count)break;at+=count;}
  if(at!==12161||JSON.stringify(stamp(fstatSync(fd)))!==JSON.stringify(stamp(before))||JSON.stringify(stamp(lstatSync(path)))!==JSON.stringify(stamp(before)))fail('complete stable archive read required');
  for(const [name,value]of initial)if(JSON.stringify(stamp(lstatSync(name)))!==value)fail('source archive or ancestor changed during read');
  return result.subarray(0,at);
 },[()=>closeSync(fd)]);
}
export function proposeLegacySourceEditsHistory({root=ROOT}={}){
 const captured=createReconcileSourceCapture(root);
 return withCompleteSourceClosingFence(()=>{
  const archivePath=captured.root+'/'+ARCHIVE,initial=new Map(),opening=bytes(archivePath,initial),checkArchive=()=>{if(!bytes(archivePath,initial).equals(opening))fail('original complete archive changed during operation');};
  return withCompleteSourceClosingFence(()=>{
   if(createHash('sha256').update(opening).digest('hex')!=='e83081f177ada19d2e3d8950a5d6376697044a4a5bcc2dc571fff8d882d5bbf5')fail('immutable whole-source archive differs');
   const raw=gunzipSync(opening,{maxOutputLength:72609});if(raw.length!==72609)fail('complete decoded source archive required');
   const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
   if(data.schema!=='router-historical-output-current-edits-source-v1'||data.files.length!==FILES.length)fail('complete original source census differs');
   const output={schema:'router-historical-output-current-edits-proposal-v1',files:[],sourceAuthority:false,semanticAuthority:false,executionEvidence:'UNRUN'};
   for(let index=0;index<FILES.length;index++){
    const row=data.files[index];if(row.path!==FILES[index]||row.language!=='JavaScript'||typeof row.before!=='string'||typeof row.after!=='string'||row.before===row.after||captured.capture(row.path).source!==row.after)fail('complete physical successor differs');
    if(row.originalPath!==null&&captured.capture(row.originalPath).source!==row.before)fail('immutable historical predecessor changed');
    const source=transportConcreteSyntaxSource(row.before,{language:row.language});
    const history=applyConcreteSyntaxSubstitutions(source.meta,{
      languageRules:[{id:'javascript:isolate-fixed-historical-producer-from-current-application-edits',edits:[{span:[0,row.before.length],expected:row.before,replacement:row.after}]}],
      repositoryRules:[{id:'router:enroll-exact-known-legacy-output-bytes-with-fresh-current-producer-fences',edits:[]}],
    });
    if(history.value.source!==row.after||transportConcreteSyntaxMeta(source.meta).source!==row.before)fail('complete original/source inverse differs');
    const after=transportConcreteSyntaxSource(row.after,{language:row.language});
    if(transportConcreteSyntaxMeta(after.meta).source!==row.after)fail('complete successor CST inverse differs');
    output.files.push({...row,inverse:row.before,beforeMeta:source.meta,afterMeta:after.meta,trace:history.trace});
    accountPrimitiveVectorIteratorBulkData(output);
   }
   return output;
  },[checkArchive]);
 },[()=>captured.close()]);
}
