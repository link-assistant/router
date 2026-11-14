// Preserve a complete fresh source proposal, never a selected metadata summary.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareConcretePhasedEquations} from '../../tools/translation/prepare-concrete-phased-equations.mjs';
const output=process.argv[2];
if(process.argv.length!==3||!output?.startsWith('ci-logs/issue-784-restart-2/'))throw TypeError('One fresh task evidence path required');
const started=performance.now(),plan=prepareConcretePhasedEquations(),raw=Buffer.from(JSON.stringify(plan));
if(raw.length>64*1024*1024)throw Error('Complete finite source proposal bound');
if(readFileSync(plan.file.path,'utf8')!==plan.file.after)throw Error('Complete installed private sibling differs');
const packed=gzipSync(raw);writeFileSync(output,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('Complete source proposal readback differs');
console.log(JSON.stringify({schema:plan.schema,node:process.version,elapsedMilliseconds:performance.now()-started,
 path:plan.file.path,beforeSha256:plan.file.beforeSha256,afterSha256:plan.file.afterSha256,
 completeEvidenceBytes:raw.length,packedBytes:packed.length,packedSha256:createHash('sha256').update(packed).digest('hex'),
 semanticAuthority:false,performanceQualified:false}));
