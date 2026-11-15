// Retain the actual complete source producer; do not expose source in stdout.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareDerivePathIndexReentry} from '../../tools/translation/prepare-derive-path-index-reentry.mjs';

const [target,...rest]=process.argv.slice(2);
if(rest.length||!target?.startsWith('ci-logs/issue-784-restart-2/')||!target.endsWith('.json.gz'))
 throw Error('Fresh task-owned compressed evidence path required');
const plan=prepareDerivePathIndexReentry();
for(const row of plan.files){
 if(row.current!==row.after||readFileSync(row.path,'utf8')!==row.after)
  throw Error('Actual complete source producer is stale');
 if(row.equation.inverse!==row.before||row.equation.after!==row.after
  ||row.equation.stages.map(row=>row.phase).join(',')!=='language,repository')
  throw Error('Complete fixed-phase source/inverse differs');
}
const raw=Buffer.from(JSON.stringify(plan));
if(raw.length>8*1024*1024)throw Error('Finite complete source proposal bound');
const packed=gzipSync(raw,{level:9});
if(packed.length>2*1024*1024)throw Error('Finite complete proposal storage bound');
writeFileSync(target,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(target),{maxOutputLength:8*1024*1024}).equals(raw))
 throw Error('Complete source proposal readback differs');
console.log(JSON.stringify({target,bytes:raw.length,packedBytes:packed.length,
 sha256:createHash('sha256').update(raw).digest('hex'),typescriptVersion:plan.typescriptVersion,
 files:plan.files.map(row=>({path:row.path,sha256:row.afterSha256})),semanticAuthority:false}));
