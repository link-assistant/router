// Change only finite diagnostic reporting at the actual canonical module URLs.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
const plan=JSON.parse(gunzipSync(readFileSync(new URL('ci-logs/issue-784-restart-2/bang-progress-diagnostic.json.gz',root)),{maxOutputLength:32*1024*1024}));
const hash=value=>createHash('sha256').update(value).digest('hex');
if(plan.schema!=='complete-bang-progress-diagnostic-v1'||plan.diagnosticOnly!==true||plan.files.length!==2)throw Error('Complete diagnostic profile differs');
const selected=new Map();
for(const [at,row]of plan.files.entries()){
 if(row.path!==['tools/translation/project.mjs','tools/translation/derive-bang-context.mjs'][at]||hash(row.before)!==row.beforeSha256||hash(row.after)!==row.afterSha256||readFileSync(new URL(row.path,root),'utf8')!==row.before)throw Error('Complete canonical diagnostic input differs');
 selected.set(new URL(row.path,root).href,row.after);
}
export async function load(url,context,next){
 const result=await next(url,context);return selected.has(url)?{...result,source:selected.get(url)}:result;
}
