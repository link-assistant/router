// Compare the complete actual source producer, without substituting a verdict.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareOwnedRuntimeImportEdges} from '../../tools/translation/prepare-owned-runtime-import-current.mjs';
const [mode]=process.argv.slice(2);
assert.ok(['before','after'].includes(mode));
const prefix='ci-logs/issue-784-restart-2/runtime-binding-batch-';
const target=prefix+mode+'.json.gz';
assert.equal(existsSync(target),false);
const start=performance.now(),plan=prepareOwnedRuntimeImportEdges(),elapsedMs=performance.now()-start;
const raw=Buffer.from(JSON.stringify(plan)+'\n'),hash=value=>createHash('sha256').update(value).digest('hex');
if(mode==='after'){
 const before=gunzipSync(readFileSync(prefix+'before.json.gz'),{maxOutputLength:128*1024*1024});
 assert.deepEqual(raw,before,'Every complete original public plan field must remain identical');
}
const packed=gzipSync(raw,{level:9,mtime:0});
writeFileSync(target,packed,{flag:'wx'});assert.deepEqual(gunzipSync(readFileSync(target)),raw);
console.log(JSON.stringify({target,elapsedMs,bytes:packed.length,sha256:hash(packed),
 rawBytes:raw.length,rawSha256:hash(raw),completePlanEquality:mode==='after',
 controlledSpeedup:false,fullGatePassed:false,runtimeParity:false,rustExecuted:false}));
