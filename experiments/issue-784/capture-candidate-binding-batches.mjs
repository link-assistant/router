// Complete source DATA, with readback. No runtime or performance authority.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareCandidateBindingBatches} from '../../tools/translation/prepare-candidate-binding-batches.mjs';
const output=process.argv[2];
if(process.argv.length!==3||!output?.startsWith('ci-logs/issue-784-restart-2/'))
 throw new TypeError('One fresh task evidence path required');
const started=performance.now(),plan=prepareCandidateBindingBatches(),raw=Buffer.from(JSON.stringify(plan));
if(raw.length>32*1024*1024)throw new TypeError('Complete finite source proposal bound');
for(const row of plan.files)if(readFileSync(row.path,'utf8')!==row.after)
 throw new TypeError('Installed generator differs from its complete source equation');
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw))
 throw new TypeError('Complete source proposal readback differs');
console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,
 elapsedMilliseconds:performance.now()-started,completeEvidenceBytes:raw.length,
 packedBytes:packed.length,sha256:createHash('sha256').update(packed).digest('hex'),
 sourceFiles:plan.files.length,semanticAuthority:false,performanceQualified:false,
 productionExecutableGain:0}));
