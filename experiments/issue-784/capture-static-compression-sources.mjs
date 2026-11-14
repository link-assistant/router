// Retain each complete actual native/CST plan before installing its output.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareStaticSourceRelease} from '../../tools/translation/prepare-static-source-release.mjs';
import {prepareStrictStaticSourceProducer} from '../../tools/translation/prepare-strict-static-source-producer.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [name,prepare]of [['release',prepareStaticSourceRelease],['strict',prepareStrictStaticSourceProducer]]){
 const plan=prepare(),raw=Buffer.from(JSON.stringify(plan)+'\n'),packed=gzipSync(raw,{level:3,mtime:0});
 const path='docs/case-studies/issue-784/evidence/current-static-compression-'+name+'-source.json.gz';
 assert.ok(packed.length<8000000);writeFileSync(path,packed,{flag:'wx'});
 assert.deepEqual(gunzipSync(readFileSync(path)),raw);
 assert.equal(JSON.stringify(JSON.parse(raw)),JSON.stringify(plan));
 for(const row of plan.files)assert.equal(readFileSync(row.path,'utf8'),row.current??row.before);
 for(const row of plan.files)writeFileSync(row.path,row.after);
 console.log(JSON.stringify({path,bytes:packed.length,sha256:sha(packed),rawBytes:raw.length,
  rawSha256:sha(raw),sourceAuthority:false,fullGatePassed:false}));
}
