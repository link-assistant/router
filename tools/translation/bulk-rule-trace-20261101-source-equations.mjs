// Complete source correction DATA only. Every implementation/case remains UNRUN.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const PROFILE=new URL('./source-profiles/bulk-rule-trace-20261101/',import.meta.url);
const PATHS=Object.freeze([
 'tools/translation/test/primitive-vector-iterator-bulk-20261101.test.mjs',
 'tools/translation/test/collection-callback-bulk-20261101.test.mjs',
 'tools/translation/test/scalar-chain-bulk-20261101.test.mjs',
 'tools/translation/scalar-chain-bulk-20261101-source-equations.mjs',
]);
const fail=message=>{throw new TypeError('Bulk rule trace source equations: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const stamp=row=>[row.dev,row.ino,row.mode,row.size,row.mtimeMs,row.ctimeMs];
function read(url,limit){
 const initial=fs.lstatSync(url);if(!initial.isFile()||initial.isSymbolicLink()||initial.size>limit)fail('bounded ordinary complete source input required');
 const fd=fs.openSync(url,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0)|(fs.constants.O_NONBLOCK??0));
 try{
  const actual=fs.fstatSync(fd);if(JSON.stringify(stamp(actual))!==JSON.stringify(stamp(initial)))fail('source input replaced before read');
  const bytes=Buffer.alloc(actual.size+1);let count=0;
  while(count<bytes.length){const next=fs.readSync(fd,bytes,count,bytes.length-count,null);if(!next)break;count+=next;}
  if(count!==actual.size||JSON.stringify(stamp(fs.fstatSync(fd)))!==JSON.stringify(stamp(initial))||JSON.stringify(stamp(fs.lstatSync(url)))!==JSON.stringify(stamp(initial)))fail('complete source input changed during read');
  return {url,limit,bytes:bytes.subarray(0,count),identity:stamp(initial)};
 }finally{fs.closeSync(fd);}
}
function close(rows){let failed=false,primary;for(const row of rows)try{const current=read(row.url,row.limit);if(JSON.stringify(current.identity)!==JSON.stringify(row.identity)||!current.bytes.equals(row.bytes))fail('complete source input changed at closing');}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;}
export function prepareBulkRuleTraceSourceEquations(){
 const retained=[];
 return withCompleteSourceClosingFence(()=>{
  const manifestRow=read(new URL('manifest.json',PROFILE),65536);retained.push(manifestRow);
  const manifest=JSON.parse(manifestRow.bytes.toString('utf8'));
  if(manifest.schema!=='bulk-rule-trace-source-profile-v1'||manifest.archive!=='complete-originals.json.gz'||JSON.stringify(manifest.paths)!==JSON.stringify(PATHS)||manifest.execution!=='UNRUN')fail('complete fixed source profile required');
  const archive=read(new URL(manifest.archive,PROFILE),1048576);retained.push(archive);
  if(archive.bytes.length!==manifest.archiveBytes||hash(archive.bytes)!==manifest.archiveSha256)fail('complete original archive differs');
  const decoded=gunzipSync(archive.bytes,{maxOutputLength:8388608});if(decoded.length!==manifest.decodedBytes||hash(decoded)!==manifest.decodedSha256)fail('complete decoded source originals differ');
  const source=JSON.parse(decoded.toString('utf8'));
  if(source.schema!=='bulk-rule-trace-source-originals-v1'||!Array.isArray(source.files)||source.files.length!==PATHS.length)fail('complete fixed original rows required');
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'language:retain-complete-trace-case-originals-and-CST-source-inverses',apply:()=>source.files.map((row,index)=>{
    if(!row||Object.keys(row).length!==3||row.path!==PATHS[index]||typeof row.before!=='string'||!row.before.length||typeof row.after!=='string'||Buffer.byteLength(row.before)>2097152||Buffer.byteLength(row.after)>2097152)fail('complete bounded original/current source row required');
    const history=transportConcreteSourceEquations([{before:row.before,after:row.after,language:'JavaScript'}])[0];
    if(history.before!==row.before||history.after!==row.after||history.inverse!==row.before)fail('complete source inverse differs');
    return {...row,inverse:row.before,history};
   })}]},
   {phase:'repository',rules:[{id:'router:join-every-physical-successor-without-rewriting-frozen-source-originals',apply:files=>{
    for(const row of files){const actual=read(new URL('../../'+row.path,import.meta.url),2097152);retained.push(actual);if(actual.bytes.toString('utf8')!==row.after||!Buffer.from(row.after).equals(actual.bytes))fail('complete installed source differs: '+row.path);}
    return {schema:'bulk-rule-trace-source-proposal-v1',files,sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,receivingExecuted:false,rustExecuted:false,freshnessQualified:false};
   }}]},
  ]).run(null);
  return {...run.value,trace:run.trace};
 },[()=>close(retained)]);
}
export function findBulkRuleTraceSourceSuccessor(path,original){
 if(typeof path!=='string'||typeof original!=='string')fail('primitive original path/source required');
 const matches=prepareBulkRuleTraceSourceEquations().files.filter(row=>row.path===path&&row.before===original);
 if(matches.length>1)fail('ambiguous source successor');return matches[0]??null;
}
