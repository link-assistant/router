// Retain and read back the complete source equation before installation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareConcreteCommonGuard} from './concrete-common-guard-source.mjs';
const base='ci-logs/issue-784-restart-2/current-concrete-common-guard-proposal';
assert.ok(!existsSync(base+'.json.gz'));
const started=performance.now(),plan=prepareConcreteCommonGuard();
assert.equal(plan.current,plan.before);
const raw=Buffer.from(JSON.stringify(plan));
assert.ok(raw.length<16*1024*1024);
writeFileSync(base+'.json.gz',gzipSync(raw),{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(base+'.json.gz')),raw);
const hash=value=>createHash('sha256').update(value).digest('hex');
writeFileSync(base+'-receipt.json',JSON.stringify({
 bytes:raw.length,sha256:hash(raw),beforeSha256:plan.beforeSha256,afterSha256:plan.afterSha256,
 completeSourceInverse:plan.inverse===plan.before,phaseNames:plan.equation.stages.map(row=>row.phase),
 inputSha256:hash(readFileSync('experiments/issue-784/concrete-common-guard-source.mjs')),
 elapsedMilliseconds:performance.now()-started,installed:false,runtimeParity:false,
},null,2),{flag:'wx'});
console.log(readFileSync(base+'-receipt.json','utf8'));
