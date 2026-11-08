// Full source preparation is retained and read back before output installation.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareModuleTokenLayout} from '../../tools/translation/prepare-module-token-layout.mjs';
const target='ci-logs/issue-784-restart-2/current-module-freeze-source-proposal-v2.json.gz';
const row=prepareModuleTokenLayout(),hash=value=>createHash('sha256').update(value).digest('hex');
if(row.before!==row.previousAfter||row.before===row.after)throw Error('Exact current receiving source required');
const raw=Buffer.from(JSON.stringify({row,installed:false,sourceAuthority:false,runtimeAuthority:false})+'\n'),packed=gzipSync(raw,{level:6});
writeFileSync(target,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(target)).equals(raw))throw Error('Complete source proposal readback differs');
console.log(JSON.stringify({path:target,bytes:packed.length,sha256:hash(packed),originalSha256:row.originalSha256,beforeSha256:hash(row.before),afterSha256:row.afterSha256,nativeVersion:row.nativeItemFreeze.nativeVersion,phases:row.stages.map(stage=>stage.phase),installed:false}));
