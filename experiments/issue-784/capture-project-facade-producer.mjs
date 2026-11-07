// Receiving source-equation evidence; no runtime output is installed here.
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {prepareProjectFacadeRetention} from '../../tools/translation/prepare-project-facade-retention.mjs';
const output=process.argv[2];
if(!output?.startsWith('ci-logs/issue-784-restart-2/')||process.argv.length!==3)throw new TypeError('Select one fresh investigation evidence path');
const started=performance.now(),plan=prepareProjectFacadeRetention(),raw=Buffer.from(JSON.stringify(plan));
if(raw.length>64*1024*1024)throw new TypeError('Complete source evidence exceeds its finite storage bound');
writeFileSync(output,gzipSync(raw),{flag:'wx'});
console.log(JSON.stringify({schema:plan.schema,typescriptVersion:plan.typescriptVersion,elapsedMilliseconds:performance.now()-started,bytes:raw.length,files:plan.files.map(row=>({path:row.path,beforeSha256:row.beforeSha256,afterSha256:row.afterSha256,stages:row.stages.map(stage=>({phase:stage.phase,completeInverse:stage.completeInverse})),nativeBindings:row.nativeBindings}))}));
