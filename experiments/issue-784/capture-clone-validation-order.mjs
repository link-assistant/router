// Preserve the complete source equation before installing its exact afterimage.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareCloneValidationOrder} from '../../tools/translation/prepare-clone-validation-order.mjs';
const args=process.argv.slice(2),output=args[0];
if(args.length!==2||args[1]!=='--install'||output!=='ci-logs/issue-784-restart-2/clone-validation-order-source.json.gz')throw Error('Expected this task complete source proposal and explicit installation');
const plan=prepareCloneValidationOrder(),row=plan.file,raw=Buffer.from(JSON.stringify(plan));
if(raw.length>32*1024*1024||row.before!==row.original)throw Error('Expected a finite original complete source proposal');
writeFileSync(output,gzipSync(raw),{flag:'wx'});
if(!gunzipSync(readFileSync(output),{maxOutputLength:32*1024*1024}).equals(raw)||readFileSync(row.path,'utf8')!==row.before)throw Error('Complete evidence or physical source changed');
writeFileSync(row.path,row.after);
if(readFileSync(row.path,'utf8')!==row.after)throw Error('Complete installed afterimage differs');
console.log(JSON.stringify({schema:plan.schema,bytes:raw.length,originalSha256:row.originalSha256,afterSha256:row.afterSha256,originalNodeLimit:plan.originalNodeLimit,originalDepthLimit:plan.originalDepthLimit,semanticAuthority:false}));
