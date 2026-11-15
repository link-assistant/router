// Complete production-input allocation diagnostic; sampling grants no authority.
import {Session} from 'node:inspector';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {captureSourceModuleViews,originalModuleViewItems} from '../../tools/translation/source-module-views.mjs';
const target=process.argv[2];
if(!target?.startsWith('ci-logs/issue-784-restart-2/current-module-freeze-')||!target.endsWith('.json.gz')||process.argv.length!==3)throw Error('One task-owned new complete profile target required');
const sha=raw=>createHash('sha256').update(raw).digest('hex');
const paths=execFileSync('git',['ls-files','-z','--','rust/src/*.rs','rust/src/**/*.rs']).toString().split('\0').filter(Boolean);
if(paths.length!==567)throw Error('Complete current production source census changed');
const session=new Session();session.connect();
const call=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,result)=>error?reject(error):resolve(result)));
let profile,rows=[];const started=performance.now(),usage=process.memoryUsage();
try{
 await call('HeapProfiler.startSampling',{samplingInterval:16384,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
 for(const path of paths){
  const bytes=readFileSync(path),source=bytes.toString('utf8');
  if(!Buffer.from(source).equals(bytes))throw Error('Complete source UTF8 changed');
  const result=captureSourceModuleViews({source,sourcePath:path}),items=result.views.map(view=>originalModuleViewItems(view,source));
  rows.push({path,bytes:bytes.length,sourceSha256:sha(bytes),resultSha256:sha(JSON.stringify({result,items}))});
 }
 ({profile}=await call('HeapProfiler.stopSampling'));
}finally{session.disconnect();}
const after=process.memoryUsage(),elapsedMs=performance.now()-started;
const packet={schema:'complete-module-item-freeze-allocation-v1',engine:process.version,
 sourceHead:execFileSync('git',['rev-parse','HEAD']).toString().trim(),
 producerSha256:sha(readFileSync('tools/translation/prepare-module-token-layout.mjs')),
 moduleSha256:sha(readFileSync('tools/translation/source-module-views.mjs')),
 rows,profile,elapsedMs,memoryBefore:usage,memoryAfter:after,samplingInterval:16384,
 includesCollectedObjects:true,scope:'One whole unchanged production source census; sampled allocation estimates, not retained bytes, a leak proof, generation qualification or executable application coverage.'};
const raw=Buffer.from(JSON.stringify(packet)+'\n'),packed=gzipSync(raw,{level:6});
writeFileSync(target,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(target)).equals(raw))throw Error('Complete profile readback differs');
console.log(JSON.stringify({path:target,bytes:packed.length,sha256:sha(packed),files:rows.length,
 elapsedMs,resultCensusSha256:sha(JSON.stringify(rows)),moduleSha256:packet.moduleSha256}));
