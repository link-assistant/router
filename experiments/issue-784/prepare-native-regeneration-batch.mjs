// Preserve complete ordered source/CST proposal before a reviewed installation.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareNativeRegenerationBatch} from '../../tools/translation/prepare-native-regeneration-batch.mjs';
if(process.argv.slice(2).join(' ')!=='--install')throw Error('Explicit source installation required');
const plan=prepareNativeRegenerationBatch(),raw=Buffer.from(JSON.stringify(plan));
if(raw.length>32*1024*1024)throw Error('Complete finite source-equation bound');
const path='ci-logs/issue-784-restart-2/native-regeneration-batch-proposal.json.gz';
writeFileSync(path,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(path),{maxOutputLength:32*1024*1024}).equals(raw))throw Error('Full proposal readback differs');
if(readFileSync(plan.path,'utf8')!==plan.before)throw Error('Full physical original changed');
writeFileSync(plan.path,plan.after);
if(readFileSync(plan.path,'utf8')!==plan.after)throw Error('Complete installed proposal differs');
console.log(JSON.stringify({path,bytes:raw.length,originalSha256:plan.originalSha256,
 afterSha256:plan.afterSha256,semanticAuthority:false,productionExecutableGain:0}));
