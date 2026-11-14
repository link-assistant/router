// Full public source plan, retained and read back before physical installation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareProjectFacadeRetention} from '../../tools/translation/prepare-project-facade-retention.mjs';
const plan=prepareProjectFacadeRetention(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const raw=Buffer.from(JSON.stringify({schema:'complete-project-matches-analysis-source-v1',
 engine:process.versions,plan,fullGateQualified:false})+'\n');
const target='docs/case-studies/issue-784/evidence/current-project-matches-analysis-source.json.gz';
const packed=gzipSync(raw,{level:3,mtime:0});
assert.ok(packed.length<10000000,'bounded complete source evidence');
writeFileSync(target,packed,{flag:'wx'});
assert.deepEqual(gunzipSync(readFileSync(target)),raw);
assert.equal(JSON.stringify(JSON.parse(raw).plan),JSON.stringify(plan));
console.log(JSON.stringify({target,bytes:packed.length,sha256:sha(packed),
 decodedBytes:raw.length,decodedSha256:sha(raw),typescriptVersion:plan.typescriptVersion}));
for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.current);
for(const row of plan.files){writeFileSync(row.path,row.after);assert.equal(readFileSync(row.path,'utf8'),row.after);}
