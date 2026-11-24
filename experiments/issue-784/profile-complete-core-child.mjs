// Diagnostic only: finite original complete legacy Hash workload, all output.
// Inspector overhead cannot qualify the original child's 12500 ms deadline.
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const session=new Session();session.connect();
const post=(method,parameters={})=>new Promise((resolve,reject)=>
 session.post(method,parameters,(error,value)=>error?reject(error):resolve(value)));
const target=new URL('../../tools/translation/test/fixtures/whole-owner-core-hook-child.mjs',import.meta.url);
const source=readFileSync(target,'utf8'),self=readFileSync(new URL(import.meta.url),'utf8');
const started=performance.now();
await post('Profiler.enable');
await post('Profiler.setSamplingInterval',{interval:1000});
await post('Profiler.start');
process.argv=[process.execPath,target.pathname,'legacy','hash-hook'];
let result=null;
try{await import(target.href);result=await post('Profiler.stop');}
finally{session.disconnect();}
assert.equal(readFileSync(target,'utf8'),source);
const record={schema:'complete-Core-child-finite-inspector-diagnostic-v1',
 engine:process.versions,elapsedMs:performance.now()-started,completeChildSource:source,
 completeDiagnosticSource:self,...result,deadlineQualified:false,
 sourceInstalled:false,productionExecutableGain:0};
const raw=Buffer.from(JSON.stringify(record)),packed=gzipSync(raw,{mtime:0});
assert.deepEqual(gunzipSync(packed),raw);
writeFileSync('ci-logs/issue-784-restart-2/core-child-current-profile.json.gz',packed,{flag:'wx'});
process.stderr.write(JSON.stringify({schema:record.schema,elapsedMs:record.elapsedMs,
 profilePackedBytes:packed.length,profileRawBytes:raw.length,
 profileRawSha256:createHash('sha256').update(raw).digest('hex'),
 originalDeadlineQualified:false})+'\n');
