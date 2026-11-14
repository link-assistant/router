// Retain both complete historical/current CST equations before installation.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareCloneValidationOrder} from '../../tools/translation/prepare-clone-validation-order.mjs';
const output='ci-logs/issue-784-restart-2/clone-completed-freeze-source.json.gz';
if(process.argv.slice(2).join(' ')!=='--install')throw Error('Explicit --install required');
const plan=prepareCloneValidationOrder(),row=plan.file,raw=Buffer.from(JSON.stringify(plan));
if(raw.length>32*1024*1024||row.before!==plan.previous.after)throw Error('Expected the complete earlier Clone afterimage');
writeFileSync(output,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw)||readFileSync(row.path,'utf8')!==row.before)throw Error('Complete evidence or physical source changed');
writeFileSync(row.path,row.after);
if(readFileSync(row.path,'utf8')!==row.after)throw Error('Complete installed afterimage differs');
console.log(JSON.stringify({schema:plan.schema,bytes:raw.length,originalSha256:row.originalSha256,previousSha256:plan.previous.afterSha256,afterSha256:row.afterSha256,originalNodeLimit:plan.originalNodeLimit,originalDepthLimit:plan.originalDepthLimit,semanticAuthority:false}));
