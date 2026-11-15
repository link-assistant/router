// Preserve the canonical module identity and all actual private issuers.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const project=new URL('../../tools/translation/project.mjs',import.meta.url);
const archive=new URL('../../ci-logs/issue-784-restart-2/namespace-progress-diagnostic.json.gz',import.meta.url);
const plan=JSON.parse(gunzipSync(readFileSync(archive),{maxOutputLength:32*1024*1024}));
const hash=value=>createHash('sha256').update(value).digest('hex');
if(plan.schema!=='complete-namespace-progress-diagnostic-v1'||plan.path!=='tools/translation/project.mjs'||plan.diagnosticOnly!==true
 ||hash(plan.before)!==plan.beforeSha256||hash(plan.after)!==plan.afterSha256||readFileSync(project,'utf8')!==plan.before)throw Error('Complete canonical diagnostic source differs');
export async function load(url,context,next){
 const result=await next(url,context);
 return url===project.href?{...result,source:plan.after}:result;
}
