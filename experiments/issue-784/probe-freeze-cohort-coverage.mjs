// Finite observer experiment. Original helper and fixture source remain data.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base='ci-logs/issue-784-restart-2/',hash=x=>createHash('sha256').update(x).digest('hex');
const original=JSON.parse(gunzipSync(readFileSync(base+'freeze-cohort-before-vectors/root-small-old-complete-result.json.gz'),{maxOutputLength:8*1024*1024}));
const directory=mkdtempSync(join(tmpdir(),'router-freeze-coverage-probe-')),helper=join(directory,'complete-original.mjs');
const rows=[];
try{
 writeFileSync(helper,original.record.subject.copiedSource);
 const source=original.record.code.split(original.record.subject.url).join(pathToFileURL(helper).href);
 const anchor='const native=common.originalDataFreezeIntrinsicsUnchanged(),fixture=make(';assert.equal(source.split(anchor).length,2);
 const warm="%PrepareFunctionForOptimization(read);for(let at=0;at<100;at++)read({warm:at});%OptimizeFunctionOnNextCall(read);read({warm:101});";
 for(const [label,code]of [['original',source],['forced-optimization',source.replace(anchor,warm+anchor)]]){
  const result=spawnSync(process.execPath,['--max-old-space-size=128','--allow-natives-syntax','--input-type=module','--eval',code],{encoding:null,timeout:10000,maxBuffer:8*1024*1024});
  const row={label,code,args:['--max-old-space-size=128','--allow-natives-syntax','--input-type=module','--eval'],status:result.status,signal:result.signal,error:result.error?{name:result.error.name,message:result.error.message}:null,stdoutBase64:result.stdout.toString('base64'),stderrBase64:result.stderr.toString('base64')};
  if(result.status===0){const value=JSON.parse(gunzipSync(result.stdout,{maxOutputLength:8*1024*1024}));const matches=value.coverage.result.filter(r=>r.url===pathToFileURL(helper).href);assert.equal(matches.length,1);row.plan=matches[0].functions.filter(r=>r.functionName==='plan');row.rootCount=row.plan[0]?.ranges[0].count??null;row.completeResult=value;}
  rows.push(row);console.log(JSON.stringify({label,status:row.status,rootCount:row.rootCount,error:row.error}));
 }
 const raw=Buffer.from(JSON.stringify({original,helperSource:original.record.subject.copiedSource,rows,originalAssertionsChanged:false,qualification:false}));
 const output=base+'freeze-cohort-coverage-probe.json.gz';writeFileSync(output,gzipSync(raw),{flag:'wx'});assert.ok(gunzipSync(readFileSync(output)).equals(raw));console.log(JSON.stringify({output,bytes:raw.length,sha256:hash(raw)}));
}finally{rmSync(directory,{recursive:true,force:true});}
