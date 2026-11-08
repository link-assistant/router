#!/usr/bin/env node
// Each CI shard runs complete files through the unchanged independent auditor.
// A full physical source census is joined before and after the original runner.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {nodeTestArguments,runAuditedNodeTests} from './run-node-tests.mjs';
import {readCaseSource,canonicalCasePath} from './node-case-deadlines.mjs';
const own=fileURLToPath(import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function partitionWholeFiles(files,index,count){
 if(!Number.isSafeInteger(count)||count<1||count>16||!Number.isSafeInteger(index)||index<1||index>count)throw Error('One complete bounded whole-file shard identity required');
 if(!Array.isArray(files)||!files.length||files.length>4096||files.some(file=>typeof file!=='string'||!file||file.includes('\0'))||new Set(files).size!==files.length)throw Error('Complete distinct whole file selection required');
 const all=[...files].sort();
 const selected=all.filter((_,at)=>at%count===index-1);
 if(!selected.length)throw Error('Every declared whole-file shard must contain files');
 return {all,selected,index,count};
}
export async function runWholeFileShard({root,files,flags=[],index,count,outerTimeoutMs=3600000}={}){
 const started=performance.now();
 root=canonicalCasePath(root);
 if(!Number.isSafeInteger(outerTimeoutMs)||outerTimeoutMs<1||outerTimeoutMs>3600000)throw Error('Finite original enclosing Node budget required');
 ({files,flags}=nodeTestArguments([...flags,...files]));
 const absolute=files.map(file=>canonicalCasePath(path.resolve(root,file)));
 if(absolute.some(file=>path.relative(root,file).startsWith('..')||path.isAbsolute(path.relative(root,file))))throw Error('Complete whole-file sources must stay inside selected root');
 const partition=partitionWholeFiles(absolute,index,count),sources=partition.all.map(file=>readCaseSource(file));
 if(sources.reduce((n,row)=>n+row.bytes,0)>64*1024*1024)throw Error('Complete whole-file source bound exceeded');
 const codeSources=[own,...['run-node-tests.mjs','node-case-deadlines.mjs','node-case-deadline-reporter.mjs'].map(file=>fileURLToPath(new URL(file,import.meta.url)))].map(file=>readCaseSource(file));
 const originalBudget=outerTimeoutMs,remaining=Math.floor(originalBudget-(performance.now()-started));
 if(remaining<1)throw Error('Complete source joins exhausted original enclosing Node budget');
 const result=await runAuditedNodeTests({root,files:partition.selected,flags,outerTimeoutMs:remaining});
 let refusal=null;
 try{
  for(const before of [...codeSources,...sources])if(!same(readCaseSource(before.path),before))throw Error('Complete original shard source changed during execution');
  if(performance.now()-started>originalBudget)throw Error('Complete shard and final source joins exceeded original enclosing Node budget');
 }catch(error){refusal=error.stack??error.message;}
 const record={schema:'complete-whole-file-node-shard-v1',index,count,allFiles:partition.all,selectedFiles:partition.selected,
  completeSources:sources,codeSources,sourceCensusSha256:hash(JSON.stringify(sources.map(({path,bytes,sha256})=>({path,bytes,sha256})))),
  originalOuterTimeoutMs:originalBudget,runnerOuterTimeoutMs:remaining,elapsedMs:performance.now()-started,
  terminal:'terminal.json',refusal,exitCode:result.exitCode||refusal?1:0,caseDeadlinesChanged:false,runtimeParity:false,rustExecuted:false};
 const raw=JSON.stringify(record)+'\n';
 if(Buffer.byteLength(raw)>128*1024*1024)throw Error('Complete whole-file shard receipt bound exceeded');
 const target=path.join(result.outputDirectory,'whole-file-shard.json');
 fs.writeFileSync(target,raw,{flag:'wx',mode:0o600});
 if(readCaseSource(target,128*1024*1024).source!==raw)throw Error('Complete whole-file shard receipt readback differs');
 try{
  for(const before of [...codeSources,...sources])if(!same(readCaseSource(before.path),before))throw Error('Complete original shard source changed at final receipt boundary');
  if(performance.now()-started>originalBudget)throw Error('Complete shard receipt exceeded original enclosing Node budget');
 }catch(error){
  record.exitCode=1;record.refusal='Final receipt boundary: '+(error.stack??error.message);
  fs.writeFileSync(path.join(result.outputDirectory,'whole-file-shard-finalization-refusal.json'),JSON.stringify(record)+'\n',{flag:'wx',mode:0o600});
 }
 return {...result,exitCode:record.exitCode,shard:record};
}
async function main(){
 const args=process.argv.slice(2);let outerTimeoutMs=3600000;
 if(args[0]?.startsWith('--outer-timeout-ms=')){if(!/^--outer-timeout-ms=[1-9]\d{0,6}$/u.test(args[0]))throw Error('Exact finite outer budget option required');outerTimeoutMs=Number(args.shift().split('=')[1]);}
 const identity=/^--whole-file-shard=([1-9]\d?)\/([1-9]\d?)$/u.exec(args.shift()??'');
 if(!identity)throw Error('Explicit whole-file shard identity required');
 const root=fileURLToPath(new URL('../',import.meta.url)),selected=nodeTestArguments(args);
 const result=await runWholeFileShard({root,...selected,index:Number(identity[1]),count:Number(identity[2]),outerTimeoutMs});
 process.stderr.write('Complete Node deadline evidence: '+result.outputDirectory+'\n');
 if(result.exitCode)process.stderr.write(JSON.stringify({exitCode:result.exitCode,shardRefusal:result.shard.refusal,auditError:result.auditError})+'\n');
 process.exitCode=result.exitCode;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.stack??error.message);process.exitCode=1;});

